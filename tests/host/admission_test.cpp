#include "../../native/phase2-admission/admission.h"
#include <cassert>
#include <iostream>
#include <vector>
using namespace admission;
const std::string yes = "{\"returnValue\":true,\"allowed\":true}";
const std::string empty = "{\"returnValue\":true,\"publishedWindows\":[]}";
const std::string window = "{\"publishId\":1,\"appId\":\"com.webos.app.hdmi1\","
    "\"windowId\":\"private-window\",\"width\":1920,\"height\":1080}";
struct Fake final : Transport {
    int64_t now = 0, beginDelay = 0, replyDelay = 1;
    int cancelAt = -1, failSendAt = -1;
    bool beginOk = true, nameOk = true, disconnect = false, closeOk = true, neverReply = false;
    bool pending = false, closed = false, cancelledPending = false;
    unsigned closes = 0, begins = 0;
    std::vector<Step> sent;
    std::vector<std::string> replies{yes, yes, empty};
    int64_t nowMs() const override { return now; }
    bool cancelled() const override { return cancelAt >= 0 && now >= cancelAt; }
    bool begin() override { ++begins; now += beginDelay; return beginOk; }
    const char* name() const override { return nameOk ? appId : "another.app"; }
    bool send(Step step) override {
        assert(!closed && !pending);
        const auto r = request(step);
        // This asserts the security acceptance boundary, including the policy-only setter string.
        const std::string uri = r.uri;
        assert(uri == "luna://com.webos.service.bus/isCallAllowed" ||
            uri == "luna://com.webos.service.iwc/listPublishedWindows");
        assert(std::string(r.payload).find("setExportedWindow") == std::string::npos ||
            uri == "luna://com.webos.service.bus/isCallAllowed");
        sent.push_back(step);
        pending = static_cast<int>(sent.size()) != failSendAt;
        return pending;
    }
    int poll(std::string& payload) override {
        now += replyDelay;
        if (disconnect) return -1;
        if (neverReply) return 0;
        payload = replies.at(sent.size() - 1);
        pending = false;
        return 1;
    }
    bool close() override {
        ++closes; closed = true; cancelledPending = pending; pending = false;
        return closeOk;
    }
};
int main() {
    const std::string launch = "{\"@system_native_app\":true,\"nid\":\"synthetic-launch-id\"}";
    for (const int count : {1, 2}) {
        const char* args[] = {"multiview-admission", launch.c_str()};
        Fake f;
        assert(runFromLaunch(f, count, args).status == Status::Passed);
        assert(f.begins == 1 && f.sent.size() == 3);
    }
    for (const auto& bad : std::vector<std::string>{"", "{}", "null", "[]", "{",
         launch + "junk", launch + launch, std::string(1025, 'x'),
         "{\"@system_native_app\":false,\"nid\":\"x\"}",
         "{\"@system_native_app\":1,\"nid\":\"x\"}",
         "{\"@system_native_app\":true,\"nid\":1}",
         "{\"@system_native_app\":true,\"nid\":\"\"}",
         "{\"@system_native_app\":true,\"nid\":\"a\\u0000b\"}",
         "{\"@system_native_app\":true,\"nid\":\"a\\nb\"}",
         "{\"@system_native_app\":true,\"nid\":\"" + std::string(257, 'x') + "\"}",
         "{\"@system_native_app\":true,\"nid\":\"x\",\"uri\":\"override\"}",
         "{\"@system_native_app\":true,\"appId\":\"override\"}"}) {
        const char* args[] = {"multiview-admission", bad.c_str()};
        Fake f; const auto rejected = runFromLaunch(f, 2, args);
        assert(rejected.status == Status::InvalidLaunch && rejected.clean && rejected.calls == 0);
        assert(f.begins == 0 && f.sent.empty() && f.closes == 0);
    }
    { const char* args[] = {"multiview-admission", launch.c_str(), "extra"};
      Fake f; assert(runFromLaunch(f, 3, args).status == Status::InvalidLaunch); assert(f.begins == 0); }
    Fake ok;
    auto r = run(ok);
    assert(r.status == Status::Passed && r.clean && r.listed && r.calls == 3);
    assert(r.listPolicy == 1 && r.resetPolicy == 1 && r.publications == 0);
    assert((ok.sent == std::vector<Step>{Step::ListPolicy, Step::ResetPolicy, Step::List}));
    assert(ok.closes == 1 && !ok.cancelledPending);
    Fake selected;
    selected.replies[2] = "{\"returnValue\":true,\"publishedWindows\":[" + window + "]}";
    r = run(selected);
    assert(r.status == Status::Passed && r.hdmiCandidates == 1 && r.publications == 1);
    for (unsigned stage = 0; stage < 3; ++stage) {
        for (const auto& bad : std::vector<std::string>{"{}", "[]", "null", "{", "",
             "{\"returnValue\":1}", yes + "garbage", yes + yes, std::string(32769, 'x'),
             std::string("{}\0junk", 7), "{\"returnValue\":true,\"subscribed\":true}"}) {
            Fake f; f.replies[stage] = bad; r = run(f);
            assert(r.status == Status::Malformed && r.calls == stage + 1 && !r.listed);
            assert(f.closes == 1);
        }
        Fake denied; denied.replies[stage] = "{\"returnValue\":false,\"errorText\":\"SECRET\"}";
        r = run(denied);
        assert(r.status == Status::Denied && r.calls == stage + 1);
        Fake send; send.failSendAt = static_cast<int>(stage + 1); r = run(send);
        assert(r.status == Status::Transport && r.calls == stage + 1 && send.closes == 1);
    }
    for (unsigned stage = 0; stage < 2; ++stage) {
        Fake denied; denied.replies[stage] = "{\"returnValue\":true,\"allowed\":false}";
        r = run(denied);
        assert(r.status == Status::Denied && r.calls == stage + 1 && !r.listed);
        Fake wrong; wrong.replies[stage] = "{\"returnValue\":true,\"allowed\":\"true\"}";
        assert(run(wrong).status == Status::Malformed);
    }
    for (const auto& list : std::vector<std::string>{"null", "{}", "[{}]", "["+window+","+window+"]"}) {
        Fake f; f.replies[2] = "{\"returnValue\":true,\"publishedWindows\":"+list+"}";
        assert(run(f).status == Status::Malformed);
    }
    std::string many = "[";
    for (int i = 0; i < 65; ++i) many += (i ? "," : "") + window;
    Fake limit; limit.replies[2] = "{\"returnValue\":true,\"publishedWindows\":"+many+"]}";
    assert(run(limit).status == Status::Malformed);
    for (const auto& dimension : {"0", "-1", "2147483648", "1.5", "\"1920\""}) {
        Fake f;
        std::string badWindow = window;
        badWindow.replace(badWindow.find("1920"), 4, dimension);
        f.replies[2] = "{\"returnValue\":true,\"publishedWindows\":["+badWindow+"]}";
        assert(run(f).status == Status::Malformed);
    }
    Fake identity; identity.nameOk = false;
    assert(run(identity).status == Status::Identity && identity.sent.empty());
    Fake registration; registration.beginOk = false;
    assert(run(registration).status == Status::Registration && registration.sent.empty());
    Fake cancel; cancel.cancelAt = 1;
    assert(run(cancel).status == Status::Cancelled && cancel.sent.size() == 1);
    Fake before; before.cancelAt = 0;
    assert(run(before).status == Status::Cancelled && before.sent.empty());
    Fake waiting; waiting.neverReply = true; waiting.replyDelay = 100;
    assert(run(waiting).status == Status::Timeout && waiting.cancelledPending && waiting.sent.size() == 1);
    Fake waitingCancel; waitingCancel.neverReply = true; waitingCancel.cancelAt = 2;
    assert(run(waitingCancel).status == Status::Cancelled && waitingCancel.cancelledPending);
    Fake timeout; timeout.replyDelay = 2000;
    assert(run(timeout).status == Status::Timeout && timeout.sent.size() == 1);
    Fake startup; startup.beginDelay = 7000;
    assert(run(startup).status == Status::Deadline && startup.sent.empty());
    Fake total; total.beginDelay = 6000; total.replyDelay = 1000;
    assert(run(total).status == Status::Deadline && total.sent.size() == 1);
    Fake disconnect; disconnect.disconnect = true;
    assert(run(disconnect).status == Status::Transport && disconnect.cancelledPending);
    Fake cleanup; cleanup.closeOk = false;
    r = run(cleanup);
    assert(r.status == Status::Cleanup && r.listed && !r.clean);
    Fake deniedCleanup; deniedCleanup.closeOk = false; deniedCleanup.replies[0] = "{\"returnValue\":false}";
    r = run(deniedCleanup);
    assert(r.status == Status::Denied && !r.clean);
    assert(request(static_cast<Step>(99)).uri == nullptr);
    std::cout << "PASS: fixed read-only calls, identity, fail-closed replies, bounds, cancellation and cleanup\n";
}
