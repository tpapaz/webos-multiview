# Current status

Updated 2026-11-18. [Roadmap](ROADMAP.md) · [Documentation](docs/README.md) · [Current procedure](docs/device-tests/current-plan.md)

## Verified milestone

Version 0.1.12 displayed moving video and audible sound from physical HDMI 4
in a fixed app window during one short trial on an LG OLED C1 running
firmware 03.53.45. The app terminated independently. Normal picture, sound
and remote control returned after exit.
[Device outcome](docs/device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound)

Independent HDMI 1 and HDMI 2, sustained stability, audio ownership and
isolated release remain **unknown**. Direct UTP remains the prototype's
input path. [Prototype contract](native/phase2-hdmi-candidate-0.1.12/README.md)

## Single next task

**Phase 2 native dual-HDMI work is paused.** Check with LG Developer Support
whether the C1 has a supported way for an app to bind HDMI 2 to a secondary
sink before its connector requests a scaler. The stock captures reached HDMI 2
video output on `MAIN`, while the only accepted ownership reply belonged to a
different pipeline. The first request for HDMI 2 remains **unknown**. Another
switch with the same capture setup would leave the same gap.
[Remaining options](docs/research/c1-hdmi-evidence-ledger.md#remaining-options)

The existing HDMI 4 package is the control. The bounded ResourceManager
mapping lookup is spent, the app-specific grant awaits separate cleanup,
and the dual-source trial remains at design review.
[Current device disposition](docs/device-tests/current-plan.md)
