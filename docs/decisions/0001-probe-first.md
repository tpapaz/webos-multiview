# 0001 — Research physical-input ownership before implementing MultiView

Status: accepted for Phase 0. Date: 2026-11-09.

Historical scope: this decision describes the completed passive Phase 0.
The historical Phase 1 direction is [SMP main/sub validation](0002-main-sub-validation.md);
its owner-authorized local playback probes are recorded separately.

The defining outcome is independent live HDMI 1 + HDMI 2 on the TV's own hardware.
Root, a decoder, an overlay window and output capture establish different things;
none of the audited sources establishes this outcome on C1.

Build a passive diagnostic first. The web package contains only an explicit
one-shot metadata query and redacted report viewer. A separate portable C++ CLI
inventories fixed library paths with stat. Neither loads candidate libraries,
opens device nodes, performs active capture or allocates video surfaces. The web
app cannot invoke the CLI. There is no root helper, privileged IPC endpoint,
listener, boot hook, arbitrary-command interface or hardware adapter in Phase 0.

Use vanilla ES5 syntax for the small TV UI and C++11/CMake/Ninja for the native
inventory. Keep their reports within the same versioned schema, but preserve
their distinct origins. Device metadata remains unknown in the CLI; library
availability remains uninspected in the web app. No guessed cross-process bridge
or automatic report merging is justified yet.

The installable web probe needs no NDK. The optional native CLI needs a matching
openlgtv toolchain and ABI review before TV execution; host compilation does not
make a host binary installable on ARM. Default functional capabilities stay
unknown, including when every library file is present.

Consequences: Phase 0 cannot prove HDMI concurrency. We can deliver repeatable
host verification, an actual web-only package and a safe physical verification
protocol without inventing native TV results. SMP exported windows are the most
promising **presentation** route for later phases, conditional on C1 evidence.
HDMI input ownership and a second independent ingress session remain the decisive
blockers. Full compositor, source scheduling, app embedding and audio management
stay deferred to their roadmap gates.
