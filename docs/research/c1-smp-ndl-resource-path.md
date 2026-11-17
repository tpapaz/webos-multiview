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

## App-scoped screensaver review

The later endurance test reached 30 minutes of local playback overlap.
Focus loss interrupted the final recovery check. Effective inhibition
remains unknown. [Idle research](c1-app-idle-path.md)
