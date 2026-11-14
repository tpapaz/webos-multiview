// Deliberately no Native/Platform adapter: no graphics, bus or UTP client calls.
#include "../phase2-entry-diagnostic/diagnostic.h"
#include "../phase2-hdmi-window/launch-clock.h"
#include <cerrno>
#include <csignal>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#include <cstring>
#include <string>

namespace {
void timedOut(int) { _exit(124); }
void cancelled(int) { _exit(125); }
bool append(int fd, const std::string& text) {
    size_t offset = 0;
    while (offset < text.size()) {
        const auto count = write(fd, text.data() + offset, text.size() - offset);
        if (count < 0 && errno == EINTR) continue;
        if (count <= 0) return false;
        offset += static_cast<size_t>(count);
    }
    return fsync(fd) == 0;
}
} // namespace

int main(int argc, char** argv) {
    std::signal(SIGALRM, timedOut);
    std::signal(SIGINT, cancelled);
    std::signal(SIGTERM, cancelled);
    alarm(5); // Before any report/parser/clock work; expiry never admits HDMI work.
    const char* directory = "/tmp/io.github.tpapaz.multiview.hdmiwindow";
    if (mkdir(directory, 0700) != 0 && errno != EEXIST) return 71;
    const int parent = open(directory, O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
    if (parent < 0) return 72;
    struct stat st{};
    if (fstat(parent, &st) != 0 || st.st_uid != geteuid() || (st.st_mode & 07777) != 0700) {
        close(parent); return 73;
    }
    const int fd = openat(parent, "entry-0.1.6.jsonl", O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC, 0600);
    const bool parentClosed = close(parent) == 0;
    if (fd < 0) return 74;
    if (!parentClosed) { close(fd); return 75; }
    const auto finish = [&](int status, const std::string& text) {
        const bool written = append(fd, text + "{\"event\":\"exit_intent\",\"code\":" + std::to_string(status) + "}\n");
        const bool closed = close(fd) == 0;
        return written && closed ? status : 76;
    };
    if (!append(fd, "{\"schemaVersion\":1,\"appId\":\"io.github.tpapaz.multiview.hdmiwindow\","
        "\"diagnosticVersion\":\"0.1.6\",\"event\":\"main_entered\",\"reservation\":\"reserved\"}\n")) {
        close(fd); return 75;
    }
    const auto launch = hdmi::parseLaunch(argc, argv);
    if (!append(fd, std::string("{\"event\":\"parser\",\"outcome\":\"") + entry::parserOutcome(launch) + "\"}\n")) {
        close(fd); return 76;
    }
    if (launch.mode != hdmi::Mode::Picture) return finish(64, "");
    // Exact production clock reads/predicate; values stay private and are not saved.
    const auto boot = hdmi::currentBootId();
    const auto guard = entry::evaluate(launch, boot, hdmi::boottimeMs(), hdmi::realtimeMs());
    const std::string outcome = std::string("{\"event\":\"guard\",\"bootRead\":\"") + guard.bootRead +
        "\",\"bootMatch\":\"" + guard.bootMatch + "\",\"boottime\":\"" + guard.boottime +
        "\",\"realtime\":\"" + guard.realtime + "\",\"allowed\":" + (guard.allowed ? "true" : "false") + "}\n";
    return finish(guard.allowed ? 0 : 64, outcome);
}
