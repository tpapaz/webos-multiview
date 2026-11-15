#pragma once
#include <cerrno>
#include <csignal>
#include <fcntl.h>
#include <sys/prctl.h>
#include <sys/stat.h>
#include <sys/time.h>
#include <time.h>
#include <unistd.h>

namespace hdmi {
// Linux own-parent witness. No SDK/vendor work, heap, stdio or destructor runs in
// the forked child. The SAM-launched parent keeps all graphics/LS2 work and PID.
namespace witness {
constexpr char record[]="{\"schemaVersion\":1,\"kind\":\"own_parent_termination\",\"state\":\"observed\",\"exitStatus\":\"unknown\",\"hardwareRelease\":\"unknown\"}\n";
static volatile sig_atomic_t notified=0;
inline void notice(int){notified=1;}
inline void cap(int){_exit(124);}
inline long long now(){
    timespec t{};if(clock_gettime(CLOCK_BOOTTIME,&t)!=0)return -1;
    const long long seconds=t.tv_sec;
    if(seconds<0||seconds>9007199254740LL||t.tv_nsec<0||t.tv_nsec>=1000000000)return -1;
    return seconds*1000+t.tv_nsec/1000000;
}
inline void procPath(char* out,pid_t pid){
    const char prefix[]="/proc/";unsigned n=0;for(char c:prefix){if(!c)break;out[n++]=c;}
    char digits[20];unsigned count=0;do{digits[count++]=static_cast<char>('0'+pid%10);pid/=10;}while(pid>0);
    while(count)out[n++]=digits[--count];
    const char suffix[]="/stat";for(char c:suffix)out[n++]=c;
}
// A stat read alone is deliberately NOT used to claim termination. Death
// notification + reparenting + ENOENT/ESRCH for the original /proc parent entry
// are all required. A zombie/main-thread exit with a surviving group stays unknown.
[[noreturn]] inline void child(pid_t parent,int ready,int report,int closeInChild,long long deadline){
    if(closeInChild>=0)close(closeInChild);
    close(STDIN_FILENO);close(STDOUT_FILENO);close(STDERR_FILENO);
    notified=0;struct sigaction action{};sigemptyset(&action.sa_mask);action.sa_handler=notice;
    if(sigaction(SIGUSR1,&action,nullptr)!=0)_exit(76);
    action.sa_handler=cap;if(sigaction(SIGALRM,&action,nullptr)!=0)_exit(76);
    const auto started=now();if(started<0||deadline<=started)_exit(76);
    const auto remaining=deadline-started;itimerval timer{};timer.it_value.tv_sec=remaining/1000;timer.it_value.tv_usec=(remaining%1000)*1000;
    if(setitimer(ITIMER_REAL,&timer,nullptr)!=0||prctl(PR_SET_PDEATHSIG,SIGUSR1,0,0,0)!=0||getppid()!=parent)_exit(76);
    char path[64];procPath(path,parent);int alive=open(path,O_RDONLY|O_CLOEXEC|O_NOFOLLOW);if(alive<0)_exit(76);close(alive);
    const char armed='R';if(write(ready,&armed,1)!=1)_exit(76);close(ready);
    for(;;){
        const auto sample=now();if(sample<started||sample>=deadline)_exit(76);
        if(notified&&getppid()!=parent){
            const int fd=open(path,O_RDONLY|O_CLOEXEC|O_NOFOLLOW);
            if(fd>=0)close(fd);
            else if(errno==ENOENT||errno==ESRCH){
                size_t done=0;while(done<sizeof(record)-1){const auto k=write(report,record+done,sizeof(record)-1-done);if(k<0&&errno==EINTR)continue;if(k<=0)_exit(74);done+=static_cast<size_t>(k);}
                const bool saved=fsync(report)==0;const bool closed=close(report)==0;_exit(saved&&closed?0:74);
            }
        }
        timespec pause{0,4000000};nanosleep(&pause,nullptr);
    }
}
inline bool start(int report,int parentReport,long long issue){
    const auto started=now();if(report<=STDERR_FILENO||issue<0||started<issue||started>=issue+17000)return false;
    int channel[2];if(pipe2(channel,O_CLOEXEC|O_NONBLOCK)!=0)return false;
    const pid_t parent=getpid(),pid=fork();
    if(pid==0){close(channel[0]);child(parent,channel[1],report,parentReport,issue+25000);}
    close(channel[1]);if(pid<0){close(channel[0]);return false;}
    bool armed=false;
    for(;;){
        const auto sample=now();if(sample<started||sample-started>=100||sample>=issue+17000)break;
        char byte=0;const auto n=read(channel[0],&byte,1);if(n==1){armed=byte=='R';break;}if(n==0)break;
        if(n<0&&errno!=EAGAIN&&errno!=EINTR)break;
        timespec pause{0,1000000};nanosleep(&pause,nullptr);
    }
    close(channel[0]);return armed;
}
} // namespace witness
} // namespace hdmi
