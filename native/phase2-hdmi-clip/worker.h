#pragma once

#include <sys/types.h>

namespace mixed {

constexpr char workerArgument[] = "--clip-worker";
constexpr int workerFd = 3;
enum class Event : unsigned char { None, Ready, Frame, Advanced, Closed, Failed };
enum class Reap { Absent, Pending, Clean, Failed, Unobserved };

class Worker {
public:
    Worker() = default;
    Worker(const Worker&) = delete;
    Worker& operator=(const Worker&) = delete;
    ~Worker();

    bool spawn();
    bool start(const char* windowId, long long deadline) const;
    bool stop() const;
    Event event() const;
    void terminate() const;
    Reap reap();

private:
    int fd_ = -1;
    pid_t pid_ = -1;
    Reap result_ = Reap::Absent;
};

struct Clip {
    virtual ~Clip() = default;
    virtual bool open(const char* windowId) = 0;
    virtual bool feed() = 0;
    virtual unsigned frames() const = 0;
    virtual unsigned positionMs() const = 0;
    virtual bool close() = 0;
};

// The worker accepts commands only on the inherited private socket.
bool parentChannel();
int serveClip(Clip& clip);

} // namespace mixed
