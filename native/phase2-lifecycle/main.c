#define _GNU_SOURCE
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <poll.h>
#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

/* Lifecycle-only: forked fake roles, no exec, networking, LS2 or graphics. */
enum test_case { NORMAL, CONTROL_LOSS, ACTOR_LOSS, WORKER_HANG, PARTIAL, DELAYED, CLEANUP_HANG };
static const char *const cases[] = {"normal", "control_loss", "actor_loss", "worker_hang",
    "partial_reply", "delayed_exit", "cleanup_hang"};
static volatile sig_atomic_t cancelled;
static int64_t entered;
static int64_t clock_ms(void) {
    struct timespec ts;
    if (clock_gettime(CLOCK_MONOTONIC, &ts)) _exit(125);
    return (int64_t)ts.tv_sec * 1000 + ts.tv_nsec / 1000000;
}
static int64_t elapsed(void) { return clock_ms() - entered; }
static void cancel(int sig) { (void)sig; cancelled = 1; }
static void hard_stop(int sig) { (void)sig; _exit(124); }
static int put(int fd, const char *text) {
    size_t n = strlen(text), off = 0;
    while (off < n) {
        ssize_t written = write(fd, text + off, n - off);
        if (written < 0 && errno == EINTR) continue;
        if (written <= 0) return -1;
        off += (size_t)written;
    }
    return 0;
}
static int private_file(int dir, const char *name) {
    return openat(dir, name, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC, 0600);
}
static int record(int fd, pid_t pid, const char *role) {
    char path[64], buffer[2048], line[256], *field, *save, *end;
    int in, index = 3;
    unsigned long long start = 0;
    snprintf(path, sizeof(path), "/proc/%ld/stat", (long)pid);
    in = open(path, O_RDONLY | O_CLOEXEC);
    if (in < 0) return -1;
    ssize_t n = read(in, buffer, sizeof(buffer) - 1);
    close(in);
    if (n <= 0) return -1;
    buffer[n] = 0; end = strrchr(buffer, ')');
    if (!end) return -1;
    for (field = strtok_r(end + 1, " \n", &save); field; field = strtok_r(NULL, " \n", &save), ++index) {
        if (index == 22) { start = strtoull(field, NULL, 10); break; }
    }
    if (!start) return -1;
    snprintf(line, sizeof(line), "{\"pid\":%ld,\"role\":\"%s\",\"start\":\"%llu\",\"session\":%ld}\n",
        (long)pid, role, start, (long)getsid(pid));
    return put(fd, line);
}
struct child { pid_t pid; int reaped, status, term_sent, kill_sent; int64_t term_at; };
static void reap(struct child *c) {
    if (c->pid > 0 && !c->reaped) {
        pid_t result = waitpid(c->pid, &c->status, WNOHANG);
        if (result == c->pid) c->reaped = 1;
    }
}
static void terminate(struct child *c, int64_t now) {
    reap(c);
    if (c->pid <= 0 || c->reaped) return;
    if (!c->term_sent) { kill(c->pid, SIGTERM); c->term_sent = 1; c->term_at = now; }
    else if (!c->kill_sent && now - c->term_at >= 200) { kill(c->pid, SIGKILL); c->kill_sent = 1; }
}
static void fake_role(int gate, int out, int actor, enum test_case which) {
    char byte;
    signal(SIGTERM, SIG_DFL); signal(SIGINT, SIG_DFL); signal(SIGALRM, SIG_DFL);
    cancelled = 0;
    alarm(7); /* Fixture-only bound if its supervisor disappears. */
    if (read(gate, &byte, 1) != 1) _exit(126);
    close(gate);
    if ((actor && which == CLEANUP_HANG) || (!actor && which == WORKER_HANG)) signal(SIGTERM, SIG_IGN);
    if (actor) {
        if (put(out, "A") < 0) _exit(126);
        if (which == ACTOR_LOSS) { usleep(150000); _exit(0); }
        for (;;) pause();
    }
    if (which == WORKER_HANG) for (;;) pause();
    if (which == DELAYED) {
        if (put(out, "fake-ok\n") < 0) _exit(126);
        usleep(300000);
    } else {
        usleep(250000);
        if (put(out, which == PARTIAL ? "fake-" : "fake-ok\n") < 0) _exit(126);
    }
    close(out); _exit(0);
}
static int spawn_fake(struct child *c, int dir, int report, int owned, int control, int ready,
                      int *reader, int actor, enum test_case which) {
    int gate[2], output[2];
    if (pipe2(gate, O_CLOEXEC)) return -1;
    if (pipe2(output, O_CLOEXEC)) { close(gate[0]); close(gate[1]); return -1; }
    c->pid = fork();
    if (c->pid == 0) {
        close(gate[1]); close(output[0]);
        close(dir); close(report); close(owned); close(control); close(ready);
        fake_role(gate[0], output[1], actor, which);
    }
    close(gate[0]); close(output[1]);
    if (c->pid < 0) { close(gate[1]); close(output[0]); return -1; }
    if (record(owned, c->pid, actor ? "actor" : "worker") || put(gate[1], "G")) {
        close(gate[1]); close(output[0]); return -1;
    }
    close(gate[1]);
    if (fcntl(output[0], F_SETFL, O_NONBLOCK) < 0) { close(output[0]); return -1; }
    *reader = output[0];
    return 0;
}
static void supervise(int dir, int report, int owned, int control, int ready, enum test_case which) {
    struct child actor = {0}, worker = {0};
    int actor_fd = -1, worker_fd = -1, cleaning = 0, host_lost = 0, worker_eof = 0;
    int bad = 0, reply_valid = 0, actor_started = 0, actor_lost = 0;
    int64_t cleanup_at = 0, work_at = 0, reply_at = -1, worker_exit_at = -1;
    char output[64]; size_t size = 0;
    const char *status = "startup_failed";
    int death_signal = -1;
    alarm(8);
    if (setsid() < 0 || prctl(PR_GET_PDEATHSIG, &death_signal) || death_signal != 0) _exit(125);
    int null_fd = open("/dev/null", O_RDWR | O_CLOEXEC);
    if (null_fd < 0 || dup2(null_fd, 0) < 0 || dup2(null_fd, 1) < 0 || dup2(null_fd, 2) < 0) _exit(125);
    if (null_fd > 2) close(null_fd);
    if (record(owned, getpid(), "supervisor") || fcntl(control, F_SETFL, O_NONBLOCK) < 0) _exit(125);
    if (spawn_fake(&actor, dir, report, owned, control, ready, &actor_fd, 1, which)) {
        bad = 1; cleaning = 1; cleanup_at = elapsed();
    } else if (put(ready, "R")) {
        status = "readiness_lost"; bad = 1; cleaning = 1; cleanup_at = elapsed();
    }
    close(ready);
    while (elapsed() < 7500) {
        int64_t now = elapsed();
        reap(&actor); reap(&worker);
        if (worker.reaped && worker_exit_at < 0) worker_exit_at = now;
        struct pollfd fds[3] = {{control, POLLIN | POLLHUP, 0}, {actor_fd, POLLIN | POLLHUP, 0},
                              {worker_fd, POLLIN | POLLHUP, 0}};
        if (poll(fds, 3, 10) < 0 && errno != EINTR) { bad = 1; cleaning = 1; status = "poll_failed"; }
        if (!host_lost && (fds[0].revents & (POLLIN | POLLHUP | POLLERR))) {
            char b;
            ssize_t n = read(control, &b, 1);
            if (n == 0) { host_lost = 1; close(control); control = -1; }
            else if (n > 0) { bad = 1; status = "unexpected_control_data"; }
        }
        if (!actor_started && actor_fd >= 0 && (fds[1].revents & (POLLIN | POLLHUP))) {
            char b;
            if (read(actor_fd, &b, 1) == 1 && b == 'A') {
                actor_started = 1;
                close(actor_fd); actor_fd = -1;
                if (!host_lost && !cleaning) {
                    work_at = now;
                    if (spawn_fake(&worker, dir, report, owned, control, -1, &worker_fd, 0, which)) {
                        bad = 1; status = "worker_start_failed"; cleaning = 1;
                    }
                }
            }
        }
        if (!worker_eof && worker_fd >= 0 && (fds[2].revents & (POLLIN | POLLHUP))) {
            char bytes[64]; ssize_t n = read(worker_fd, bytes, sizeof(bytes));
            if (n == 0) { worker_eof = 1; close(worker_fd); worker_fd = -1; }
            else if (n > 0) {
                if (size + (size_t)n > sizeof(output)) { bad = 1; status = "oversized_fake_reply"; cleaning = 1; }
                else { memcpy(output + size, bytes, (size_t)n); size += (size_t)n; if (reply_at < 0) reply_at = elapsed(); }
            } else if (errno != EAGAIN && errno != EINTR) { bad = 1; status = "pipe_failed"; cleaning = 1; }
        }
        if (!cleaning) {
            if (cancelled || host_lost || actor.reaped) {
                actor_lost = actor.reaped;
                status = "cancelled_cleanly"; cleaning = 1;
            } else if (worker.pid > 0 && worker.reaped && worker_eof) {
                reply_valid = size == 8 && !memcmp(output, "fake-ok\n", 8) &&
                    WIFEXITED(worker.status) && WEXITSTATUS(worker.status) == 0;
                status = reply_valid ? "lifecycle_control_passed" : "invalid_fake_reply";
                bad = !reply_valid; cleaning = 1;
            } else if ((worker.pid > 0 && now - work_at >= 2000) || now >= 4000) {
                bad = 1; status = "fake_work_timeout"; cleaning = 1;
            }
        }
        if (cleaning) {
            if (!cleanup_at) cleanup_at = now;
            terminate(&actor, now); terminate(&worker, now);
            if ((actor.pid <= 0 || actor.reaped) && (worker.pid <= 0 || worker.reaped)) break;
            if (now - cleanup_at >= 1000) { status = "cleanup_unconfirmed"; bad = 1; break; }
        }
    }
    reap(&actor); reap(&worker);
    int clean = (actor.pid <= 0 || actor.reaped) && (worker.pid <= 0 || worker.reaped);
    if (!clean) { status = "cleanup_unconfirmed"; bad = 1; }
    else if (which == CONTROL_LOSS && !host_lost) { status = "control_loss_not_observed"; bad = 1; }
    else if (which == ACTOR_LOSS && !actor_lost) { status = "actor_loss_not_observed"; bad = 1; }
    char json[2048];
    snprintf(json, sizeof(json), "{\"schemaVersion\":1,\"mode\":\"native_lifecycle_fake_workers\","
        "\"case\":\"%s\",\"status\":\"%s\",\"cleanupConfirmed\":%s,\"separateSession\":%s,"
        "\"hostControlLost\":%s,\"actorLossObserved\":%s,\"actorStarted\":%s,\"workerStarted\":%s,\"fakeReplyValidated\":%s,"
        "\"actorReaped\":%s,\"workerReaped\":%s,\"termRequests\":%d,\"killRequests\":%d,"
        "\"replyObservedMs\":%lld,\"workerExitObservedMs\":%lld,\"elapsedMs\":%lld,"
        "\"iwcCalls\":0,\"hardwareRestoration\":\"not_tested\"}\n",
        cases[which], status, clean ? "true" : "false", getsid(0) == getpid() ? "true" : "false",
        host_lost ? "true" : "false", actor_lost ? "true" : "false", actor_started ? "true" : "false", worker.pid > 0 ? "true" : "false",
        reply_valid ? "true" : "false", actor.reaped ? "true" : "false", worker.reaped ? "true" : "false",
        actor.term_sent + worker.term_sent, actor.kill_sent + worker.kill_sent,
        (long long)reply_at, (long long)worker_exit_at, (long long)elapsed());
    if (put(report, json) || fsync(report) || close(report)) _exit(74);
    if (actor_fd >= 0) close(actor_fd);
    if (worker_fd >= 0) close(worker_fd);
    close(owned); close(control); close(dir);
    _exit(bad ? 1 : 0);
}
int main(int argc, char **argv) {
    entered = clock_ms();
    if (argc != 5 || strcmp(argv[1], "--case") || strcmp(argv[3], "--directory") || argv[4][0] != '/') return 64;
    size_t which;
    for (which = 0; which < sizeof(cases) / sizeof(cases[0]); ++which) if (!strcmp(argv[2], cases[which])) break;
    if (which == sizeof(cases) / sizeof(cases[0])) return 64;
    signal(SIGPIPE, SIG_IGN); signal(SIGTERM, cancel); signal(SIGINT, cancel); signal(SIGALRM, hard_stop);
    alarm(8);
    int dir = open(argv[4], O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
    struct stat st;
    if (dir < 0 || fstat(dir, &st) || st.st_uid != geteuid() || (st.st_mode & 07777) != 0700) return 73;
    int report = private_file(dir, "report.json");
    if (report < 0) { close(dir); return 73; }
    int owned = private_file(dir, "owned.jsonl");
    int control[2], ready[2];
    if (owned < 0 || record(owned, getpid(), "launcher") || pipe2(control, O_CLOEXEC) || pipe2(ready, O_CLOEXEC)) return 73;
    pid_t pid = fork();
    if (pid < 0) return 71;
    if (!pid) {
        close(control[1]); close(ready[0]);
        supervise(dir, report, owned, control[0], ready[1], (enum test_case)which);
    }
    close(control[0]); close(ready[1]); close(report); close(owned); close(dir);
    struct pollfd init = {ready[0], POLLIN, 0};
    char byte;
    if (poll(&init, 1, 2000) <= 0 || read(ready[0], &byte, 1) != 1 || byte != 'R') {
        close(control[1]); close(ready[0]); return 72;
    }
    close(ready[0]);
    if (put(STDOUT_FILENO, "{\"ready\":true}\n")) { close(control[1]); control[1] = -1; }
    int status = 0, closed = control[1] < 0;
    for (;;) {
        pid_t r = waitpid(pid, &status, WNOHANG);
        if (r == pid) break;
        if (r < 0 && errno != EINTR) return 75;
        struct pollfd host = {closed ? -1 : STDIN_FILENO, POLLIN | POLLHUP, 0};
        if (poll(&host, 1, 10) < 0 && errno != EINTR) cancelled = 1;
        if (!closed && (cancelled || host.revents)) { close(control[1]); closed = 1; }
    }
    if (!closed) close(control[1]);
    return WIFEXITED(status) ? WEXITSTATUS(status) : 1;
}
