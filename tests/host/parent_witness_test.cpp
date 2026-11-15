#include "../../native/phase2-hdmi-dispatch/termination.h"
#include <cassert>
#include <cstring>
#include <fstream>
#include <iostream>
#include <string>
#include <sys/wait.h>
namespace {
std::string load(const std::string& p){std::ifstream f(p);return {std::istreambuf_iterator<char>(f),{}};}
void run(const std::string& dir,int mode){
 const auto file=dir+"/witness-"+std::to_string(mode)+".json";const int output=open(file.c_str(),O_WRONLY|O_CREAT|O_EXCL,0600);assert(output>=3);
 const pid_t actor=fork();assert(actor>=0);
 if(actor==0){
   if(mode==3){
     int ready[2];assert(pipe(ready)==0);const pid_t child=fork();assert(child>=0);
     if(child==0){close(ready[0]);hdmi::witness::child(getppid(),ready[1],output,-1,hdmi::witness::now()+40);}
     close(ready[1]);char armed=0;assert(read(ready[0],&armed,1)==1&&armed=='R');close(ready[0]);
     timespec delay{0,100000000};nanosleep(&delay,nullptr);_exit(0);
   }
   const int sink=mode==4?open("/dev/full",O_WRONLY):output;assert(sink>=3);
   assert(hdmi::witness::start(sink,-1,hdmi::witness::now()));
   if(mode==1){signal(SIGTERM,SIG_DFL);raise(SIGTERM);}
   if(mode==2){signal(SIGALRM,hdmi::witness::cap);raise(SIGALRM);}
   _exit(0);
 }
 close(output);int status=0;assert(waitpid(actor,&status,0)==actor);
 const auto end=hdmi::witness::now()+1500;bool witnessReaped=false;
 while(hdmi::witness::now()<end){
   int childStatus=0;const pid_t reaped=waitpid(-1,&childStatus,WNOHANG);
   if(reaped>0){assert(WIFEXITED(childStatus));assert(WEXITSTATUS(childStatus)==(mode==3?124:mode==4?74:0));witnessReaped=true;break;}
   timespec delay{0,1000000};nanosleep(&delay,nullptr);
 }
 assert(witnessReaped);const auto bytes=load(file);
 if(mode<3)assert(bytes==hdmi::witness::record);else assert(bytes.empty());
}
}
int main(int argc,char** argv){
 assert(argc==2);assert(prctl(PR_SET_CHILD_SUBREAPER,1,0,0,0)==0);
 char pattern[4096];const std::string name=std::string(argv[1])+"/witness-acceptance-XXXXXX";assert(name.size()<sizeof(pattern));std::strcpy(pattern,name.c_str());assert(mkdtemp(pattern));
 for(int mode=0;mode<5;++mode)run(pattern,mode);
 std::cout<<"Independent own-parent witness: normal/signal/exit124 deaths observed; timeout and write failure produce no evidence; all host descendants reaped\n";
}

