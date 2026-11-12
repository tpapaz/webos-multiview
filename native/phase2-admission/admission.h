#pragma once
#include <cstdint>
#include <string>

namespace admission {
constexpr const char* appId = "io.github.tpapaz.multiview.admission";
enum class Step { ListPolicy, ResetPolicy, List };
struct Request { const char* uri; const char* payload; };
Request request(Step step);
enum class Status { Passed, Registration, Identity, Transport, Cancelled, Deadline,
                    Timeout, Malformed, Denied, Cleanup, InvalidLaunch };
const char* statusName(Status status);
struct Report {
    Status status = Status::Registration;
    bool registered = false, identity = false, clean = false, listed = false;
    int listPolicy = -1, resetPolicy = -1;
    unsigned calls = 0, publications = 0, hdmiCandidates = 0;
    int64_t elapsedMs = 0;
};
// Transport owns its one outstanding call. A received one-reply token is no
// longer cancellable; close cancels only an outstanding token, then unregisters.
class Transport {
public:
    virtual ~Transport() = default;
    virtual int64_t nowMs() const = 0;
    virtual bool cancelled() const = 0;
    virtual bool begin() = 0;
    virtual const char* name() const = 0;
    virtual bool send(Step step) = 0;
    // 0 pending, 1 reply, -1 transport failure. Payload never enters the report.
    virtual int poll(std::string& payload) = 0;
    virtual bool close() = 0;
};
Report run(Transport& transport);
Report runFromLaunch(Transport& transport, int argc, const char* const* argv);
} // namespace admission
