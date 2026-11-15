#pragma once
#include "../phase2-hdmi-picture/session.h"
#include <array>
#include <mutex>
#include <string>

namespace hdmi {
// Main owns progression/SDL. The sole GLib owner submits/cancels and publishes
// copied replies. No LSMessage pointer or token crosses into main-thread reads.
class CallbackReplies {
public:
    enum class Phase { Idle, Queued, Sending, Waiting, CancelQueued, Cancelling, Ready, Poisoned };
    enum class Action { None, Send, Cancel };
    struct Work { Action action=Action::None; int id=-1; std::string target,payload; bool cleanup=false; long long expires=-1; };
private:
    mutable std::mutex mutex_;
    Phase phase_=Phase::Idle;
    std::array<bool,4> received_{{false,false,false,false}};
    std::array<bool,4> returned_{{false,false,false,false}};
    Work work_; int count_=0;
    bool abandoned_=false,closed_=false;
    Reply reply_{Delivery::Uncertain,{}};
    void complete(Reply reply) {
        reply_=std::move(reply);
        phase_=abandoned_?Phase::Idle:Phase::Ready;
    }
public:
    int submit(const char* target,const std::string& payload,bool cleanup,long long now,long long expires) {
        std::lock_guard<std::mutex> lock(mutex_);
        if(closed_||phase_!=Phase::Idle||count_==4||!target||payload.empty()||payload.size()>4096||now<0||expires<=now)return -1;
        work_={Action::Send,count_++,target,payload,cleanup,expires};
        abandoned_=false;reply_={Delivery::Uncertain,{}};phase_=Phase::Queued;return work_.id;
    }
    Work next() {
        std::lock_guard<std::mutex> lock(mutex_);
        if(phase_==Phase::Queued){phase_=Phase::Sending;return work_;}
        if(phase_==Phase::CancelQueued){phase_=Phase::Cancelling;auto w=work_;w.action=Action::Cancel;return w;}
        return {};
    }
    void sent(int id,bool accepted) {
        std::lock_guard<std::mutex> lock(mutex_);
        returned_[static_cast<size_t>(id)]=true;
        if(id!=work_.id||phase_==Phase::Idle)return;
        if(!accepted){reply_={Delivery::Uncertain,{}};phase_=Phase::CancelQueued;}
        else if(received_[static_cast<size_t>(id)])complete(std::move(reply_));
        else if(phase_==Phase::Sending)phase_=Phase::Waiting;
    }
    void notSent(int id) {
        std::lock_guard<std::mutex> lock(mutex_);
        if(id==work_.id&&phase_!=Phase::Idle)complete({Delivery::NotSent,{}});
    }
    bool publish(int id,const char* payload,size_t size) {
        std::lock_guard<std::mutex> lock(mutex_);
        if(id<0||id>=count_||received_[id])return false;
        received_[id]=true;
        if(id!=work_.id||phase_==Phase::Idle||phase_==Phase::Poisoned)return false;
        reply_={Delivery::Reply,payload&&size<=4096?std::string(payload,size):std::string()};
        if(returned_[static_cast<size_t>(id)])complete(std::move(reply_));
        return true;
    }
    bool received(int id)const {
        std::lock_guard<std::mutex> lock(mutex_);return id>=0&&id<count_&&received_[id];
    }
    bool take(int id,Reply& reply) {
        std::lock_guard<std::mutex> lock(mutex_);
        if(id!=work_.id||phase_!=Phase::Ready)return false;
        reply=std::move(reply_);phase_=Phase::Idle;return true;
    }
    void abandon(int id) {
        std::lock_guard<std::mutex> lock(mutex_);
        if(id!=work_.id)return;
        abandoned_=true;
        if(phase_==Phase::Ready||phase_==Phase::Queued)phase_=Phase::Idle;
        else if(phase_==Phase::Sending||phase_==Phase::Waiting)phase_=Phase::CancelQueued;
    }
    void cancelled(int id,bool success) {
        std::lock_guard<std::mutex> lock(mutex_);
        if(id!=work_.id)return;
        if(!success)phase_=Phase::Poisoned;
        else complete({Delivery::Uncertain,{}});
    }
    void close() {
        std::lock_guard<std::mutex> lock(mutex_);closed_=true;abandoned_=true;
        if(phase_==Phase::Ready||phase_==Phase::Queued)phase_=Phase::Idle;
        else if(phase_==Phase::Sending||phase_==Phase::Waiting)phase_=Phase::CancelQueued;
    }
    bool idle()const {std::lock_guard<std::mutex> lock(mutex_);return phase_==Phase::Idle;}
    bool poisoned()const {std::lock_guard<std::mutex> lock(mutex_);return phase_==Phase::Poisoned;}
};
} // namespace hdmi
