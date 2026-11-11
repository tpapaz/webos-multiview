#include "../phase1/smp-session.h"
#include <algorithm>
#include <csignal>

namespace {
using namespace std::chrono_literals;
using phase1::Clock;
using phase1::Session;
using phase1::State;
using phase1::VideoSink;
constexpr char appId[] = "io.github.tpapaz.multiview.sinks";
volatile std::sig_atomic_t stopping = 0, stepping = 0, releasing = 0;
void stop(int) { stopping = 1; }
void step(int) { stepping = 1; }
void release(int) { releasing = 1; }
bool closes(const SDL_Event& event) {
    if (event.type == SDL_QUIT) return true;
    if (event.type != SDL_KEYDOWN) return false;
    const int key = event.key.keysym.scancode;
    return key == SDL_SCANCODE_ESCAPE || key == SDL_SCANCODE_AC_BACK ||
        key == SDL_WEBOS_SCANCODE_BACK || key == SDL_WEBOS_SCANCODE_EXIT;
}
SDL_Rect pane(SDL_DisplayMode screen, bool right, bool compact = false) {
    const int w = std::min(screen.w / 2, screen.h * 640 / 360) / (compact ? 2 : 1);
    const int h = w * 360 / 640;
    return {(right ? screen.w / 2 : 0) + (screen.w / 2 - w) / 2,
        compact ? screen.h * 3 / 4 - h / 2 : (screen.h - h) / 2, w, h};
}
class Run {
public:
    explicit Run(phase1::Trace& trace) : a('A', appId), b('B', appId), trace_(trace) {}
    ~Run() { close(); }
    Session a, b;
    int stage = 0;
    bool clean = true;
    void record(const char* event, int status) {
        trace_.record(event, status, a.frames(), b.frames(), a.positionMs(), b.positionMs());
        trace_.record("packets", stage, a.packets(), b.packets(), 0, 0);
    }
    bool next(const char* root, SDL_DisplayMode screen) {
        record("step_begin", stage + 1);
        bool ok = true;
        switch (stage) {
            case 0: ok = b.reserveWindow(a.windowId()) && b.move(pane(screen, true)); break;
            case 1: ok = b.createPlayer(); break;
            case 2: ok = b.foreground(); break;
            case 3: ok = b.load(root, false, VideoSink::sub); break;
            case 4: b.enableFeed(); break;
            case 5: ok = b.requestPlay(); break;
            case 6: ok = b.move(pane(screen, true, true)); break;
            default: return true;
        }
        if (!ok) { record("step_error", stage + 1); return false; }
        record("step_end", ++stage);
        return true;
    }
    void closeB() {
        if (bClosed_) return;
        record("b_unload_begin", stage);
        const bool accepted = b.close(); clean &= accepted;
        record("b_unload", accepted ? 0 : 1);
        bClosed_ = true;
    }
    void close() {
        closeB();
        if (closed_) return;
        const bool accepted = a.close(); clean &= accepted;
        record("a_unload", accepted ? 0 : 1);
        closed_ = true;
    }
private:
    phase1::Trace& trace_;
    bool bClosed_ = false, closed_ = false;
};
int play(Run& run, const char* root, SDL_DisplayMode screen, bool solo) {
    const auto started = Clock::now();
    const auto deadline = started + 45s;
    run.record(solo ? "solo_start" : "run_start", 0);
    if (solo) {
        if (!run.b.start(root, pane(screen, true), false, VideoSink::sub)) return 2;
        run.stage = 6;
    } else {
        if (!run.a.start(root, pane(screen, false), false, VideoSink::main)) return 2;
        run.b.useManualPlay();
    }
    auto sampleAt = Clock::now();
    auto releasedAt = Clock::time_point::max();
    while (!stopping && Clock::now() < deadline) {
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (closes(event)) stopping = 1;
            if (event.type == SDL_WINDOWEVENT && (event.window.event == SDL_WINDOWEVENT_FOCUS_LOST ||
                event.window.event == SDL_WINDOWEVENT_HIDDEN || event.window.event == SDL_WINDOWEVENT_MINIMIZED)) return 1;
            if (event.type == SDL_KEYDOWN && !event.key.repeat) {
                if (event.key.keysym.scancode == SDL_SCANCODE_RIGHT) stepping = 1;
                if (event.key.keysym.scancode == SDL_SCANCODE_DOWN) releasing = 1;
            }
        }
        if (stopping) break;
        if (releasing) {
            releasing = 0; stepping = 0;
            if (run.stage != 8) {
                run.closeB(); run.stage = 8; releasedAt = Clock::now();
                run.record("step_end", 8);
            }
        }
        if (stepping) {
            stepping = 0;
            if (!solo && run.stage != 8 && run.a.frames() && !run.next(root, screen)) return 2;
        }
        const auto now = Clock::now();
        if (!solo && run.a.advance(now) == State::failed) return 3;
        if (run.stage >= 4 && run.stage <= 7 && run.b.advance(now) == State::failed) return 3;
        if (now >= sampleAt) { run.record("sample", run.stage); sampleAt = now + 500ms; }
        if (run.stage == 8 && now - releasedAt >= 3s) return 0;
        if (solo && now - started >= 8s && run.b.frames()) return 0;
        SDL_Delay(4);
    }
    return stopping ? 1 : 4;
}
}
int main() {
    char root[4096];
    if (!phase1::assetRoot(root, sizeof(root))) return 1;
    std::signal(SIGINT, stop); std::signal(SIGTERM, stop);
    std::signal(SIGUSR1, step); std::signal(SIGUSR2, release);
    setenv("EGL_PLATFORM", "wayland", 0); setenv("XDG_RUNTIME_DIR", "/tmp/xdg", 0);
    SDL_SetHint(SDL_HINT_WEBOS_ACCESS_POLICY_KEYS_BACK, "true");
    SDL_SetHint(SDL_HINT_WEBOS_ACCESS_POLICY_KEYS_EXIT, "true");
    if (SDL_Init(SDL_INIT_VIDEO) != 0) return 1;
    SDL_DisplayMode screen{};
    if (SDL_GetCurrentDisplayMode(0, &screen) != 0) { SDL_Quit(); return 1; }
    auto* window = SDL_CreateWindow("MultiView Main + Sub Test", SDL_WINDOWPOS_UNDEFINED,
        SDL_WINDOWPOS_UNDEFINED, screen.w, screen.h, SDL_WINDOW_FULLSCREEN);
    auto* renderer = window ? SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED) : nullptr;
    auto* bitmap = renderer ? SDL_LoadBMP((std::string(root) + "guide.bmp").c_str()) : nullptr;
    auto* guide = bitmap ? SDL_CreateTextureFromSurface(renderer, bitmap) : nullptr;
    SDL_FreeSurface(bitmap);
    if (guide) {
        phase1::Trace trace;
        const SDL_Rect source{0, 0, 960, 540};
        const auto menu = [&] { SDL_RenderCopy(renderer, guide, &source, nullptr); SDL_RenderPresent(renderer); };
        menu(); trace.record("ready", 0, 0, 0, 0, 0);
        while (!stopping) {
            SDL_Event event{};
            const bool received = SDL_WaitEventTimeout(&event, 100) != 0;
            if (received && closes(event)) break;
            const bool confirm = received && event.type == SDL_KEYDOWN && !event.key.repeat &&
                (event.key.keysym.scancode == SDL_SCANCODE_RETURN || event.key.keysym.scancode == SDL_SCANCODE_KP_ENTER);
            const bool left = received && event.type == SDL_KEYDOWN && !event.key.repeat && event.key.keysym.scancode == SDL_SCANCODE_LEFT;
            if (stopping || (!stepping && !releasing && !confirm && !left)) continue;
            const bool solo = releasing || left;
            stepping = 0; releasing = 0;
            if (!(SDL_GetWindowFlags(window) & SDL_WINDOW_INPUT_FOCUS)) continue;
            SDL_SetRenderDrawColor(renderer, 0, 0, 0, 0); SDL_RenderClear(renderer); SDL_RenderPresent(renderer);
            alarm(50);
            {
                Run run(trace);
                const int result = play(run, root, screen, solo);
                run.close(); run.record("run_end", run.clean ? result : 5);
            }
            alarm(0);
            stepping = 0; releasing = 0;
            if (!stopping) menu();
        }
    }
    SDL_DestroyTexture(guide); SDL_DestroyRenderer(renderer); SDL_DestroyWindow(window); SDL_Quit();
    return guide ? 0 : 1;
}
