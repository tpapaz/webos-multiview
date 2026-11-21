#pragma once

#include <string>

namespace ownership {

enum class OpenDisposition { Fresh, Rejected, Uncertain };
struct OpenReply {
    OpenDisposition disposition;
    std::string logicalId;
};

// Each operation must complete within the trial's deadline. Fresh means a
// confirmed new session created by this open. An echoed ID alone is insufficient.
class Port1Session {
public:
    virtual ~Port1Session() = default;
    virtual bool cancelled() const noexcept = 0;
    virtual OpenReply open(const std::string& parentId) noexcept = 0;
    virtual bool selectHdmi1(const std::string& logicalId) noexcept = 0;
    virtual bool observePlayback() noexcept = 0;
    virtual bool stop(const std::string& logicalId) noexcept = 0;
    virtual bool close(const std::string& logicalId) noexcept = 0;
    // Finish callbacks and release local session resources, even on cancellation.
    virtual bool finish() noexcept = 0;
};

enum class Playback { Cancelled, NoParent, RegistrationFailed, OpenRejected, OpenUncertain, SelectFailed, WindowCompleted, ObservationIncomplete };
enum class Ack { Unattempted, Failed, Accepted };
struct Result {
    Playback playback = Playback::Cancelled;
    Ack stop = Ack::Unattempted;
    Ack close = Ack::Unattempted;
    bool finished = false;
};

// Results contain no IDs. A completed observation window alone cannot prove
// visible motion, a successful owner association or physical resource release.
Result run(Port1Session& session);
}
