#include "../phase1/smp-session.h"
#include "../phase1-ndl/directmedia.h"
#include <algorithm>
#include <csignal>

namespace {
using phase1::Clock;
using namespace std::chrono_literals;
constexpr char appId[] = "io.github.tpapaz.multiview.mixed";
volatile std::sig_atomic_t stopping = 0, stepping = 0, releasing = 0;
std::atomic<unsigned> frames{0}, loads{0}, playing{0}, events{0};
std::atomic<int> error{0};
void stop(int) { stopping = 1; }
void step(int) { stepping = 1; }
void release(int) { releasing = 1; }
void callback(int type, long long, const char*) {
    ++events;
    switch (type) {
        case 0x00: ++frames; break;
        case 0x16: ++loads; break;
        case 0x1a: ++playing; break;
        case 0x12: case 0x13: error = type; break;
    }
}
bool closes(const SDL_Event& event) {
    if (event.type == SDL_QUIT) return true;
    if (event.type != SDL_KEYDOWN) return false;
    const int key = event.key.keysym.scancode;
    return key == SDL_SCANCODE_ESCAPE || key == SDL_SCANCODE_AC_BACK ||
        key == SDL_WEBOS_SCANCODE_BACK || key == SDL_WEBOS_SCANCODE_EXIT;
}
SDL_Rect pane(const SDL_DisplayMode& screen, bool right) {
    const int w = std::min(screen.w / 2, screen.h * 640 / 360);
    const int h = w * 360 / 640;
    return {(right ? screen.w / 2 : 0) + (screen.w / 2 - w) / 2, (screen.h - h) / 2, w, h};
}
class Run {
public:
    Run(phase1::Trace& trace, const char* root) : a('A', appId), trace_(trace),
        stream_(std::string(root) + "clip-b.h264", std::ios::binary),
        index_(std::string(root) + "clip-b.frames") {}
    ~Run() { close(); }
    phase1::Session a;
    int stage = 0;
    bool fixtures() const { return stream_.is_open() && index_.is_open(); }
    void record(const char* event, int status) {
        trace_.record(event, status, a.frames(), a.positionMs(), packets_, frames.load());
        trace_.record("ndl_events", stage, loads.load(), playing.load(), error.load(), events.load());
    }
    bool next(SDL_Rect area) {
        int result = 0;
        switch (stage) {
            case 0:
                record("init_begin", 0);
                result = initDirectMediaC1(appId);
                initialized_ = result == 0;
                record("init", result);
                break;
            case 1:
                record("foreground_begin", 0);
                result = foregroundDirectMedia();
                record("foreground", result);
                // C1 solo playback succeeds despite foreground=-1.
                result = 0;
                break;
            case 2:
                record("load_begin", 0);
                loadAttempted_ = true;
                result = loadDirectVideo(640, 360, callback);
                record("load", result);
                break;
            case 3:
                record("area_begin", 0);
                result = NDL_DirectVideoSetArea(area.x, area.y, area.w, area.h);
                record("area", result);
                break;
            case 4:
                record("feed_begin", 0);
                feeding_ = true;
                lastAccepted_ = Clock::now();
                record("feed", 0);
                break;
            default: return true;
        }
        if (result != 0) return false;
        ++stage;
        record("step_end", stage);
        return true;
    }
    void closeB() {
        feeding_ = false;
        if (loadAttempted_) {
            record("unload_begin", 0);
            const int result = NDL_DirectMediaUnload();
            record("unload", result);
            cleanupOk_ &= result == 0;
            loadAttempted_ = false;
        }
        if (initialized_) {
            record("quit_begin", 0);
            const int result = NDL_DirectMediaQuit();
            record("quit", result);
            cleanupOk_ &= result == 0;
            initialized_ = false;
        }
    }
    void close() {
        closeB();
        if (!closed_) { const bool clean = a.close(); cleanupOk_ &= clean; record("a_closed", clean ? 0 : 1); closed_ = true; }
    }
    bool cleanupOk() const { return cleanupOk_; }
    int advance(Clock::time_point now) {
        if (error.load()) return 4;
        if (!feeding_) return 0;
        if (packets_ == 450) {
            if (!feedEnded_) {
                unsigned extra;
                if (index_ >> extra || !index_.eof() || stream_.peek() != std::char_traits<char>::eof()) return 2;
                record("feed_complete", 0);
                feedEnded_ = true;
            }
            return 0;
        }
        if (now - lastAccepted_ > 8s) return 5;
        if (now - lastAccepted_ < std::chrono::microseconds(1000000 / 30)) return 0;
        if (packet_.empty()) {
            unsigned size;
            if (!(index_ >> size) || !size || size > 256 * 1024) return 2;
            packet_.resize(size);
            if (!stream_.read(packet_.data(), size)) return 2;
        }
        const int result = NDL_DirectVideoPlay(packet_.data(), packet_.size(), packets_ * 1000000LL / 30);
        if (result != lastFeedResult_) { record("feed_status", result); lastFeedResult_ = result; }
        if (result == 0) { ++packets_; packet_.clear(); lastAccepted_ = now; }
        return 0;
    }
private:
    phase1::Trace& trace_;
    std::ifstream stream_, index_;
    std::vector<char> packet_;
    unsigned packets_ = 0;
    int lastFeedResult_ = 0;
    bool initialized_ = false, loadAttempted_ = false, feeding_ = false;
    bool feedEnded_ = false, closed_ = false, cleanupOk_ = true;
    Clock::time_point lastAccepted_;
};

int play(Run& run, const char* root, SDL_DisplayMode screen) {
    const auto deadline = Clock::now() + 45s;
    if (!run.fixtures()) return 2;
    if (!run.a.start(root, pane(screen, false))) return 3;
    auto sampleAt = Clock::now();
    unsigned baselineFrames = 0, baselinePts = 0;
    bool baseline = false;
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
            run.record("release_begin", run.stage);
            run.closeB();
            run.stage = 6;
            releasedAt = Clock::now();
            run.record("step_end", run.stage);
        }
        if (stepping) {
            stepping = 0;
            if (baseline && !run.next(pane(screen, true))) return 3;
        }
        const auto now = Clock::now();
        if (run.a.advance(now) == phase1::State::failed) return 4;
        if (const int result = run.advance(now)) return result;
        if (now >= sampleAt) {
            run.record("sample", run.stage);
            if (run.stage == 0) {
                if (baselineFrames && run.a.frames() > baselineFrames && run.a.positionMs() > baselinePts) baseline = true;
                baselineFrames = run.a.frames(); baselinePts = run.a.positionMs();
            }
            sampleAt = now + 500ms;
        }
        if (run.stage == 6 && now - releasedAt >= 3s) return 0;
        SDL_Delay(4);
    }
    return stopping ? 1 : 6;
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
    auto* window = SDL_CreateWindow("MultiView SMP + NDL", SDL_WINDOWPOS_UNDEFINED,
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
            if (stopping || (!stepping && !confirm)) continue;
            stepping = 0; releasing = 0;
            if (!(SDL_GetWindowFlags(window) & SDL_WINDOW_INPUT_FOCUS)) continue;
            frames = loads = playing = events = 0; error = 0;
            SDL_SetRenderDrawColor(renderer, 0, 0, 0, 0); SDL_RenderClear(renderer); SDL_RenderPresent(renderer);
            alarm(50);
            {
                Run run(trace, root);
                run.record("run_start", 0);
                const int result = play(run, root, screen);
                run.close();
                run.record("run_end", run.cleanupOk() ? result : 7);
            }
            alarm(0);
            stepping = 0; releasing = 0;
            if (!stopping) menu();
        }
    }
    SDL_DestroyTexture(guide); SDL_DestroyRenderer(renderer); SDL_DestroyWindow(window); SDL_Quit();
    return guide ? 0 : 1;
}

