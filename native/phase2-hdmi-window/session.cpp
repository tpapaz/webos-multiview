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
        json_object_object_add(object.get(), "options", options);
        json_object_object_add(object.get(), "inputSourceType", json_object_new_string("HDMI"));
    } else {
        json_object_object_add(object.get(), "pipelineId", json_object_new_string(ownedId.c_str()));
        if (step == Step::Select) json_object_object_add(object.get(), "portId", json_object_new_int(4));
    }
    return json_object_to_json_string_ext(object.get(), JSON_C_TO_STRING_PLAIN);
}
bool optedIn(int argc, const char* const* argv) {
    if (argc != 2 || !argv || !argv[1] || strnlen(argv[1], 4097) > 4096) return false;
    auto object = parse(argv[1]);
    auto* yes = field(object.get(), "acquireHdmi4", json_type_boolean);
    if (!yes || !json_object_get_boolean(yes)) return false;
    // Launcher metadata is allowed but never used as app/window/pipeline identity.
    json_object_object_foreach(object.get(), key, value) {
        if (!std::strcmp(key, "acquireHdmi4")) continue;
        if (!std::strcmp(key, "@system_native_app") && value &&
            json_object_get_type(value) == json_type_boolean && json_object_get_boolean(value)) continue;
        if (!std::strcmp(key, "nid") && value && json_object_get_type(value) == json_type_string &&
            validId(std::string(json_object_get_string(value), json_object_get_string_len(value)))) continue;
        return false;
    }
    return true;
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
            result.stopped = accepted(stopped.get());
            auto reply = response(p.exchange(Step::Close, request(Step::Close, pipeline)));
            result.closed = accepted(reply.get());
            if (result.closed) result.acquisitionUncertain = false;
        }
        result.localCleanup = p.end();
        if ((result.acquisitionUncertain || !result.stopped || !result.localCleanup) &&
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
} // namespace hdmi
