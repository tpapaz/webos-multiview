#include "smp-session.h"

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
using phase1::Clock;
using phase1::Trace;
using phase1::assetRoot;
using namespace std::chrono_literals;
constexpr char appId[] = "io.github.tpapaz.multiview.phase1";
constexpr int width = 640, height = 360, fps = 30;
volatile std::sig_atomic_t interrupted = 0;
volatile std::sig_atomic_t advanceRequested = 0, releaseRequested = 0;

void onSignal(int) { interrupted = 1; }
void onAdvance(int) { advanceRequested = 1; }
void onRelease(int) { releaseRequested = 1; }

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

using phase1::Session;
using phase1::State;

SDL_Rect pane(SDL_DisplayMode screen, bool dual, bool second, bool compact = false) {
    const int available = screen.w / (dual ? 2 : 1);
    const int w = std::min(available, screen.h * width / height) / (compact ? 2 : 1);
    const int h = w * height / width;
    return {(second && dual ? available : 0) + (available - w) / 2,
            compact ? screen.h * 3 / 4 - h / 2 : (screen.h - h) / 2, w, h};
}

enum class Result { completed, stopped, failed, exit };
enum class BStage { idle, emptyWindow, constructed, foreground, loaded, feeding, playing, released };

struct DualEvidence {
    bool attempted = false;
    bool emptyWindowReady = false;
    unsigned aAtEmptyWindow = 0;
    unsigned aWithEmptyWindow = 0;
    unsigned aAtFirstBFrame = 0;
    unsigned aAfterB = 0;
    unsigned bFrames = 0;

    void observePlayback(unsigned a, unsigned b) {
        if (!b) return;
        if (!bFrames) aAtFirstBFrame = a;
        aAfterB = a - aAtFirstBFrame;
        bFrames = b;
    }
};

Result play(const char* root, SDL_DisplayMode screen, SDL_Scancode key, DualEvidence& evidence, Trace& trace) {
    Session a('A', appId), b('B', appId);
    const bool dual = key == SDL_SCANCODE_RETURN || key == SDL_SCANCODE_KP_ENTER;
    evidence = DualEvidence{};
    evidence.attempted = dual;
    const bool onlyB = key == SDL_SCANCODE_RIGHT;
    if (onlyB ? !b.start(root, pane(screen, false, true), true) : !a.start(root, pane(screen, dual, false)))
        return Result::failed;

    const auto deadline = Clock::now() + 50s;
    auto reportAt = Clock::now() + 1s;
    auto bStage = onlyB ? BStage::playing : BStage::idle;
    if (dual) b.useManualPlay();
    const auto record = [&](const char* event) {
        trace.record(event, static_cast<int>(bStage), a.frames(), b.frames(), a.positionMs(), b.positionMs());
    };
    record("run_start");
    bool compact = false;
    while (!interrupted && Clock::now() < deadline) {
        SDL_Event event;
        while (advanceRequested || releaseRequested || SDL_PollEvent(&event)) {
            if (advanceRequested || releaseRequested) {
                event = SDL_Event{};
                event.type = SDL_KEYDOWN;
                event.key.keysym.scancode = releaseRequested ? SDL_SCANCODE_DOWN : SDL_SCANCODE_RIGHT;
                advanceRequested = 0;
                releaseRequested = 0;
            }
            if (exitRequested(event)) return Result::exit;
            if (event.type == SDL_WINDOWEVENT && (event.window.event == SDL_WINDOWEVENT_HIDDEN ||
                event.window.event == SDL_WINDOWEVENT_MINIMIZED || event.window.event == SDL_WINDOWEVENT_FOCUS_LOST))
                return Result::stopped;
            if (!dual || event.type != SDL_KEYDOWN || event.key.repeat) continue;
            const auto action = event.key.keysym.scancode;
            if (action == SDL_SCANCODE_RIGHT) record("step_begin");
            if (action == SDL_SCANCODE_RIGHT && a.frames() && bStage == BStage::idle) {
                if (!b.reserveWindow(a.windowId()) || !b.move(pane(screen, true, true))) return Result::failed;
                evidence.aAtEmptyWindow = a.frames();
                evidence.emptyWindowReady = true;
                bStage = BStage::emptyWindow;
                std::fprintf(stderr, "[B] empty window ready\n");
            } else if (action == SDL_SCANCODE_RIGHT && bStage == BStage::emptyWindow) {
                evidence.aWithEmptyWindow = a.frames() - evidence.aAtEmptyWindow;
                if (!b.createPlayer()) return Result::failed;
                bStage = BStage::constructed;
            } else if (action == SDL_SCANCODE_RIGHT && bStage == BStage::constructed) {
                if (!b.foreground()) return Result::failed;
                bStage = BStage::foreground;
            } else if (action == SDL_SCANCODE_RIGHT && bStage == BStage::foreground) {
                if (!b.load(root, true)) return Result::failed;
                bStage = BStage::loaded;
            } else if (action == SDL_SCANCODE_RIGHT && bStage == BStage::loaded) {
                b.enableFeed();
                bStage = BStage::feeding;
            } else if (action == SDL_SCANCODE_RIGHT && bStage == BStage::feeding) {
                if (!b.requestPlay()) return Result::failed;
                bStage = BStage::playing;
            } else if (action == SDL_SCANCODE_UP && bStage == BStage::playing) {
                compact = !compact;
                if (!b.move(pane(screen, true, true, compact))) return Result::failed;
            } else if (action == SDL_SCANCODE_DOWN && bStage != BStage::idle && bStage != BStage::released) {
                if (bStage == BStage::emptyWindow) evidence.aWithEmptyWindow = a.frames() - evidence.aAtEmptyWindow;
                else evidence.observePlayback(a.frames(), b.frames());
                b.close();
                bStage = BStage::released;
            }
            if (action == SDL_SCANCODE_RIGHT || action == SDL_SCANCODE_DOWN) record("step_end");
        }

        const auto now = Clock::now();
        const auto aState = onlyB ? State::done : a.advance(now);
        if (aState == State::failed) return Result::failed;
        const auto bState = bStage >= BStage::loaded && bStage <= BStage::playing ? b.advance(now) : State::done;
        if (bStage == BStage::emptyWindow) evidence.aWithEmptyWindow = a.frames() - evidence.aAtEmptyWindow;
        if (dual && bStage == BStage::playing) evidence.observePlayback(a.frames(), b.frames());
        if (bState == State::failed) return Result::failed;
        if (aState == State::done && bState == State::done) return Result::completed;
        if (now >= reportAt) {
            record("sample");
            std::fprintf(stderr, "frames A=%u B=%u\n", a.frames(), b.frames());
            reportAt = now + 1s;
        }
        SDL_Delay(5);
    }
    return interrupted ? Result::exit : Result::failed;
}

void drawCount(SDL_Renderer* renderer, SDL_Texture* guide, int x, int y, int w, int h, unsigned count) {
    char digits[16];
    std::snprintf(digits, sizeof(digits), "%u", count);
    for (const char* digit = digits; *digit; ++digit, x += 20) {
        const SDL_Rect glyph{(*digit - '0') * 20, 540, 20, 32};
        const SDL_Rect destination{x * w / 960, y * h / 540, 20 * w / 960, 32 * h / 540};
        SDL_RenderCopy(renderer, guide, &glyph, &destination);
    }
}

void menu(SDL_Renderer* renderer, SDL_Texture* guide, Result result, const DualEvidence& evidence) {
    SDL_SetRenderDrawBlendMode(renderer, SDL_BLENDMODE_NONE);
    SDL_SetRenderDrawColor(renderer, 0, 0, 0, 255);
    SDL_RenderClear(renderer);
    const SDL_Rect instructions{0, 0, 960, 540};
    SDL_RenderCopy(renderer, guide, &instructions, nullptr);
    if (evidence.attempted) {
        int w = 0, h = 0;
        if (SDL_GetRendererOutputSize(renderer, &w, &h) == 0) {
            drawCount(renderer, guide, 267, 442, w, h, evidence.emptyWindowReady);
            drawCount(renderer, guide, 718, 442, w, h, evidence.aWithEmptyWindow);
            drawCount(renderer, guide, 350, 476, w, h, evidence.aAfterB);
            drawCount(renderer, guide, 718, 476, w, h, evidence.bFrames);
        }
    }
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
    std::signal(SIGUSR1, onAdvance);
    std::signal(SIGUSR2, onRelease);
    Trace trace;
    trace.record("ready", 0, 0, 0, 0, 0);
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
        DualEvidence evidence;
        menu(renderer, guide, Result::stopped, evidence);
        while (!interrupted) {
            SDL_Event event;
            const bool received = SDL_WaitEventTimeout(&event, 100) != 0;
            if (advanceRequested) {
                advanceRequested = 0;
                event = SDL_Event{};
                event.type = SDL_KEYDOWN;
                event.key.keysym.scancode = SDL_SCANCODE_RETURN;
            } else if (!received) continue;
            releaseRequested = 0;
            if (exitRequested(event)) break;
            if (event.type != SDL_KEYDOWN || event.key.repeat) continue;
            const auto key = event.key.keysym.scancode;
            if (key != SDL_SCANCODE_LEFT && key != SDL_SCANCODE_RIGHT &&
                key != SDL_SCANCODE_RETURN && key != SDL_SCANCODE_KP_ENTER) continue;
            SDL_SetRenderDrawColor(renderer, 0, 0, 0, 0);
            SDL_RenderClear(renderer);
            SDL_RenderPresent(renderer);
            // Process-local hard stop if a vendor call stalls the normal cleanup path.
            alarm(55);
            const auto result = play(root, screen, key, evidence, trace);
            trace.record("run_end", static_cast<int>(result), 0, 0, 0, 0);
            alarm(0);
            if (result == Result::exit) break;
            menu(renderer, guide, result, evidence);
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
