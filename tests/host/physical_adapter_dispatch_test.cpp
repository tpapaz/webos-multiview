#include "../../native/phase2-hdmi-dispatch/adapter.h"
#include <cassert>
#include <algorithm>
#include <functional>
#include <iostream>
#include <map>
#include <mutex>
#include <thread>
#include <vector>
namespace {
GMainContext* context=nullptr;SDL_Window window;SDL_Renderer renderer;LSHandle handle;
std::thread::id mainThread;std::vector<std::string> events;std::mutex eventMutex;
std::atomic<bool> cancelEvent{false};bool earlyReply=false,missingReply=false,failCancel=false,failUnregister=false,failInit=false,pendingQuit=false;
std::atomic<long long> clockOffset{0};std::atomic<bool> clockInvalid{false};
long long now(){return clockInvalid.load()?-1:hdmi::boottimeMs()+clockOffset.load();}
bool expireInit=false,expireFocus=false,cancelAfterOpen=false,failSend=false;std::vector<std::string> sentSteps;
LSMessageToken nextToken=1;std::map<LSMessageToken,GSource*> requests;
void event(const char* name){std::lock_guard<std::mutex> lock(eventMutex);events.push_back(name);}
void queue(std::function<void()> fn){auto* s=g_idle_source_new();auto* f=new std::function<void()>(std::move(fn));g_source_set_callback(s,[](void* p)->int{(*static_cast<std::function<void()>*>(p))();return 0;},f,[](void* p){delete static_cast<std::function<void()>*>(p);});assert(g_source_attach(s,context));g_source_unref(s);}
hdmi::Launch launch(){hdmi::Launch l;l.mode=hdmi::Mode::Picture;l.bootId=hdmi::currentBootId();l.startByBoottimeMs=hdmi::boottimeMs()+2900;l.startByRealtimeMs=hdmi::realtimeMs()+2900;return l;}
void reset(){clockOffset=0;clockInvalid=false;expireInit=false;expireFocus=false;cancelAfterOpen=false;failSend=false;sentSteps.clear();context=nullptr;earlyReply=false;missingReply=false;failCancel=false;failUnregister=false;failInit=false;pendingQuit=false;cancelEvent=false;events.clear();requests.clear();}

}
struct LSMessage{std::string text;};
extern "C" {
void LSErrorInit(LSError* e){e->error_code=0;}void LSErrorFree(LSError*){}
bool LSRegisterPubPriv(const char* name,LSHandle** p,bool pub,LSError*){assert(std::this_thread::get_id()==mainThread);assert(pub&&std::string(name)==hdmi::appId);*p=&handle;event("register");return true;}
const char* LSHandleGetName(LSHandle*){return hdmi::appId;}
bool LSGmainContextAttach(LSHandle*,GMainContext* c,LSError*){context=c;return true;}
bool LSSetDisconnectHandler(LSHandle*,void(*)(LSHandle*,void*),void*,LSError*){return true;}
const char* LSMessageGetPayload(LSMessage* m){return m->text.c_str();}
bool LSCallOneReply(LSHandle*,const char* uri,const char*,LSFilterFunc fn,void* data,LSMessageToken* token,LSError*){
 assert(std::this_thread::get_id()!=mainThread&&g_main_context_is_owner(context));event("send");const std::string target(uri);sentSteps.push_back(target.substr(target.find_last_of('/')+1));*token=nextToken++;if(failSend)return false;
 const std::string text=std::string(uri).find("/open")!=std::string::npos?"{\"returnValue\":true,\"pipelineId\":\"owned-only\"}":"{\"returnValue\":true}";
 if(earlyReply){LSMessage m{text};fn(&handle,&m,data);return true;}
 if(missingReply)return true;
 const auto current=*token;auto* s=g_timeout_source_new(3);requests[current]=s;
 auto* callback=new std::function<void()>([=]{LSMessage m{text};if(cancelAfterOpen&&text.find("pipelineId")!=std::string::npos)cancelEvent=true;fn(&handle,&m,data);requests.erase(current);g_source_unref(s);});
 g_source_set_callback(s,[](void* p)->int{(*static_cast<std::function<void()>*>(p))();return 0;},callback,[](void* p){delete static_cast<std::function<void()>*>(p);});assert(g_source_attach(s,context));return true;
}
bool LSCallCancel(LSHandle*,LSMessageToken token,LSError*){
 assert(std::this_thread::get_id()!=mainThread&&g_main_context_is_owner(context));event("cancel");if(failCancel)return false;
 const auto it=requests.find(token);if(it!=requests.end()){g_source_destroy(it->second);g_source_unref(it->second);requests.erase(it);}return true;
}
bool LSUnregister(LSHandle*,LSError*){assert(std::this_thread::get_id()==mainThread);event("unregister");return !failUnregister;}
bool SDL_SetHint(const char*,const char*){return true;}int SDL_Init(unsigned){assert(context);event("init");std::atomic<bool> done{false};queue([&]{done=true;});for(int n=0;n<80&&!done;++n)g_usleep(1000);assert(done);if(expireInit)clockOffset=20000;return failInit?-1:0;}
SDL_Window* SDL_CreateWindow(const char*,int,int,int,int,unsigned){event("window");return &window;}SDL_Renderer* SDL_CreateRenderer(SDL_Window*,int,unsigned){return &renderer;}
void SDL_GetWindowSize(SDL_Window*,int* w,int* h){*w=1920;*h=1080;}int SDL_SetRenderDrawBlendMode(SDL_Renderer*,int){return 0;}
int SDL_SetRenderDrawColor(SDL_Renderer*,unsigned char,unsigned char,unsigned char,unsigned char){return 0;}int SDL_RenderClear(SDL_Renderer*){return 0;}
int SDL_RenderFillRect(SDL_Renderer*,const SDL_Rect*){return 0;}void SDL_RenderPresent(SDL_Renderer*){}unsigned SDL_GetWindowFlags(SDL_Window*){if(expireFocus)clockOffset=20000;return SDL_WINDOW_INPUT_FOCUS;}
void SDL_Delay(unsigned n){g_usleep(n*1000);}int SDL_PollEvent(SDL_Event* e){if(cancelEvent.exchange(false)){e->type=SDL_QUIT;return 1;}return 0;}
const char* SDL_webOSCreateExportedWindow(int type){assert(type==2);return "own-window";}bool SDL_webOSSetExportedWindow(const char*,SDL_Rect*,SDL_Rect*){return true;}
void SDL_webOSDestroyExportedWindow(const char*){event("export_destroy");}void SDL_DestroyRenderer(SDL_Renderer*){event("renderer_destroy");}void SDL_DestroyWindow(SDL_Window*){event("window_destroy");}
void SDL_Quit(){event("quit");std::atomic<bool> done{false};queue([&]{if(pendingQuit){for(;;)g_usleep(1000);}done=true;});if(pendingQuit){g_usleep(15000);return;}for(int n=0;n<80&&!done;++n)g_usleep(1000);assert(done);}
}
int main(int argc,char** argv){
 mainThread=std::this_thread::get_id();reset();volatile sig_atomic_t stopping=0;
 if(argc==2){const std::string scenario=argv[1];pendingQuit=scenario=="pending";failUnregister=scenario=="unregister";failCancel=scenario=="cancel";missingReply=failCancel;
   auto l=launch();hdmi::PhysicalAdapter adapter(l,stopping,now);assert(adapter.begin());if(failCancel)assert(adapter.exchange(hdmi::Step::Open,hdmi::request(hdmi::Step::Open,adapter.windowId())).delivery==hdmi::Delivery::Uncertain);
   if(scenario=="clock")clockInvalid=true;
   const bool clean=adapter.end();assert(!clean&&adapter.ownerPending());_exit(75);
 }
 for(bool synchronous:{false,true}){
   reset();earlyReply=synchronous;auto l=launch();hdmi::PhysicalAdapter adapter(l,stopping,now);assert(adapter.begin());
   for(const auto step:{hdmi::Step::Open,hdmi::Step::Select,hdmi::Step::Stop,hdmi::Step::Close})assert(adapter.exchange(step,hdmi::request(step,step==hdmi::Step::Open?adapter.windowId():"owned-only")).delivery==hdmi::Delivery::Reply);
   assert(adapter.end());assert(!adapter.ownerPending());
   const auto at=[](const char* s){return std::find(events.begin(),events.end(),s)-events.begin();};assert(at("register")<at("init")&&at("quit")<at("unregister"));
 }
 reset();failInit=true;{auto l=launch();hdmi::PhysicalAdapter adapter(l,stopping,now);assert(!adapter.begin());assert(adapter.end());assert(!adapter.ownerPending());}
 reset();{auto l=launch();hdmi::PhysicalAdapter adapter(l,stopping,now);assert(adapter.begin());cancelEvent=true;assert(adapter.cancelled());assert(adapter.exchange(hdmi::Step::Open,"payload").delivery==hdmi::Delivery::NotSent);assert(adapter.end());}
 reset();{auto l=launch();l.startByBoottimeMs-=3001;hdmi::PhysicalAdapter adapter(l,stopping,now);assert(!adapter.begin());assert(adapter.end());assert(events.empty());}
 reset();stopping=0;cancelAfterOpen=true;{auto l=launch();hdmi::PhysicalAdapter adapter(l,stopping,now);const auto r=hdmi::run(adapter,true);assert(r.status==hdmi::Status::Cancelled);assert(r.opened&&r.stopAcknowledged&&r.closeAcknowledged&&r.localCleanup);assert((sentSteps==std::vector<std::string>{"open","stop","close"}));}
 reset();stopping=0;failSend=true;{auto l=launch();hdmi::PhysicalAdapter adapter(l,stopping,now);const auto r=hdmi::run(adapter,true);assert(r.status==hdmi::Status::OpenFailed&&r.acquisitionUncertain&&r.localCleanup);assert(sentSteps.size()==1);}
 reset();stopping=0;missingReply=true;{auto l=launch();hdmi::PhysicalAdapter adapter(l,stopping,now);const auto r=hdmi::run(adapter,true);assert(r.status==hdmi::Status::OpenFailed&&r.acquisitionUncertain&&r.localCleanup);assert(sentSteps.size()==1);}
 for(bool duringInit:{false,true}){reset();stopping=0;expireInit=duringInit;expireFocus=!duringInit;auto l=launch();hdmi::PhysicalAdapter adapter(l,stopping,now);assert(!adapter.begin());assert(adapter.end());assert(sentSteps.empty());if(duringInit)assert(std::find(events.begin(),events.end(),"window")==events.end());}
 std::cout<<"Actual physical adapter: real GLib sole owner, synchronous/asynchronous replies, stale/reentrant/failed-return mailbox, original guard, cancellation, failure and cleanup order passed\n";
}



