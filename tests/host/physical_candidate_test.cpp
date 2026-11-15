#include "../../native/phase2-hdmi-candidate-0.1.12/contract.h"
#include <cassert>
#include <algorithm>
#include <fstream>
#include <iostream>
#include <vector>
namespace {
struct Clock:candidate::Clock {long long time=1000;bool wide=false;long long mono()override{if(wide)time+=30000;return time;}long long boot()override{return time;}};
struct Backend:hdmi::Platform {
    Clock& clock;bool setup=true,clean=true,stop=false,earlyCancel=false,lateCancel=false;
    hdmi::Delivery delivery=hdmi::Delivery::Reply;int reject=-1;std::vector<hdmi::Step> calls;int ended=0;
    explicit Backend(Clock& c):clock(c){}
    bool begin()override{clock.time+=10;return setup;}
    std::string windowId()const override{return "private-own-window";}
    bool cancelled()override{return earlyCancel||(lateCancel&&!calls.empty());}
    hdmi::Reply exchange(hdmi::Step s,const std::string&)override{calls.push_back(s);clock.time+=7;if(delivery!=hdmi::Delivery::Reply&&s==hdmi::Step::Open)return {delivery,{}};
      return {hdmi::Delivery::Reply,std::string("{\"returnValue\":")+(static_cast<int>(s)==reject?"false":"true")+(s==hdmi::Step::Open?",\"pipelineId\":\"private-own-pipeline\"}":"}")};}
    bool observe()override{clock.time+=10;return !stop;}
    bool end()override{ended++;clock.time+=10;return clean;}
};
candidate::Launch launch(candidate::Action action){candidate::Launch l;l.action=action;l.authority.mode=hdmi::Mode::Picture;l.authority.bootId="00000000-0000-0000-0000-000000000001";l.authority.startByBoottimeMs=103000;l.authority.startByRealtimeMs=1700000003000LL;if(action==candidate::Action::Picture)l.gate=std::string(64,'a');return l;}
std::string wire(candidate::Action action,Backend& b,Clock& clock,bool owner=false,int failAt=-1,int sinkCost=0,bool witness=true){
    std::string bytes;int writes=0;candidate::Trace t([&](const std::string& s){clock.time+=sinkCost;if(writes++==failAt)return false;bytes+=s;return true;},clock,900);
    t.header(launch(action));t.entered(0);t.returned(0,[&]{return witness;});hdmi::Result r;r.status=hdmi::Status::SetupFailed;
    if(witness)r=candidate::execute(b,t,action);
    t.summary(r,owner,candidate::intent(r,owner));assert(bytes.size()<=2048);assert(bytes.find("private-own-")==std::string::npos);return bytes;
}
void parsing(){
    assert(candidate::pidNamespaceMatches("42",2,42));
    assert(!candidate::pidNamespaceMatches("42",2,43));assert(!candidate::pidNamespaceMatches("42\n",3,42));
    assert(!candidate::pidNamespaceMatches("",0,42));assert(!candidate::pidNamespaceMatches("42",-1,42));assert(!candidate::pidNamespaceMatches("0",1,0));
    const std::string authority="\"launchBootId\":\"00000000-0000-0000-0000-000000000001\",\"launchStartByBoottimeMs\":4000,\"launchStartByRealtimeMs\":5000";
    const auto parse=[&](const std::string& s){const char* argv[]={"candidate",s.c_str()};return candidate::parse(2,argv);};
    assert(parse("{\"verifyLifecycle\":true,"+authority+"}").action==candidate::Action::Lifecycle);
    assert(parse("{\"acquireHdmi4\":true,\"terminationGateEvidenceSha256\":\""+std::string(64,'a')+"\","+authority+"}").action==candidate::Action::Picture);
    for(const auto& bad:std::vector<std::string>{"{}","{\"acquireHdmi4\":true,"+authority+"}","{\"verifyLifecycle\":true,\"acquireHdmi4\":true,"+authority+"}","{\"verifyLifecycle\":true,\"unexpected\":true,"+authority+"}","{\"verifyLifecycle\":true,\"terminationGateEvidenceSha256\":\""+std::string(64,'a')+"\","+authority+"}"})assert(parse(bad).action==candidate::Action::None);
    const char* empty[]={"candidate"};assert(candidate::parse(1,empty).action==candidate::Action::None);
}
}
int main(int argc,char** argv){
    assert(argc==2);parsing();unsigned fixtures=0;size_t maximum=0;
    const auto save=[&](const std::string& name,const std::string& bytes){std::ofstream f(std::string(argv[1])+"/"+name+".jsonl");f<<bytes;assert(f.good());fixtures++;maximum=std::max(maximum,bytes.size());};
    {Clock c;Backend b(c);save("lifecycle",wire(candidate::Action::Lifecycle,b,c));assert(b.calls.empty()&&b.ended==1);}
    {Clock c;Backend b(c);save("picture",wire(candidate::Action::Picture,b,c));assert(b.calls.size()==4&&b.ended==1);}
    {Clock c;Backend b(c);b.setup=false;save("setup-failure",wire(candidate::Action::Picture,b,c));assert(b.calls.empty());}
    {Clock c;Backend b(c);b.clean=false;save("retained-owner",wire(candidate::Action::Lifecycle,b,c,true));}
    {Clock c;Backend b(c);save("witness-failure",wire(candidate::Action::Lifecycle,b,c,false,-1,0,false));assert(b.ended==0&&b.calls.empty());}
    for(int step=0;step<4;++step){Clock c;Backend b(c);b.reject=step;save("reject-"+std::to_string(step),wire(candidate::Action::Picture,b,c));}
    for(auto delivery:{hdmi::Delivery::NotSent,hdmi::Delivery::Uncertain}){Clock c;Backend b(c);b.delivery=delivery;save(delivery==hdmi::Delivery::NotSent?"not-sent":"uncertain",wire(candidate::Action::Picture,b,c));}
    {Clock c;Backend b(c);b.earlyCancel=true;save("cancel-before-open",wire(candidate::Action::Picture,b,c));assert(b.calls.empty());}
    {Clock c;Backend b(c);b.lateCancel=true;save("cancel-after-open",wire(candidate::Action::Picture,b,c));assert((b.calls==std::vector<hdmi::Step>{hdmi::Step::Open,hdmi::Step::Stop,hdmi::Step::Close}));}
    {Clock c;Backend b(c);b.stop=true;save("cancel-observe",wire(candidate::Action::Picture,b,c));}
    {Clock c;Backend b(c);save("slow-persistence",wire(candidate::Action::Picture,b,c,false,-1,19));}
    {Clock c;c.wide=true;Backend b(c);save("widest",wire(candidate::Action::Picture,b,c));}
    for(int boundary=0;boundary<20;++boundary){Clock c;Backend b(c);wire(candidate::Action::Picture,b,c,false,boundary);assert(b.ended==1);}
    {Clock c;Backend b(c);std::string sink;candidate::Trace t([&](const std::string& s){sink+=s;return true;},c,900);const auto r=candidate::execute(b,t,candidate::Action::None);assert(r.status==hdmi::Status::OptInRequired&&b.ended==0&&b.calls.empty());}
    std::cout<<fixtures<<" C++ fixtures; maximum "<<maximum<<" bytes. Exclusive action/gate parser, no-UTP lifecycle, cancellation/cleanup and every writer failure boundary passed\n";
}
