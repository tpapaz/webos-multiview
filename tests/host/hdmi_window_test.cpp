#include "../../native/phase2-hdmi-window/session.h"
#include <cassert>
#include <cstdio>
#include <vector>

namespace {
using namespace hdmi;
struct Fake final : Platform {
    bool setup = true, cancellation = false, interval = true, cleanup = true;
    bool cancelAfterOpen = false, cancelAfterSelect = false;
    unsigned begins = 0, ends = 0, observations = 0;
    std::string window = "owned-window";
    std::vector<Step> calls;
    Reply open{Delivery::Reply, R"({"returnValue":true,"pipelineId":"own-pipeline"})"};
    Reply select{Delivery::Reply, R"({"returnValue":true})"};
    Reply stop{Delivery::Reply, R"({"returnValue":true})"};
    Reply close{Delivery::Reply, R"({"returnValue":true})"};
    bool begin() override { ++begins; return setup; }
    std::string windowId() const override { return window; }
    bool cancelled() override { return cancellation; }
    Reply exchange(Step step, const std::string& payload) override {
        calls.push_back(step);
        if (step == Step::Open) {
            assert(payload == R"({"options":{"appId":"io.github.tpapaz.multiview.hdmiwindow","windowId":"owned-window"},"inputSourceType":"HDMI"})");
            cancellation |= cancelAfterOpen;
            return open;
        }
        assert(payload == (step == Step::Select ? R"({"pipelineId":"own-pipeline","portId":4})" :
            R"({"pipelineId":"own-pipeline"})"));
        if (step == Step::Select) { cancellation |= cancelAfterSelect; return select; }
        if (step == Step::Stop) return stop;
        return close;
    }
    bool observe() override { ++observations; return interval; }
    bool end() override { ++ends; return cleanup; }
};
bool launch(const char* text) {
    const char* argv[]{"app", text};
    return optedIn(2, argv);
}
} // namespace
int main() {
    // Explicit HDMI-4 consent only; launch metadata supplies no routing authority.
    assert(launch(R"({"acquireHdmi4":true})"));
    assert(launch(R"({"acquireHdmi4":true,"@system_native_app":true,"nid":"metadata"})"));
    for (const char* text : {"{}", R"({"acquireHdmi4":false})", R"({"acquireHdmi4":1})",
            R"({"acquireHdmi4":true,"portId":1})", R"({"acquireHdmi4":true,"windowId":"borrowed"})",
            R"({"acquireHdmi4":true} {})", R"({"acquireHdmi4":true,"nid":"a\u0000b"})"}) assert(!launch(text));
    assert(!optedIn(1, nullptr));
    Fake dormant;
    assert(run(dormant, false).status == Status::OptInRequired);
    assert(!dormant.begins && !dormant.ends && dormant.calls.empty());

    Fake normal;
    auto r = run(normal, true);
    assert(r.status == Status::Completed && r.opened && r.selected && r.closed && !r.acquisitionUncertain);
    assert((normal.calls == std::vector<Step>{Step::Open, Step::Select, Step::Stop, Step::Close}));
    assert(normal.observations == 1 && normal.ends == 1);

    // A failed/invalid acquisition never selects a port or retries. Absence of
    // an ID after submission is explicitly uncertain, never a cleanup pass.
    for (const Reply& reply : {Reply{Delivery::Reply, R"({"returnValue":false})"},
            Reply{Delivery::Uncertain, ""}, Reply{Delivery::Reply, "not-json"},
            Reply{Delivery::Reply, R"({"returnValue":true,"pipelineId":"bad\u0000id"})"},
            Reply{Delivery::Reply, R"({"returnValue":true})"}, Reply{Delivery::Reply, std::string(4097, 'x')}}) {
        Fake failed; failed.open = reply;
        r = run(failed, true);
        assert(r.status == Status::OpenFailed && r.acquisitionUncertain && !r.closed);
        assert(failed.calls.size() == 1 && !failed.observations && failed.ends == 1);
    }
    Fake notSent; notSent.open = {Delivery::NotSent, ""};
    assert(!run(notSent, true).acquisitionUncertain);

    // Even a negative open with an owned ID must be closed, without selection.
    Fake negativeWithId;
    negativeWithId.open.text = R"({"returnValue":false,"pipelineId":"own-pipeline"})";
    r = run(negativeWithId, true);
    assert(r.status == Status::OpenFailed && r.closed && negativeWithId.calls.size() == 3);

    Fake cancelledOpen; cancelledOpen.cancelAfterOpen = true;
    r = run(cancelledOpen, true);
    assert(r.status == Status::Cancelled && r.closed && !r.selected && cancelledOpen.calls.size() == 3);
    Fake cancelledSelect; cancelledSelect.cancelAfterSelect = true;
    r = run(cancelledSelect, true);
    assert(r.status == Status::Cancelled && r.closed && !cancelledSelect.observations);
    Fake cancelledInterval; cancelledInterval.interval = false;
    r = run(cancelledInterval, true);
    assert(r.status == Status::Cancelled && r.closed);

    for (const Reply& reply : {Reply{Delivery::Reply, R"({"returnValue":false})"},
            Reply{Delivery::Uncertain, ""}, Reply{Delivery::Reply, R"({"returnValue":"true"})"}}) {
        Fake failed; failed.select = reply;
        r = run(failed, true);
        assert(r.status == Status::SelectFailed && r.closed && !failed.observations && failed.calls.size() == 4);
        Fake unclosed; unclosed.close = reply;
        r = run(unclosed, true);
        assert(r.status == Status::CleanupFailed && !r.closed && r.acquisitionUncertain);
        Fake unstopped; unstopped.stop = reply;
        r = run(unstopped, true);
        assert(r.status == Status::CleanupFailed && !r.stopped && r.closed && unstopped.calls.size() == 4);
    }
    Fake badCleanup; badCleanup.cleanup = false;
    assert(run(badCleanup, true).status == Status::CleanupFailed);
    for (const std::string& id : {std::string(), std::string(257, 'x'), std::string("bad\nid")}) {
        Fake invalid; invalid.window = id;
        assert(run(invalid, true).status == Status::SetupFailed && invalid.calls.empty() && invalid.ends == 1);
    }
    Fake setupFailed; setupFailed.setup = false;
    assert(run(setupFailed, true).status == Status::SetupFailed && setupFailed.calls.empty() && setupFailed.ends == 1);
    Fake cancelledBeforeOpen; cancelledBeforeOpen.cancellation = true;
    assert(run(cancelledBeforeOpen, true).status == Status::Cancelled && cancelledBeforeOpen.calls.empty() &&
        cancelledBeforeOpen.ends == 1);
    assert(request(Step::Open, "quoted\"id").find("quoted\\\"id") != std::string::npos);
    std::puts("HDMI window acquisition/ownership/cancellation acceptance checks passed");
}
