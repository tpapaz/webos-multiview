#include "setup.h"
#include "../phase2-hdmi-picture/session.h"
#include "../phase2-hdmi-picture/launch-clock.h"
#include <SDL.h>
#include <SDL_webOS.h>
#include <glib.h>
#include <luna-service2/lunaservice.h>
#include <chrono>
#include <csignal>
#include <cstring>
#include <cstdlib>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
#include <cerrno>
extern "C" bool LSRegisterPubPriv(const char*, LSHandle**, bool, LSError*);
namespace {
volatile sig_atomic_t stopping=0;
void stop(int) { stopping=1; }
void hardStop(int) { _exit(124); }
struct Error { LSError e; Error(){LSErrorInit(&e);} ~Error(){LSErrorFree(&e);} };
class Native final:public setup::Backend {
    const hdmi::Launch& launch_;
    SDL_Window* window_=nullptr; SDL_Renderer* renderer_=nullptr;
    GMainContext* context_=nullptr; LSHandle* handle_=nullptr;
    std::string exported_; const char* rawExport_=nullptr; bool graphics_=false, connected_=true;
    setup::Data d_;
    static void disconnected(LSHandle*,void* p){static_cast<Native*>(p)->connected_=false;}
    bool validId() const {
        if(exported_.empty() || exported_.size()>256) return false;
        for(unsigned char c:exported_) if(c<0x21 || c>0x7e) return false;
        return true;
    }
    bool cancelled() {
        SDL_Event e{};
        for(int i=0;i<32 && SDL_PollEvent(&e);++i) {
            int cause=0;
            if(e.type==SDL_QUIT) cause=1;
            if(e.type==SDL_KEYDOWN) {
                const int k=e.key.keysym.scancode;
                if(k==SDL_SCANCODE_ESCAPE || k==SDL_SCANCODE_AC_BACK || k==SDL_WEBOS_SCANCODE_BACK || k==SDL_WEBOS_SCANCODE_EXIT) cause=2;
            }
            if(e.type==SDL_WINDOWEVENT) {
                if(e.window.event==SDL_WINDOWEVENT_FOCUS_LOST) cause=3;
                if(e.window.event==SDL_WINDOWEVENT_HIDDEN) cause=4;
                if(e.window.event==SDL_WINDOWEVENT_MINIMIZED) cause=5;
                if(e.window.event==SDL_WINDOWEVENT_CLOSE) cause=6;
            }
            if(cause){stopping=1;if(!d_.cancel)d_.cancel=cause;}
        }
        if(stopping && !d_.cancel) d_.cancel=7;
        if(!connected_ && !d_.cancel) d_.cancel=8;
        if(!hdmi::dispatchAllowed(launch_,hdmi::boottimeMs(),false) && !d_.cancel) d_.cancel=9;
        return stopping || !connected_ || d_.cancel;
    }
public:
    explicit Native(const hdmi::Launch& launch):launch_(launch){}
    setup::Data data()const override{return d_;}
    bool needed(setup::Stage s)const override {
        switch(s){case setup::Unregister:return handle_;case setup::Unref:return context_;
        case setup::ExportDestroy:return (rawExport_ && *rawExport_) || !exported_.empty();case setup::RendererDestroy:return renderer_;
        case setup::WindowDestroy:return window_;case setup::Quit:return graphics_;default:return false;}
    }
    bool call(setup::Stage s)override {
        Error error;
        SDL_Rect destination{480,270,960,540}, source{0,0,1920,1080};
        switch(s) {
        case setup::Lease:return hdmi::launchAllowed(launch_,hdmi::currentBootId(),hdmi::boottimeMs(),hdmi::realtimeMs());
        case setup::Egl:return setenv("EGL_PLATFORM","wayland",0)==0;
        case setup::Runtime:return setenv("XDG_RUNTIME_DIR","/tmp/xdg",0)==0;
        // Original ignores hint return values; observation failures must not add rejection.
        case setup::BackHint:return SDL_SetHint(SDL_HINT_WEBOS_ACCESS_POLICY_KEYS_BACK,"true");
        case setup::ExitHint:return SDL_SetHint(SDL_HINT_WEBOS_ACCESS_POLICY_KEYS_EXIT,"true");
        case setup::Init:graphics_=true;return SDL_Init(SDL_INIT_VIDEO)==0;
        case setup::DisplayMode:{SDL_DisplayMode m{};const bool ok=SDL_GetCurrentDisplayMode(0,&m)==0;if(ok){d_.displayW=m.w;d_.displayH=m.h;}return ok;}
        case setup::Window:window_=SDL_CreateWindow("MultiView HDMI Window Candidate",SDL_WINDOWPOS_UNDEFINED,SDL_WINDOWPOS_UNDEFINED,1920,1080,SDL_WINDOW_FULLSCREEN);return window_;
        case setup::Renderer:renderer_=SDL_CreateRenderer(window_,-1,SDL_RENDERER_ACCELERATED);return renderer_;
        case setup::WindowSize:SDL_GetWindowSize(window_,&d_.windowW,&d_.windowH);return true;
        case setup::Blend:return SDL_SetRenderDrawBlendMode(renderer_,SDL_BLENDMODE_NONE)==0;
        case setup::Black:return SDL_SetRenderDrawColor(renderer_,0,0,0,255)==0;
        case setup::Clear:return SDL_RenderClear(renderer_)==0;
        case setup::Transparent:return SDL_SetRenderDrawColor(renderer_,0,0,0,0)==0;
        case setup::Fill:return SDL_RenderFillRect(renderer_,&destination)==0;
        case setup::Present:SDL_RenderPresent(renderer_);return true;
        case setup::ExportCreate:rawExport_=SDL_webOSCreateExportedWindow(SDL_WEBOS_EXPORED_WINDOW_TYPE_TRANSPARENT);return rawExport_ && *rawExport_;
        case setup::ExportIdGuard:if(strnlen(rawExport_,257)>256)return false;exported_=rawExport_;return true;
        case setup::ExportBind:return SDL_webOSSetExportedWindow(exported_.c_str(),&source,&destination);
        case setup::Focus:{
            d_.focusBefore=(SDL_GetWindowFlags(window_)&SDL_WINDOW_INPUT_FOCUS)?1:0;
            const auto end=std::chrono::steady_clock::now()+std::chrono::seconds(1);
            while(!(SDL_GetWindowFlags(window_)&SDL_WINDOW_INPUT_FOCUS) && std::chrono::steady_clock::now()<end){if(cancelled())break;SDL_Delay(4);}
            d_.focusAfter=(SDL_GetWindowFlags(window_)&SDL_WINDOW_INPUT_FOCUS)?1:0;
            return d_.focusAfter && !d_.cancel;
        }
        case setup::Context:context_=g_main_context_new();return context_;
        case setup::Register:return LSRegisterPubPriv(hdmi::appId,&handle_,true,&error.e);
        case setup::Name:{const char* name=LSHandleGetName(handle_);return name && !std::strcmp(name,hdmi::appId);}
        case setup::Attach:return LSGmainContextAttach(handle_,context_,&error.e);
        case setup::Disconnect:return LSSetDisconnectHandler(handle_,disconnected,this,&error.e);
        case setup::WindowIdGuard:return validId();
        case setup::Unregister:{const bool ok=LSUnregister(handle_,&error.e);handle_=nullptr;return ok;}
        case setup::Unref:g_main_context_unref(context_);context_=nullptr;return true;
        case setup::ExportDestroy:SDL_webOSDestroyExportedWindow(exported_.empty()?rawExport_:exported_.c_str());exported_.clear();rawExport_=nullptr;return true;
        case setup::RendererDestroy:SDL_DestroyRenderer(renderer_);renderer_=nullptr;return true;
        case setup::WindowDestroy:SDL_DestroyWindow(window_);window_=nullptr;return true;
        case setup::Quit:SDL_Quit();graphics_=false;return true;
        default:return false;
        }
    }
};
}
int main(int argc,char** argv) {
    const auto launch=hdmi::parseLaunch(argc,argv);
    if(launch.mode!=hdmi::Mode::Picture)return 64;
    std::signal(SIGALRM,hardStop);std::signal(SIGINT,stop);std::signal(SIGTERM,stop);alarm(22);
    if(!hdmi::launchAllowed(launch,hdmi::currentBootId(),hdmi::boottimeMs(),hdmi::realtimeMs()))return 64;
    const char* directory="/tmp/io.github.tpapaz.multiview.hdmiwindow";
    if(mkdir(directory,0700)!=0 && errno!=EEXIST)return 73;
    const int parent=open(directory,O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);
    if(parent<0)return 73;
    struct stat st{};
    if(fstat(parent,&st)!=0 || st.st_uid!=geteuid() || (st.st_mode&07777)!=0700){close(parent);return 73;}
    const int fd=openat(parent,"setup-0.1.8.jsonl",O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0600);
    close(parent);if(fd<0)return 73;
    setup::Trace trace([&](const std::string& s){size_t n=0;while(n<s.size()){const auto k=write(fd,s.data()+n,s.size()-n);if(k<0&&errno==EINTR)continue;if(k<=0)return false;n+=static_cast<size_t>(k);}return fsync(fd)==0;});
    if(!trace.line("{\"schemaVersion\":1,\"appId\":\"io.github.tpapaz.multiview.hdmiwindow\",\"appVersion\":\"0.1.8\",\"mode\":\"setup_only\"}\n")){close(fd);return 74;}
    Native native(launch);const auto result=setup::run(native,trace);
    const int status=result.ready && result.cleanup?0:1;
    trace.event(100,status);const bool written=trace.writable;const bool closed=close(fd)==0;
    return written && closed?status:74; // No UTP interface, stdout or acquisition loop.
}
