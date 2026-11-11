# webOS MultiView

Feasibility research for showing two independently live HDMI inputs in
PiP or split screen using the TV's own hardware. The reference device is
the rooted LG OLED C1. Simultaneous HDMI remains **unknown**.

On C1 firmware 03.53.45, two local video-only clips have now played together
using native SMP with A on `main_video` and B on `sub_video`. The owner
confirmed both clocks advancing, B moving/resizing and A continuing after B
release. Earlier default-main SMP/NDL runs contended for MAIN_SCALER.

The current work is **Phase 1 repeatability and bounded endurance**, using
a separate Main + Sub Endurance app. Its 0.1.0 ARM IPK is locally built,
packaged and C1 ABI-checked. C1 smoke and 20 distinct app start/exit cycles
passed native progress and cleanup. The owner confirmed both clocks advancing
together, A continuing after B release and normal viewing after the final exit.
The first five-minute attempt cancelled after about 21 seconds; logs point
to a screensaver/lifecycle interruption while both players were advancing.
Endurance **0.1.1** is now locally built, packaged and C1 ABI-checked, **not
TV-tested**. It requests app-scoped screensaver handling and logs distinct
exit events. Install it, pass a fresh smoke check, then retry five-minute
continuous playback with CPU/temperature sampling before the gated 30-minute run.
The 0.1.0 repeatability result does not certify the new binary.
Audio focus and wider independent
geometry remain untested. See the [current procedure](docs/build.md#repeatability-and-endurance).

- [Build and install](docs/build.md) covers the passive probe, browser comparison and ARM diagnostics.
- [Roadmap](ROADMAP.md) tracks the next experiment and product gates.
- [C1 test records](docs/device-tests/lg-c1-phase-1.md) document playback results. [Phase 0](docs/device-tests/lg-c1-phase-0.md) covers the passive probe.
- [Prior art](docs/research/prior-art.md) records upstream evidence and physical-input research gaps.
- [Main/sub decision](docs/decisions/0002-main-sub-validation.md) explains the selected path and remaining gates.

Build locally in WSL. Keep the SMP, NDL, mixed and staged main/sub IPKs as
controls. Do not build through GitHub Actions, commit or push automatically.
