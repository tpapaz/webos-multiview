#include "../../native/phase2-hdmi-candidate-0.1.12/contract.h"
#include "../../native/phase2-hdmi-dispatch/termination.h"
#include "../../native/phase2-hdmi-dispatch/capture.h"
#include <cassert>
#include <fstream>
#include <iostream>
#include <vector>
#include <sys/wait.h>
int main(int argc,char** argv){
    assert(argc==2);assert(prctl(PR_SET_CHILD_SUBREAPER,1,0,0,0)==0);
    std::string prefix=std::string(argv[1])+"/bound-witness-XXXXXX";std::vector<char> directory(prefix.begin(),prefix.end());directory.push_back(0);assert(mkdtemp(directory.data()));
    for(auto action:{candidate::Action::Lifecycle,candidate::Action::Picture}){
        candidate::Launch launch;launch.action=action;launch.gate=action==candidate::Action::Picture?std::string(64,'a'):"";
        launch.authority.bootId="00000000-0000-0000-0000-000000000001";launch.authority.startByBoottimeMs=103000;launch.authority.startByRealtimeMs=1700000003000LL;
        const auto file=std::string(directory.data())+"/"+candidate::witnessName(action);
        const int fd=open(file.c_str(),O_WRONLY|O_CREAT|O_EXCL,0600);assert(fd>=3);
        const auto header=candidate::witnessHeader(launch);assert(hdmi::finishReviewReport(fd,header));
        const pid_t actor=fork();assert(actor>=0);
        if(actor==0){assert(candidate::witnessNamespaceBound());assert(hdmi::witness::start(fd,-1,hdmi::witness::now()));close(fd);_exit(0);}
        close(fd);int status=0;assert(waitpid(actor,&status,0)==actor&&WIFEXITED(status)&&WEXITSTATUS(status)==0);
        bool reaped=false;const auto deadline=hdmi::witness::now()+1500;
        while(hdmi::witness::now()<deadline){const pid_t child=waitpid(-1,&status,WNOHANG);if(child>0){assert(WIFEXITED(status)&&WEXITSTATUS(status)==0);reaped=true;break;}timespec pause{0,1000000};nanosleep(&pause,nullptr);}
        assert(reaped);std::ifstream input(file);const std::string bytes{std::istreambuf_iterator<char>(input),{}};
        assert(bytes==header+hdmi::witness::record);assert(bytes.size()<=256);
    }
    std::cout<<"Real parent-death witness appends to exact version/mode/launch-bound prefix; two host descendants reaped; each file <=256 bytes\n";
}
