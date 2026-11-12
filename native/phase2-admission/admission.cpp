#include "admission.h"
#include <json-c/json.h>
#include <climits>
#include <cstring>
#include <memory>
#include <set>

namespace admission {
Request request(Step step) {
    switch (step) {
    case Step::ListPolicy:
        return {"luna://com.webos.service.bus/isCallAllowed",
            "{\"uri\":\"luna://com.webos.service.iwc/listPublishedWindows\","
            "\"requester\":\"io.github.tpapaz.multiview.admission\"}"};
    case Step::ResetPolicy:
        return {"luna://com.webos.service.bus/isCallAllowed",
            "{\"uri\":\"luna://com.webos.service.iwc/setExportedWindow\","
            "\"requester\":\"io.github.tpapaz.multiview.admission\"}"};
    case Step::List:
        return {"luna://com.webos.service.iwc/listPublishedWindows", "{\"subscribe\":false}"};
    }
    return {nullptr, nullptr};
}
const char* statusName(Status status) {
    switch (status) {
    case Status::Passed: return "read_admission_passed";
    case Status::Registration: return "registration_failed";
    case Status::Identity: return "identity_mismatch";
    case Status::Transport: return "transport_failed";
    case Status::Cancelled: return "cancelled";
    case Status::Deadline: return "deadline";
    case Status::Timeout: return "reply_timeout";
    case Status::Malformed: return "invalid_reply";
    case Status::Denied: return "denied";
    case Status::Cleanup: return "cleanup_failed";
    case Status::InvalidLaunch: return "invalid_launch_arguments";
    }
    return "unknown";
}
namespace {
bool validLaunch(int argc, const char* const* argv) {
    if (argc == 1) return true;
    if (argc != 2 || !argv || !argv[1]) return false;
    const size_t size = strnlen(argv[1], 1025);
    if (!size || size > 1024) return false;
    std::unique_ptr<json_tokener, decltype(&json_tokener_free)> tok(json_tokener_new(), json_tokener_free);
    if (!tok) return false;
    json_tokener_set_flags(tok.get(), JSON_TOKENER_STRICT);
    std::unique_ptr<json_object, decltype(&json_object_put)> object(
        json_tokener_parse_ex(tok.get(), argv[1], static_cast<int>(size + 1)), json_object_put);
    if (json_tokener_get_error(tok.get()) != json_tokener_success || !object ||
        json_object_get_type(object.get()) != json_type_object ||
        json_object_object_length(object.get()) != 2) return false;
    json_object *native = nullptr, *nid = nullptr;
    if (!json_object_object_get_ex(object.get(), "@system_native_app", &native) || !native ||
        json_object_get_type(native) != json_type_boolean || !json_object_get_boolean(native) ||
        !json_object_object_get_ex(object.get(), "nid", &nid) || !nid ||
        json_object_get_type(nid) != json_type_string) return false;
    const int length = json_object_get_string_len(nid);
    if (length < 1 || length > 256) return false;
    const auto* value = reinterpret_cast<const unsigned char*>(json_object_get_string(nid));
    for (int i = 0; i < length; ++i) if (value[i] < 0x21 || value[i] > 0x7e) return false;
    // Metadata is validated then discarded, never used as identity or request data.
    return true;
}
json_object* field(json_object* object, const char* key, json_type type) {
    json_object* value = nullptr;
    return json_object_object_get_ex(object, key, &value) && value &&
        json_object_get_type(value) == type ? value : nullptr;
}
bool validString(json_object* value) {
    if (!value) return false;
    const auto size = json_object_get_string_len(value);
    return size > 0 && size <= 256 &&
        std::strlen(json_object_get_string(value)) == static_cast<size_t>(size);
}
Status parse(const std::string& text, Step step, Report& report) {
    if (text.empty() || text.size() > 32768 || text.find('\0') != std::string::npos)
        return Status::Malformed;
    std::unique_ptr<json_tokener, decltype(&json_tokener_free)> tok(json_tokener_new(), json_tokener_free);
    if (!tok) return Status::Malformed;
    json_tokener_set_flags(tok.get(), JSON_TOKENER_STRICT);
    std::unique_ptr<json_object, decltype(&json_object_put)> object(
        json_tokener_parse_ex(tok.get(), text.c_str(), static_cast<int>(text.size() + 1)), json_object_put);
    if (json_tokener_get_error(tok.get()) != json_tokener_success || !object ||
        json_object_get_type(object.get()) != json_type_object) return Status::Malformed;
    auto* success = field(object.get(), "returnValue", json_type_boolean);
    if (!success) return Status::Malformed;
    if (!json_object_get_boolean(success)) return Status::Denied;
    json_object* subscribed = nullptr;
    if (json_object_object_get_ex(object.get(), "subscribed", &subscribed) &&
        (!subscribed || json_object_get_type(subscribed) != json_type_boolean ||
         json_object_get_boolean(subscribed))) return Status::Malformed;
    if (step != Step::List) {
        auto* allowed = field(object.get(), "allowed", json_type_boolean);
        if (!allowed) return Status::Malformed;
        const bool yes = json_object_get_boolean(allowed);
        (step == Step::ListPolicy ? report.listPolicy : report.resetPolicy) = yes ? 1 : 0;
        return yes ? Status::Passed : Status::Denied;
    }
    auto* windows = field(object.get(), "publishedWindows", json_type_array);
    if (!windows || json_object_array_length(windows) > 64) return Status::Malformed;
    unsigned matches = 0;
    std::set<int64_t> ids;
    for (size_t i = 0; i < json_object_array_length(windows); ++i) {
        auto* window = json_object_array_get_idx(windows, i);
        if (!window || json_object_get_type(window) != json_type_object) return Status::Malformed;
        auto* id = field(window, "publishId", json_type_int);
        auto* app = field(window, "appId", json_type_string);
        auto* name = field(window, "windowId", json_type_string);
        auto* width = field(window, "width", json_type_int);
        auto* height = field(window, "height", json_type_int);
        if (!id || !validString(app) || !validString(name) || !width || !height)
            return Status::Malformed;
        const auto number = json_object_get_int64(id);
        const auto w = json_object_get_int64(width), h = json_object_get_int64(height);
        if (number < 0 || number > INT_MAX || w <= 0 || h <= 0 || w > INT_MAX || h > INT_MAX ||
            !ids.insert(number).second) return Status::Malformed;
        const char* a = json_object_get_string(app);
        if (!std::strcmp(a, "com.webos.app.hdmi1") || !std::strcmp(a, "com.webos.app.hdmi2") ||
            !std::strcmp(a, "com.webos.app.hdmi3") || !std::strcmp(a, "com.webos.app.hdmi4")) ++matches;
    }
    report.publications = static_cast<unsigned>(json_object_array_length(windows));
    report.hdmiCandidates = matches;
    report.listed = true;
    return Status::Passed;
}
} // namespace

Report run(Transport& t) {
    Report r;
    const auto finish = [&]() {
        r.clean = t.close();
        if (!r.clean && r.status == Status::Passed) r.status = Status::Cleanup;
        r.elapsedMs = t.nowMs();
        return r;
    };
    const auto stopped = [&]() {
        if (t.cancelled()) { r.status = Status::Cancelled; return true; }
        // Reserve the final second of the process's eight-second hard cap for cleanup.
        if (t.nowMs() >= 7000) { r.status = Status::Deadline; return true; }
        return false;
    };
    if (stopped()) return finish();
    r.registered = t.begin();
    if (stopped() || !r.registered) return finish();
    r.identity = t.name() && !std::strcmp(t.name(), appId);
    if (!r.identity) { r.status = Status::Identity; return finish(); }
    for (Step step : {Step::ListPolicy, Step::ResetPolicy, Step::List}) {
        if (stopped()) return finish();
        const auto sentAt = t.nowMs();
        ++r.calls;
        if (!t.send(step)) { r.status = Status::Transport; return finish(); }
        for (;;) {
            if (stopped()) return finish();
            if (t.nowMs() - sentAt >= 2000) { r.status = Status::Timeout; return finish(); }
            std::string payload;
            const int result = t.poll(payload);
            if (stopped()) return finish();
            if (t.nowMs() - sentAt >= 2000) { r.status = Status::Timeout; return finish(); }
            if (result < 0) { r.status = Status::Transport; return finish(); }
            if (!result) continue;
            r.status = parse(payload, step, r);
            if (r.status != Status::Passed) return finish();
            break;
        }
    }
    return finish();
}
Report runFromLaunch(Transport& transport, int argc, const char* const* argv) {
    if (validLaunch(argc, argv)) return run(transport);
    Report report;
    report.status = Status::InvalidLaunch;
    report.clean = true; // No transport resources were acquired.
    report.elapsedMs = transport.nowMs();
    return report;
}
} // namespace admission
