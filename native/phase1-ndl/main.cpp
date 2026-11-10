#include "../phase1/diagnostic.h"
#include "directmedia.h"

#include <SDL.h>
#include <SDL_webOS.h>

#include <atomic>
#include <csignal>
#include <fstream>
#include <string>
#include <vector>

namespace {
using phase1::Clock;
using phase1::Trace;
using namespace std::chrono_literals;
constexpr char appId[] = "io.github.tpapaz.multiview.ndl";
constexpr int fps = 30;
constexpr unsigned packetLimit = 256 * 1024;
constexpr unsigned fixtureFrames = 450;
volatile std::sig_atomic_t stopRequested = 0;
volatile std::sig_atomic_t startRequested = 0;
std::atomic<unsigned> frames{0}, loads{0}, playing{0};
std::atomic<int> pipelineError{0};

void stop(int) { stopRequested = 1; }
void start(int) { startRequested = 1; }

void onMediaEvent(int event, long long, const char*) {
    // NDL v2 forwards Starfish PF_EVENT_T IDs. Ignore diagnostic strings.
    switch (event) {
        case 0x00: ++frames; break;  // FRAMEREADY
        case 0x12:                  // INT_ERROR
        case 0x13: pipelineError = event; break;  // STR_ERROR
        case 0x16: ++loads; break;   // LOADCOMPLETED
        case 0x1a: ++playing; break; // PLAYING
    }
}

class Run {
public:
    explicit Run(Trace& trace) : trace_(trace) {}
    ~Run() {
        if (loaded_) record("unload", NDL_DirectMediaUnload());
        if (initialized_) record("quit", NDL_DirectMediaQuit());
    }

    bool open(int width, int height) {
        int result = initDirectMediaC1(appId);
        record("init", result);
        if (result != 0) return false;
        initialized_ = true;
        result = foregroundDirectMedia();
        record("foreground", result);
        // The app already has focus. Record the NDL result and still test Load.
        if (stopRequested) return false;
        result = loadDirectVideo(640, 360, onMediaEvent);
        record("load", result);
        if (result != 0) return false;
        loaded_ = true;
        result = NDL_DirectVideoSetArea(0, 0, width, height);
        record("area", result);
        return result == 0;
    }

    int feed(std::vector<char>& buffer, unsigned size) {
        const auto pts = static_cast<long long>(packets_) * 1000000 / fps;
        const int status = NDL_DirectVideoPlay(buffer.data(), size, pts);
        if (status == 0) ++packets_;
        return status;
    }

    unsigned packets() const { return packets_; }
    void record(const char* event, int status) {
        trace_.record(event, status, packets_, frames.load(), loads.load(), playing.load());
    }

private:
    Trace& trace_;
    unsigned packets_ = 0;
    bool initialized_ = false;
    bool loaded_ = false;
};

bool closesApp(const SDL_Event& event) {
    if (event.type == SDL_QUIT) return true;
    if (event.type != SDL_KEYDOWN) return false;
    const int key = event.key.keysym.scancode;
    return key == SDL_SCANCODE_ESCAPE || key == SDL_SCANCODE_AC_BACK ||
           key == SDL_WEBOS_SCANCODE_BACK || key == SDL_WEBOS_SCANCODE_EXIT;
}

bool cancelled() {
    SDL_Event event;
    bool lostFocus = false;
    while (SDL_PollEvent(&event)) {
        if (closesApp(event)) stopRequested = 1;
        if (event.type == SDL_WINDOWEVENT &&
            (event.window.event == SDL_WINDOWEVENT_FOCUS_LOST ||
             event.window.event == SDL_WINDOWEVENT_MINIMIZED ||
             event.window.event == SDL_WINDOWEVENT_HIDDEN)) lostFocus = true;
    }
    return stopRequested || lostFocus;
}

int play(const std::string& root, const SDL_DisplayMode& screen, Run& run) {
    const auto deadline = Clock::now() + 25s;
    std::ifstream stream(root + "clip-b.h264", std::ios::binary);
    std::ifstream index(root + "clip-b.frames");
    if (!stream || !index) return 2;
    std::vector<char> buffer(packetLimit);
    if (cancelled()) return 1;
    if (!run.open(screen.w, screen.h)) return 3;
    const auto started = Clock::now();
    auto lastAccepted = started;
    auto sampleAt = started;
    int status = 0;
    unsigned size = 0;
    while (Clock::now() < deadline) {
        if (cancelled()) return 1;
        if (const int error = pipelineError.load()) {
            run.record("pipeline_error", error);
            return 4;
        }
        const auto now = Clock::now();
        if (now >= sampleAt) {
            run.record("sample", status);
            sampleAt = now + 500ms;
        }
        if (now - lastAccepted > 8s) return 5;
        if (run.packets() == fixtureFrames) {
            if (now - lastAccepted > 2s) return 0;
        } else if (now >= started + std::chrono::microseconds(run.packets() * 1000000LL / fps) &&
                   now >= lastAccepted + std::chrono::microseconds(1000000 / fps)) {
            if (size == 0 && (!(index >> size) || size == 0 || size > packetLimit ||
                              !stream.read(buffer.data(), size))) return 2;
            status = run.feed(buffer, size);
            if (status == 0) {
                lastAccepted = now;
                size = 0;
            }
        }
        SDL_Delay(4);
    }
    return 6;
}
}  // namespace

int main() {
    char root[4096];
    if (!phase1::assetRoot(root, sizeof(root))) return 1;
    std::signal(SIGINT, stop);
    std::signal(SIGTERM, stop);
    std::signal(SIGUSR1, start);
    setenv("EGL_PLATFORM", "wayland", 0);
    setenv("XDG_RUNTIME_DIR", "/tmp/xdg", 0);
    SDL_SetHint(SDL_HINT_WEBOS_ACCESS_POLICY_KEYS_BACK, "true");
    SDL_SetHint(SDL_HINT_WEBOS_ACCESS_POLICY_KEYS_EXIT, "true");
    if (SDL_Init(SDL_INIT_VIDEO) != 0) return 1;
    SDL_DisplayMode screen{};
    if (SDL_GetCurrentDisplayMode(0, &screen) != 0) { SDL_Quit(); return 1; }
    auto* window = SDL_CreateWindow("MultiView NDL Clip Test", SDL_WINDOWPOS_UNDEFINED,
        SDL_WINDOWPOS_UNDEFINED, screen.w, screen.h, SDL_WINDOW_FULLSCREEN);
    auto* renderer = window ? SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED) : nullptr;
    auto* bitmap = renderer ? SDL_LoadBMP((std::string(root) + "guide.bmp").c_str()) : nullptr;
    auto* guide = bitmap ? SDL_CreateTextureFromSurface(renderer, bitmap) : nullptr;
    SDL_FreeSurface(bitmap);
    if (guide) {
        Trace trace;
        trace.record("ready", 0, 0, 0, 0, 0);
        const SDL_Rect source{0, 0, 960, 540};
        const auto menu = [&] {
            SDL_RenderCopy(renderer, guide, &source, nullptr);
            SDL_RenderPresent(renderer);
        };
        menu();
        while (!stopRequested) {
            SDL_Event event{};
            const bool received = SDL_WaitEventTimeout(&event, 100) != 0;
            if (received && closesApp(event)) break;
            const bool confirm = received && event.type == SDL_KEYDOWN && !event.key.repeat &&
                (event.key.keysym.scancode == SDL_SCANCODE_RETURN ||
                 event.key.keysym.scancode == SDL_SCANCODE_KP_ENTER);
            if (stopRequested || (!startRequested && !confirm)) continue;
            startRequested = 0;
            if (!(SDL_GetWindowFlags(window) & SDL_WINDOW_INPUT_FOCUS)) continue;
            frames = 0;
            loads = 0;
            playing = 0;
            pipelineError = 0;
            SDL_SetRenderDrawColor(renderer, 0, 0, 0, 0);
            SDL_RenderClear(renderer);
            SDL_RenderPresent(renderer);
            trace.record("run_start", 0, 0, 0, 0, 0);
            alarm(30);
            int result;
            {
                Run run(trace);
                result = play(root, screen, run);
                run.record("feed_end", result);
            }
            alarm(0);
            trace.record("run_end", result, 0, frames.load(), loads.load(), playing.load());
            startRequested = 0;
            if (!stopRequested) menu();
        }
    }
    SDL_DestroyTexture(guide);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return guide ? 0 : 1;
}
