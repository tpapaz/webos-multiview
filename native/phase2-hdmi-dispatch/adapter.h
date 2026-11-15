#pragma once
#include "../phase2-hdmi-picture/session.h"
#include "../phase2-hdmi-picture/launch-clock.h"
#include "../phase2-context-dispatch/dispatcher.h"
#include "replies.h"
#include <SDL.h>
#include <SDL_webOS.h>
#include <glib.h>
#include <luna-service2/lunaservice.h>
#include <array>
#include <atomic>
#include <chrono>
#include <csignal>
#include <cstdlib>
#include <cstring>

extern "C" bool LSRegisterPubPriv(const char*,LSHandle**,bool,LSError*);
namespace hdmi {
class PhysicalAdapter final:public Platform {
    using Wall=std::chrono::steady_clock;
    struct Error {LSError e;Error(){LSErrorInit(&e);}~Error(){LSErrorFree(&e);}};
    struct Callback {PhysicalAdapter* owner=nullptr;int id=-1;LSMessageToken token=LSMESSAGE_TOKEN_INVALID;};
    const Launch& launch_;
    volatile sig_atomic_t& stopping_;
    ContextDispatcher::Now now_;
    ContextDispatcher dispatcher_;
    CallbackReplies replies_;
    std::array<Callback,4> callbacks_;
    SDL_Window* window_=nullptr;SDL_Renderer* renderer_=nullptr;
    GMainContext* context_=nullptr;LSHandle* handle_=nullptr;GSource* source_=nullptr;
    std::string exported_;const char* rawExport_=nullptr;
    std::atomic<bool> connected_{true},progressionCancelled_{false};bool graphics_=false;
    SDL_Rect destination_{480,270,960,540};
    static bool replied(LSHandle*,LSMessage* message,void* data) {
        auto& c=*static_cast<Callback*>(data);
        const char* text=LSMessageGetPayload(message);const auto size=text?strnlen(text,4097):0;
        if(c.owner->replies_.publish(c.id,text,size))c.token=LSMESSAGE_TOKEN_INVALID;
        return true;
    }
    static void disconnected(LSHandle*,void* p){static_cast<PhysicalAdapter*>(p)->connected_.store(false);}
    static int service(void* data) {static_cast<PhysicalAdapter*>(data)->service();return 1;}
    void service() {
        const auto work=replies_.next();if(work.action==CallbackReplies::Action::None)return;
        auto& c=callbacks_[static_cast<size_t>(work.id)];
        if(work.action==CallbackReplies::Action::Send){
            const auto now=now_();
            if(!connected_.load()||(!work.cleanup&&progressionCancelled_.load())||now<0||now>=work.expires||
                !dispatchAllowed(launch_,now+(work.cleanup?0:2000),work.cleanup)){
                replies_.notSent(work.id);return;
            }
            c.owner=this;c.id=work.id;Error error;LSMessageToken token=LSMESSAGE_TOKEN_INVALID;
            const bool accepted=LSCallOneReply(handle_,work.target.c_str(),work.payload.c_str(),replied,&c,&token,&error.e);
            // A callback may have run before LSCallOneReply returned. Never revive
            // that completed token; stale callback userdata stays valid until join.
            c.token=replies_.received(work.id)?LSMESSAGE_TOKEN_INVALID:token;
            replies_.sent(work.id,accepted);
        }else{
            Error error;const bool clean=c.token==LSMESSAGE_TOKEN_INVALID||LSCallCancel(handle_,c.token,&error.e);
            if(clean)c.token=LSMESSAGE_TOKEN_INVALID;
            replies_.cancelled(work.id,clean);
        }
    }
public:
    explicit PhysicalAdapter(const Launch& l,volatile sig_atomic_t& stop,ContextDispatcher::Now now=boottimeMs)
        :launch_(l),stopping_(stop),now_(now),dispatcher_(l,now){}
    ~PhysicalAdapter(){if(ownerPending())_exit(75);}
    bool ownerPending()const{return dispatcher_.active()||handle_;}
    bool begin()override {
        if(!launchAllowed(launch_,currentBootId(),now_(),realtimeMs()))return false;
        context_=g_main_context_new();Error error;
        if(!context_||!LSRegisterPubPriv(appId,&handle_,true,&error.e))return false;
        const char* name=LSHandleGetName(handle_);
        if(!name||std::strcmp(name,appId)||!LSGmainContextAttach(handle_,context_,&error.e)||
            !LSSetDisconnectHandler(handle_,disconnected,this,&error.e))return false;
        source_=g_timeout_source_new(1);if(!source_)return false;
        g_source_set_callback(source_,service,this,nullptr);
        if(!g_source_attach(source_,context_)||!dispatcher_.start(context_)||cancelled())return false;
        graphics_=true;
        setenv("EGL_PLATFORM","wayland",0);setenv("XDG_RUNTIME_DIR","/tmp/xdg",0);
        SDL_SetHint(SDL_HINT_WEBOS_ACCESS_POLICY_KEYS_BACK,"true");SDL_SetHint(SDL_HINT_WEBOS_ACCESS_POLICY_KEYS_EXIT,"true");
        if(SDL_Init(SDL_INIT_VIDEO)!=0||cancelled())return false;
        window_=SDL_CreateWindow("MultiView HDMI Window Candidate",SDL_WINDOWPOS_UNDEFINED,SDL_WINDOWPOS_UNDEFINED,1920,1080,SDL_WINDOW_FULLSCREEN);
        renderer_=window_?SDL_CreateRenderer(window_,-1,SDL_RENDERER_ACCELERATED):nullptr;if(!renderer_)return false;
        int w=0,h=0;SDL_GetWindowSize(window_,&w,&h);if(w!=1920||h!=1080)return false;
        if(SDL_SetRenderDrawBlendMode(renderer_,SDL_BLENDMODE_NONE)!=0||SDL_SetRenderDrawColor(renderer_,0,0,0,255)!=0||SDL_RenderClear(renderer_)!=0||
            SDL_SetRenderDrawColor(renderer_,0,0,0,0)!=0||SDL_RenderFillRect(renderer_,&destination_)!=0)return false;
        SDL_RenderPresent(renderer_);
        rawExport_=SDL_webOSCreateExportedWindow(SDL_WEBOS_EXPORED_WINDOW_TYPE_TRANSPARENT);
        if(!rawExport_||!*rawExport_||strnlen(rawExport_,257)>256)return false;
        exported_=rawExport_;
        SDL_Rect from{0,0,1920,1080};if(!SDL_webOSSetExportedWindow(exported_.c_str(),&from,&destination_))return false;
        const auto end=Wall::now()+std::chrono::seconds(1);
        while(!(SDL_GetWindowFlags(window_)&SDL_WINDOW_INPUT_FOCUS)&&Wall::now()<end){if(cancelled())return false;SDL_Delay(4);}
        return (SDL_GetWindowFlags(window_)&SDL_WINDOW_INPUT_FOCUS)&&!cancelled();
    }
    std::string windowId()const override{return exported_;}
    bool cancelled()override {
        SDL_Event event{};
        for(int i=0;graphics_&&i<32&&SDL_PollEvent(&event);++i){
            if(event.type==SDL_QUIT)stopping_=1;
            if(event.type==SDL_KEYDOWN){const int k=event.key.keysym.scancode;if(k==SDL_SCANCODE_ESCAPE||k==SDL_SCANCODE_AC_BACK||k==SDL_WEBOS_SCANCODE_BACK||k==SDL_WEBOS_SCANCODE_EXIT)stopping_=1;}
            if(event.type==SDL_WINDOWEVENT&&(event.window.event==SDL_WINDOWEVENT_FOCUS_LOST||event.window.event==SDL_WINDOWEVENT_HIDDEN||event.window.event==SDL_WINDOWEVENT_MINIMIZED||event.window.event==SDL_WINDOWEVENT_CLOSE))stopping_=1;
        }
        const bool cancelled=stopping_||!connected_.load()||!dispatchAllowed(launch_,now_(),false);
        if(cancelled)progressionCancelled_.store(true);
        return cancelled;
    }
    Reply exchange(Step step,const std::string& payload)override {
        const bool cleanup=step==Step::Stop||step==Step::Close;
        const auto started=now_();
        if(!handle_||!dispatcher_.active()||payload.empty()||started<0||
            (!cleanup&&cancelled())||!dispatchAllowed(launch_,started+(cleanup?0:2000),cleanup))return {Delivery::NotSent,{}};
        const auto deadline=started+2000;
        while(!replies_.idle()&&!replies_.poisoned()){
            const auto now=now_();if(now<started||now>=deadline||!dispatchAllowed(launch_,now,true))return {Delivery::NotSent,{}};
            cancelled();g_usleep(4000);
        }
        const int id=replies_.submit(uri(step),payload,cleanup,now_(),deadline);
        if(id<0)return {Delivery::NotSent,{}};
        for(;;){
            const auto now=now_();
            if(!connected_.load()||now<started||now>=deadline||!dispatchAllowed(launch_,now,true))break;
            // Continue bounded draining after user cancellation, recovering an
            // open ID for stop/close; no new progression is admitted.
            cancelled();
            Reply result{Delivery::Uncertain,{}};if(replies_.take(id,result))return result;
            g_usleep(4000);
        }
        replies_.abandon(id);return {Delivery::Uncertain,{}};
    }
    bool observe()override {
        const auto end=Wall::now()+std::chrono::seconds(8);
        while(!cancelled()&&Wall::now()<end)SDL_Delay(4);
        return !cancelled();
    }
    bool end()override {
        replies_.close();
        if(rawExport_&&*rawExport_){SDL_webOSDestroyExportedWindow(exported_.empty()?rawExport_:exported_.c_str());exported_.clear();rawExport_=nullptr;}
        if(renderer_){SDL_DestroyRenderer(renderer_);renderer_=nullptr;}
        if(window_){SDL_DestroyWindow(window_);window_=nullptr;}
        if(graphics_){SDL_Quit();graphics_=false;}
        if(!dispatcher_.stopAndJoin())return false;
        if(source_){g_source_destroy(source_);g_source_unref(source_);source_=nullptr;}
        // Unconfirmed cancellation retains token/callback owner even after join.
        if(!replies_.idle())return false;
        if(handle_){Error error;if(!LSUnregister(handle_,&error.e))return false;handle_=nullptr;}
        if(context_){g_main_context_unref(context_);context_=nullptr;}
        return true;
    }
};
} // namespace hdmi

