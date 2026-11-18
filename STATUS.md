# Current status

LG OLED C1 · firmware 03.53.45 · updated 2026-11-18. [Research history](docs/research/c1-hdmi-evidence-ledger.md#research-history) · [Roadmap](ROADMAP.md) · [Device procedure](docs/device-tests/current-plan.md)

## Single next task

**Trace a stock native caller offline.** Does it pass its own already-registered media pipeline in `options.mediaId` when opening HDMI, and does the video connector receive an accepted ownership reply for that same pipeline? The native open handlers read a media ID. The ordinary browser open on this C1 chose a backend ID before the receiver registered, and both connectors' ownership requests failed. Follow the ID through both handlers in the saved files. A matching field name alone leaves the question open. [Connector owner data flow](docs/research/c1-hdmi-interface-map.md#where-does-the-hdmi-video-connector-get-its-owner)

**Decision after that check.** An accepted association would let us investigate targeting just the laptop's HDMI 1 video connector. A device trial would then need to show the laptop moving on `SUB0` with `MAIN` free before starting HDMI 4. The defining milestone is still independent motion from HDMI 1 + HDMI 2, followed by closing one while the other keeps playing. No device trial is queued. [Proposed move](docs/research/c1-hdmi-interface-map.md#move-hdmi-1-to-sub0-before-opening-hdmi-4)

## Verified milestone

| Path | Latest evidence and disposition |
|---|---|
| Native direct UTP | **Verified** moving HDMI 4 with sound in 0.1.12. Keep that package as the single-input control. The native HDMI 1 + 2 design paused before a two-input launch. [Native history and pause](docs/research/c1-hdmi-evidence-ledger.md#research-history) |
| JavaScript external-input player | **Verified** moving HDMI 4 with sound in preview 0.1.0. Pair 0.1.2 showed HDMI 4 → laptop HDMI 1 → HDMI 4 in sequence. Both moving together remains **unknown** for a secondary route. [Pair observation](docs/device-tests/c1-journal.md#browser-hdmi-pair--40-second-retry) |
| JS probe with native ownership tracing | Installed pair 0.1.3 traced HDMI 1 on `MAIN` and closed normally. Moving it to `SUB0` remains **untested**. Pair 0.1.4 preserves the previous trial log through idle opens and stale launch requests. It is host-tested and packaged locally. The last TV-tested version is 0.1.3. [Trace](docs/device-tests/c1-journal.md#browser-hdmi-1-connector-ownership) · [Build guide](docs/build.md#browser-hdmi-preview) |

**Pending separately.** The captured app-specific UTP grant awaits cleanup. First-scaler assignment for stock HDMI 2, independent receiver release, audio ownership and sustained stability remain unknown. HDMI plus tuner or a local clip are parked candidates. [Grant disposition](docs/research/archive/c1-hdmi-admission-2026-11-14.md) · [Source combinations](docs/research/c1-hdmi-evidence-ledger.md#source-combinations)
