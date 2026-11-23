#pragma once

#include "worker.h"
#include "../phase2-hdmi-picture/launch-clock.h"
#include <algorithm>

namespace mixed {

struct Observation {
    bool firstFrame = false;
    bool advanced = false;
    bool closeCompleted = false;
    bool continuityWindow = false;
};

template<class Clock, class Cancel, class Sleep>
bool ready(Worker& worker, Clock now, Cancel cancelled, Sleep sleep) {
    const auto started = now();
    if (started < 0) return false;
    while (!cancelled()) {
        const auto current = now();
        if (current < started || current >= started + 500) return false;
        const auto event = worker.event();
        if (event == Event::Ready) return true;
        if (event != Event::None || worker.reap() != Reap::Pending) return false;
        sleep();
    }
    return false;
}

template<class Clock, class Cancel, class Sleep>
bool observe(Worker& worker, const char* windowId, Observation& result,
             long long workerCutoff, Clock now, Cancel cancelled, Sleep sleep) {
    const auto started = now();
    if (started < 0) return false;
    const auto limit = started + 8000;
    const auto wait = [&](long long deadline, auto done) {
        while (!cancelled()) {
            const auto current = now();
            if (current < started || current >= limit) return false;
            // Consume any final message before checking exit in this sample.
            switch (worker.event()) {
            case Event::Frame: result.firstFrame = true; break;
            case Event::Advanced: result.advanced = true; break;
            case Event::Closed: result.closeCompleted = true; break;
            case Event::Ready:
            case Event::Failed: return false;
            case Event::None: break;
            }
            const auto exited = worker.reap();
            if (exited == Reap::Failed || exited == Reap::Unobserved ||
                (exited == Reap::Clean && !result.closeCompleted)) return false;
            if (done(current, exited)) return true;
            if (current >= deadline) return false;
            sleep();
        }
        return false;
    };
    const auto elapsed = [](long long deadline) {
        return [deadline](long long current, Reap) { return current >= deadline; };
    };
    // Give HDMI its own initial viewing interval before the clip is admitted.
    if (!wait(started + 1000, elapsed(started + 1000)) ||
        !worker.start(windowId, std::min(workerCutoff, hdmi::boottimeMs() + 7000))) return false;
    if (!wait(started + 3250, [&](long long, Reap) { return result.firstFrame; })) return false;
    const auto overlapEnd = now() + 2000;
    if (!wait(overlapEnd, [&](long long current, Reap) {
            return current >= overlapEnd && result.advanced;
        }) || !worker.stop()) return false;
    if (!wait(now() + 350, [&](long long, Reap state) {
            return result.closeCompleted && state == Reap::Clean;
        })) return false;
    const auto continuityEnd = now() + 2000;
    result.continuityWindow = wait(continuityEnd, elapsed(continuityEnd));
    return result.continuityWindow;
}

template<class Clock, class Sleep>
bool reapAfterHdmi(Worker& worker, long long absoluteDeadline, Clock now, Sleep sleep) {
    const auto started = now();
    const auto deadline = std::min(absoluteDeadline, started + 200);
    while (worker.reap() == Reap::Pending) {
        const auto current = now();
        if (current < started || current < 0 || current >= deadline) return false;
        sleep();
    }
    return worker.reap() != Reap::Unobserved;
}

} // namespace mixed
