# 0002 — Validate SMP main/sub local playback before expanding sources

Status: accepted for Phase 1. Date: 2026-11-11.

The C1 03.53.45 staged tests establish a short, video-only combination:
SMP A requests `main_video`, SMP B requests `sub_video`. The owner saw both
clocks advance together, B move/shrink and A continue after B release.
Attributed logs show distinct decoder grants and MAIN_SCALER for A versus
SUB_SCALER for B. [Device evidence](../device-tests/lg-c1-phase-1.md)

Earlier default-main SMP and mixed SMP/NDL tests failed because B's separate
presentation registration reclaimed MAIN_SCALER. B holding a media-pipeline
SUB_SCALER token did not select its presentation sink. The inspected NDL
wrapper exposes no equivalent selector. Use two SMP sessions with explicit
Load-time sink selection; retain NDL and earlier SMP packages as controls.
[Firmware path and log attribution](../research/c1-smp-ndl-resource-path.md)

Validate in this order: separate endurance build smoke cycle, 20 distinct
app processes with clean exits, five minutes, then 30 minutes. Loop the
existing video-only fixtures without reloading players and retain monotonic
feed PTS. Require native progress, bounded execution, cancellation, cleanup,
identity checks and human clock observations. Resource startup/final windows
do not prove continuous resource ownership over a long run.

The endurance package is built, packaged and C1 ABI-checked, awaiting its
first TV playback. A passing short staged package does not pre-approve a
new binary. [Build and run procedure](../build.md#repeatability-and-endurance)

Phase 1 remains active until stability, wider independent geometry and audio
focus are validated. Simultaneous HDMI 1 + HDMI 2 remains the defining
objective and **unknown**; the current setup has one physical HDMI source.
Local clip success is presentation evidence only. No firmware/configuration
changes, forced resource grants or IPTV product pivot follow from this result.

All artifacts are built locally in WSL. No GitHub Actions, automatic commits
or pushes. Keep evidence tied to model, firmware, package and ELF hashes.
