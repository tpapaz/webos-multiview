#pragma once
#include <fcntl.h>
#include <time.h>
#include <unistd.h>
#include <string>

namespace hdmi {
inline long long boottimeMs() {
    struct timespec time{};
    if (clock_gettime(CLOCK_BOOTTIME, &time) != 0) return -1;
    const long long seconds = time.tv_sec;
    if (seconds < 0 || seconds > 9007199254740LL ||
        time.tv_nsec < 0 || time.tv_nsec >= 1000000000L) return -1;
    return seconds * 1000 + time.tv_nsec / 1000000;
}
inline std::string currentBootId() {
    const int fd = open("/proc/sys/kernel/random/boot_id", O_RDONLY | O_NOFOLLOW | O_CLOEXEC);
    if (fd < 0) return {};
    char bytes[38]{};
    const auto count = read(fd, bytes, sizeof(bytes));
    const bool closed = close(fd) == 0;
    if (!closed || count != 37 || bytes[36] != '\n') return {};
    return std::string(bytes, 36); // Never printed or added to a report.
}
} // namespace hdmi
