#pragma once
#include "../context-dispatch-headers/glib.h"
extern "C" {
GSource* g_timeout_source_new(unsigned int);
void g_source_destroy(GSource*);
int g_main_context_is_owner(GMainContext*);
}
