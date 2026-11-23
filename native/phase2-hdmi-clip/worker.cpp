#include "worker.h"
#include "../phase2-hdmi-picture/launch-clock.h"
#include <cerrno>
#include <csignal>
#include <cstdio>
#include <cstring>
#include <fcntl.h>
#include <poll.h>
#include <sys/prctl.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <unistd.h>

namespace mixed {
namespace {

struct Start {
    long long deadline;
    char windowId[256];
};

bool sendBytes(int fd, const void* bytes, size_t count) {
    return fd >= 0 && send(fd, bytes, count, MSG_NOSIGNAL) == static_cast<ssize_t>(count);
}

bool sendEvent(Event value) {
    return sendBytes(workerFd, &value, sizeof(value));
}

bool validWindow(const char* text, size_t size) {
    if (size < 2 || size > 256 || text[size - 1] != '\0') return false;
    for (size_t offset = 0; offset + 1 < size; ++offset) {
        const auto c = static_cast<unsigned char>(text[offset]);
        if (c < 0x21 || c > 0x7e || c == '"' || c == '\\') return false;
    }
    return true;
}

int failed() {
    sendEvent(Event::Failed);
    return 1;
}

} // namespace

Worker::~Worker() {
    terminate();
    reap();
    if (fd_ >= 0) close(fd_);
}

bool Worker::spawn() {
    if (fd_ >= 0) return false;
    int pair[2];
    if (socketpair(AF_UNIX, SOCK_SEQPACKET | SOCK_NONBLOCK | SOCK_CLOEXEC, 0, pair) != 0)
        return false;
    const pid_t parent = getpid();
    pid_ = fork();
    if (pid_ == 0) {
        close(pair[0]);
        if (prctl(PR_SET_PDEATHSIG, SIGKILL, 0, 0, 0) != 0 || getppid() != parent)
            _exit(75);
        alarm(22);
        if (dup2(pair[1], workerFd) < 0 || fcntl(workerFd, F_SETFD, 0) < 0)
            _exit(75);
        if (pair[1] != workerFd) close(pair[1]);
        execl("/proc/self/exe", "multiview-hdmi-clip", workerArgument, static_cast<char*>(nullptr));
        _exit(75);
    }
    close(pair[1]);
    if (pid_ < 0) {
        close(pair[0]);
        return false;
    }
    fd_ = pair[0];
    result_ = Reap::Pending;
    return true;
}

bool Worker::start(const char* windowId, long long deadline) const {
    const size_t size = strnlen(windowId, 256) + 1;
    if (!validWindow(windowId, size)) return false;
    Start message{deadline, {}};
    std::memcpy(message.windowId, windowId, size);
    return sendBytes(fd_, &message, sizeof(message));
}

bool Worker::stop() const {
    const char command = 'Q';
    return sendBytes(fd_, &command, sizeof(command));
}

Event Worker::event() const {
    Event value = Event::None;
    const auto size = recv(fd_, &value, sizeof(value), MSG_TRUNC);
    if (size < 0 && (errno == EAGAIN || errno == EINTR)) return Event::None;
    // A clean exit may follow the final packet immediately.
    if (size == 0) return Event::None;
    return size == sizeof(value) && value >= Event::Ready && value <= Event::Failed
        ? value : Event::Failed;
}

void Worker::terminate() const {
    if (pid_ > 0) kill(pid_, SIGKILL);
}

Reap Worker::reap() {
    if (pid_ <= 0) return result_;
    int status = 0;
    const auto observed = waitpid(pid_, &status, WNOHANG);
    if (observed == 0 || (observed < 0 && errno != ECHILD)) return Reap::Pending;
    pid_ = -1;
    if (observed < 0) result_ = Reap::Unobserved;
    else result_ = WIFEXITED(status) && WEXITSTATUS(status) == 0 ? Reap::Clean : Reap::Failed;
    return result_;
}

bool parentChannel() {
    ucred peer{};
    socklen_t size = sizeof(peer);
    if (getsockopt(workerFd, SOL_SOCKET, SO_PEERCRED, &peer, &size) != 0 ||
        size != sizeof(peer) || peer.pid <= 1 || peer.pid != getppid() || peer.uid != geteuid())
        return false;
    char parent[64];
    std::snprintf(parent, sizeof(parent), "/proc/%ld/exe", static_cast<long>(peer.pid));
    struct stat ours{}, theirs{};
    return stat("/proc/self/exe", &ours) == 0 && stat(parent, &theirs) == 0 &&
        ours.st_dev == theirs.st_dev && ours.st_ino == theirs.st_ino;
}

int serveClip(Clip& clip) {
    if (!parentChannel()) return 64;
    if (!sendEvent(Event::Ready)) return 1;
    pollfd source{workerFd, POLLIN, 0};
    if (poll(&source, 1, 17000) != 1) return failed();
    Start message{};
    const auto size = recv(workerFd, &message, sizeof(message), MSG_TRUNC);
    const auto started = hdmi::boottimeMs();
    if (size != sizeof(message) || !validWindow(message.windowId, strnlen(message.windowId, 256) + 1) ||
        started < 0 || message.deadline <= started || message.deadline > started + 8000) return failed();
    if (!clip.open(message.windowId)) return failed();

    bool firstFrame = false, advanced = false;
    unsigned initialPosition = 0;
    for (;;) {
        char command = 0;
        const auto count = recv(workerFd, &command, sizeof(command), MSG_TRUNC);
        if (count >= 0) {
            if (count != 1 || command != 'Q' || !clip.close()) return failed();
            return sendEvent(Event::Closed) ? 0 : 1;
        }
        if (errno != EAGAIN && errno != EINTR) return failed();
        const auto current = hdmi::boottimeMs();
        if (current < started || current >= message.deadline) return failed();
        if (!clip.feed()) return failed();
        const auto position = clip.positionMs();
        if (!firstFrame && clip.frames() != 0) {
            initialPosition = position;
            firstFrame = true;
            if (!sendEvent(Event::Frame)) return failed();
        } else if (firstFrame && !advanced && position > initialPosition) {
            advanced = true;
            if (!sendEvent(Event::Advanced)) return failed();
        }
        source.revents = 0;
        if (poll(&source, 1, 4) < 0 && errno != EINTR) return failed();
    }
}

} // namespace mixed
