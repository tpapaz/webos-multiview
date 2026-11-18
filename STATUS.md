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

**Phase 2 native dual-HDMI work is paused pending new evidence.** Reopen it
when a new evidence source can tie the stock HDMI 2 connector to its first
scaler request, or when an app-owned HDMI path emerges that can apply the
secondary sink before that request. The stock captures reached HDMI 2 video
output on `MAIN`. The accepted ownership reply belonged to a different
pipeline, so HDMI 2's first request remains **unknown**.

The next offline task is **HDMI 4 plus the built-in TV tuner**. Trace the
saved C1 broadcast preview path for app-owned secondary placement and
tuner-only close while HDMI 4 stays live. Coexistence remains unknown.
[Tuner evidence](docs/research/c1-hdmi-interface-map.md#hdmi-4-with-a-built-in-tuner-feed)

HDMI 4 plus a local clip remains a **candidate**. The schedule fits on
paper. Keeping HDMI cleanup responsive requires moving all synchronous
player work off the HDMI controller. Clip teardown and shared-resource
behavior remain unknown.
[Clip isolation finding](docs/research/c1-smp-ndl-resource-path.md#isolating-clip-playback-from-hdmi-cleanup) ·
[Source combinations](docs/research/c1-hdmi-evidence-ledger.md#source-combinations)

The existing HDMI 4 package is the control. The bounded ResourceManager
mapping lookup is spent, the app-specific grant awaits separate cleanup,
and the dual-source trial remains at design review.
[Current device disposition](docs/device-tests/current-plan.md)
