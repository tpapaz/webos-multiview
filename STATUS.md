# Current status

LG OLED C1 · firmware 03.53.45 · updated 2026-11-22. [Research history](docs/research/c1-hdmi-evidence-ledger.md#research-history) · [Roadmap](ROADMAP.md) · [Device procedure](docs/device-tests/current-plan.md)

## Single next task

**Assess HDMI 1 + a live channel from the C1’s built-in tuner offline.** The browser probe already showed the laptop moving on HDMI 1. The open question is whether an app-owned channel preview can use a separate video window and close independently while that picture continues. No mixed-source device trial is ready. [Current procedure](docs/device-tests/current-plan.md#hdmi-1-and-a-live-tv-channel)

The physical HDMI 4 + HDMI 1 trial remains parked. The ARM-linked ownership core passed its lifetime tests. A port-1 reply can describe a new or adopted session, and the known parent-carrying caller selects port 5. Keep HDMI 4 + a silent local clip as the alternative if the tuner route cannot meet its gate. [Physical pair findings](docs/research/c1-hdmi-interface-map.md#does-the-port-1-open-reply-establish-a-fresh-session) · [Workarounds](docs/device-tests/current-plan.md#workarounds-if-native-ownership-ends-here)

## Verified milestone

| Path | Latest evidence and disposition |
|---|---|
| Native direct UTP | **Verified** moving HDMI 4 with sound in 0.1.12. Keep that package as the single-input control. The native HDMI 1 + 2 design paused before a two-input launch. [Native history and pause](docs/research/c1-hdmi-evidence-ledger.md#research-history) |
| JavaScript external-input player | **Verified** moving HDMI 4 with sound in preview 0.1.0. Pair 0.1.2 showed HDMI 4 → laptop HDMI 1 → HDMI 4 in sequence. Both moving together remains **unknown** for a secondary route. [Pair observation](docs/device-tests/c1-journal.md#browser-hdmi-pair--40-second-retry) |
| JS probe with native ownership tracing | Installed pair 0.1.3 traced HDMI 1 on `MAIN` and closed normally. Moving it to `SUB0` remains **untested**. Pair 0.1.4 preserves the previous trial log through idle opens and stale launch requests. It is host-tested and packaged locally. The last TV-tested version is 0.1.3. [Trace](docs/device-tests/c1-journal.md#browser-hdmi-1-connector-ownership) · [Build guide](docs/build.md#browser-hdmi-preview) |

**Parked.** HDMI 2 is the roadmap milestone and has its own [paused first-scaler design](docs/device-tests/archive/c1-dual-hdmi-design.md). The [stock HDMI 1 receiver window](docs/device-tests/c1-journal.md#stock-hdmi-1-receiver-grant-window) closed with an unknown index. The captured app-specific UTP grant awaits cleanup. First-scaler assignment for stock HDMI 2, independent receiver release, audio ownership and sustained stability remain unknown. [Grant disposition](docs/research/archive/c1-hdmi-admission-2026-11-14.md) · [Source combinations](docs/research/c1-hdmi-evidence-ledger.md#source-combinations)
