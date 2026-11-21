# Current status

LG OLED C1 · firmware 03.53.45 · updated 2026-11-22. [Research history](docs/research/c1-hdmi-evidence-ledger.md#research-history) · [Roadmap](ROADMAP.md) · [Device procedure](docs/device-tests/current-plan.md)

## Single next task

**Work on HDMI 4 and laptop HDMI 1.** Both pictures have played on this C1. With default routing, HDMI 4 stopped when HDMI 1 played and resumed when HDMI 1 closed. Simultaneous motion remains **unknown**. [Pair trial](docs/device-tests/c1-journal.md#browser-hdmi-pair--40-second-retry)

**Next, prepare a single-input ownership test for HDMI 1 using the playback frontend.** The candidate keeps an app-registered parent alive while opening a fresh physical port-1 session. The built helper only checks for an ID and then exits. No device trial is ready. The plan gives each stage a pass condition and a stop rule. [Completed attempts, remaining test and workarounds](docs/device-tests/current-plan.md#hdmi-4-and-hdmi-1)

## Verified milestone

| Path | Latest evidence and disposition |
|---|---|
| Native direct UTP | **Verified** moving HDMI 4 with sound in 0.1.12. Keep that package as the single-input control. The native HDMI 1 + 2 design paused before a two-input launch. [Native history and pause](docs/research/c1-hdmi-evidence-ledger.md#research-history) |
| JavaScript external-input player | **Verified** moving HDMI 4 with sound in preview 0.1.0. Pair 0.1.2 showed HDMI 4 → laptop HDMI 1 → HDMI 4 in sequence. Both moving together remains **unknown** for a secondary route. [Pair observation](docs/device-tests/c1-journal.md#browser-hdmi-pair--40-second-retry) |
| JS probe with native ownership tracing | Installed pair 0.1.3 traced HDMI 1 on `MAIN` and closed normally. Moving it to `SUB0` remains **untested**. Pair 0.1.4 preserves the previous trial log through idle opens and stale launch requests. It is host-tested and packaged locally. The last TV-tested version is 0.1.3. [Trace](docs/device-tests/c1-journal.md#browser-hdmi-1-connector-ownership) · [Build guide](docs/build.md#browser-hdmi-preview) |

**Parked.** HDMI 2 is the roadmap milestone and has its own [paused first-scaler design](docs/device-tests/archive/c1-dual-hdmi-design.md). The [stock HDMI 1 receiver window](docs/device-tests/c1-journal.md#stock-hdmi-1-receiver-grant-window) closed with an unknown index. The captured app-specific UTP grant awaits cleanup. First-scaler assignment for stock HDMI 2, independent receiver release, audio ownership and sustained stability remain unknown. HDMI plus tuner or a local clip remain separate candidates. [Grant disposition](docs/research/archive/c1-hdmi-admission-2026-11-14.md) · [Source combinations](docs/research/c1-hdmi-evidence-ledger.md#source-combinations)
