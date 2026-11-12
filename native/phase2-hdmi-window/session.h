#pragma once
#include <string>

namespace hdmi {
constexpr char appId[] = "io.github.tpapaz.multiview.hdmiwindow";
enum class Step { Open, Select, Stop, Close };
enum class Delivery { Reply, NotSent, Uncertain };
struct Reply { Delivery delivery; std::string text; };
enum class Status { OptInRequired, SetupFailed, OpenFailed, SelectFailed, Cancelled, Completed, CleanupFailed };
struct Result {
    Status status = Status::OptInRequired;
    bool opened = false, selected = false, stopped = false, closed = false;
    bool acquisitionUncertain = false, localCleanup = true;
};

// Only these four fixed operations exist; no caller-supplied URI or port.
const char* uri(Step step);
std::string request(Step step, const std::string& ownedId);
bool optedIn(int argc, const char* const* argv);
const char* statusName(Status status);

class Platform {
public:
    virtual ~Platform() = default;
    virtual bool begin() = 0;
    virtual std::string windowId() const = 0;
    virtual bool cancelled() = 0;
    // Drain an in-flight open even after cancellation, to recover its ID for close.
    // Every exchange has a two-second deadline and cancels its pending token.
    virtual Reply exchange(Step step, const std::string& payload) = 0;
    virtual bool observe() = 0; // At most eight seconds; false means cancellation.
    virtual bool end() = 0;
};
Result run(Platform& platform, bool optIn);
} // namespace hdmi
