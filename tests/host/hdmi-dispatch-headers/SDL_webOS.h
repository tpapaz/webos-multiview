#pragma once
#include "SDL.h"
#define SDL_HINT_WEBOS_ACCESS_POLICY_KEYS_BACK "back"
#define SDL_HINT_WEBOS_ACCESS_POLICY_KEYS_EXIT "exit"
enum{SDL_WEBOS_SCANCODE_BACK=500,SDL_WEBOS_SCANCODE_EXIT,SDL_WEBOS_EXPORED_WINDOW_TYPE_TRANSPARENT=2};
extern "C"{const char* SDL_webOSCreateExportedWindow(int);bool SDL_webOSSetExportedWindow(const char*,SDL_Rect*,SDL_Rect*);void SDL_webOSDestroyExportedWindow(const char*);}
