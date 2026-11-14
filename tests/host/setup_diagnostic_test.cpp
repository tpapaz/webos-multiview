#include "../../native/phase2-setup-diagnostic/setup.h"
#include <cassert>
#include <vector>
struct Fake:setup::Backend {
    int fail=-1; bool mismatch=false; std::vector<int> calls;
    bool call(setup::Stage s)override{calls.push_back(s);return s!=fail;}
    bool needed(setup::Stage)const override{return true;}
    setup::Data data()const override{setup::Data d;d.windowW=mismatch?3840:1920;d.windowH=1080;return d;}
};
int main(){
    for(int failed=-1;failed<=setup::Quit;++failed){
        Fake f;f.fail=failed;f.mismatch=failed==setup::DimensionGuard;
        std::string output;setup::Trace trace([&](const std::string& s){output+=s;return true;});
        const auto r=setup::run(f,trace);
        const bool optional=failed==setup::Egl || failed==setup::Runtime || failed==setup::BackHint || failed==setup::ExitHint || failed==setup::DisplayMode;
        const bool setupFailure=failed>=0 && failed<=setup::WindowIdGuard && !optional;
        assert(r.ready==!setupFailure);
        assert(r.failed==(setupFailure?failed:-1));
        assert(r.cleanup==(failed<setup::Unregister));
        if(setupFailure){
            assert(output.find("["+std::to_string(failed)+",0]\n")!=std::string::npos);
            assert(output.find("["+std::to_string(failed)+",2]\n")!=std::string::npos);
            for(int stage:f.calls)assert(stage<=failed || stage>=setup::Unregister);
        }
        assert(output.size()<1800); // Leaves space for binding header and exit-intent row.
    }
    Fake f;int writes=0;setup::Trace broken([&](const std::string&){return ++writes<2;});
    const auto r=setup::run(f,broken);assert(!r.ready && !broken.writable);
    for(int call:f.calls)assert(call==setup::Lease || call>=setup::Unregister);
}
