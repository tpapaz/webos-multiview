#include "inventory.h"
#include <cerrno>
#include <sstream>
#include <sys/stat.h>

namespace multiview {
Presence PosixInventory::inspect(const char* path) const {
    struct stat info {};
    if (::stat(path, &info) == 0)
        return S_ISREG(info.st_mode) ? Presence::present : Presence::unavailable;
    return errno == ENOENT || errno == ENOTDIR ? Presence::not_found : Presence::unavailable;
}
std::string report(const FileInventory& files) {
    // Exact paths are candidates from upstream link names; this is not a loader search.
    const char* paths[] = {
        "/usr/lib/libplayerAPIs.so", "/usr/lib/libplayerAPIs.so.1.0.0",
        "/usr/lib/libNDL_directmedia.so", "/usr/lib/libndl-directmedia2.so",
        "/usr/lib/libSDL2.so", "/usr/lib/libdile_vt.so", "/usr/lib/libvtcapture.so"
    };
    const char* caps[] = {"smpPlayback", "ndlPlayback", "multiNativeSurfaces",
        "activeHdmiCapture", "simultaneousHdmiInputs", "hdmiAndTunerCoexistence",
        "appSurfaceComposition", "audioFocusSwitching"};
    std::ostringstream out;
    out << "{\"schemaVersion\":1,\"probeVersion\":\"0.1.0\","
        "\"mode\":\"passive\",\"origin\":\"native-inventory\",\"redactionApplied\":true,"
        "\"device\":{\"modelFamily\":\"unknown\",\"webosVersion\":\"unknown\","
        "\"firmwareVersion\":\"unknown\",\"boardFamily\":\"unknown\"},\"capabilities\":{";
    bool first = true;
    for (const char* cap : caps) {
        if (!first) out << ',';
        first = false;
        out << '"' << cap << "\":{\"status\":\"unknown\",\"evidence\":null}";
    }
    out << "},\"tests\":[],\"observations\":[";
    first = true;
    for (const char* path : paths) {
        if (!first) out << ',';
        first = false;
        Presence presence = files.inspect(path);
        const char* result = presence == Presence::present ? "present" :
            presence == Presence::not_found ? "not_found_in_scope" : "unavailable";
        out << "{\"method\":\"stat-fixed-path\",\"backend\":\"" << path
            << "\",\"result\":\"" << result << "\",\"limitations\":"
            "\"File presence only; no ABI, symbol, API, permission or concurrency test.\"}";
    }
    out << "]}";
    return out.str();
}
}
