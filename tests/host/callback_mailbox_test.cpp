#include "../../native/phase2-hdmi-dispatch/replies.h"
#include <cassert>
#include <thread>
#include <iostream>
void mailboxAcceptance(){
 for(int i=0;i<100;++i){hdmi::CallbackReplies q;const int id=q.submit("uri","payload",false,0,2000);assert(id==0);assert(q.next().action==hdmi::CallbackReplies::Action::Send);
   hdmi::Reply reply{};std::thread callback([&]{assert(q.publish(id,"ok",2));});callback.join();assert(!q.take(id,reply));q.sent(id,true);assert(q.take(id,reply));assert(reply.text=="ok");
   const int newer=q.submit("uri","new",true,1,2000);assert(newer==1);assert(!q.publish(id,"stale",5));assert(q.next().id==newer);q.sent(newer,true);q.abandon(newer);assert(q.next().action==hdmi::CallbackReplies::Action::Cancel);q.cancelled(newer,true);assert(q.idle());
 }
 hdmi::CallbackReplies q;const int id=q.submit("uri","payload",false,0,2000);q.next();q.publish(id,"reply before failed return",26);q.sent(id,false);hdmi::Reply r{};assert(!q.take(id,r));assert(q.next().action==hdmi::CallbackReplies::Action::Cancel);q.cancelled(id,false);assert(q.poisoned());assert(q.submit("uri","blocked",true,1,2000)==-1);
}
int main(){mailboxAcceptance();std::cout<<"Bounded callback mailbox: early reply waits for accepted return, stale/duplicate replies ignored, cancellation failure poisons progression; 100 concurrent cases passed\n";}
