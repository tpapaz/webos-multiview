#include "../../native/phase2-media-registration/ownership.h"
#include <starfish-media-pipeline/StarfishMediaAPIs.h>
#include <cassert>
#include <stdexcept>
#include <vector>

namespace {
using namespace ownership;
enum class Event { Register, Open, Select, Playback, Stop, Close, Finish, Release };
std::vector<Event> events;
const char* registeredId = "fixture-parent";
bool parentAlive = false;
bool failRegister = false;
bool failGetter = false;

struct Session final : Port1Session {
    OpenReply reply{OpenDisposition::Fresh, "fixture-session"};
    bool cancelBeforeRegistration = false;
    bool cancelAfterOpen = false;
    bool cancelAfterSelect = false;
    bool selectOk = true;
    bool playbackOk = true;
    bool stopOk = true;
    bool closeOk = true;
    bool finishOk = true;

    bool cancelled() const noexcept override {
        return cancelBeforeRegistration || (!events.empty() &&
            ((cancelAfterOpen && events.back() == Event::Open) ||
             (cancelAfterSelect && events.back() == Event::Select)));
    }
    OpenReply open(const std::string& id) noexcept override {
        assert(parentAlive && id == registeredId);
        events.push_back(Event::Open);
        return reply;
    }
    void sessionEvent(Event event, const std::string& id) {
        assert(parentAlive && id == "fixture-session" && id != registeredId);
        events.push_back(event);
    }
    bool selectHdmi1(const std::string& id) noexcept override {
        sessionEvent(Event::Select, id);
        return selectOk;
    }
    bool observePlayback() noexcept override {
        assert(parentAlive);
        events.push_back(Event::Playback);
        return playbackOk;
    }
    bool stop(const std::string& id) noexcept override {
        sessionEvent(Event::Stop, id);
        return stopOk;
    }
    bool close(const std::string& id) noexcept override {
        sessionEvent(Event::Close, id);
        return closeOk;
    }
    bool finish() noexcept override {
        assert(parentAlive || cancelBeforeRegistration || failRegister);
        events.push_back(Event::Finish);
        return finishOk;
    }
};

void check(Session session, Playback playback, std::initializer_list<Event> expected,
           Ack stop = Ack::Unattempted, Ack close = Ack::Unattempted) {
    events.clear();
    const auto result = run(session);
    assert(!parentAlive && events == std::vector<Event>(expected));
    assert(result.playback == playback && result.stop == stop && result.close == close);
    assert(result.finished == session.finishOk);
}
}

StarfishMediaAPIs::StarfishMediaAPIs(const char* id) {
    assert(!id && !parentAlive);
    events.push_back(Event::Register);
    if (failRegister) throw std::runtime_error("registration failed");
    parentAlive = true;
}
StarfishMediaAPIs::~StarfishMediaAPIs() {
    assert(parentAlive);
    parentAlive = false;
    events.push_back(Event::Release);
}
const char* StarfishMediaAPIs::getMediaID() {
    if (failGetter) throw std::runtime_error("getter failed");
    return registeredId;
}

int main() {
    using E = Event;
    Session session;
    const auto full = {E::Register, E::Open, E::Select, E::Playback, E::Stop, E::Close, E::Finish, E::Release};
    check(session, Playback::WindowCompleted, full, Ack::Accepted, Ack::Accepted);
    session.stopOk = false;
    check(session, Playback::WindowCompleted, full, Ack::Failed, Ack::Accepted);
    session.stopOk = true;
    session.closeOk = false;
    check(session, Playback::WindowCompleted, full, Ack::Accepted, Ack::Failed);
    session.playbackOk = false;
    session.stopOk = session.closeOk = session.finishOk = false;
    check(session, Playback::ObservationIncomplete, full, Ack::Failed, Ack::Failed);
    session = {};
    session.selectOk = false;
    const auto afterSelect = {E::Register, E::Open, E::Select, E::Stop, E::Close, E::Finish, E::Release};
    check(session, Playback::SelectFailed, afterSelect, Ack::Accepted, Ack::Accepted);
    session.selectOk = true;
    session.cancelAfterSelect = true;
    check(session, Playback::Cancelled, afterSelect, Ack::Accepted, Ack::Accepted);
    session.cancelAfterOpen = true;
    check(session, Playback::Cancelled, {E::Register, E::Open, E::Stop, E::Close, E::Finish, E::Release},
          Ack::Accepted, Ack::Accepted);
    session = {};
    const auto afterOpen = {E::Register, E::Open, E::Finish, E::Release};
    session.reply = {OpenDisposition::Uncertain, "borrowed-session"};
    check(session, Playback::OpenUncertain, afterOpen);
    session.reply = {OpenDisposition::Rejected, "borrowed-session"};
    check(session, Playback::OpenRejected, afterOpen);
    session.reply = {OpenDisposition::Fresh, std::string("bad\0id", 6)};
    check(session, Playback::OpenUncertain, afterOpen);
    session = {};
    const auto beforeOpen = {E::Register, E::Finish, E::Release};
    registeredId = nullptr;
    check(session, Playback::NoParent, beforeOpen);
    std::string overlong(257, 'x');
    registeredId = overlong.c_str();
    check(session, Playback::NoParent, beforeOpen);
    failGetter = true;
    check(session, Playback::RegistrationFailed, beforeOpen);
    failRegister = true;
    check(session, Playback::RegistrationFailed, {E::Register, E::Finish});
    session.cancelBeforeRegistration = true;
    check(session, Playback::Cancelled, {E::Finish});
}
