#pragma once
#include <cerrno>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>
namespace hdmi {
inline int reserveReviewReport(const char* name){
    const char* directory="/tmp/io.github.tpapaz.multiview.hdmiwindow";
    if(mkdir(directory,0700)!=0&&errno!=EEXIST)return -1;
    const int dir=open(directory,O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC);if(dir<0)return -1;
    struct stat st{};int fd=-1;
    if(fstat(dir,&st)==0&&st.st_uid==geteuid()&&(st.st_mode&07777)==0700)fd=openat(dir,name,O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC,0600);
    close(dir);return fd;
}
inline bool finishReviewReport(int fd,const std::string& bytes){
    if(fd<0||bytes.empty()||bytes.size()>2048)return false;
    size_t done=0;while(done<bytes.size()){const auto n=write(fd,bytes.data()+done,bytes.size()-done);if(n<0&&errno==EINTR)continue;if(n<=0)return false;done+=static_cast<size_t>(n);}
    return fsync(fd)==0;
}
}
