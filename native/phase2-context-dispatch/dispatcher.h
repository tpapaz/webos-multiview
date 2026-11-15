#pragma once
#include "../phase2-hdmi-picture/launch-clock.h"
#include "../phase2-hdmi-picture/session.h"
#include <atomic>
#include <cerrno>
#include <glib.h>
#include <pthread.h>
#include <unistd.h>

namespace hdmi {
// Review component only; not connected to an installable app or live runner.
// Caller retains context/callback-owner storage until stopAndJoin returns true.
class ContextDispatcher {
public:
    using Now = long long (*)();
    using Create = int (*)(pthread_t*, const pthread_attr_t*, void* (*)(void*), void*);
private:
    const Launch& launch_;
    Now now_; Create create_;
    GMainContext* context_=nullptr;
    pthread_t thread_{};
    bool attempted_=false, active_=false;
    std::atomic<bool> stop_{false}, ready_{false}, finished_{false};
    static void* dispatch(void* data) {
        auto& self=*static_cast<ContextDispatcher*>(data);
        if (g_main_context_acquire(self.context_)) {
            self.ready_.store(true);
            while (!self.stop_.load()) {
                for (int i=0; i<8 && !self.stop_.load() &&
                     g_main_context_iteration(self.context_,false); ++i) {}
                if (!self.stop_.load()) g_usleep(4000);
            }
            g_main_context_release(self.context_);
        }
        self.finished_.store(true);
        return nullptr;
    }
    bool within(long long started, long long now, bool cleanup) const {
        return started>=0 && now>=started && now-started<100 &&
            dispatchAllowed(launch_,now,cleanup);
    }
public:
    explicit ContextDispatcher(const Launch& launch, Now now=boottimeMs, Create create=pthread_create)
        :launch_(launch),now_(now),create_(create) {}
    ContextDispatcher(const ContextDispatcher&)=delete;
    ContextDispatcher& operator=(const ContextDispatcher&)=delete;
    ~ContextDispatcher() {
        // Never unwind callback-owner storage under an unjoined worker. The
        // adapter also checks active() before returning / writing exit intent.
        if (active_) _exit(75);
    }
    bool start(GMainContext* context) {
        if (attempted_) return false;
        attempted_=true;
        const auto started=now_();
        if (!context || !within(started,started,false)) return false;
        context_=context;
        if (create_(&thread_,nullptr,dispatch,this)!=0) return false;
        active_=true;
        for (;;) {
            if (!within(started,now_(),false)) { stop_.store(true); return false; }
            if (ready_.load()) return true;
            if (finished_.load()) return false;
            g_usleep(1000);
        }
    }
    bool stopAndJoin() {
        if (!active_) return true;
        // Main cancellation deliberately does NOT set this flag. Keep dispatch
        // alive through SDL_Quit, even after progression has been cancelled.
        stop_.store(true);
        const auto started=now_();
        while (within(started,now_(),true)) {
            const int result=pthread_tryjoin_np(thread_,nullptr);
            if (result==0) { active_=false; context_=nullptr; return true; }
            if (result!=EBUSY) return false;
            g_usleep(1000);
        }
        return false; // No detach, cancellation, unref or unbounded join.
    }
    bool active() const { return active_; }
};
static_assert(ATOMIC_BOOL_LOCK_FREE==2,"Retail correction requires lock-free callback flags");
} // namespace hdmi
