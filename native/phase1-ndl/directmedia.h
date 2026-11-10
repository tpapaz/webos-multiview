#pragma once

#ifdef __cplusplus
extern "C" {
#endif

int initDirectMediaC1(const char* appId);
int foregroundDirectMedia(void);
int loadDirectVideo(int width, int height, void (*callback)(int, long long, const char*));
int NDL_DirectVideoSetArea(int left, int top, int width, int height);
int NDL_DirectVideoPlay(void* buffer, unsigned int size, long long pts);
int NDL_DirectMediaUnload(void);
int NDL_DirectMediaQuit(void);

#ifdef __cplusplus
}
#endif
