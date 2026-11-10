#pragma once

#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <unistd.h>

namespace phase1 {
using Clock = std::chrono::steady_clock;

class Trace {
public:
    Trace() {
        char path[] = "/tmp/multiview-phase1-XXXXXX";
        const int fd = mkstemp(path);
        if (fd >= 0) {
            // Keep telemetry readable through this process's fd until exit.
            if (unlink(path) == 0) file_ = fdopen(fd, "w");
            if (!file_) close(fd);
        }
    }
    Trace(const Trace&) = delete;
    Trace& operator=(const Trace&) = delete;
    ~Trace() { if (file_) std::fclose(file_); }

    void record(const char* event, int status, unsigned a, unsigned b, unsigned c, unsigned d) {
        if (!file_) return;
        const auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(Clock::now() - opened_).count();
        std::fprintf(file_, "%lld,%s,%d,%u,%u,%u,%u\n", static_cast<long long>(ms), event, status, a, b, c, d);
        std::fflush(file_);
    }
private:
    std::FILE* file_ = nullptr;
    Clock::time_point opened_ = Clock::now();
};

inline bool assetRoot(char* path, size_t capacity) {
    const auto length = readlink("/proc/self/exe", path, capacity - 1);
    if (length <= 0 || static_cast<size_t>(length) == capacity - 1) return false;
    path[length] = '\0';
    char* slash = std::strrchr(path, '/');
    if (!slash) return false;
    slash[1] = '\0';
    return true;
}
}  // namespace phase1
