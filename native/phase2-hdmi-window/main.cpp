#include "session.h"
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
    const char message[] = "hdmi_window_hard_deadline_cleanup_unknown\n";
    const auto ignored = write(STDERR_FILENO, message, sizeof(message) - 1);
    (void)ignored;
    _exit(124);
}
struct Error {
    LSError value;
    Error() { LSErrorInit(&value); }
    ~Error() { LSErrorFree(&value); }
};
class Native final : public hdmi::Platform {
public:
    bool begin() override {
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
    std::string windowId() const override { return exported_; }
    bool cancelled() override {
        SDL_Event event{};
        // Bound event work as well as bus work, even under an event flood.
        for (int i = 0; i < 32 && SDL_PollEvent(&event); ++i) {
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
        return stopping || !connected_ || Clock::now() - started_ >= std::chrono::seconds(17);
    }
    hdmi::Reply exchange(hdmi::Step step, const std::string& payload) override {
        if (!handle_ || !connected_ || pending_ != LSMESSAGE_TOKEN_INVALID || payload.empty())
            return {hdmi::Delivery::NotSent, {}};
        ready_ = false;
        reply_.clear();
        Error error;
        const auto deadline = Clock::now() + std::chrono::seconds(2);
        if ((step == hdmi::Step::Open || step == hdmi::Step::Select) &&
            deadline > started_ + std::chrono::seconds(17)) return {hdmi::Delivery::NotSent, {}};
        if (!LSCallOneReply(handle_, hdmi::uri(step), payload.c_str(), replied, this, &pending_, &error.value)) {
            // A failed submission is conservatively uncertain; never retry open.
            cancelPending();
            return {hdmi::Delivery::Uncertain, {}};
        }
        while (connected_ && Clock::now() < deadline) {
            pump();
            // Cancellation stops progression, but drains this reply for bounded
            // cleanup. In particular a late open ID must still be closed.
            cancelled();
            if (ready_) return {hdmi::Delivery::Reply, std::move(reply_)};
            SDL_Delay(4);
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
        SDL_DestroyRenderer(renderer_); renderer_ = nullptr;
        SDL_DestroyWindow(window_); window_ = nullptr;
        SDL_Quit();
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
    bool ready_ = false, connected_ = true;
};
} // namespace

int main(int argc, char** argv) {
    // Default launch exits before SDL, registration or any acquisition request.
    const bool optIn = hdmi::optedIn(argc, argv);
    std::signal(SIGINT, stop); std::signal(SIGTERM, stop); std::signal(SIGALRM, hardStop);
    if (optIn) alarm(22);
    Native native;
    const auto result = hdmi::run(native, optIn);
    std::printf("{\"schemaVersion\":1,\"appId\":\"%s\",\"status\":\"%s\","
        "\"port\":4,\"opened\":%s,\"selected\":%s,\"stopAcknowledged\":%s,\"closeAcknowledged\":%s,"
        "\"acquisitionUncertain\":%s,\"localCleanup\":%s,"
        "\"livePicture\":\"unknown\",\"restoration\":\"unknown\",\"dualHdmi\":\"unknown\"}\n",
        hdmi::appId, hdmi::statusName(result.status), result.opened ? "true" : "false",
        result.selected ? "true" : "false", result.stopped ? "true" : "false", result.closed ? "true" : "false",
        result.acquisitionUncertain ? "true" : "false", result.localCleanup ? "true" : "false");
    std::fflush(stdout);
    alarm(0);
    return !optIn ? 64 : result.status == hdmi::Status::Completed ? 0 : 1;
}
