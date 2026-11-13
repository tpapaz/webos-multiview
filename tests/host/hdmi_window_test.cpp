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
            assert(payload == R"({"options":{"appId":"io.github.tpapaz.multiview.hdmiwindow","windowId":"owned-window","windowType":"NormalWindow"},"inputSourceType":"HDMI"})");
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
    return parseLaunch(2, argv).mode == Mode::Picture;
}
struct PolicyFake final : PolicyPlatform {
    bool setup = true, cleanup = true, cancel = false;
    unsigned begins = 0, ends = 0, cancelAfter = 5;
    std::vector<Step> calls;
    std::vector<Reply> replies = std::vector<Reply>(4, {Delivery::Reply, R"({"returnValue":true,"allowed":false})"});
    bool begin() override { ++begins; return setup; }
    bool cancelled() override { return cancel; }
    Reply policy(Step step) override {
        calls.push_back(step);
        const auto request = policyRequest(step);
        assert(request == std::string(R"({"uri":")") + uri(step) +
            R"(","requester":"io.github.tpapaz.multiview.hdmiwindow"})");
        cancel = calls.size() >= cancelAfter;
        return replies[calls.size() - 1];
    }
    bool end() override { ++ends; return cleanup; }
};
} // namespace
int main() {
    // Synthetic boot ID/clock only. Fresh boot-bound opt-in replaces unbounded opt-in.
    const std::string boot = "00112233-4455-6677-8899-aabbccddeeff";
    const std::string guard = R"("launchBootId":")" + boot + R"(","launchStartByBoottimeMs":103000)";
    const std::string fresh = R"({"acquireHdmi4":true,)" + guard + "}";
    assert(launch(fresh.c_str()));
    assert(launch((R"({"acquireHdmi4":true,"@system_native_app":true,"nid":"metadata",)" + guard + "}").c_str()));
    const char* clockArgv[]{"app", fresh.c_str()};
    const auto timed = parseLaunch(2, clockArgv);
    assert(launchAllowed(timed, boot, 100000));
    assert(launchAllowed(timed, boot, 102999));
    assert(!launchAllowed(timed, boot, 103000)); // Equality is expired, no late start.
    assert(!launchAllowed(timed, boot, 103001));
    assert(!launchAllowed(timed, boot, 99999)); // Never admit a lease over three seconds ahead.
    assert(!launchAllowed(timed, boot, -1));
    assert(!launchAllowed(timed, "ffeeddcc-bbaa-9988-7766-554433221100", 100000)); // Reboot/replay.
    assert(!launchAllowed(timed, "", 100000));
    assert(dispatchAllowed(timed, 100000, false));
    assert(dispatchAllowed(timed, 116999, false));
    assert(!dispatchAllowed(timed, 117000, false));
    assert(dispatchAllowed(timed, 121999, true));
    assert(!dispatchAllowed(timed, 122000, true));
    assert(!dispatchAllowed(timed, 200000, false)); // Resume after owner handoff cannot dispatch.
    assert(!dispatchAllowed(timed, 200000, true));
    assert(!dispatchAllowed(timed, -1, true));
    assert(!dispatchAllowed(timed, 99999, true));
    assert(!launch(R"({"acquireHdmi4":true})"));
    for (const char* text : {"{}", R"({"acquireHdmi4":false})", R"({"acquireHdmi4":1})",
            R"({"acquireHdmi4":true,"portId":1})", R"({"acquireHdmi4":true,"windowId":"borrowed"})",
            R"({"acquireHdmi4":true} {})", R"({"acquireHdmi4":true,"nid":"a\u0000b"})"}) assert(!launch(text));
    assert(parseLaunch(1, nullptr).mode == Mode::Inert);
    for (const char* deadline : {"null", "true", "\"103000\"", "103000.0", "-1", "0", "9007199254740992"})
        assert(!launch((R"({"acquireHdmi4":true,"launchBootId":")" + boot +
            R"(","launchStartByBoottimeMs":)" + deadline + "}").c_str()));
    for (const char* invalidBoot : {"", "borrowed", "00112233-4455-6677-8899-AABBCCDDEEFF",
            "00112233-4455-6677-8899-aabbccddeefg", "00112233-4455-6677-8899-aabbccddee\\u0000"})
        assert(!launch((std::string(R"({"acquireHdmi4":true,"launchBootId":")") + invalidBoot +
            R"(","launchStartByBoottimeMs":103000})").c_str()));
    for (const auto* phase : {"baseline", "overlay", "removed", "picture-ready", "after-picture"}) {
        const auto text = std::string("{\"checkUtpAdmission\":\"") + phase + "\"}";
        const char* argv[]{"app", text.c_str()};
        assert(parseLaunch(2, argv).mode != Mode::Inert && parseLaunch(2, argv).mode != Mode::Picture);
        assert(std::string(modeName(parseLaunch(2, argv).mode)) == phase);
    }
    for (const auto* text : {R"({"checkUtpAdmission":true})", R"({"checkUtpAdmission":"other"})",
            R"({"checkUtpAdmission":"overlay","acquireHdmi4":true})",
            R"({"checkUtpAdmission":"overlay","uri":"borrowed"})",
            R"({"checkUtpAdmission":"overlay\u0000"})",
            R"({"checkUtpAdmission":"baseline","launchStartByBoottimeMs":103000})"}) {
        const char* argv[]{"app", text}; assert(parseLaunch(2, argv).mode == Mode::Inert);
    }
    Fake dormant;
    assert(run(dormant, false).status == Status::OptInRequired);
    assert(!dormant.begins && !dormant.ends && dormant.calls.empty());

    Fake normal;
    auto r = run(normal, true);
    assert(r.status == Status::Completed && r.opened && r.selected && r.stopAcknowledged &&
        r.closeAcknowledged && r.acquisitionUncertain && r.localCleanup);
    assert((normal.calls == std::vector<Step>{Step::Open, Step::Select, Step::Stop, Step::Close}));
    assert(normal.observations == 1 && normal.ends == 1);

    // A successful wrapper reply can contain a failed backend close. Neither
    // that reply nor successful local cleanup establishes hardware release.
    Fake maskedClose;
    maskedClose.close.text = R"({"returnValue":true,"results":[{"result":{"returnValue":false}}]})";
    r = run(maskedClose, true);
    assert(r.status == Status::Completed && r.closeAcknowledged &&
        r.acquisitionUncertain && r.localCleanup && maskedClose.calls.size() == 4);

    // A failed/invalid acquisition never selects a port or retries. Absence of
    // an ID after submission is explicitly uncertain, never a cleanup pass.
    for (const Reply& reply : {Reply{Delivery::Reply, R"({"returnValue":false})"},
            Reply{Delivery::Uncertain, ""}, Reply{Delivery::Reply, "not-json"},
            Reply{Delivery::Reply, R"({"returnValue":true,"pipelineId":"bad\u0000id"})"},
            Reply{Delivery::Reply, R"({"returnValue":true})"}, Reply{Delivery::Reply, std::string(4097, 'x')}}) {
        Fake failed; failed.open = reply;
        r = run(failed, true);
        assert(r.status == Status::OpenFailed && r.acquisitionUncertain && !r.closeAcknowledged);
        assert(failed.calls.size() == 1 && !failed.observations && failed.ends == 1);
    }
    Fake notSent; notSent.open = {Delivery::NotSent, ""};
    assert(!run(notSent, true).acquisitionUncertain);

    // Even a negative open with an owned ID must be closed, without selection.
    Fake negativeWithId;
    negativeWithId.open.text = R"({"returnValue":false,"pipelineId":"own-pipeline"})";
    r = run(negativeWithId, true);
    assert(r.status == Status::OpenFailed && r.closeAcknowledged && r.acquisitionUncertain && negativeWithId.calls.size() == 3);

    Fake cancelledOpen; cancelledOpen.cancelAfterOpen = true;
    r = run(cancelledOpen, true);
    assert(r.status == Status::Cancelled && r.closeAcknowledged && r.acquisitionUncertain && !r.selected && cancelledOpen.calls.size() == 3);
    Fake cancelledSelect; cancelledSelect.cancelAfterSelect = true;
    r = run(cancelledSelect, true);
    assert(r.status == Status::Cancelled && r.closeAcknowledged && !cancelledSelect.observations);
    Fake cancelledInterval; cancelledInterval.interval = false;
    r = run(cancelledInterval, true);
    assert(r.status == Status::Cancelled && r.closeAcknowledged);

    for (const Reply& reply : {Reply{Delivery::Reply, R"({"returnValue":false})"},
            Reply{Delivery::Uncertain, ""}, Reply{Delivery::NotSent, ""},
            Reply{Delivery::Reply, R"({"returnValue":"true"})"}}) {
        Fake failed; failed.select = reply;
        r = run(failed, true);
        assert(r.status == Status::SelectFailed && r.closeAcknowledged && !failed.observations && failed.calls.size() == 4);
        Fake unclosed; unclosed.close = reply;
        r = run(unclosed, true);
        assert(r.status == Status::CleanupFailed && !r.closeAcknowledged && r.acquisitionUncertain);
        Fake unstopped; unstopped.stop = reply;
        r = run(unstopped, true);
        assert(r.status == Status::CleanupFailed && !r.stopAcknowledged && r.closeAcknowledged && unstopped.calls.size() == 4);
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
    // Admission-only probes never have a target-operation interface. Denial is
    // a recorded prediction; query errors/cancellation stop without target calls.
    PolicyFake denied;
    auto policy = checkPolicy(denied);
    assert(policy.status == PolicyStatus::Checked && policy.callerReady && policy.localCleanup && policy.calls == 4);
    assert((denied.calls == std::vector<Step>{Step::Open, Step::Select, Step::Stop, Step::Close}));
    for (int allowed : policy.allowed) assert(allowed == 0);
    PolicyFake allowed;
    allowed.replies.assign(4, {Delivery::Reply, R"({"returnValue":true,"allowed":true,"privateData":"must-not-export"})"});
    policy = checkPolicy(allowed);
    for (int value : policy.allowed) assert(value == 1);
    const auto policyReport = report(policy, Mode::Overlay, 12);
    assert(policyReport.find("must-not-export") == std::string::npos &&
        policyReport.find("\"actualUtpCalls\":0") != std::string::npos &&
        policyReport.find("\"policyAllowed\":[1,1,1,1]") != std::string::npos);
    for (const Reply& reply : {Reply{Delivery::Uncertain, ""}, Reply{Delivery::NotSent, ""},
            Reply{Delivery::Reply, R"({"returnValue":true,"allowed":1})"},
            Reply{Delivery::Reply, R"({"returnValue":false,"allowed":true})"},
            Reply{Delivery::Reply, R"({"returnValue":true,"allowed":true,"subscribed":true})"},
            Reply{Delivery::Reply, std::string(4097, 'x')}}) {
        PolicyFake failed; failed.replies[0] = reply;
        policy = checkPolicy(failed);
        assert(policy.status == PolicyStatus::QueryFailed && policy.calls == 1 && policy.allowed[0] == -1 && failed.ends == 1);
    }
    PolicyFake cancelledPolicy; cancelledPolicy.cancelAfter = 2;
    policy = checkPolicy(cancelledPolicy);
    assert(policy.status == PolicyStatus::Cancelled && policy.calls == 2 && policy.allowed[1] == -1);
    PolicyFake uncleanPolicy; uncleanPolicy.cleanup = false;
    assert(checkPolicy(uncleanPolicy).status == PolicyStatus::CleanupFailed);
    const auto pictureReport = report(run(normal, true), 100);
    assert(pictureReport.find("own-pipeline") == std::string::npos &&
        pictureReport.find("owned-window") == std::string::npos &&
        pictureReport.find("\"hardwareRelease\":\"unknown\"") != std::string::npos);
    std::puts("HDMI window acquisition/ownership/cancellation acceptance checks passed");
}
