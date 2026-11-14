#pragma once
#include "../phase2-hdmi-window/session.h"

namespace entry {
constexpr char version[] = "0.1.5";
inline const char* parserOutcome(const hdmi::Launch& launch) {
    return launch.mode == hdmi::Mode::Picture ? "picture_accepted" :
        launch.mode == hdmi::Mode::Inert ? "inert_or_invalid" : "non_picture_mode";
}
inline const char* clockWindow(long long now, long long deadline) {
    if (now < 0) return "unavailable";
    if (deadline <= now) return "expired";
    return deadline - now <= 3000 ? "within" : "future";
}
struct Guard {
    const char* bootRead;
    const char* bootMatch;
    const char* boottime;
    const char* realtime;
    bool allowed;
};
inline Guard evaluate(const hdmi::Launch& launch, const std::string& boot, long long uptime, long long real) {
    return {boot.empty() ? "unavailable" : "available",
        boot.empty() ? "unknown" : launch.bootId == boot ? "match" : "mismatch",
        clockWindow(uptime, launch.startByBoottimeMs), clockWindow(real, launch.startByRealtimeMs),
        hdmi::launchAllowed(launch, boot, uptime, real)};
}
} // namespace entry
