# GLib context dispatcher

[dispatcher.h](dispatcher.h) is a production dependency of the
[current adapter](../phase2-hdmi-dispatch/README.md). It keeps one owner pumping
the app's context during SDL startup/quit, serializes app requests and bounds
worker start/join. It retains ownership on uncertain stop rather than releasing
callback storage prematurely.

The separate setup-correction patch, old setup review CMake target and diagnostic
fixtures were retired. Current adapter/mailbox/retained-owner native acceptance
covers the deployed use. [Causal saved-library review](../../docs/research/archive/c1-first-picture-development-2026-11-15.md#ls2glib-context-and-sdl-lifecycle-review).
