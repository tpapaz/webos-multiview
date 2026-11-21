# Current status

LG OLED C1 · firmware 03.53.45 · updated 2026-11-22. [Research history](docs/research/c1-hdmi-evidence-ledger.md#research-history) · [Roadmap](ROADMAP.md) · [Device procedure](docs/device-tests/current-plan.md)

## Single next task

**The C1 media server can report the assigned HDMI receiver index.** Its successful completion carries the registered connection ID and, for an indexed grant, the `VHDMIRX` index. The saved HDMI 1 capture retained the resource name and omitted the index. Two conditional TVRM diagnostics could connect that media connection to the physical port in one slot lifetime. No saved run establishes the match. The existing decoder reads TVRM request and release replies. **Next, implement and test offline decoding of the separate media completion and slot diagnostics.** A valid receiver grant may still leave its physical jack unknown. This work needs only local files. [Firmware and capture evidence](docs/research/c1-hdmi-interface-map.md#where-does-the-separate-receiver-get-its-index) · [Procedure](docs/device-tests/current-plan.md#hdmi-pair-handoff)

## Paused HDMI ownership work

**The HDMI move is paused.** The saved C1 Starfish player can register its own media pipeline and forward the returned ID into an HDMI open. That path selects fixed port 5. The reviewed browser callers that can select HDMI 1 or 2 omit the parent ID. The saved files therefore provide no verified native caller for an app-owned physical HDMI video connector. [Native caller and ID trace](docs/research/c1-hdmi-interface-map.md#which-native-caller-registers-the-parent-before-hdmi-open) · [Port 5 mapping](docs/research/c1-hdmi-interface-map.md#what-does-the-native-callers-fixed-port-5-select)

**Physical HDMI 1 ownership search complete for the reviewed interfaces.** UTP `bind` binds a TV resource. The HDMI window setter changes the display window, and the traced property and pin handlers carry no helper-to-video-child association. The registration helper is built locally. No TV trial is queued. Reopen this path when a distinct physical-input caller or API contract ties its registered parent to the HDMI video child. The stock and JS port-1 captures already cover ordinary playback. [Physical API findings](docs/research/c1-hdmi-interface-map.md#can-a-physical-hdmi-1-api-attach-the-helpers-media-id) · [Helper build](docs/build.md#native-media-registration-helper)

## Verified milestone

| Path | Latest evidence and disposition |
|---|---|
| Native direct UTP | **Verified** moving HDMI 4 with sound in 0.1.12. Keep that package as the single-input control. The native HDMI 1 + 2 design paused before a two-input launch. [Native history and pause](docs/research/c1-hdmi-evidence-ledger.md#research-history) |
| JavaScript external-input player | **Verified** moving HDMI 4 with sound in preview 0.1.0. Pair 0.1.2 showed HDMI 4 → laptop HDMI 1 → HDMI 4 in sequence. Both moving together remains **unknown** for a secondary route. [Pair observation](docs/device-tests/c1-journal.md#browser-hdmi-pair--40-second-retry) |
| JS probe with native ownership tracing | Installed pair 0.1.3 traced HDMI 1 on `MAIN` and closed normally. Moving it to `SUB0` remains **untested**. Pair 0.1.4 preserves the previous trial log through idle opens and stale launch requests. It is host-tested and packaged locally. The last TV-tested version is 0.1.3. [Trace](docs/device-tests/c1-journal.md#browser-hdmi-1-connector-ownership) · [Build guide](docs/build.md#browser-hdmi-preview) |

**Pending separately.** The captured app-specific UTP grant awaits cleanup. First-scaler assignment for stock HDMI 2, independent receiver release, audio ownership and sustained stability remain unknown. HDMI plus tuner or a local clip are parked candidates. [Grant disposition](docs/research/archive/c1-hdmi-admission-2026-11-14.md) · [Source combinations](docs/research/c1-hdmi-evidence-ledger.md#source-combinations)
