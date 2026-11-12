#pragma once
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#include <cerrno>
#include <cstddef>

// Reserve one private report before making any LS2 call. Never replace a
// previous run or follow a link. The owner must archive/remove it before retry.
class ReportFile {
public:
    explicit ReportFile(const char* directory) {
        if (mkdir(directory, 0700) != 0 && errno != EEXIST) return;
        const int dir = open(directory, O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC);
        if (dir < 0) return;
        struct stat st{};
        if (fstat(dir, &st) == 0 && st.st_uid == geteuid() &&
            (st.st_mode & 07777) == 0700) {
            fd_ = openat(dir, "report-0.1.2.json",
                O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW | O_CLOEXEC, 0600);
        }
        close(dir);
    }
    ~ReportFile() { if (fd_ >= 0) close(fd_); }
    ReportFile(const ReportFile&) = delete;
    ReportFile& operator=(const ReportFile&) = delete;
    bool ready() const { return fd_ >= 0; }
    bool finish(const char* data, size_t size) {
        if (!ready() || !size || size > 2048) return false;
        size_t offset = 0;
        while (offset < size) {
            const auto n = write(fd_, data + offset, size - offset);
            if (n < 0 && errno == EINTR) continue;
            if (n <= 0) return false;
            offset += static_cast<size_t>(n);
        }
        const bool synced = fsync(fd_) == 0;
        const bool closed = close(fd_) == 0;
        fd_ = -1;
        return synced && closed;
    }
private:
    int fd_ = -1;
};
