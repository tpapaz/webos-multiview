#include "session.h"
#include <json-c/json.h>
#include <cstring>
#include <memory>

namespace hdmi {
namespace {
using Json = std::unique_ptr<json_object, decltype(&json_object_put)>;
Json parse(const std::string& text) {
    Json result(nullptr, json_object_put);
    if (text.empty() || text.size() > 4096 || text.find('\0') != std::string::npos) return result;
    std::unique_ptr<json_tokener, decltype(&json_tokener_free)> tok(json_tokener_new(), json_tokener_free);
    if (!tok) return result;
    json_tokener_set_flags(tok.get(), JSON_TOKENER_STRICT);
    result.reset(json_tokener_parse_ex(tok.get(), text.c_str(), static_cast<int>(text.size() + 1)));
    if (json_tokener_get_error(tok.get()) != json_tokener_success || !result ||
        json_object_get_type(result.get()) != json_type_object) result.reset();
    return result;
}
json_object* field(json_object* object, const char* key, json_type type) {
    json_object* value = nullptr;
    return object && json_object_object_get_ex(object, key, &value) && value &&
        json_object_get_type(value) == type ? value : nullptr;
}
bool validId(const std::string& id) {
    if (id.empty() || id.size() > 256) return false;
    for (unsigned char c : id) if (c < 0x21 || c > 0x7e) return false;
    return true;
}
bool validBootId(const std::string& id) {
    if (id.size() != 36) return false;
    for (size_t i = 0; i < id.size(); ++i) {
        if (i == 8 || i == 13 || i == 18 || i == 23) {
            if (id[i] != '-') return false;
        } else if (!((id[i] >= '0' && id[i] <= '9') || (id[i] >= 'a' && id[i] <= 'f'))) return false;
    }
    return true;
}
bool accepted(json_object* object) {
    auto* success = field(object, "returnValue", json_type_boolean);
    return success && json_object_get_boolean(success);
}
Json response(const Reply& reply) {
    return reply.delivery == Delivery::Reply ? parse(reply.text) : Json(nullptr, json_object_put);
}
} // namespace

const char* uri(Step step) {
    switch (step) {
    case Step::Open: return "luna://com.webos.service.utp.extinputs/open";
    case Step::Select: return "luna://com.webos.service.utp.extinputs/switchExternalInput";
    case Step::Stop: return "luna://com.webos.service.utp.extinputs/stop";
    case Step::Close: return "luna://com.webos.service.utp.extinputs/close";
    }
    return nullptr;
}
std::string request(Step step, const std::string& ownedId) {
    if (!validId(ownedId)) return {};
    Json object(json_object_new_object(), json_object_put);
    if (step == Step::Open) {
        auto* options = json_object_new_object();
        json_object_object_add(options, "appId", json_object_new_string(appId));
        json_object_object_add(options, "windowId", json_object_new_string(ownedId.c_str()));
        json_object_object_add(options, "windowType", json_object_new_string("NormalWindow"));
        json_object_object_add(object.get(), "options", options);
        json_object_object_add(object.get(), "inputSourceType", json_object_new_string("HDMI"));
    } else {
        json_object_object_add(object.get(), "pipelineId", json_object_new_string(ownedId.c_str()));
        if (step == Step::Select) json_object_object_add(object.get(), "portId", json_object_new_int(4));
    }
    return json_object_to_json_string_ext(object.get(), JSON_C_TO_STRING_PLAIN);
}
Launch parseLaunch(int argc, const char* const* argv) {
    if (argc != 2 || !argv || !argv[1] || strnlen(argv[1], 4097) > 4096) return {};
    auto object = parse(argv[1]);
    auto* yes = field(object.get(), "acquireHdmi4", json_type_boolean);
    auto* phase = field(object.get(), "checkUtpAdmission", json_type_string);
    Mode mode = Mode::Inert;
    if (yes && json_object_get_boolean(yes)) mode = Mode::Picture;
    if (phase) {
        const std::string value(json_object_get_string(phase), json_object_get_string_len(phase));
        if (value == "baseline") mode = Mode::Baseline;
        else if (value == "overlay") mode = Mode::Overlay;
        else if (value == "removed") mode = Mode::Removed;
        else if (value == "picture-ready") mode = Mode::PictureReady;
        else if (value == "after-picture") mode = Mode::AfterPicture;
        else return {};
    }
    if (mode == Mode::Inert || (yes && phase)) return {};
    Launch launch;
    launch.mode = mode;
    if (mode == Mode::Picture) {
        auto* boot = field(object.get(), "launchBootId", json_type_string);
        auto* deadline = field(object.get(), "launchStartByBoottimeMs", json_type_int);
        if (!boot || !deadline) return {};
        launch.bootId.assign(json_object_get_string(boot), json_object_get_string_len(boot));
        launch.startByBoottimeMs = json_object_get_int64(deadline);
        if (!validBootId(launch.bootId) || launch.startByBoottimeMs <= 0 ||
            launch.startByBoottimeMs > 9007199254740991LL) return {};
    }
    // Launcher metadata is allowed but never used as app/window/pipeline identity.
    json_object_object_foreach(object.get(), key, value) {
        if (!std::strcmp(key, mode == Mode::Picture ? "acquireHdmi4" : "checkUtpAdmission")) continue;
        if (mode == Mode::Picture && (!std::strcmp(key, "launchBootId") ||
            !std::strcmp(key, "launchStartByBoottimeMs"))) continue;
        if (!std::strcmp(key, "@system_native_app") && value &&
            json_object_get_type(value) == json_type_boolean && json_object_get_boolean(value)) continue;
        if (!std::strcmp(key, "nid") && value && json_object_get_type(value) == json_type_string &&
            validId(std::string(json_object_get_string(value), json_object_get_string_len(value)))) continue;
        return {};
    }
    return launch;
}
bool launchAllowed(const Launch& launch, const std::string& bootId, long long boottimeMs) {
    return launch.mode == Mode::Picture && validBootId(bootId) && launch.bootId == bootId &&
        boottimeMs >= 0 && launch.startByBoottimeMs > boottimeMs &&
        launch.startByBoottimeMs - boottimeMs <= 3000;
}
bool dispatchAllowed(const Launch& launch, long long boottimeMs, bool cleanup) {
    // Progress ends at issue +17 s, cleanup dispatch at issue +22 s, including
    // time spent suspended. Never let resumption turn an old opt-in into work.
    return launch.mode == Mode::Picture && boottimeMs >= 0 &&
        launch.startByBoottimeMs >= 3000 && boottimeMs >= launch.startByBoottimeMs - 3000 &&
        boottimeMs < launch.startByBoottimeMs + (cleanup ? 19000 : 14000);
}
const char* modeName(Mode mode) {
    switch (mode) {
    case Mode::Picture: return "picture";
    case Mode::Baseline: return "baseline";
    case Mode::Overlay: return "overlay";
    case Mode::Removed: return "removed";
    case Mode::PictureReady: return "picture-ready";
    case Mode::AfterPicture: return "after-picture";
    case Mode::Inert: return "inert";
    }
    return "inert";
}
const char* reportFilename(Mode mode) {
    switch (mode) {
    case Mode::Picture: return "picture-0.1.3.json";
    case Mode::Baseline: return "admission-baseline-0.1.3.json";
    case Mode::Overlay: return "admission-overlay-0.1.3.json";
    case Mode::Removed: return "admission-removed-0.1.3.json";
    case Mode::PictureReady: return "admission-picture-ready-0.1.3.json";
    case Mode::AfterPicture: return "admission-after-picture-0.1.3.json";
    case Mode::Inert: return nullptr;
    }
    return nullptr;
}
const char* statusName(Status status) {
    switch (status) {
    case Status::OptInRequired: return "opt_in_required";
    case Status::SetupFailed: return "setup_failed";
    case Status::OpenFailed: return "open_failed";
    case Status::SelectFailed: return "select_failed";
    case Status::Cancelled: return "cancelled";
    case Status::Completed: return "candidate_interval_completed";
    case Status::CleanupFailed: return "cleanup_failed";
    }
    return "unknown";
}
Result run(Platform& p, bool optIn) {
    Result result;
    if (!optIn) return result; // No graphics, registration or IPC before explicit opt-in.
    std::string pipeline;
    const auto finish = [&]() {
        if (!pipeline.empty()) {
            // Close only the ID returned by this attempt's own open, including
            // cancellation after open and a rejected/uncertain port selection.
            auto stopped = response(p.exchange(Step::Stop, request(Step::Stop, pipeline)));
            result.stopAcknowledged = accepted(stopped.get());
            auto reply = response(p.exchange(Step::Close, request(Step::Close, pipeline)));
            result.closeAcknowledged = accepted(reply.get());
            // UTP can acknowledge close after a backend failure. Keep allocation
            // uncertainty independent of these wrapper acknowledgments.
        }
        result.localCleanup = p.end();
        if ((!result.stopAcknowledged || !result.closeAcknowledged || !result.localCleanup) &&
            result.status == Status::Completed) result.status = Status::CleanupFailed;
        return result;
    };
    result.status = Status::SetupFailed;
    if (!p.begin() || !validId(p.windowId())) return finish();
    if (p.cancelled()) { result.status = Status::Cancelled; return finish(); }
    result.status = Status::OpenFailed;
    const auto openReply = p.exchange(Step::Open, request(Step::Open, p.windowId()));
    result.acquisitionUncertain = openReply.delivery != Delivery::NotSent;
    auto open = response(openReply);
    if (auto* id = field(open.get(), "pipelineId", json_type_string)) {
        std::string candidate(json_object_get_string(id), json_object_get_string_len(id));
        if (validId(candidate)) pipeline = candidate;
    }
    result.opened = accepted(open.get()) && !pipeline.empty();
    if (!result.opened) return finish();
    if (p.cancelled()) { result.status = Status::Cancelled; return finish(); }
    result.status = Status::SelectFailed;
    auto selected = response(p.exchange(Step::Select, request(Step::Select, pipeline)));
    result.selected = accepted(selected.get());
    if (!result.selected) return finish();
    result.status = !p.cancelled() && p.observe() ? Status::Completed : Status::Cancelled;
    return finish();
}

std::string policyRequest(Step step) {
    const char* target = uri(step);
    if (!target) return {};
    return std::string("{\"uri\":\"") + target + "\",\"requester\":\"" + appId + "\"}";
}
PolicyResult checkPolicy(PolicyPlatform& p) {
    PolicyResult result;
    const auto finish = [&]() {
        result.localCleanup = p.end();
        if (!result.localCleanup) result.status = PolicyStatus::CleanupFailed;
        return result;
    };
    if (!p.begin()) return finish();
    result.callerReady = true;
    const Step steps[] = {Step::Open, Step::Select, Step::Stop, Step::Close};
    for (unsigned i = 0; i < 4; ++i) {
        if (p.cancelled()) { result.status = PolicyStatus::Cancelled; return finish(); }
        ++result.calls;
        auto object = response(p.policy(steps[i]));
        if (p.cancelled()) { result.status = PolicyStatus::Cancelled; return finish(); }
        auto* allowed = field(object.get(), "allowed", json_type_boolean);
        json_object* subscribed = nullptr;
        if (!accepted(object.get()) || !allowed ||
            (json_object_object_get_ex(object.get(), "subscribed", &subscribed) &&
             (!subscribed || json_object_get_type(subscribed) != json_type_boolean ||
              json_object_get_boolean(subscribed)))) {
            result.status = PolicyStatus::QueryFailed;
            return finish();
        }
        result.allowed[i] = json_object_get_boolean(allowed) ? 1 : 0;
    }
    result.status = PolicyStatus::Checked; // False predictions are valid query results.
    return finish();
}
namespace {
Json reportBase(Mode mode, long long elapsedMs) {
    Json object(json_object_new_object(), json_object_put);
    json_object_object_add(object.get(), "schemaVersion", json_object_new_int(1));
    json_object_object_add(object.get(), "appId", json_object_new_string(appId));
    json_object_object_add(object.get(), "appVersion", json_object_new_string(appVersion));
    json_object_object_add(object.get(), "mode", json_object_new_string(modeName(mode)));
    json_object_object_add(object.get(), "elapsedMs", json_object_new_int64(elapsedMs));
    return object;
}
void flag(json_object* object, const char* key, bool value) {
    json_object_object_add(object, key, json_object_new_boolean(value));
}
}
std::string report(const Result& r, long long elapsedMs) {
    auto object = reportBase(Mode::Picture, elapsedMs);
    json_object_object_add(object.get(), "status", json_object_new_string(statusName(r.status)));
    json_object_object_add(object.get(), "port", json_object_new_int(4));
    flag(object.get(), "opened", r.opened); flag(object.get(), "selected", r.selected);
    flag(object.get(), "stopAcknowledged", r.stopAcknowledged);
    flag(object.get(), "closeAcknowledged", r.closeAcknowledged);
    flag(object.get(), "acquisitionUncertain", r.acquisitionUncertain);
    flag(object.get(), "localCleanup", r.localCleanup);
    for (const auto* key : {"hardwareRelease", "livePicture", "restoration", "dualHdmi"})
        json_object_object_add(object.get(), key, json_object_new_string("unknown"));
    return json_object_to_json_string_ext(object.get(), JSON_C_TO_STRING_PLAIN);
}
std::string report(const PolicyResult& r, Mode mode, long long elapsedMs) {
    auto object = reportBase(mode, elapsedMs);
    const char* status = "query_failed";
    switch (r.status) {
    case PolicyStatus::Checked: status = "policy_checked"; break;
    case PolicyStatus::SetupFailed: status = "setup_failed"; break;
    case PolicyStatus::Cancelled: status = "cancelled"; break;
    case PolicyStatus::QueryFailed: break;
    case PolicyStatus::CleanupFailed: status = "cleanup_failed"; break;
    }
    json_object_object_add(object.get(), "status", json_object_new_string(status));
    flag(object.get(), "callerReady", r.callerReady); flag(object.get(), "localCleanup", r.localCleanup);
    json_object_object_add(object.get(), "calls", json_object_new_int(r.calls));
    json_object_object_add(object.get(), "actualUtpCalls", json_object_new_int(0));
    auto* allowed = json_object_new_array();
    for (int value : r.allowed) json_object_array_add(allowed, json_object_new_int(value));
    json_object_object_add(object.get(), "policyAllowed", allowed);
    return json_object_to_json_string_ext(object.get(), JSON_C_TO_STRING_PLAIN);
}
} // namespace hdmi
