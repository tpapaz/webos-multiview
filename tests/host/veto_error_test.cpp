#include "../../native/phase1-endurance/error-reason.h"
#include <cassert>
#include <climits>
#include <string>
int main() {
    using endurance::errorReason;
    assert(errorReason(nullptr)==0);
    assert(errorReason("LSCallFromApplication: not privileged; private-token")==1);
    assert(errorReason("PERMISSION DENIED secret-identity")==1);
    assert(errorReason("Service does not exist")==2);
    assert(errorReason("invalid argument secret-value")==3);
    assert(errorReason("transport disconnected")==4);
    assert(errorReason("request timed out")==5);
    assert(errorReason("opaque vendor text private-token")==6);
    assert(errorReason((std::string(300,'x')+"permission").c_str())==6);
    assert(endurance::errorMagnitude(INT_MIN)==1000001);
    assert(endurance::errorMagnitude(-123)==123);
}
