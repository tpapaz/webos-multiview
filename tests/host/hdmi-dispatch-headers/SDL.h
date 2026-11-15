#pragma once
struct SDL_Window{};struct SDL_Renderer{};struct SDL_Rect{int x,y,w,h;};
struct SDL_Event{unsigned type;struct{struct{int scancode;}keysym;}key;struct{int event;}window;};
enum{SDL_INIT_VIDEO=1,SDL_WINDOWPOS_UNDEFINED,SDL_WINDOW_FULLSCREEN,SDL_RENDERER_ACCELERATED,SDL_BLENDMODE_NONE,SDL_QUIT,SDL_KEYDOWN,SDL_WINDOWEVENT,SDL_SCANCODE_ESCAPE,SDL_SCANCODE_AC_BACK,SDL_WINDOWEVENT_FOCUS_LOST,SDL_WINDOWEVENT_HIDDEN,SDL_WINDOWEVENT_MINIMIZED,SDL_WINDOWEVENT_CLOSE,SDL_WINDOW_INPUT_FOCUS=1024};
extern "C" {
bool SDL_SetHint(const char*,const char*);int SDL_Init(unsigned);SDL_Window* SDL_CreateWindow(const char*,int,int,int,int,unsigned);
SDL_Renderer* SDL_CreateRenderer(SDL_Window*,int,unsigned);void SDL_GetWindowSize(SDL_Window*,int*,int*);int SDL_SetRenderDrawBlendMode(SDL_Renderer*,int);
int SDL_SetRenderDrawColor(SDL_Renderer*,unsigned char,unsigned char,unsigned char,unsigned char);int SDL_RenderClear(SDL_Renderer*);
int SDL_RenderFillRect(SDL_Renderer*,const SDL_Rect*);void SDL_RenderPresent(SDL_Renderer*);unsigned SDL_GetWindowFlags(SDL_Window*);
void SDL_Delay(unsigned);int SDL_PollEvent(SDL_Event*);void SDL_DestroyRenderer(SDL_Renderer*);void SDL_DestroyWindow(SDL_Window*);void SDL_Quit();
}
