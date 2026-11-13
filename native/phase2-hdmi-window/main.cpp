#include "session.h"
#include "capture.h"
#include "launch-clock.h"
#include <SDL.h>
#include <SDL_webOS.h>
#include <glib.h>
#include <luna-service2/lunaservice.h>
#include <chrono>
#include <csignal>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <utility>
#include <unistd.h>

// Exact retail C1 ABI already used by the admission control. No proxy identity.
extern "C" bool LSRegisterPubPriv(const char*, LSHandle**, bool, LSError*);
namespace {
using Clock = std::chrono::steady_clock;
volatile sig_atomic_t stopping = 0;
void stop(int) { stopping = 1; }
void hardStop(int) {
    // Do not write to potentially blocked vendor/launcher output at the cap.
    // An absent/partial committed report already leaves cleanup unknown.
    _exit(124);
}
struct Error {
    LSError value;
    Error() { LSErrorInit(&value); }
    ~Error() { LSErrorFree(&value); }
};
class Native final : public hdmi::Platform, public hdmi::PolicyPlatform {
public:
    explicit Native(const hdmi::Launch& launch) : launch_(launch), graphics_(launch.mode == hdmi::Mode::Picture) {}
    bool begin() override {
        // A slow report reservation must not allow a stale start to touch SDL/LS2.
        if (graphics_) {
            const auto boot = hdmi::currentBootId();
            if (!hdmi::launchAllowed(launch_, boot, hdmi::boottimeMs())) return false;
        }
        if (graphics_ && !beginGraphics()) return false;
        context_ = g_main_context_new();
        Error registration;
        if (!context_ || !LSRegisterPubPriv(hdmi::appId, &handle_, true, &registration.value)) return false;
        const char* name = LSHandleGetName(handle_);
        if (!name || std::strcmp(name, hdmi::appId)) return false;
        Error attachment;
        if (!LSGmainContextAttach(handle_, context_, &attachment.value)) return false;
        Error disconnect;
        return LSSetDisconnectHandler(handle_, disconnected, this, &disconnect.value);
    }
    bool beginGraphics() {
        graphicsStarted_ = true;
        setenv("EGL_PLATFORM", "wayland", 0);
        setenv("XDG_RUNTIME_DIR", "/tmp/xdg", 0);
        SDL_SetHint(SDL_HINT_WEBOS_ACCESS_POLICY_KEYS_BACK, "true");
        SDL_SetHint(SDL_HINT_WEBOS_ACCESS_POLICY_KEYS_EXIT, "true");
        if (SDL_Init(SDL_INIT_VIDEO) != 0) return false;
        window_ = SDL_CreateWindow("MultiView HDMI Window Candidate", SDL_WINDOWPOS_UNDEFINED,
            SDL_WINDOWPOS_UNDEFINED, 1920, 1080, SDL_WINDOW_FULLSCREEN);
        renderer_ = window_ ? SDL_CreateRenderer(window_, -1, SDL_RENDERER_ACCELERATED) : nullptr;
        if (!renderer_) return false;
        int width = 0, height = 0;
        SDL_GetWindowSize(window_, &width, &height);
        if (width != 1920 || height != 1080) return false; // App coordinates, never panel/signal pixels.
        if (SDL_SetRenderDrawBlendMode(renderer_, SDL_BLENDMODE_NONE) != 0 ||
            SDL_SetRenderDrawColor(renderer_, 0, 0, 0, 255) != 0 || SDL_RenderClear(renderer_) != 0 ||
            SDL_SetRenderDrawColor(renderer_, 0, 0, 0, 0) != 0 ||
            SDL_RenderFillRect(renderer_, &destination_) != 0) return false;
        SDL_RenderPresent(renderer_);
        // Same exported type (2) as InputCommon::registerWindowId at 0xcc72.
        const char* id = SDL_webOSCreateExportedWindow(SDL_WEBOS_EXPORED_WINDOW_TYPE_TRANSPARENT);
        if (!id || !*id) return false;
        if (strnlen(id, 257) > 256) { SDL_webOSDestroyExportedWindow(id); return false; }
        exported_ = id;
        SDL_Rect source{0, 0, 1920, 1080};
        if (!SDL_webOSSetExportedWindow(exported_.c_str(), &source, &destination_)) return false;
        const auto focusDeadline = Clock::now() + std::chrono::seconds(1);
        while (!(SDL_GetWindowFlags(window_) & SDL_WINDOW_INPUT_FOCUS) && Clock::now() < focusDeadline) {
            if (cancelled()) return false;
            SDL_Delay(4);
        }
        if (!(SDL_GetWindowFlags(window_) & SDL_WINDOW_INPUT_FOCUS)) return false;
        return true;
    }
    std::string windowId() const override { return exported_; }
    bool cancelled() override {
        SDL_Event event{};
        // Bound event work as well as bus work, even under an event flood.
        for (int i = 0; graphics_ && i < 32 && SDL_PollEvent(&event); ++i) {
            if (event.type == SDL_QUIT) stopping = 1;
            if (event.type == SDL_KEYDOWN) {
                const int key = event.key.keysym.scancode;
                if (key == SDL_SCANCODE_ESCAPE || key == SDL_SCANCODE_AC_BACK ||
                    key == SDL_WEBOS_SCANCODE_BACK || key == SDL_WEBOS_SCANCODE_EXIT) stopping = 1;
            }
            if (event.type == SDL_WINDOWEVENT && (event.window.event == SDL_WINDOWEVENT_FOCUS_LOST ||
                event.window.event == SDL_WINDOWEVENT_HIDDEN || event.window.event == SDL_WINDOWEVENT_MINIMIZED ||
                event.window.event == SDL_WINDOWEVENT_CLOSE)) stopping = 1;
        }
        return stopping || !connected_ || (graphics_ ?
            !hdmi::dispatchAllowed(launch_, hdmi::boottimeMs(), false) :
            Clock::now() - started_ >= std::chrono::seconds(10));
    }
    hdmi::Reply exchange(hdmi::Step step, const std::string& payload) override {
        if (!graphics_) return {hdmi::Delivery::NotSent, {}};
        if (step == hdmi::Step::Open || step == hdmi::Step::Select) {
            const auto now = hdmi::boottimeMs();
            if (now < 0 || cancelled() || !hdmi::dispatchAllowed(launch_, now + 2000, false))
                return {hdmi::Delivery::NotSent, {}};
        }
        return call(hdmi::uri(step), payload, step == hdmi::Step::Stop || step == hdmi::Step::Close);
    }
    hdmi::Reply policy(hdmi::Step step) override {
        if (graphics_ || cancelled()) return {hdmi::Delivery::NotSent, {}};
        return call("luna://com.webos.service.bus/isCallAllowed", hdmi::policyRequest(step), false);
    }
    hdmi::Reply call(const char* uri, const std::string& payload, bool cleanup) {
        if (!handle_ || !connected_ || pending_ != LSMESSAGE_TOKEN_INVALID || payload.empty())
            return {hdmi::Delivery::NotSent, {}};
        ready_ = false;
        reply_.clear();
        Error error;
        const auto deadline = Clock::now() + std::chrono::seconds(2);
        // Recheck the operation-specific bound at dispatch, not just at exchange
        // entry: resuming an old open/select must not borrow the cleanup budget.
        if (graphics_) {
            const auto now = hdmi::boottimeMs();
            if (now < 0 || !hdmi::dispatchAllowed(launch_, now + (cleanup ? 0 : 2000), cleanup))
                return {hdmi::Delivery::NotSent, {}};
        }
        if (!LSCallOneReply(handle_, uri, payload.c_str(), replied, this, &pending_, &error.value)) {
            // A failed submission is conservatively uncertain; never retry open.
            cancelPending();
            return {hdmi::Delivery::Uncertain, {}};
        }
        while (connected_ && Clock::now() < deadline &&
            (!graphics_ || hdmi::dispatchAllowed(launch_, hdmi::boottimeMs(), true))) {
            pump();
            // Cancellation stops progression, but drains this reply for bounded
            // cleanup. In particular a late open ID must still be closed.
            cancelled();
            if (ready_) return {hdmi::Delivery::Reply, std::move(reply_)};
            g_usleep(4000);
        }
        cancelPending();
        return {hdmi::Delivery::Uncertain, {}};
    }
    bool observe() override {
        const auto deadline = Clock::now() + std::chrono::seconds(8);
        while (!cancelled() && Clock::now() < deadline) { pump(); SDL_Delay(4); }
        return !cancelled(); // Elapsed time establishes no HDMI motion/visibility.
    }
    bool end() override {
        bool clean = cancelPending();
        if (handle_) {
            Error error;
            clean = LSUnregister(handle_, &error.value) && clean;
            handle_ = nullptr;
        }
        if (context_) { g_main_context_unref(context_); context_ = nullptr; }
        if (!exported_.empty()) {
            SDL_webOSDestroyExportedWindow(exported_.c_str());
            exported_.clear(); // Void local release; no hardware restoration claim.
        }
        if (graphicsStarted_) {
            SDL_DestroyRenderer(renderer_); renderer_ = nullptr;
            SDL_DestroyWindow(window_); window_ = nullptr;
            SDL_Quit();
            graphicsStarted_ = false;
        }
        return clean;
    }
private:
    void pump() {
        for (int i = 0; context_ && i < 8 && g_main_context_pending(context_); ++i)
            g_main_context_iteration(context_, false);
    }
    bool cancelPending() {
        if (pending_ == LSMESSAGE_TOKEN_INVALID) return true;
        Error error;
        const bool clean = LSCallCancel(handle_, pending_, &error.value);
        if (clean) pending_ = LSMESSAGE_TOKEN_INVALID;
        else connected_ = false; // Never overlap another request after an uncertain cancel.
        return clean;
    }
    static bool replied(LSHandle*, LSMessage* message, void* data) {
        auto& self = *static_cast<Native*>(data);
        self.pending_ = LSMESSAGE_TOKEN_INVALID;
        const char* text = LSMessageGetPayload(message);
        const auto size = text ? strnlen(text, 4097) : 0;
        if (text && size <= 4096) self.reply_.assign(text, size);
        self.ready_ = true;
        return true;
    }
    static void disconnected(LSHandle*, void* data) { static_cast<Native*>(data)->connected_ = false; }
    Clock::time_point started_ = Clock::now();
    SDL_Window* window_ = nullptr;
    SDL_Renderer* renderer_ = nullptr;
    SDL_Rect destination_{480, 270, 960, 540};
    std::string exported_, reply_;
    GMainContext* context_ = nullptr;
    LSHandle* handle_ = nullptr;
    LSMessageToken pending_ = LSMESSAGE_TOKEN_INVALID;
    const hdmi::Launch& launch_;
    bool ready_ = false, connected_ = true, graphics_, graphicsStarted_ = false;
};
} // namespace

int main(int argc, char** argv) {
    // No file, graphics or IPC work on default/invalid launch.
    const auto launch = hdmi::parseLaunch(argc, argv);
    const auto mode = launch.mode;
    if (mode == hdmi::Mode::Inert) return 64;
    const bool picture = mode == hdmi::Mode::Picture;
    const auto started = Clock::now();
    std::signal(SIGINT, stop); std::signal(SIGTERM, stop); std::signal(SIGALRM, hardStop);
    alarm(picture ? 22 : 12);
    // Arm the cap BEFORE reading the boot clock. A start admitted within three
    // seconds of issuance therefore cannot extend this cap beyond issue +25 s.
    // Invalid/stale/other-boot opt-ins leave no report and do no graphics/IPC.
    if (picture) {
        const auto boot = hdmi::currentBootId();
        if (!hdmi::launchAllowed(launch, boot, hdmi::boottimeMs())) return 64;
    }
    hdmi::Capture capture(mode);
    if (!capture.ready()) return 73; // Stale report or unavailable capture: zero SDL/LS2 calls.
    Native native(launch);
    std::string output;
    int status;
    if (picture) {
        const auto result = hdmi::run(native, true);
        const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(Clock::now() - started).count();
        output = hdmi::report(result, elapsed);
        status = result.status == hdmi::Status::Completed ? 0 : 1;
    } else {
        const auto result = hdmi::checkPolicy(native);
        const auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(Clock::now() - started).count();
        output = hdmi::report(result, mode, elapsed);
        status = result.status == hdmi::PolicyStatus::Checked ? 0 : 1;
    }
    if (!capture.finish(output)) return 74;
    std::puts(output.c_str());
    std::fflush(stdout);
    alarm(0);
    return status;
}
