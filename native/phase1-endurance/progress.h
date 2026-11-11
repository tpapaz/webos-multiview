#pragma once
#include <cstdint>
namespace endurance {
// Progress must include increasing callback count AND increasing monotonic PTS.
class ProgressWatch {
public:
    explicit ProgressWatch(int64_t startedMs) : started_(startedMs), lastProgress_(startedMs) {}
    bool observe(int64_t nowMs, unsigned frames, unsigned ptsMs) {
        if (frames < frames_ || ptsMs < pts_) return false;
        if (frames > frames_ && ptsMs > pts_) lastProgress_ = nowMs;
        frames_ = frames; pts_ = ptsMs;
        return frames ? nowMs - lastProgress_ <= 5000 : nowMs - started_ <= 8000;
    }
private:
    int64_t started_, lastProgress_;
    unsigned frames_ = 0, pts_ = 0;
};
}  // namespace endurance
