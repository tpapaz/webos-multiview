#include "../../native/phase1-endurance/progress.h"
#include <cassert>
int main() {
    endurance::ProgressWatch initial(0);
    assert(initial.observe(8000,0,0)); assert(!initial.observe(8001,0,0));
    endurance::ProgressWatch stalled(0);
    assert(stalled.observe(100,1,100)); assert(stalled.observe(5100,2,100));
    assert(!stalled.observe(5101,3,100));
    endurance::ProgressWatch regression(0);
    assert(regression.observe(1000,5,1000)); assert(!regression.observe(2000,10,0));
    endurance::ProgressWatch longRun(0);
    for(unsigned sec=1;sec<=1800;++sec) assert(longRun.observe(sec*1000,sec*5,sec*1000));
    assert(!longRun.observe(1806001,9000,1800000));
}
