#pragma once
#include "../phase2-hdmi-picture/session.h"
#include <json-c/json.h>
#include <glib.h>
#include <cstring>
#include <functional>
#include <memory>
#include <string>
#include <utility>
#include <unistd.h>

namespace candidate {
constexpr char version[]="0.1.12";
enum class Action { None, Lifecycle, Picture };
struct Launch {hdmi::Launch authority;Action action=Action::None;std::string gate;};
inline bool digest(const std::string& s){if(s.size()!=64)return false;for(char c:s)if(!((c>='0'&&c<='9')||(c>='a'&&c<='f')))return false;return true;}
inline Launch parse(int argc,const char* const* argv){
    if(argc!=2||!argv||!argv[1]||strnlen(argv[1],4097)>4096)return {};
    using Json=std::unique_ptr<json_object,decltype(&json_object_put)>;
    std::unique_ptr<json_tokener,decltype(&json_tokener_free)> tok(json_tokener_new(),json_tokener_free);if(!tok)return {};
    json_tokener_set_flags(tok.get(),JSON_TOKENER_STRICT);
    Json object(json_tokener_parse_ex(tok.get(),argv[1],static_cast<int>(strlen(argv[1])+1)),json_object_put);
    if(json_tokener_get_error(tok.get())!=json_tokener_success||!object||json_object_get_type(object.get())!=json_type_object)return {};
    json_object *lifecycle=nullptr,*picture=nullptr,*gate=nullptr;
    const bool l=json_object_object_get_ex(object.get(),"verifyLifecycle",&lifecycle),p=json_object_object_get_ex(object.get(),"acquireHdmi4",&picture);
    if(l==p)return {};
    auto* action=l?lifecycle:picture;if(!action||json_object_get_type(action)!=json_type_boolean||!json_object_get_boolean(action))return {};
    Launch result;result.action=l?Action::Lifecycle:Action::Picture;
    const bool hasGate=json_object_object_get_ex(object.get(),"terminationGateEvidenceSha256",&gate);
    if(l&&hasGate)return {};
    if(p){if(!hasGate||!gate||json_object_get_type(gate)!=json_type_string)return {};result.gate.assign(json_object_get_string(gate),json_object_get_string_len(gate));if(!digest(result.gate))return {};}
    json_object_object_del(object.get(),"verifyLifecycle");json_object_object_del(object.get(),"terminationGateEvidenceSha256");
    json_object_object_add(object.get(),"acquireHdmi4",json_object_new_boolean(true));
    const std::string normalized=json_object_to_json_string_ext(object.get(),JSON_C_TO_STRING_PLAIN);
    const char* original[]={argv[0],normalized.c_str()};result.authority=hdmi::parseLaunch(2,original);
    if(result.authority.mode!=hdmi::Mode::Picture)return {};
    return result;
}
inline const char* mode(Action a){return a==Action::Lifecycle?"lifecycle_validation":a==Action::Picture?"physical_picture":"invalid";}
inline std::string binding(const Launch& launch){
    const std::string text=std::string("{\"mode\":\"")+mode(launch.action)+"\",\"boot\":\""+launch.authority.bootId+"\",\"boottime\":"+std::to_string(launch.authority.startByBoottimeMs)+",\"realtime\":"+std::to_string(launch.authority.startByRealtimeMs)+",\"gate\":"+(launch.action==Action::Picture?"\""+launch.gate+"\"":"null")+"}";
    char* value=g_compute_checksum_for_string(G_CHECKSUM_SHA256,text.c_str(),text.size());
    if(!value)return {};
    const std::string result(value);g_free(value);return result;
}
inline std::string witnessHeader(const Launch& launch){return "[2,\"0.1.12\","+std::to_string(launch.action==Action::Picture?1:0)+",\""+binding(launch)+"\"]\n";}
inline const char* reportName(Action a){return a==Action::Lifecycle?"lifecycle-0.1.12.jsonl":a==Action::Picture?"picture-0.1.12.jsonl":nullptr;}
inline const char* witnessName(Action a){return a==Action::Lifecycle?"termination-lifecycle-0.1.12.json":a==Action::Picture?"termination-picture-0.1.12.json":nullptr;}
inline bool pidNamespaceMatches(const char* bytes,long count,long pid){return pid>0&&count>0&&count<32&&std::string(bytes,static_cast<size_t>(count))==std::to_string(pid);}
inline bool witnessNamespaceBound(){char bytes[32];const auto count=readlink("/proc/self",bytes,sizeof(bytes));return pidNamespaceMatches(bytes,count,getpid());}
inline int age(long long now,long long origin){if(now<0||origin<0)return -1;if(now<origin)return -2;return now-origin>25000?25001:static_cast<int>(now-origin);}
struct Clock {virtual ~Clock()=default;virtual long long mono()=0;virtual long long boot()=0;};
class Trace {
    std::function<bool(const std::string&)> sink_;Clock& clock_;long long origin_,issue_;unsigned bytes_=0;int persistence_=0;
public:
    bool writable=true,setupReady=false;
    Trace(std::function<bool(const std::string&)> sink,Clock& clock,long long issue):sink_(std::move(sink)),clock_(clock),origin_(clock.mono()),issue_(issue){}
    bool line(const std::string& row){
        if(!writable||bytes_+row.size()>2048)return writable=false;
        bytes_+=static_cast<unsigned>(row.size());const auto started=clock_.mono();const bool ok=sink_(row);const int cost=age(clock_.mono(),started);
        persistence_=cost<0||persistence_<0?-1:persistence_+cost>25000?25001:persistence_+cost;return writable=ok;
    }
    bool header(const Launch& launch){const auto sum=binding(launch);if(!digest(sum))return writable=false;return line(std::string("{\"schemaVersion\":2,\"appId\":\"")+hdmi::appId+"\",\"appVersion\":\"0.1.12\",\"mode\":\""+mode(launch.action)+"\",\"gateEvidenceSha256\":"+(launch.action==Action::Picture?"\""+launch.gate+"\"":"null")+",\"launchBindingSha256\":\""+sum+"\"}\n");}
    bool entered(int stage){return line("["+std::to_string(stage)+",0,"+std::to_string(age(clock_.mono(),origin_))+","+std::to_string(age(clock_.boot(),issue_))+"]\n");}
    template<class Call> auto returned(int stage,Call call,int* outcome=nullptr)->decltype(call()){
        const auto before=clock_.mono();auto result=call();const auto after=clock_.mono();
        const int value=outcome?*outcome:(result?1:2);
        line("["+std::to_string(stage)+","+std::to_string(value)+","+std::to_string(age(after,origin_))+","+std::to_string(age(clock_.boot(),issue_))+","+std::to_string(age(after,before))+"]\n");return result;
    }
    bool summary(const hdmi::Result& r,bool owner,int intent){
        line("[92,"+std::to_string(persistence_)+"]\n");
        return line("[90,"+std::to_string(static_cast<int>(r.status))+","+std::to_string(setupReady?1:0)+","+std::to_string(r.opened?1:0)+","+std::to_string(r.selected?1:0)+","+std::to_string(r.stopAcknowledged?1:0)+","+std::to_string(r.closeAcknowledged?1:0)+","+std::to_string(r.acquisitionUncertain?1:0)+","+std::to_string(r.localCleanup?1:0)+","+std::to_string(owner?1:0)+","+std::to_string(intent)+"]\n");
    }
};
class TracedPlatform final:public hdmi::Platform {
    hdmi::Platform& platform_;Trace& trace_;
public:
    TracedPlatform(hdmi::Platform& p,Trace& t):platform_(p),trace_(t){}
    bool begin()override {
        if(!trace_.entered(1))return false;
        trace_.setupReady=trace_.returned(1,[&]{
            if(!platform_.begin())return false;
            const auto id=platform_.windowId();if(id.empty()||id.size()>256)return false;
            for(unsigned char c:id)if(c<0x21||c>0x7e)return false;
            return true;
        });return trace_.setupReady;
    }
    std::string windowId()const override{return platform_.windowId();}
    bool cancelled()override{return !trace_.writable||platform_.cancelled();}
    hdmi::Reply exchange(hdmi::Step step,const std::string& payload)override {
        const bool cleanup=step==hdmi::Step::Stop||step==hdmi::Step::Close;
        const int stage=step==hdmi::Step::Open?2:step==hdmi::Step::Select?3:step==hdmi::Step::Stop?5:6;
        if(!trace_.entered(stage)&&!cleanup)return {hdmi::Delivery::NotSent,{}};
        int outcome=0;hdmi::Reply reply{hdmi::Delivery::Uncertain,{}};
        trace_.returned(stage,[&]{reply=platform_.exchange(step,payload);outcome=reply.delivery==hdmi::Delivery::Reply?1:reply.delivery==hdmi::Delivery::NotSent?2:3;return true;},&outcome);
        return reply;
    }
    bool observe()override{if(!trace_.entered(4))return false;return trace_.returned(4,[&]{return platform_.observe();});}
    bool end()override{trace_.entered(7);return trace_.returned(7,[&]{return platform_.end();});}
};
inline hdmi::Result execute(hdmi::Platform& platform,Trace& trace,Action action){
    if(action==Action::None)return {};
    TracedPlatform tracked(platform,trace);
    if(action==Action::Picture)return hdmi::run(tracked,true);
    hdmi::Result result;result.status=tracked.begin()?hdmi::Status::Completed:hdmi::Status::SetupFailed;
    result.localCleanup=tracked.end();if(!result.localCleanup)result.status=hdmi::Status::CleanupFailed;return result;
}
inline int intent(const hdmi::Result& r,bool owner){return owner?75:r.status==hdmi::Status::Completed&&r.localCleanup?0:1;}
} // namespace candidate
