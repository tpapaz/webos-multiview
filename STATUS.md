# Current status

LG OLED C1 · firmware 03.53.45 · updated 2026-11-18. [Research history](docs/research/c1-hdmi-evidence-ledger.md#research-history) · [Roadmap](ROADMAP.md) · [Device procedure](docs/device-tests/current-plan.md)

## Single next task

**The HDMI move is paused pending ownership evidence for a physical input.** The stock input app opens HDMI without a parent media ID. The separate native caller that supplies one uses logical port 5. On the saved C1 firmware, that selects a special media-frontend path with fixed hardware index 4. Our HDMI 1 and stock HDMI 2 captures reported indices 3 and 2 respectively. This caller provides no selector for either jack. [Port 5 mapping](docs/research/c1-hdmi-interface-map.md#what-does-the-native-callers-fixed-port-5-select) · [Stock caller and ownership evidence](docs/research/c1-hdmi-interface-map.md#does-the-stock-hdmi-caller-supply-a-registered-parent)

**Next evidence needed.** Reopen the helper path when a new source can link a registered parent to a physical HDMI 1 or 2 open and an accepted ownership reply for that same video child. The stock monitor's switch-only evidence cannot make that link. A subsequent move would need to show the laptop advancing on `SUB0` with `MAIN` free before opening HDMI 4. The defining milestone remains independently live HDMI 1 + HDMI 2 and isolated close. No device trial is queued. [Proposed move](docs/research/c1-hdmi-interface-map.md#move-hdmi-1-to-sub0-before-opening-hdmi-4)

## Verified milestone

| Path | Latest evidence and disposition |
|---|---|
| Native direct UTP | **Verified** moving HDMI 4 with sound in 0.1.12. Keep that package as the single-input control. The native HDMI 1 + 2 design paused before a two-input launch. [Native history and pause](docs/research/c1-hdmi-evidence-ledger.md#research-history) |
| JavaScript external-input player | **Verified** moving HDMI 4 with sound in preview 0.1.0. Pair 0.1.2 showed HDMI 4 → laptop HDMI 1 → HDMI 4 in sequence. Both moving together remains **unknown** for a secondary route. [Pair observation](docs/device-tests/c1-journal.md#browser-hdmi-pair--40-second-retry) |
| JS probe with native ownership tracing | Installed pair 0.1.3 traced HDMI 1 on `MAIN` and closed normally. Moving it to `SUB0` remains **untested**. Pair 0.1.4 preserves the previous trial log through idle opens and stale launch requests. It is host-tested and packaged locally. The last TV-tested version is 0.1.3. [Trace](docs/device-tests/c1-journal.md#browser-hdmi-1-connector-ownership) · [Build guide](docs/build.md#browser-hdmi-preview) |

**Pending separately.** The captured app-specific UTP grant awaits cleanup. First-scaler assignment for stock HDMI 2, independent receiver release, audio ownership and sustained stability remain unknown. HDMI plus tuner or a local clip are parked candidates. [Grant disposition](docs/research/archive/c1-hdmi-admission-2026-11-14.md) · [Source combinations](docs/research/c1-hdmi-evidence-ledger.md#source-combinations)
