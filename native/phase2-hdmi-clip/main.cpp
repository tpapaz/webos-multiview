#include "observation.h"
#include "../phase1/smp-session.h"
#include "../phase2-hdmi-candidate-0.1.12/contract.h"
#include "../phase2-hdmi-dispatch/adapter.h"
#include "../phase2-hdmi-dispatch/capture.h"
#include "../phase2-hdmi-dispatch/termination.h"

namespace {

volatile sig_atomic_t stopping = 0;
void stop(int) { stopping = 1; }
void abortAtDeadline(int) { _exit(124); }

class LocalClip final : public mixed::Clip {
public:
    bool open(const char* windowId) override {
        char root[4096];
        if (!phase1::assetRoot(root, sizeof(root)) || !session_.useExportedWindow(windowId) ||
            !session_.createPlayer() || !session_.foreground() ||
            !session_.load(root, false, phase1::VideoSink::sub)) return false;
        session_.enableFeed();
        return true;
    }
    bool feed() override { return session_.advance(phase1::Clock::now()) == phase1::State::running; }
    unsigned frames() const override { return session_.frames(); }
    unsigned positionMs() const override { return session_.positionMs(); }
    bool close() override { return session_.close(); }

private:
    phase1::Session session_{'B', hdmi::appId};
};

void pause() { SDL_Delay(4); }

class MixedPlatform final : public hdmi::Platform {
public:
    MixedPlatform(const hdmi::Launch& launch, bool active)
        : hdmi_(launch, stopping), active_(active), cleanupDeadline_(launch.startByBoottimeMs + 19000) {}

    bool begin() override {
        if (!hdmi_.begin() || !worker_.spawn() ||
            !mixed::ready(worker_, hdmi::boottimeMs, [&] { return cancelled(); }, pause)) return false;
        workerReady = true;
        auto* window = SDL_GetKeyboardFocus();
        auto* renderer = window ? SDL_GetRenderer(window) : nullptr;
        if (!renderer) return false;
        const char* secondary = SDL_webOSCreateExportedWindow(SDL_WEBOS_EXPORED_WINDOW_TYPE_VIDEO);
        if (!secondary || !*secondary || hdmi_.windowId() == secondary) return false;
        secondary_ = secondary;
        SDL_Rect from{0, 0, phase1::width, phase1::height};
        SDL_Rect primary{480, 270, 960, 540};
        SDL_Rect clip{1456, 432, 432, 243};
        if (!SDL_webOSSetExportedWindow(secondary_.c_str(), &from, &clip) ||
            SDL_SetRenderDrawColor(renderer, 0, 0, 0, 255) != 0 || SDL_RenderClear(renderer) != 0 ||
            SDL_SetRenderDrawColor(renderer, 0, 0, 0, 0) != 0 ||
            SDL_RenderFillRect(renderer, &primary) != 0 || SDL_RenderFillRect(renderer, &clip) != 0)
            return false;
        SDL_RenderPresent(renderer);
        return !cancelled();
    }
    std::string windowId() const override { return hdmi_.windowId(); }
    bool cancelled() override { return hdmi_.cancelled(); }
    hdmi::Reply exchange(hdmi::Step step, const std::string& payload) override {
        return hdmi_.exchange(step, payload);
    }
    bool observe() override {
        const bool ok = mixed::observe(worker_, secondary_.c_str(), observation,
            cleanupDeadline_ - 5000, hdmi::boottimeMs, [&] { return cancelled(); }, pause);
        if (!ok) worker_.terminate();
        return ok;
    }
    bool end() override {
        if (!observation.closeCompleted) worker_.terminate();
        workerSettled_ = mixed::reapAfterHdmi(worker_, cleanupDeadline_, hdmi::boottimeMs, pause);
        if (!workerSettled_) return false;
        workerReaped = worker_.reap() != mixed::Reap::Absent;
        if (!secondary_.empty()) SDL_webOSDestroyExportedWindow(secondary_.c_str());
        const bool local = hdmi_.end();
        return local && (!active_ || (observation.closeCompleted && worker_.reap() == mixed::Reap::Clean));
    }
    bool ownerPending() const { return !workerSettled_ || hdmi_.ownerPending(); }

    mixed::Observation observation;
    bool workerReady = false, workerReaped = false;

private:
    hdmi::PhysicalAdapter hdmi_;
    mixed::Worker worker_;
    bool workerSettled_ = false;
    const bool active_;
    const long long cleanupDeadline_;
    std::string secondary_;
};

candidate::Launch parse(int argc, char** argv) {
    if (argc != 2 || strnlen(argv[1], 4097) > 4096) return {};
    using Json = std::unique_ptr<json_object, decltype(&json_object_put)>;
    auto* tok = json_tokener_new();
    if (!tok) return {};
    json_tokener_set_flags(tok, JSON_TOKENER_STRICT);
    Json object(json_tokener_parse_ex(tok, argv[1], static_cast<int>(strlen(argv[1]) + 1)), json_object_put);
    const bool valid = json_tokener_get_error(tok) == json_tokener_success;
    json_tokener_free(tok);
    if (!valid || !object || json_object_get_type(object.get()) != json_type_object) return {};
    json_object* action = nullptr;
    if (json_object_object_get_ex(object.get(), "acquireHdmi4", &action)) return {};
    if (json_object_object_get_ex(object.get(), "acquireHdmi4WithClip", &action)) {
        if (!action || json_object_get_type(action) != json_type_boolean || !json_object_get_boolean(action)) return {};
        json_object_object_del(object.get(), "acquireHdmi4WithClip");
        json_object_object_add(object.get(), "acquireHdmi4", json_object_new_boolean(true));
    }
    const char* normalized[]{argv[0], json_object_to_json_string_ext(object.get(), JSON_C_TO_STRING_PLAIN)};
    return candidate::parse(2, normalized);
}

const char* yes(bool value) { return value ? "true" : "false"; }

std::string report(const candidate::Launch& launch, const hdmi::Result& result,
                   const MixedPlatform& platform, int intent) {
    const auto& clip = platform.observation;
    return std::string("{\"schemaVersion\":1,\"appVersion\":\"0.1.13\",\"mode\":\"") +
        (launch.action == candidate::Action::Lifecycle ? "lifecycle" : "hdmi4_clip") +
        "\",\"launchBindingSha256\":\"" + candidate::binding(launch) +
        "\",\"status\":\"" + hdmi::statusName(result.status) +
        "\",\"opened\":" + yes(result.opened) + ",\"selected\":" + yes(result.selected) +
        ",\"stopAcknowledged\":" + yes(result.stopAcknowledged) +
        ",\"closeAcknowledged\":" + yes(result.closeAcknowledged) +
        ",\"acquisitionUncertain\":" + yes(result.acquisitionUncertain) +
        ",\"localCleanup\":" + yes(result.localCleanup) +
        ",\"clipFrame\":" + yes(clip.firstFrame) + ",\"clipAdvanced\":" + yes(clip.advanced) +
        ",\"clipCloseCompleted\":" + yes(clip.closeCompleted) +
        ",\"workerReady\":" + yes(platform.workerReady) +
        ",\"workerReaped\":" + yes(platform.workerReaped) +
        ",\"continuityWindow\":" + yes(clip.continuityWindow) +
        ",\"exitIntent\":" + std::to_string(intent) +
        ",\"picture\":\"unknown\",\"hardwareRelease\":\"unknown\",\"restoration\":\"unknown\"}\n";
}

} // namespace

int main(int argc, char** argv) {
    if (argc == 2 && std::strcmp(argv[1], mixed::workerArgument) == 0) {
        if (!mixed::parentChannel()) return 64;
        LocalClip clip;
        const int code = mixed::serveClip(clip);
        // Failure may leave a vendor destructor blocked. The supervisor owns
        // termination and reports uncertain release for this path.
        if (code != 0) _exit(code);
        return 0;
    }
    const auto launch = parse(argc, argv);
    if (launch.action == candidate::Action::None) return 64;
    std::signal(SIGINT, stop);
    std::signal(SIGTERM, stop);
    std::signal(SIGCHLD, SIG_DFL);
    std::signal(SIGALRM, abortAtDeadline);
    alarm(22);
    if (!hdmi::launchAllowed(launch.authority, hdmi::currentBootId(),
                             hdmi::boottimeMs(), hdmi::realtimeMs())) return 64;
    const bool active = launch.action == candidate::Action::Picture;
    const int summary = hdmi::reserveReviewReport(active ? "clip-0.1.13.json" : "lifecycle-0.1.13.json");
    if (summary < 0) return 73;
    const int witness = hdmi::reserveReviewReport(active ? "termination-clip-0.1.13.json" : "termination-lifecycle-0.1.13.json");
    if (witness < 0) return 73;
    const auto header = std::string("[1,\"0.1.13\",") + (active ? "1" : "0") +
        ",\"" + candidate::binding(launch) + "\"]\n";
    if (!hdmi::finishReviewReport(witness, header) || !candidate::witnessNamespaceBound() ||
        !hdmi::witness::start(witness, summary, launch.authority.startByBoottimeMs - 3000)) return 74;
    close(witness);

    MixedPlatform platform(launch.authority, active);
    hdmi::Result result;
    if (active) result = hdmi::run(platform, true);
    else {
        result.status = platform.begin() ? hdmi::Status::Completed : hdmi::Status::SetupFailed;
        result.localCleanup = platform.end();
        if (!result.localCleanup) result.status = hdmi::Status::CleanupFailed;
    }
    const int intent = candidate::intent(result, platform.ownerPending());
    const bool saved = hdmi::finishReviewReport(summary, report(launch, result, platform, intent));
    const bool closed = close(summary) == 0;
    if (intent == 75) _exit(75);
    return saved && closed ? intent : 74;
}
