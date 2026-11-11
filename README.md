# webOS MultiView

Feasibility research for showing two independently live HDMI inputs in
PiP or split screen using the TV's own hardware. The reference device is
the rooted LG OLED C1. Simultaneous HDMI remains **unknown**.

**Next: HDMI input/presentation discovery.** Start with the
[next-chat handoff](docs/handoff/hdmi-next-chat.md) and
[current decision](docs/decisions/0003-close-idle-work-resume-hdmi.md).
Only one HDMI source is currently connected; independently live HDMI 1 + 2
remains unknown.

On C1 firmware 03.53.45, native SMP A `main_video` + B `sub_video`
showed both local clip clocks advancing, B geometry and A continuity after
B release. This proves a local presentation combination, not HDMI ingress.
[Device evidence](docs/device-tests/lg-c1-phase-1.md)

Screensaver work is **closed for the current scope, not verified fixed**.
The 0.1.3 smoke passed native registration, 8.056 s overlap, 3.049 s A recovery,
cleanup/exit and owner clock checks. The final request test ended in
60.022 s without a request; cleanup passed and the result is inconclusive.
A screensaver was reported after probe exit. Effective NACK inhibition
remains unknown; no further idle test is scheduled. Glasshouse/Home routing
is separate, uninvestigated owner context.

Phase 1 audio, wider geometry, final-build repeatability and long-run recovery
gaps remain unverified/deferred. Phase 2 begins with read-only source and
firmware mapping, followed by a justified selected-HDMI presentation proposal.
Active dual-port testing needs a second source, an evidenced per-port path,
owner opt-in and bounded restoration.

- [Build and install](docs/build.md) covers the passive probe, browser comparison and ARM diagnostics.
- [Roadmap](ROADMAP.md) tracks the next experiment and product gates.
- [C1 test records](docs/device-tests/lg-c1-phase-1.md) document playback results. [Phase 0](docs/device-tests/lg-c1-phase-0.md) covers the passive probe.
- [Prior art](docs/research/prior-art.md) records upstream evidence and physical-input research gaps.
- [Main/sub decision](docs/decisions/0002-main-sub-validation.md) explains the selected path and remaining gates.

Build locally in WSL. Keep the SMP, NDL, mixed and staged main/sub IPKs as
controls. Do not build through GitHub Actions, commit or push automatically.
