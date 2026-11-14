#pragma once
#include "session.h"
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#include <cerrno>

namespace hdmi {
// One fixed slot per explicit phase. Reserve before SDL/LS2; never replace,
// follow links, delete evidence or accept a caller-supplied path/run identifier.
class Capture {
public:
    explicit Capture(Mode mode) {
        const char* name = reportFilename(mode);
        if (!name) return;
        const char* directory = "/tmp/io.github.tpapaz.multiview.hdmiwindow";
        if (mkdir(directory, 0700) != 0 && errno != EEXIST) return;
        const int dir = open(directory, O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
        if (dir < 0) return;
        struct stat st{};
        if (fstat(dir, &st) == 0 && st.st_uid == geteuid() && (st.st_mode & 07777) == 0700)
            fd_ = openat(dir, name, O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC, 0600);
        close(dir);
    }
    ~Capture() { if (fd_ >= 0) close(fd_); }
    Capture(const Capture&) = delete;
    Capture& operator=(const Capture&) = delete;
    bool ready() const { return fd_ >= 0; }
    bool finish(const std::string& report) {
        if (!ready() || report.empty() || report.size() + 1 > 2048) return false;
        const std::string bytes = report + '\n';
        size_t offset = 0;
        while (offset < bytes.size()) {
            const auto count = write(fd_, bytes.data() + offset, bytes.size() - offset);
            if (count < 0 && errno == EINTR) continue;
            if (count <= 0) return false;
            offset += static_cast<size_t>(count);
        }
        const bool synced = fsync(fd_) == 0;
        const bool closed = close(fd_) == 0;
        fd_ = -1;
        return synced && closed;
    }
private:
    int fd_ = -1;
};
} // namespace hdmi
