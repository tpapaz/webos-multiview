#include "../phase1/smp-session.h"
#include "progress.h"
#include "native-veto.h"
#include <algorithm>
#include <csignal>

namespace {
using phase1::Clock;
using phase1::Session;
using phase1::State;
using phase1::VideoSink;
using namespace std::chrono_literals;
constexpr char appId[] = "io.github.tpapaz.multiview.endurance";
volatile std::sig_atomic_t stopping = 0, requested = 0;
void stop(int signal) { stopping = signal; }
void cycle(int) { requested = 8; }
void vetoProbe(int) { requested = 60; }
// Closed numeric vocabulary: never log arbitrary event/vendor strings.
int exitEvent(const SDL_Event& event) {
    if (event.type == SDL_QUIT) return 4;
    if (event.type == SDL_WINDOWEVENT) {
        switch (event.window.event) {
            case SDL_WINDOWEVENT_CLOSE: return 5;
            case SDL_WINDOWEVENT_FOCUS_LOST: return 6;
            case SDL_WINDOWEVENT_HIDDEN: return 7;
            case SDL_WINDOWEVENT_MINIMIZED: return 8;
            default: return 0;
        }
    }
    if (event.type != SDL_KEYDOWN) return 0;
    const int key = event.key.keysym.scancode;
    if (key == SDL_SCANCODE_AC_BACK || key == SDL_WEBOS_SCANCODE_BACK) return 1;
    if (key == SDL_WEBOS_SCANCODE_EXIT) return 2;
    return key == SDL_SCANCODE_ESCAPE ? 3 : 0;
}
SDL_Rect pane(SDL_DisplayMode screen, bool right) {
    const int w = std::min(screen.w / 2, screen.h * 640 / 360), h = w * 360 / 640;
    return {(right ? screen.w / 2 : 0) + (screen.w / 2 - w) / 2, (screen.h - h) / 2, w, h};
}
class Run {
public:
    explicit Run(phase1::Trace& trace) : a('A',appId), b('B',appId), trace_(trace) {}
    ~Run() { close(); }
    Session a,b;
    int phase = 0;
    bool clean = true;
    void record(const char* event,int status) {
        trace_.record(event,status,a.frames(),b.frames(),a.positionMs(),b.positionMs());
        trace_.record("packets",phase,a.packets(),b.packets(),0,0);
        trace_.record("loops",phase,a.loops(),b.loops(),0,0);
    }
    void closeB() {
        if (bClosed_) return;
        record("b_unload_begin",phase);
        const bool ok=b.close(); clean &= ok;
        record("b_unload",ok?0:1); bClosed_=true;
    }
    void close() {
        closeB();
        if (closed_) return;
        const bool ok=a.close(); clean &= ok;
        record("a_unload",ok?0:1); closed_=true;
    }
private:
    phase1::Trace& trace_;
    bool bClosed_=false,closed_=false;
};
int pollExit(Run& run) {
    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        const int cause=exitEvent(event);
        if (!cause) continue;
        run.record("exit_event",cause);
        if (cause<=5) stopping=1;
        return 1;
    }
    if (stopping) { run.record("exit_event",stopping==SIGINT?10:9); return 1; }
    return 0;
}
int prepareVeto(Run& run,endurance::NativeVeto& veto,bool waitRequest) {
    const auto deadline=Clock::now()+(waitRequest?60s:3s);
    run.record("veto_wait_start",waitRequest?60:3);
    while (Clock::now()<deadline) {
        if (pollExit(run)) return 1;
        if (!veto.pump()) return 6;
        if (veto.ready() && (!waitRequest || veto.replies())) {
            run.record("veto_wait_end",0); return 0;
        }
        SDL_Delay(4);
    }
    run.record("veto_wait_end",waitRequest?7:6);
    return waitRequest?7:6; // No real request is inconclusive, never a veto pass.
}
int play(Run& run,endurance::NativeVeto& veto,const char* root,SDL_DisplayMode screen) {
    constexpr int seconds=8;
    const auto started=Clock::now(), deadline=started+25s;
    const auto elapsed=[&] { return std::chrono::duration_cast<std::chrono::milliseconds>(Clock::now()-started).count(); };
    endurance::ProgressWatch aWatch(0),bWatch(0);
    run.a.loopFixture(); run.b.loopFixture();
    run.record("run_start",seconds);
    if (!run.a.start(root,pane(screen,false),false,VideoSink::main)) return 2;
    auto sampleAt=Clock::now();
    auto overlapAt=Clock::time_point::max(),releasedAt=Clock::time_point::max();
    while (!stopping && Clock::now()<deadline) {
        if (pollExit(run)) return 1;
        if (!veto.pump()) return 6;
        if (stopping) break;
        auto now=Clock::now();
        if (run.a.advance(now)!=State::running || !aWatch.observe(elapsed(),run.a.frames(),run.a.positionMs())) {
            run.record("progress_error",1); return 3;
        }
        if (run.phase==0 && run.a.frames()>=3 && run.a.positionMs()>=400) {
            run.record("b_start",0);
            if (!run.b.reserveWindow(run.a.windowId()) || !run.b.move(pane(screen,true)) ||
                !run.b.createPlayer() || !run.b.foreground() || !run.b.load(root,false,VideoSink::sub)) return 2;
            run.b.enableFeed(); run.phase=1; bWatch=endurance::ProgressWatch(elapsed());
        }
        now=Clock::now();
        if (run.phase==1 || run.phase==2) {
            if (run.b.advance(now)!=State::running || !bWatch.observe(elapsed(),run.b.frames(),run.b.positionMs())) {
                run.record("progress_error",2); return 3;
            }
            if (run.phase==1 && run.b.frames()>=3 && run.b.positionMs()>=400) {
                run.phase=2; overlapAt=now; run.record("overlap_start",seconds);
            }
        }
        if (run.phase==2 && now-overlapAt>=std::chrono::seconds(seconds)) {
            run.closeB(); run.phase=3; releasedAt=Clock::now(); run.record("released",3);
        }
        if (now>=sampleAt) { run.record("sample",run.phase); sampleAt=now+1s; }
        if (run.phase==3 && now-releasedAt>=3s) return 0;
        SDL_Delay(4);
    }
    run.record("exit_event",stopping?(stopping==SIGINT?10:9):11);
    return stopping?1:4;
}
}
int main() {
    char root[4096]; if (!phase1::assetRoot(root,sizeof(root))) return 1;
    std::signal(SIGINT,stop); std::signal(SIGTERM,stop);
    std::signal(SIGUSR1,cycle); std::signal(SIGHUP,vetoProbe);
    setenv("EGL_PLATFORM","wayland",0); setenv("XDG_RUNTIME_DIR","/tmp/xdg",0);
    SDL_SetHint(SDL_HINT_WEBOS_ACCESS_POLICY_KEYS_BACK,"true"); SDL_SetHint(SDL_HINT_WEBOS_ACCESS_POLICY_KEYS_EXIT,"true");
    // Keep SDL's menu behavior; the traced native registration owns the veto.
    SDL_SetHintWithPriority(SDL_HINT_VIDEO_ALLOW_SCREENSAVER,"1",SDL_HINT_OVERRIDE);
    if (SDL_Init(SDL_INIT_VIDEO)!=0) return 1;
    SDL_DisplayMode screen{};
    if (SDL_GetCurrentDisplayMode(0,&screen)!=0) { SDL_Quit(); return 1; }
    auto* window=SDL_CreateWindow("MultiView Native Veto Probe",SDL_WINDOWPOS_UNDEFINED,
        SDL_WINDOWPOS_UNDEFINED,screen.w,screen.h,SDL_WINDOW_FULLSCREEN);
    auto* renderer=window?SDL_CreateRenderer(window,-1,SDL_RENDERER_ACCELERATED):nullptr;
    auto* bitmap=renderer?SDL_LoadBMP((std::string(root)+"guide.bmp").c_str()):nullptr;
    auto* guide=bitmap?SDL_CreateTextureFromSurface(renderer,bitmap):nullptr;
    SDL_FreeSurface(bitmap);
    if (guide) {
        phase1::Trace trace;
        const SDL_Rect source{0,0,960,540};
        const auto menu=[&] { SDL_RenderCopy(renderer,guide,&source,nullptr); SDL_RenderPresent(renderer); };
        menu(); trace.record("ready",0,0,0,0,0);
        trace.record("screensaver_policy",0,SDL_IsScreenSaverEnabled()?1:0,0,0,0);
        while (!stopping) {
            SDL_Event event{}; const bool received=SDL_WaitEventTimeout(&event,100)!=0;
            const int cause=received?exitEvent(event):0;
            if (cause && cause<=5) { trace.record("exit_event",cause,0,0,0,0); break; }
            if (received && event.type==SDL_KEYDOWN && !event.key.repeat) {
                if (event.key.keysym.scancode==SDL_SCANCODE_LEFT) requested=8;
                if (event.key.keysym.scancode==SDL_SCANCODE_RETURN) requested=60;
            }
            if (!requested || stopping) continue;
            if (!(SDL_GetWindowFlags(window)&SDL_WINDOW_INPUT_FOCUS)) continue;
            const bool waitRequest=requested==60; requested=0;
            alarm(90);
            { Run run(trace);
              run.record("probe_start",waitRequest?60:0);
              endurance::NativeVeto veto(appId,[&](const char* event,int status) { run.record(event,status); });
              int result=veto.begin()?prepareVeto(run,veto,waitRequest):6;
              if (!result) {
                  SDL_SetRenderDrawColor(renderer,0,0,0,0); SDL_RenderClear(renderer); SDL_RenderPresent(renderer);
                  result=play(run,veto,root,screen);
              }
              run.close(); run.clean &= veto.close();
              run.record("run_end",run.clean?result:5); }
            alarm(0); requested=0;
            if (!stopping) menu();
        }
        if (stopping==SIGTERM || stopping==SIGINT)
            trace.record("app_exit",stopping==SIGINT?10:9,0,0,0,0);
    }
    SDL_DestroyTexture(guide); SDL_DestroyRenderer(renderer); SDL_DestroyWindow(window); SDL_Quit();
    return guide?0:1;
}
