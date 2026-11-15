#include <cstring>
#include "contract.h"
#include "../phase2-hdmi-dispatch/adapter.h"
#include "../phase2-hdmi-dispatch/termination.h"
#include "../phase2-hdmi-dispatch/capture.h"
namespace {volatile sig_atomic_t stopping=0;void stop(int){stopping=1;}void hardStop(int){_exit(124);}
struct Clock:candidate::Clock {long long mono()override{return hdmi::clockMs(CLOCK_MONOTONIC);}long long boot()override{return hdmi::boottimeMs();}};}
int main(int argc,char** argv){
    const auto launch=candidate::parse(argc,argv);if(launch.action==candidate::Action::None)return 64;
    std::signal(SIGINT,stop);std::signal(SIGTERM,stop);std::signal(SIGALRM,hardStop);alarm(22);
    if(!hdmi::launchAllowed(launch.authority,hdmi::currentBootId(),hdmi::boottimeMs(),hdmi::realtimeMs()))return 64;
    const int report=hdmi::reserveReviewReport(candidate::reportName(launch.action));if(report<0)return 73;
    const int witness=hdmi::reserveReviewReport(candidate::witnessName(launch.action));if(witness<0){close(report);return 73;}
    if(!hdmi::finishReviewReport(witness,candidate::witnessHeader(launch))){close(witness);close(report);return 74;}
    Clock clock;candidate::Trace trace([&](const std::string& row){return hdmi::finishReviewReport(report,row);},clock,launch.authority.startByBoottimeMs-3000);
    if(!trace.header(launch)||!trace.entered(0)){close(witness);close(report);return 74;}
    const bool armed=trace.returned(0,[&]{return candidate::witnessNamespaceBound()&&hdmi::witness::start(witness,report,launch.authority.startByBoottimeMs-3000);});close(witness);
    hdmi::PhysicalAdapter native(launch.authority,stopping);hdmi::Result result;result.status=hdmi::Status::SetupFailed;
    if(armed&&trace.writable)result=candidate::execute(native,trace,launch.action);
    const int intent=candidate::intent(result,native.ownerPending());trace.summary(result,native.ownerPending(),intent);
    const bool written=trace.writable,closed=close(report)==0;
    if(intent==75)_exit(75);
    return written&&closed?intent:74;
}
