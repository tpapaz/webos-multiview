#pragma once
#include <string>

namespace hdmi {
constexpr char appId[] = "io.github.tpapaz.multiview.hdmiwindow";
constexpr char appVersion[] = "0.1.3";
enum class Mode { Inert, Picture, Baseline, Overlay, Removed, PictureReady, AfterPicture };
enum class Step { Open, Select, Stop, Close };
enum class Delivery { Reply, NotSent, Uncertain };
struct Reply { Delivery delivery; std::string text; };
enum class Status { OptInRequired, SetupFailed, OpenFailed, SelectFailed, Cancelled, Completed, CleanupFailed };
struct Result {
    Status status = Status::OptInRequired;
    bool opened = false, selected = false;
    bool stopAcknowledged = false, closeAcknowledged = false;
    // Once open may have reached UTP, no reply or local cleanup proves release.
    bool acquisitionUncertain = false, localCleanup = true;
};

// Only these four fixed operations exist; no caller-supplied URI or port.
const char* uri(Step step);
std::string request(Step step, const std::string& ownedId);
struct Launch {
    Mode mode = Mode::Inert;
    std::string bootId;
    long long startByBoottimeMs = 0;
};
Launch parseLaunch(int argc, const char* const* argv);
// Same-boot, at most three seconds remaining; no wall-clock/host-clock authority.
bool launchAllowed(const Launch& launch, const std::string& bootId, long long boottimeMs);
bool dispatchAllowed(const Launch& launch, long long boottimeMs, bool cleanup);
const char* modeName(Mode mode);
const char* reportFilename(Mode mode);
const char* statusName(Status status);
std::string report(const Result& result, long long elapsedMs);

enum class PolicyStatus { Checked, SetupFailed, Cancelled, QueryFailed, CleanupFailed };
struct PolicyResult {
    PolicyStatus status = PolicyStatus::SetupFailed;
    bool callerReady = false, localCleanup = true;
    unsigned calls = 0;
    int allowed[4] = {-1, -1, -1, -1};
};
class PolicyPlatform {
public:
    virtual ~PolicyPlatform() = default;
    virtual bool begin() = 0; // Own registered name, no SDL/window or target service call.
    virtual bool cancelled() = 0;
    virtual Reply policy(Step step) = 0; // Only bus/isCallAllowed for the fixed UTP URI.
    virtual bool end() = 0;
};
std::string policyRequest(Step step);
PolicyResult checkPolicy(PolicyPlatform& platform);
std::string report(const PolicyResult& result, Mode mode, long long elapsedMs);

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
