#pragma once
#include <functional>
#include <string>
namespace setup {
enum Stage { Lease, Egl, Runtime, BackHint, ExitHint, Init, DisplayMode, Window,
    Renderer, WindowSize, DimensionGuard, Blend, Black, Clear, Transparent, Fill,
    Present, ExportCreate, ExportIdGuard, ExportBind, Focus, Context, Register,
    Name, Attach, Disconnect, WindowIdGuard, Unregister, Unref, ExportDestroy,
    RendererDestroy, WindowDestroy, Quit };
struct Data { int displayW=-1, displayH=-1, windowW=-1, windowH=-1;
    int focusBefore=-1, focusAfter=-1, cancel=0; };
struct Backend {
    virtual ~Backend() = default;
    virtual bool call(Stage) = 0;
    virtual bool needed(Stage) const = 0;
    virtual Data data() const = 0;
};
class Trace {
    std::function<bool(const std::string&)> sink_;
    unsigned size_=0;
public:
    bool writable=true;
    explicit Trace(std::function<bool(const std::string&)> sink):sink_(sink) {}
    bool line(const std::string& s) {
        if (!writable || size_+s.size()>2048) return writable=false;
        size_+=s.size(); return writable=sink_(s);
    }
    bool event(int stage, int outcome) { return line("["+std::to_string(stage)+","+std::to_string(outcome)+"]\n"); }
    void metrics(const Data& d) {
        line("[90,"+std::to_string(d.displayW)+","+std::to_string(d.displayH)+","+
            std::to_string(d.windowW)+","+std::to_string(d.windowH)+","+
            std::to_string(d.focusBefore)+","+std::to_string(d.focusAfter)+","+std::to_string(d.cancel)+"]\n");
    }
};
struct Result { int failed=-1; bool ready=false, cleanup=true; };
inline Result run(Backend& b, Trace& t) {
    Result r;
    for (int n=Lease; n<=WindowIdGuard; ++n) {
        const auto s=static_cast<Stage>(n);
        if (!t.event(n,0)) { r.failed=n; break; }
        const auto d=b.data();
        const bool ok=s==DimensionGuard ? d.windowW==1920 && d.windowH==1080 : b.call(s);
        const bool optional=s==DisplayMode || s==Egl || s==Runtime || s==BackHint || s==ExitHint;
        t.event(n,ok?1:optional?3:2);
        if (s==DisplayMode || s==WindowSize || s==Focus) t.metrics(b.data());
        if (!ok && !optional) { r.failed=n; break; }
        if (!t.writable) { r.failed=n; break; }
        r.ready=s==WindowIdGuard;
    }
    for (int n=Unregister; n<=Quit; ++n) {
        const auto s=static_cast<Stage>(n);
        if (!b.needed(s)) continue;
        t.event(n,0); const bool ok=b.call(s); t.event(n,ok?1:2); r.cleanup &= ok;
    }
    t.line("[99,"+std::to_string(r.ready?1:0)+","+std::to_string(r.cleanup?1:0)+"]\n");
    return r;
}
}
