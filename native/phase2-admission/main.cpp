#include "admission.h"
#include "report-file.h"
#include <glib.h>
#include <luna-service2/lunaservice.h>
#include <chrono>
#include <csignal>
#include <cstdio>
#include <cstring>
#include <unistd.h>

// Existing SDK header omits this retail export; exact C1 ABI is documented in
// docs/research/c1-iwc-admission-reset-plan.md (wrapper 0xb88c).
extern "C" bool LSRegisterPubPriv(const char*, LSHandle**, bool, LSError*);
namespace {
volatile sig_atomic_t cancelled = 0;
void stop(int) { cancelled = 1; }
void hardStop(int) {
    const char message[] = "admission_hard_deadline_cleanup_unconfirmed\n";
    const auto ignored = write(STDERR_FILENO, message, sizeof(message) - 1);
    (void)ignored;
    _exit(124);
}
struct Error {
    LSError value;
    Error() { LSErrorInit(&value); }
    ~Error() { LSErrorFree(&value); }
};
class Luna final : public admission::Transport {
public:
    using Clock = std::chrono::steady_clock;
    explicit Luna(Clock::time_point start) : start_(start) {}
    int64_t nowMs() const override {
        return std::chrono::duration_cast<std::chrono::milliseconds>(Clock::now() - start_).count();
    }
    bool cancelled() const override { return ::cancelled != 0; }
    bool begin() override {
        context_ = g_main_context_new();
        Error error;
        if (!context_ || !LSRegisterPubPriv(admission::appId, &handle_, true, &error.value)) return false;
        Error attach;
        if (!LSGmainContextAttach(handle_, context_, &attach.value)) return false;
        Error watch;
        return LSSetDisconnectHandler(handle_, disconnected, this, &watch.value);
    }
    const char* name() const override { return handle_ ? LSHandleGetName(handle_) : nullptr; }
    bool send(admission::Step step) override {
        if (closed_ || failed_ || token_ != LSMESSAGE_TOKEN_INVALID || ready_) return false;
        const auto call = admission::request(step);
        if (!call.uri) return false;
        Error error;
        return LSCallOneReply(handle_, call.uri, call.payload, reply, this, &token_, &error.value);
    }
    int poll(std::string& payload) override {
        for (int i = 0; i < 8 && g_main_context_pending(context_); ++i)
            g_main_context_iteration(context_, false);
        if (failed_) return -1;
        if (ready_) { payload.swap(payload_); ready_ = false; return 1; }
        g_usleep(2000);
        return 0;
    }
    bool close() override {
        closed_ = true;
        bool clean = true;
        if (handle_) {
            if (token_ != LSMESSAGE_TOKEN_INVALID) {
                Error error;
                clean = LSCallCancel(handle_, token_, &error.value);
                token_ = LSMESSAGE_TOKEN_INVALID;
            }
            Error error;
            const bool unregistered = LSUnregister(handle_, &error.value);
            clean = unregistered && clean;
            handle_ = nullptr;
        }
        if (context_) { g_main_context_unref(context_); context_ = nullptr; }
        payload_.clear();
        return clean;
    }
private:
    static bool reply(LSHandle*, LSMessage* message, void* data) {
        auto& self = *static_cast<Luna*>(data);
        if (self.closed_) return true;
        self.token_ = LSMESSAGE_TOKEN_INVALID;
        if (self.ready_) { self.failed_ = true; return true; }
        const char* payload = LSMessageGetPayload(message);
        const size_t size = payload ? strnlen(payload, 32769) : 0;
        if (!payload || size > 32768) self.payload_.clear();
        else self.payload_.assign(payload, size);
        self.ready_ = true;
        return true;
    }
    static void disconnected(LSHandle*, void* data) { static_cast<Luna*>(data)->failed_ = true; }
    Clock::time_point start_;
    GMainContext* context_ = nullptr;
    LSHandle* handle_ = nullptr;
    LSMessageToken token_ = LSMESSAGE_TOKEN_INVALID;
    bool ready_ = false, failed_ = false, closed_ = false;
    std::string payload_;
};
}
int main(int argc, char** argv) {
    const auto start = Luna::Clock::now();
    std::signal(SIGINT, stop);
    std::signal(SIGTERM, stop);
    std::signal(SIGALRM, hardStop);
    alarm(8); // Also bounds registration or cleanup blocked inside the vendor library.
    ReportFile report("/tmp/io.github.tpapaz.multiview.admission");
    if (!report.ready()) return 73; // No bus calls without a fresh capture slot.
    Luna transport(start);
    const auto r = admission::runFromLaunch(transport, argc, argv);
    char output[2048];
    const int size = std::snprintf(output, sizeof(output), "{\"schemaVersion\":1,\"appVersion\":\"0.1.2\",\"appId\":\"%s\",\"status\":\"%s\","
        "\"registered\":%s,\"identityMatched\":%s,\"cleanupConfirmed\":%s,"
        "\"calls\":%u,\"listPolicyAllowed\":%d,\"resetPolicyAllowed\":%d,"
        "\"listAdmitted\":%s,\"publicationCount\":%u,\"hdmiCandidateCount\":%u,"
        "\"elapsedMs\":%lld,\"executionContext\":\"unverified\","
        "\"baseline\":\"unknown\",\"appliedGeometry\":\"unknown\"}\n",
        admission::appId, admission::statusName(r.status), r.registered ? "true" : "false",
        r.identity ? "true" : "false", r.clean ? "true" : "false", r.calls,
        r.listPolicy, r.resetPolicy, r.listed ? "true" : "false", r.publications,
        r.hdmiCandidates, static_cast<long long>(r.elapsedMs));
    if (size <= 0 || static_cast<size_t>(size) >= sizeof(output) ||
        !report.finish(output, static_cast<size_t>(size))) return 74;
    std::fputs(output, stdout);
    std::fflush(stdout);
    if (r.status == admission::Status::InvalidLaunch) return 64;
    return r.status == admission::Status::Passed ? 0 : 1;
}
