#include <starfish-media-pipeline/StarfishMediaAPIs.h>
#include <cstdio>
#include <unistd.h>

int main() {
    // Include the SDK destructor in the deadline. Only report after it returns.
    alarm(8);
    bool hasMediaId;
    {
        StarfishMediaAPIs player(nullptr);
        const char* id = player.getMediaID();
        hasMediaId = id && *id;
    }
    alarm(0);
    std::puts(hasMediaId ? "media_id_present" : "media_id_absent");
    return hasMediaId ? 0 : 1;
}
