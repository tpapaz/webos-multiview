# C1 local-media playback and presentation

On the LG OLED C1 running firmware 03.53.45, the 0.1.0 trial displayed two
independent local clips in the main and secondary presentation paths.
Both visible clocks advanced. The secondary view changed size and position,
and the main clip kept playing after the secondary clip closed. The
resource observations indicated separate decoder allocations and no main
scaler handover in this run.
[Staged playback result](../device-tests/archive/lg-c1-phase-1.md#mainsub-010-full-staged-feedplay--visible-overlap-verified)

Audio ownership, full recovery, long-run stability and independently live
physical HDMI inputs remain **unknown**. See
[Phase 1 validation scope](../decisions/0002-main-sub-validation.md).

## HDMI 4 with a secondary local clip

**Candidate on C1 03.53.45.** In the local-only 0.1.0 control, the app
loaded a silent 640 × 360 H.264 clip with `sub_video` on its own exported
video window. Its presentation registration received `SUB_SCALER` while the
main clip held `MAIN_SCALER`. Both clocks advanced together, including after
the secondary window moved. After secondary close the main clip recorded 12
more callbacks and 2.4 seconds of presentation-time progress. The owner saw
the main clock continue. Earlier default-sink loads could take the main scaler.
[Measured stages](../device-tests/archive/lg-c1-phase-1.md#mainsub-010-full-staged-feedplay--visible-overlap-verified) · [Default-sink controls](../decisions/0002-main-sub-validation.md)

**Cleanup is scoped in the app code.** Closing the clip unloads its own
player and destroys its own exported window. The app can keep the SDL
renderer and top-level window alive. The HDMI control separately owns a UTP
session and sends stop and close to the ID returned by its own open. Its
final cleanup also destroys the shared graphics environment, so it belongs
after the HDMI continuity observation.
[Clip session](../../native/phase1/smp-session.h) · [Secondary close](../../native/phase1-sinks/main.cpp) · [HDMI lifecycle](../../native/phase2-hdmi-picture/session.cpp)

**Mixed visibility and continuity remain unknown.** The HDMI-only 0.1.12
trial showed eight seconds of motion with sound. Its fullscreen surface is
opaque except for the centered HDMI rectangle. The local control cleared
the whole surface to transparent. A mixed design needs distinct exported
windows and visible regions for both pictures. The saved runs establish
neither stacking order for an overlapping inset nor how the HDMI picture
and sound respond to clip load, playback or unload.
[HDMI trial](../device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound) · [HDMI surface setup](../../native/phase2-hdmi-dispatch/adapter.h)

The smallest informative mixed design uses one foreground app, the existing
HDMI 4 session, and the silent clip in a separate, nonoverlapping secondary
rectangle. Observe distinct motion and HDMI sound during overlap, then close
only the clip and observe HDMI motion and sound again before final cleanup.
The existing HDMI control spends its eight-second observation interval polling
for cancellation. The full staged local test took about 24 seconds. A combined
design needs a bounded timeline for clip startup, overlap, unload and HDMI
continuity within the HDMI control's deadlines. These are offline findings.

### Timing against the HDMI deadlines

**A short run fits on paper. A bounded mixed run remains unproven.** In the
saved secondary-only run, the first sample with clip frames was 1.925 seconds
after run start, including export, player creation, load and initial feed.
Clip-only close took 26 ms in that run and 45 ms in the staged two-clip run.
Those are single-run observations. The staged run used operator holds between
steps, so its 24 seconds is a different measure from compact startup.
[Secondary-only and staged measurements](../device-tests/archive/lg-c1-phase-1.md#mainsub-010-b-only-control--tv-tested-2026-11-11)

| Step after HDMI select returns | Proposed allowance |
|---|---:|
| Check HDMI motion and sound in the primary rectangle | 1.00 s |
| Start the silent clip and see first motion | 2.25 s |
| Observe both pictures advancing | 2.00 s |
| Unload the clip and observe worker exit | 0.35 s |
| Observe HDMI motion and sound after clip close | 2.00 s |
| Total | 7.60 s |

This leaves 0.40 seconds in the existing eight-second window. Two seconds
of overlap is a proposed mixed-source smoke criterion. Using the saved
startup and slower close measurements, five seconds of overlap and two
seconds after close already total 8.970 seconds before checking HDMI motion.
The five-second overlap gate applies to the separate dual-HDMI design.

Reserve the full eight seconds before the issue+17-second progression cutoff,
so HDMI select must return before issue+9 seconds. In the HDMI-only run,
setup, open and select took 416 ms, 23 ms and 242 ms respectively, and the
app finished at issue+9.453 seconds after observing for eight seconds and
cleaning up. Preserve the issue+17 to issue+22 cleanup interval for HDMI
stop and close with their two-second exchange limits, followed by local
cleanup. The native alarm bounds process lifetime.
[HDMI timing receipt summary](../device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound) · [Existing deadline contract](../../native/phase2-hdmi-candidate-0.1.12/README.md)

### Isolating clip playback from HDMI cleanup

**The shared clip session calls the SDK synchronously.** The clip session
calls `Load`, `Feed`, `Play`, `Unload` and the player destructor synchronously
on its caller. The same thread would need to poll for Back, focus loss or
deadline expiry and return from observation before HDMI stop and close can
be submitted. The HDMI GLib dispatcher can service queued requests while the
caller is busy. The caller still owns the stop and close sequence.
[Clip session](../../native/phase1/smp-session.h) · [HDMI observation and dispatch](../../native/phase2-hdmi-dispatch/adapter.h) · [HDMI stop and close](../../native/phase2-hdmi-picture/session.cpp)

**Saved C1 library evidence.** The reviewed `libplayerAPIs.so.1` unload path
takes a blocking mutex. The destructor calls `Unload()` and can also join an
internal GLib thread without a caller-provided timeout. These paths supply
no deadline or cancellation handle usable by the HDMI controller. Wren's
saved source moves both unload and destruction off its caller thread, which
is precedent for isolation of the caller. Its detached worker supplies no
completion bound for our clip or its resources.
[Wren player source](https://github.com/sostk/webos-wpe-browser/blob/89fbd973ed25189afc19ed1f195a04673fb6b1e7/browser/lg_media_player.cpp#L292-L304)

**Implemented in 0.1.13.** The app owns SDL events, both exported windows
and HDMI. A worker launched from the same executable owns the clip player,
feed buffers and callback state. A private socket sends the secondary window
ID and a deadline to the worker. It reports only readiness, frame progress
and close outcomes. The app waits for close and process exit before starting
the HDMI-only continuity window. The secondary SDL window is destroyed at
final cleanup.

**Deadline behavior verified with host fixtures.** On timeout or cancellation
the app submits a termination signal to its worker and returns to HDMI stop
and close. It polls for worker exit after the HDMI exchanges, up to 200 ms
within the existing cleanup deadline. The issue+17 and issue+22 cutoffs and
the two-second HDMI exchanges are preserved. Clip close timeout fails the
continuity check and leaves clip cleanup uncertain. If worker exit stays
unconfirmed, the app exits without explicitly destroying the shared windows.
The native alarm bounds app lifetime. Backend release, cross-process window
use, simultaneous playback and restoration on the C1 remain **unknown**.
[Worker and observation](../../native/phase2-hdmi-clip/observation.h) · [Stall fixture](../../tests/host/hdmi_clip_test.cpp)

## App-scoped screensaver review

The later endurance test reached 30 minutes of local playback overlap.
Focus loss interrupted the final recovery check. Effective inhibition
remains unknown. [Idle research](c1-app-idle-path.md)
