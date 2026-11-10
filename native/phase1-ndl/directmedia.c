#include "directmedia.h"

// The SDK header's compatibility aliases require C tag namespaces.
#include <libndl-media/NDL_directmedia_v2.h>

// The C1 wrapper forwards only the app ID. The SDK declares the newer
// two-argument form. Bind the C1 signature to the firmware symbol.
extern int directMediaInitC1(const char* appId) __asm__("NDL_DirectMediaInit");

int initDirectMediaC1(const char* appId) {
    return directMediaInitC1(appId);
}

int foregroundDirectMedia(void) {
    return NDL_DirectMediaSetAppState(NDL_DIRECTMEDIA_APP_STATE_FOREGROUND);
}

int loadDirectVideo(int width, int height, NDLMediaLoadCallback callback) {
    static NDL_DIRECTMEDIA_DATA_INFO_T info;
    info = (NDL_DIRECTMEDIA_DATA_INFO_T){
        .video = { .width = width, .height = height, .type = NDL_VIDEO_TYPE_H264 }
    };
    return NDL_DirectMediaLoad(&info, callback);
}
