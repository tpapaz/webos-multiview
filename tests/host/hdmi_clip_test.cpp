#include "../../native/phase2-hdmi-clip/observation.h"
#include "../../native/phase2-hdmi-picture/launch-clock.h"
#include "../../native/phase2-hdmi-picture/session.h"
#include <cassert>
#include <csignal>
#include <cstdlib>
#include <cstring>
#include <fcntl.h>
#include <sys/prctl.h>
#include <sys/wait.h>
#include <unistd.h>
#include <vector>

namespace {

long long now() { return hdmi::boottimeMs() * 5; }
void sleepTick() { usleep(2000); }

class FixtureClip final : public mixed::Clip {
public:
    bool open(const char* window) override {
        assert(std::strcmp(window, "test-window") == 0);
        reach("startup");
        return true;
    }
    bool feed() override {
        reach("feed");
        ++frames_;
        return true;
    }
    unsigned frames() const override { return frames_; }
    unsigned positionMs() const override { return frames_ * 33; }
    bool close() override {
        reach("unload");
        return true;
    }

private:
    void reach(const char* operation) {
        const auto* chosen = std::getenv("MULTIVIEW_CLIP_TEST_STALL");
        if (!chosen || std::strcmp(chosen, operation) != 0) return;
        const auto fd = std::atoi(std::getenv("MULTIVIEW_CLIP_TEST_FD"));
        assert(write(fd, "S", 1) == 1);
        while (true) pause();
    }
    unsigned frames_ = 0;
};

class FixturePlatform final : public hdmi::Platform {
public:
    explicit FixturePlatform(bool cancel) : start_(now()), cancel_(cancel) {}
    bool begin() override {
        return worker.spawn() && mixed::ready(worker, now, [&] { return cancelled(); }, sleepTick);
    }
    std::string windowId() const override { return "owned-hdmi"; }
    bool cancelled() override { return cancel_ && now() >= start_ + 1300; }
    hdmi::Reply exchange(hdmi::Step step, const std::string& request) override {
        steps.push_back(step);
        if (step == hdmi::Step::Open) {
            assert(request.find("owned-hdmi") != std::string::npos);
            return {hdmi::Delivery::Reply, R"({"returnValue":true,"pipelineId":"owned-session"})"};
        }
        assert(request.find("owned-session") != std::string::npos);
        if (step == hdmi::Step::Select) selected_ = now();
        if (step == hdmi::Step::Stop || step == hdmi::Step::Close) {
            assert(now() < selected_ + 8500);
            if (step == hdmi::Step::Close) closeTime = now();
        }
        return {hdmi::Delivery::Reply, R"({"returnValue":true})"};
    }
    bool observe() override {
        const bool ok = mixed::observe(worker, "test-window", observation, hdmi::boottimeMs() + 7500, now,
            [&] { return cancelled(); }, sleepTick);
        if (!ok) worker.terminate();
        return ok;
    }
    bool end() override {
        assert(closeTime > 0);
        workerReaped = mixed::reapAfterHdmi(worker, closeTime + 1000, now, sleepTick);
        return workerReaped && observation.closeCompleted && worker.reap() == mixed::Reap::Clean;
    }

    mixed::Worker worker;
    mixed::Observation observation;
    std::vector<hdmi::Step> steps;
    long long closeTime = 0;
    bool workerReaped = false;

private:
    const long long start_;
    const bool cancel_;
    long long selected_ = 0;
};

void trial(const char* stall, bool cancel = false) {
    int marker[2];
    assert(pipe2(marker, O_NONBLOCK) == 0);
    assert(fcntl(marker[0], F_SETFD, FD_CLOEXEC) == 0);
    assert(setenv("MULTIVIEW_CLIP_TEST_FD", std::to_string(marker[1]).c_str(), 1) == 0);
    assert(setenv("MULTIVIEW_CLIP_TEST_STALL", stall, 1) == 0);
    FixturePlatform platform(cancel);
    const auto result = hdmi::run(platform, true);
    assert(result.opened && result.selected && result.stopAcknowledged && result.closeAcknowledged);
    const std::vector<hdmi::Step> expected{hdmi::Step::Open, hdmi::Step::Select, hdmi::Step::Stop, hdmi::Step::Close};
    assert(platform.steps == expected);
    assert(platform.workerReaped);
    const bool succeeded = *stall == '\0' && !cancel;
    assert(result.localCleanup == succeeded);
    assert(platform.observation.continuityWindow == succeeded);
    assert(platform.observation.closeCompleted == succeeded);
    assert(result.status == (succeeded ? hdmi::Status::Completed : hdmi::Status::Cancelled));
    char entered = 0;
    const auto markerBytes = read(marker[0], &entered, 1);
    if (*stall) assert(markerBytes == 1 && entered == 'S');
    else assert(markerBytes < 0);
    close(marker[0]);
    close(marker[1]);
}

void missingExitStatusIsUncertain() {
    const auto original = std::signal(SIGCHLD, SIG_IGN);
    assert(original != SIG_ERR);
    mixed::Worker worker;
    assert(worker.spawn());
    assert(mixed::ready(worker, hdmi::boottimeMs, [] { return false; }, sleepTick));
    worker.terminate();
    assert(!mixed::reapAfterHdmi(worker, hdmi::boottimeMs() + 1000, hdmi::boottimeMs, sleepTick));
    assert(worker.reap() == mixed::Reap::Unobserved);
    std::signal(SIGCHLD, original);
}

void workerDiesWithSupervisor() {
    assert(prctl(PR_SET_CHILD_SUBREAPER, 1, 0, 0, 0) == 0);
    const auto supervisor = fork();
    assert(supervisor >= 0);
    if (supervisor == 0) {
        mixed::Worker worker;
        const bool ready = worker.spawn() &&
            mixed::ready(worker, hdmi::boottimeMs, [] { return false; }, sleepTick);
        _exit(ready ? 0 : 1);
    }
    int status = 0;
    assert(waitpid(supervisor, &status, 0) == supervisor && WIFEXITED(status) && WEXITSTATUS(status) == 0);
    const auto end = hdmi::boottimeMs() + 1000;
    pid_t worker = 0;
    while (worker == 0 && hdmi::boottimeMs() < end) {
        worker = waitpid(-1, &status, WNOHANG);
        if (worker == 0) sleepTick();
    }
    assert(worker > 0 && WIFSIGNALED(status) && WTERMSIG(status) == SIGKILL);
    assert(prctl(PR_SET_CHILD_SUBREAPER, 0, 0, 0, 0) == 0);
}

} // namespace

int main(int argc, char** argv) {
    if (argc == 2 && std::strcmp(argv[1], mixed::workerArgument) == 0) {
        FixtureClip clip;
        return mixed::serveClip(clip);
    }
    trial("");
    trial("startup");
    trial("feed");
    trial("unload");
    trial("", true);
    missingExitStatusIsUncertain();
    workerDiesWithSupervisor();
}
