#pragma once
#include "../context-dispatch-headers/glib.h"
// Public opaque checksum ABI; ARM uses the real existing SDK headers.
enum { G_CHECKSUM_SHA256=2 };
extern "C" {char* g_compute_checksum_for_string(int,const char*,long);void g_free(void*);}
