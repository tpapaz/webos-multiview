#include <SDL.h>
#include <SDL_webOS.h>
#include <starfish-media-pipeline/StarfishMediaAPIs.h>

#include <algorithm>
#include <atomic>
#include <chrono>
#include <csignal>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fstream>
#include <memory>
#include <string>
#include <vector>
#include <unistd.h>

namespace {
using Clock = std::chrono::steady_clock;
using namespace std::chrono_literals;
constexpr char appId[] = "io.github.tpapaz.multiview.phase1";
constexpr int width = 640, height = 360, fps = 30;
volatile std::sig_atomic_t interrupted = 0;

void onSignal(int) { interrupted = 1; }

bool assetRoot(char* path, size_t capacity) {
    const auto length = readlink("/proc/self/exe", path, capacity - 1);
    if (length <= 0 || static_cast<size_t>(length) == capacity - 1) return false;
    path[length] = '\0';
    char* slash = std::strrchr(path, '/');
    if (!slash) return false;
    slash[1] = '\0';
    return true;
}

bool exitRequested(const SDL_Event& event) {
    if (event.type == SDL_QUIT) return true;
    if (event.type != SDL_KEYDOWN) return false;
    switch (static_cast<int>(event.key.keysym.scancode)) {
        case SDL_SCANCODE_ESCAPE:
        case SDL_SCANCODE_AC_BACK:
        case SDL_WEBOS_SCANCODE_BACK:
        case SDL_WEBOS_SCANCODE_EXIT:
            return true;
        default:
            return false;
    }
}

enum class State { running, done, failed };

class Session {
public:
    explicit Session(char label) : label_(label) {}
    ~Session() {
        if (loadAttempted_) {
            const bool accepted = player_->Unload();
            std::fprintf(stderr, "[%c] unload accepted=%d frames=%u\n", label_, accepted, frames());
        }
        player_.reset();
        if (window_[0]) SDL_webOSDestroyExportedWindow(window_);
    }

    bool start(const char* root, SDL_Rect destination) {
        const char clip = label_ == 'A' ? 'a' : 'b';
        char path[4096];
        if (std::strlen(root) + sizeof("clip-x.frames") > sizeof(path)) return fail("asset path too long");
        std::snprintf(path, sizeof(path), "%sclip-%c.h264", root, clip);
        media_.open(path, std::ios::binary);
        std::snprintf(path, sizeof(path), "%sclip-%c.frames", root, clip);
        index_.open(path);
        if (!media_ || !index_) return fail("fixture open failed");

        const auto* id = SDL_webOSCreateExportedWindow(SDL_WEBOS_EXPORED_WINDOW_TYPE_VIDEO);
        if (!id || !*id) return fail("window allocation failed");
        if (std::strlen(id) >= sizeof(window_) || std::strpbrk(id, "\"\\\r\n\t")) {
            SDL_webOSDestroyExportedWindow(id);
            return fail("invalid window identifier");
        }
        std::strcpy(window_, id);

        // The SDK constructor accepts nullptr and assigns a new pipeline identity.
        player_.reset(new StarfishMediaAPIs(nullptr));
        if (!player_->notifyForeground()) return fail("foreground rejected");
        char load[1200];
        const int size = std::snprintf(load, sizeof(load),
              R"json({"args":[{"mediaTransportType":"BUFFERSTREAM","option":{"appId":"%s","windowId":"%s",)json"
              R"json("queryPosition":false,"externalStreamingInfo":{"contents":{"codec":{"video":"H264"},)json"
              R"json("esInfo":{"pauseAtDecodeTime":false,"ptsToDecode":0,"seperatedPTS":true,"videoFpsValue":30,"videoFpsScale":1},)json"
              R"json("format":"RAW","provider":"Chrome"},"bufferingCtrInfo":{"srcBufferLevelVideo":{"minimum":1024,"maximum":8388608}}},)json"
              R"json("adaptiveStreaming":{"audioOnly":false,"maxWidth":640,"maxHeight":360,"maxFrameRate":30}}}]})json",
              appId, window_);
        if (size < 0 || static_cast<size_t>(size) >= sizeof(load)) return fail("Load payload overflow");
        loadAttempted_ = true;
        if (!player_->Load(load, onEvent, this)) return fail("Load rejected");
        start_ = Clock::now();
        std::fprintf(stderr, "[%c] Load accepted\n", label_);
        return move(destination);
    }

    bool move(SDL_Rect destination) {
        SDL_Rect source{0, 0, width, height};
        if (!SDL_webOSSetExportedWindow(window_, &source, &destination))
            return fail("window geometry rejected");
        std::fprintf(stderr, "[%c] geometry %d,%d %dx%d\n", label_, destination.x,
                     destination.y, destination.w, destination.h);
        return true;
    }

    const char* windowId() const { return window_; }
    unsigned frames() const { return frames_.load(); }

    State advance(Clock::time_point now) {
        if (error_.load()) return stopped("pipeline error");
        if (ended_.load()) return frames() ? State::done : stopped("EOS before a rendered frame");
        if (frames() == 0 && now - start_ > 8s) return stopped("first-frame timeout");

        if (loaded_.exchange(false)) {
            if (!player_->Play()) return stopped("Play rejected after Load completed");
            std::fprintf(stderr, "[%c] Load completed, Play accepted\n", label_);
        }

        const auto pts = std::chrono::nanoseconds(1000000000LL * fed_ / fps);
        if (eosSent_ || now - start_ < pts) return State::running;
        if (packet_.empty()) {
            size_t size;
            if (!(index_ >> size)) {
                if (!index_.eof() || media_.peek() != std::char_traits<char>::eof() || !fed_)
                    return stopped("fixture index mismatch");
                if (!player_->pushEOS()) return stopped("EOS rejected");
                eosSent_ = true;
                return State::running;
            }
            if (!size || size > 256 * 1024) return stopped("fixture packet size invalid");
            packet_.resize(size);
            if (!media_.read(packet_.data(), size)) return stopped("fixture packet truncated");
        }

        char json[160];
        std::snprintf(json, sizeof(json),
                      R"({"bufferAddr":"%p","bufferSize":%zu,"pts":%lld,"esData":1})",
                      static_cast<void*>(packet_.data()), packet_.size(),
                      static_cast<long long>(pts.count()));
        const auto reply = player_->Feed(json);
        if (reply.find("BufferFull") != std::string::npos || reply.find("Pending") != std::string::npos)
            return State::running;
        if (reply.find("Ok") == std::string::npos) return stopped("Feed rejected");
        packet_.clear();
        if (++fed_ == 1) player_->Play();
        return State::running;
    }

private:
    static void onEvent(int type, int64_t, const char*, void* context) {
        auto& session = *static_cast<Session*>(context);
        switch (type) {
            case PF_EVENT_TYPE_STR_STATE_UPDATE__LOADCOMPLETED: session.loaded_ = true; break;
            case PF_EVENT_TYPE_FRAMEREADY: ++session.frames_; break;
            case PF_EVENT_TYPE_STR_STATE_UPDATE__ENDOFSTREAM: session.ended_ = true; break;
            case PF_EVENT_TYPE_INT_ERROR:
            case PF_EVENT_TYPE_STR_ERROR: session.error_ = true; break;
        }
    }

    bool fail(const char* reason) const {
        std::fprintf(stderr, "[%c] %s\n", label_, reason);
        return false;
    }

    State stopped(const char* reason) const {
        fail(reason);
        return State::failed;
    }

    const char label_;
    std::ifstream media_, index_;
    std::vector<char> packet_;
    char window_[256]{};
    std::unique_ptr<StarfishMediaAPIs> player_;
    std::atomic<bool> loaded_{false}, error_{false}, ended_{false};
    std::atomic<unsigned> frames_{0};
    Clock::time_point start_;
    int fed_ = 0;
    bool loadAttempted_ = false, eosSent_ = false;
};

SDL_Rect pane(SDL_DisplayMode screen, bool dual, bool second, bool compact = false) {
    const int available = screen.w / (dual ? 2 : 1);
    const int w = std::min(available, screen.h * width / height) / (compact ? 2 : 1);
    const int h = w * height / width;
    return {(second && dual ? available : 0) + (available - w) / 2,
            compact ? screen.h * 3 / 4 - h / 2 : (screen.h - h) / 2, w, h};
}

enum class Result { completed, stopped, failed, exit };

Result play(const char* root, SDL_DisplayMode screen, SDL_Scancode key) {
    Session a('A'), b('B');
    const bool dual = key == SDL_SCANCODE_RETURN || key == SDL_SCANCODE_KP_ENTER;
    const bool onlyB = key == SDL_SCANCODE_RIGHT;
    if (onlyB ? !b.start(root, pane(screen, false, true)) : !a.start(root, pane(screen, dual, false)))
        return Result::failed;

    const auto deadline = Clock::now() + 30s;
    auto startB = Clock::time_point::max();
    auto reportAt = Clock::now() + 1s;
    bool bStarted = onlyB;
    bool compact = false;
    while (!interrupted && Clock::now() < deadline) {
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (exitRequested(event)) return Result::exit;
            if (event.type == SDL_WINDOWEVENT && (event.window.event == SDL_WINDOWEVENT_HIDDEN ||
                event.window.event == SDL_WINDOWEVENT_MINIMIZED || event.window.event == SDL_WINDOWEVENT_FOCUS_LOST))
                return Result::stopped;
            if (dual && bStarted && event.type == SDL_KEYDOWN && !event.key.repeat &&
                event.key.keysym.scancode == SDL_SCANCODE_UP) {
                compact = !compact;
                if (!b.move(pane(screen, true, true, compact))) return Result::failed;
            }
        }

        const auto now = Clock::now();
        const auto aState = onlyB ? State::done : a.advance(now);
        if (aState == State::failed) return Result::failed;
        if (dual && a.frames() && startB == Clock::time_point::max()) startB = now + 2s;
        if (dual && !bStarted && now >= startB) {
            if (aState != State::running || !b.start(root, pane(screen, true, true)) ||
                std::strcmp(a.windowId(), b.windowId()) == 0)
                return Result::failed;
            bStarted = true;
        }
        const auto bState = bStarted ? b.advance(now) : (dual ? State::running : State::done);
        if (bState == State::failed) return Result::failed;
        if (aState == State::done && bState == State::done) return Result::completed;
        if (now >= reportAt) {
            std::fprintf(stderr, "frames A=%u B=%u\n", a.frames(), b.frames());
            reportAt = now + 1s;
        }
        SDL_Delay(5);
    }
    return interrupted ? Result::exit : Result::failed;
}

void menu(SDL_Renderer* renderer, SDL_Texture* guide, Result result) {
    SDL_SetRenderDrawBlendMode(renderer, SDL_BLENDMODE_NONE);
    SDL_SetRenderDrawColor(renderer, 0, 0, 0, 255);
    SDL_RenderClear(renderer);
    SDL_RenderCopy(renderer, guide, nullptr, nullptr);
    if (result == Result::completed || result == Result::failed) {
        int w = 0, h = 0;
        if (SDL_GetRendererOutputSize(renderer, &w, &h) == 0) {
            SDL_Rect indicator{0, h - 12, w, 12};
            const bool completed = result == Result::completed;
            SDL_SetRenderDrawColor(renderer, completed ? 30 : 223, completed ? 172 : 66, 75, 255);
            SDL_RenderFillRect(renderer, &indicator);
        }
    }
    SDL_RenderPresent(renderer);
}
}  // namespace

int main() {
    char root[4096], guidePath[4096];
    if (!assetRoot(root, sizeof(root)) || std::strlen(root) + sizeof("guide.bmp") > sizeof(guidePath)) return 1;
    std::snprintf(guidePath, sizeof(guidePath), "%sguide.bmp", root);
    std::signal(SIGINT, onSignal);
    std::signal(SIGTERM, onSignal);
    setenv("EGL_PLATFORM", "wayland", 0);
    setenv("XDG_RUNTIME_DIR", "/tmp/xdg", 0);
    SDL_SetHint(SDL_HINT_WEBOS_ACCESS_POLICY_KEYS_BACK, "true");
    SDL_SetHint(SDL_HINT_WEBOS_ACCESS_POLICY_KEYS_EXIT, "true");
    if (SDL_Init(SDL_INIT_VIDEO) != 0) return 1;

    SDL_DisplayMode screen{};
    if (SDL_GetCurrentDisplayMode(0, &screen) != 0) { SDL_Quit(); return 1; }
    auto* window = SDL_CreateWindow("MultiView Phase 1", SDL_WINDOWPOS_UNDEFINED,
                                    SDL_WINDOWPOS_UNDEFINED, screen.w, screen.h, SDL_WINDOW_FULLSCREEN);
    auto* renderer = window ? SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED) : nullptr;
    auto* bitmap = renderer ? SDL_LoadBMP(guidePath) : nullptr;
    auto* guide = bitmap ? SDL_CreateTextureFromSurface(renderer, bitmap) : nullptr;
    SDL_FreeSurface(bitmap);

    if (guide) {
        menu(renderer, guide, Result::stopped);
        while (!interrupted) {
            SDL_Event event;
            if (!SDL_WaitEventTimeout(&event, 100)) continue;
            if (exitRequested(event)) break;
            if (event.type != SDL_KEYDOWN || event.key.repeat) continue;
            const auto key = event.key.keysym.scancode;
            if (key != SDL_SCANCODE_LEFT && key != SDL_SCANCODE_RIGHT &&
                key != SDL_SCANCODE_RETURN && key != SDL_SCANCODE_KP_ENTER) continue;
            SDL_SetRenderDrawColor(renderer, 0, 0, 0, 0);
            SDL_RenderClear(renderer);
            SDL_RenderPresent(renderer);
            // Process-local hard stop if a vendor call stalls the normal cleanup path.
            alarm(35);
            const auto result = play(root, screen, key);
            alarm(0);
            if (result == Result::exit) break;
            menu(renderer, guide, result);
        }
    } else {
        std::fprintf(stderr, "Phase 1 UI initialization failed\n");
    }
    SDL_DestroyTexture(guide);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    return guide ? 0 : 1;
}
