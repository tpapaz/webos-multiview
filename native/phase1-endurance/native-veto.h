#pragma once
#include "../phase1/diagnostic.h"
#include "error-reason.h"
#include <glib.h>
#include <json-c/json.h>
#include <luna-service2/lunaservice.h>
#include <functional>

// C1 03.53.45 ABI, absent from the 2026.08 SDK header. Argument order is
// verified against the C1 wrapper and callers; see c1-native-screensaver-interface.md.
extern "C" bool LSRegisterPubPriv(const char*, LSHandle**, bool, LSError*);

namespace endurance {
class NativeVeto {
public:
    using Log = std::function<void(const char*, int)>;
    NativeVeto(const char* appId, Log log) : appId_(appId), log_(log) {}
    ~NativeVeto() { close(); }
    NativeVeto(const NativeVeto&) = delete;
    NativeVeto& operator=(const NativeVeto&) = delete;

    bool begin() {
        context_ = g_main_context_new();
        LSError error; LSErrorInit(&error);
        const bool registered = context_ && LSRegisterPubPriv(nullptr, &handle_, true, &error);
        outcome("veto_bus", registered, error);
        if (!registered) return fail();
        LSErrorInit(&error);
        const bool attached = LSGmainContextAttach(handle_, context_, &error);
        outcome("veto_attach", attached, error);
        if (!attached) return fail();
        LSErrorInit(&error);
        const bool watched = LSSetDisconnectHandler(handle_, disconnected, this, &error);
        outcome("veto_disconnect_watch", watched, error);
        if (!watched) return fail();
        active_ = true;
        registerAt_ = phase1::Clock::now();
        return call(registerUri, true, registration, &subscription_, "veto_register");
    }

    bool pump() {
        for (int i = 0; context_ && i < 8 && g_main_context_pending(context_); ++i)
            g_main_context_iteration(context_, false);
        const auto now = phase1::Clock::now();
        if (!failed_ && active_ && !ready_ && now - registerAt_ > std::chrono::seconds(3)) {
            log_("veto_registered", 3); fail();
        }
        if (!failed_ && response_ && now - responseAt_ > std::chrono::seconds(2)) {
            log_("veto_reply", 3); fail();
        }
        return !failed_;
    }
    bool ready() const { return ready_ && !failed_; }
    unsigned replies() const { return replies_; }

    bool close() {
        if (closed_) return clean_;
        closed_ = true; active_ = false;
        log_("veto_end", 0);
        if (handle_) {
            // Explicit unsubscribe can be busy-rejected: always cancel the
            // original token and unregister, regardless of this reply.
            if (subscription_ && connected_) {
                unsubscribeDone_ = false;
                if (call(registerUri, false, unsubscribed, &unsubscribe_, "veto_unsubscribe_send")) {
                    const auto until = phase1::Clock::now() + std::chrono::seconds(1);
                    while (!unsubscribeDone_ && phase1::Clock::now() < until) {
                        pump(); g_usleep(4000);
                    }
                    if (!unsubscribeDone_) log_("veto_unsubscribe", 4);
                }
            }
            cancel(unsubscribe_, "veto_unsubscribe_cancel");
            cancel(response_, "veto_reply_cancel");
            cancel(subscription_, "veto_cancel");
            LSError error; LSErrorInit(&error);
            const bool ok = LSUnregister(handle_, &error);
            outcome("veto_handle_close", ok, error);
            clean_ &= ok; handle_ = nullptr;
        }
        if (context_) { g_main_context_unref(context_); context_ = nullptr; }
        return clean_;
    }
private:
    struct Json {
        json_object* value = nullptr;
        explicit Json(json_object* object) : value(object) {}
        ~Json() { if (value) json_object_put(value); }
    };
    static json_object* field(json_object* object, const char* key, json_type type) {
        json_object* value = nullptr;
        return object && json_object_object_get_ex(object, key, &value) && value &&
            json_object_get_type(value) == type ? value : nullptr;
    }
    static json_object* parse(LSMessage* message) {
        const char* payload = LSMessageGetPayload(message);
        if (!payload) return nullptr;
        const size_t size = strnlen(payload, 4097);
        if (size > 4096) return nullptr;
        auto* tokener = json_tokener_new();
        if (!tokener) return nullptr;
        auto* object = json_tokener_parse_ex(tokener, payload, static_cast<int>(size + 1));
        const bool ok = json_tokener_get_error(tokener) == json_tokener_success && object &&
            json_object_get_type(object) == json_type_object;
        json_tokener_free(tokener);
        if (!ok && object) json_object_put(object);
        return ok ? object : nullptr;
    }
    static bool success(json_object* object) {
        auto* value = field(object, "returnValue", json_type_boolean);
        return value && json_object_get_boolean(value);
    }
    bool fail() { failed_ = true; return false; }
    void serviceError(json_object* object) {
        auto* text=field(object,"errorText",json_type_string);
        log_("veto_service_error",errorReason(text?json_object_get_string(text):nullptr));
        auto* code=field(object,"errorCode",json_type_int);
        if (code) {
            const int value=json_object_get_int(code);
            log_(value<0?"veto_service_negative":"veto_service_positive",errorMagnitude(value));
        }
    }
    void outcome(const char* event, bool ok, LSError& error) {
        log_(event, ok ? 0 : 1);
        if (!ok && LSErrorIsSet(&error)) {
            log_("veto_api_error",errorReason(error.message));
            log_(error.error_code<0?"veto_api_negative":"veto_api_positive",errorMagnitude(error.error_code));
        }
        LSErrorFree(&error);
    }
    bool send(const char* uri, json_object* payload, bool subscription, LSFilterFunc callback,
              LSMessageToken* token, const char* event) {
        LSError error; LSErrorInit(&error);
        const char* text = json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN);
        // Ordinary calls use this connection's actual caller identity. Supplying
        // an application ID via FromApplication asserts privileged proxy access.
        const bool ok = subscription ? LSCall(handle_, uri, text, callback, this, token, &error) :
            LSCallOneReply(handle_, uri, text, callback, this, token, &error);
        outcome(event, ok, error);
        return ok || fail();
    }
    bool call(const char* uri, bool subscribe, LSFilterFunc callback, LSMessageToken* token, const char* event) {
        Json payload(json_object_new_object());
        json_object_object_add(payload.value, "clientName", json_object_new_string(appId_));
        json_object_object_add(payload.value, "subscribe", json_object_new_boolean(subscribe));
        return send(uri, payload.value, subscribe, callback, token, event);
    }
    void cancel(LSMessageToken& token, const char* event) {
        if (!token) return;
        LSError error; LSErrorInit(&error);
        const bool ok = LSCallCancel(handle_, token, &error);
        outcome(event, ok, error); clean_ &= ok;
        token = LSMESSAGE_TOKEN_INVALID;
    }
    static void disconnected(LSHandle*, void* context) {
        auto& self = *static_cast<NativeVeto*>(context);
        self.connected_ = false;
        self.log_("veto_disconnect", self.active_ ? 1 : 0);
        if (self.active_) self.fail();
    }
    static bool registration(LSHandle*, LSMessage* message, void* context) {
        auto& self = *static_cast<NativeVeto*>(context);
        Json object(parse(message));
        if (!success(object.value)) {
            self.serviceError(object.value);
            self.log_("veto_registered", object.value ? 1 : 2); self.fail(); return true;
        }
        if (!self.ready_) {
            auto* subscribed = field(object.value, "subscribed", json_type_boolean);
            if (!subscribed || !json_object_get_boolean(subscribed)) {
                self.log_("veto_registered", 2); self.fail(); return true;
            }
            self.ready_ = true; self.log_("veto_registered", 0);
        }
        auto* subscribed = field(object.value, "subscribed", json_type_boolean);
        if (subscribed && !json_object_get_boolean(subscribed) && self.active_) {
            self.log_("veto_registered", 1); self.fail(); return true;
        }
        auto* stamp = field(object.value, "timestamp", json_type_string);
        if (!stamp) {
            if (field(object.value, "state", json_type_string) && self.active_) {
                self.log_("veto_request", 2); self.fail();
            }
            return true; // Initial acknowledgement is not a request.
        }
        if (!self.active_ || self.failed_) return true;
        auto* state = field(object.value, "state", json_type_string);
        const char* timestamp = json_object_get_string(stamp);
        const int size = json_object_get_string_len(stamp);
        if (!state || std::strcmp(json_object_get_string(state), "active") || size < 1 || size > 128 ||
            static_cast<int>(std::strlen(timestamp)) != size || self.response_ || ++self.requests_ > 16) {
            self.log_("veto_request", 2); self.fail(); return true;
        }
        self.log_("veto_request", 1);
        Json payload(json_object_new_object());
        json_object_object_add(payload.value, "clientName", json_object_new_string(self.appId_));
        json_object_object_add(payload.value, "timestamp", json_object_new_string(timestamp));
        json_object_object_add(payload.value, "ack", json_object_new_boolean(false));
        self.log_("veto_decision", 0); // NACK; no timestamp/vendor payload is logged.
        self.responseAt_ = phase1::Clock::now();
        self.send(responseUri, payload.value, false, response, &self.response_, "veto_reply_send");
        return true;
    }
    static bool response(LSHandle*, LSMessage* message, void* context) {
        auto& self = *static_cast<NativeVeto*>(context);
        self.response_ = LSMESSAGE_TOKEN_INVALID;
        Json object(parse(message));
        const bool ok = success(object.value);
        if (!ok) self.serviceError(object.value);
        self.log_("veto_reply", ok ? 0 : object.value ? 1 : 2);
        if (ok) ++self.replies_; else self.fail();
        return true;
    }
    static bool unsubscribed(LSHandle*, LSMessage* message, void* context) {
        auto& self = *static_cast<NativeVeto*>(context);
        self.unsubscribe_ = LSMESSAGE_TOKEN_INVALID; self.unsubscribeDone_ = true;
        Json object(parse(message));
        if (!success(object.value)) self.serviceError(object.value);
        self.log_("veto_unsubscribe", success(object.value) ? 0 : object.value ? 1 : 2);
        return true;
    }
    static constexpr const char* registerUri = "luna://com.webos.service.tvpower/power/registerScreenSaverRequest";
    static constexpr const char* responseUri = "luna://com.webos.service.tvpower/power/responseScreenSaverRequest";
    const char* appId_;
    Log log_;
    GMainContext* context_ = nullptr;
    LSHandle* handle_ = nullptr;
    LSMessageToken subscription_ = 0, response_ = 0, unsubscribe_ = 0;
    phase1::Clock::time_point registerAt_{}, responseAt_{};
    unsigned requests_ = 0, replies_ = 0;
    bool active_ = false, ready_ = false, failed_ = false, closed_ = false;
    bool clean_ = true, connected_ = true, unsubscribeDone_ = false;
};
} // namespace endurance
