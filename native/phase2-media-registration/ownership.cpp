#include "ownership.h"
#include <starfish-media-pipeline/StarfishMediaAPIs.h>
#include <cstring>
#include <memory>

namespace ownership {
namespace {
constexpr std::size_t maxId = 256;

bool validId(const char* data, std::size_t size) {
    if (!data || size == 0 || size > maxId) return false;
    for (std::size_t i = 0; i < size; ++i) {
        const auto c = static_cast<unsigned char>(data[i]);
        if (c < 0x21 || c > 0x7e) return false;
    }
    return true;
}

void observe(Port1Session& session, const char* parent, Result& result) {
    if (!parent || !validId(parent, strnlen(parent, maxId + 1))) {
        result.playback = Playback::NoParent;
        return;
    }
    if (session.cancelled()) return;
    const OpenReply open = session.open(parent);
    if (open.disposition == OpenDisposition::Rejected) {
        result.playback = Playback::OpenRejected;
        return;
    }
    if (open.disposition != OpenDisposition::Fresh ||
        !validId(open.logicalId.data(), open.logicalId.size())) {
        result.playback = Playback::OpenUncertain;
        return;
    }
    if (!session.cancelled()) {
        if (!session.selectHdmi1(open.logicalId)) result.playback = Playback::SelectFailed;
        else if (!session.cancelled()) {
            result.playback = session.observePlayback() ? Playback::WindowCompleted : Playback::ObservationIncomplete;
        }
    }
    result.stop = session.stop(open.logicalId) ? Ack::Accepted : Ack::Failed;
    result.close = session.close(open.logicalId) ? Ack::Accepted : Ack::Failed;
}
}

Result run(Port1Session& session) {
    Result result;
    std::unique_ptr<StarfishMediaAPIs> parent;
    if (!session.cancelled()) {
        try {
            parent = std::make_unique<StarfishMediaAPIs>(nullptr);
            observe(session, parent->getMediaID(), result);
        } catch (...) {
            result.playback = Playback::RegistrationFailed;
        }
    }
    result.finished = session.finish();
    return result;
}
}
