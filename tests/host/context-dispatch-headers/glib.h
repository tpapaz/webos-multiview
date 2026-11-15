#pragma once
// Host runtime lacks development headers. Only the public opaque GLib ABI used
// by this acceptance model is declared here; ARM uses the real existing SDK.
extern "C" {
typedef struct _GMainContext GMainContext;
typedef struct _GSource GSource;
typedef int (*GSourceFunc)(void*);
GMainContext* g_main_context_new();
void g_main_context_unref(GMainContext*);
int g_main_context_acquire(GMainContext*);
void g_main_context_release(GMainContext*);
int g_main_context_iteration(GMainContext*,int);
void g_usleep(unsigned long);
GSource* g_idle_source_new();
void g_source_set_callback(GSource*,GSourceFunc,void*,void (*)(void*));
unsigned int g_source_attach(GSource*,GMainContext*);
void g_source_unref(GSource*);
}
