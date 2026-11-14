#include "../../native/phase2-entry-diagnostic/diagnostic.h"
#include <cassert>

int main() {
    const std::string boot = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const std::string payload = "{\"acquireHdmi4\":true,\"launchBootId\":\"" + boot +
        "\",\"launchStartByBoottimeMs\":4000,\"launchStartByRealtimeMs\":10000,"
        "\"@system_native_app\":true,\"nid\":\"synthetic\"}";
    const char* argv[] = {"diagnostic", payload.c_str()};
    const auto launch = hdmi::parseLaunch(2, argv);
    assert(std::string(entry::parserOutcome(launch)) == "picture_accepted");
    auto guard = entry::evaluate(launch, boot, 1000, 7000);
    assert(guard.allowed);
    assert(std::string(guard.boottime) == "within" && std::string(guard.realtime) == "within");
    guard = entry::evaluate(launch, boot, 1001, 10000);
    assert(!guard.allowed && std::string(guard.realtime) == "expired");
    guard = entry::evaluate(launch, boot, 999, 7000);
    assert(!guard.allowed && std::string(guard.boottime) == "future");
    guard = entry::evaluate(launch, "", 1000, 7000);
    assert(!guard.allowed && std::string(guard.bootRead) == "unavailable" && std::string(guard.bootMatch) == "unknown");
    guard = entry::evaluate(launch, "ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee", 1000, 7000);
    assert(!guard.allowed && std::string(guard.bootMatch) == "mismatch");
    guard = entry::evaluate(launch, boot, -1, -1);
    assert(!guard.allowed && std::string(guard.boottime) == "unavailable" && std::string(guard.realtime) == "unavailable");
    const char* invalid[] = {"diagnostic", "{\"acquireHdmi4\":true}"};
    assert(std::string(entry::parserOutcome(hdmi::parseLaunch(2, invalid))) == "inert_or_invalid");
    const char* admission[] = {"diagnostic", "{\"checkUtpAdmission\":\"baseline\"}"};
    assert(std::string(entry::parserOutcome(hdmi::parseLaunch(2, admission))) == "non_picture_mode");
    assert(std::string(entry::parserOutcome(hdmi::parseLaunch(1, argv))) == "inert_or_invalid");
}
