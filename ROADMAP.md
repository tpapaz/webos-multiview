# webOS MultiView roadmap

[Current status and next task](STATUS.md) · [Documentation index](docs/README.md)

## Objective and position

Build a standalone, root-assisted homebrew app that can show **two or more
independently live sources at once** on the TV's hardware. The viewer opens
MultiView and selects sources there. MultiView opens the selected inputs and
manages their playback, panes and layout within the same app. Physical HDMI
and the built-in tuner are the first hardware targets. The next dual-HDMI
milestone remains **HDMI 1 + HDMI 2**. Movable, resizable split-screen, grid
and inset layouts follow once concurrent playback is proven. Other app
surfaces and network streams remain longer-term source types.

Reference device: LG OLED C1 (2021), firmware 03.53.45 / SDK 6.5.3.
The [research history](docs/research/c1-hdmi-evidence-ledger.md#research-history) records how the native and JS approaches developed and why each changed.

Compatibility target: broad coverage across LG webOS TV families. C1 firmware
addresses and register maps are research evidence, not application constants.
Use available webOS interfaces and runtime capability checks, with narrowly
qualified model/firmware adapters when needed. Hardware and interface differences
may prevent dual HDMI on some TVs; report verified support and unsupported or
unknown combinations explicitly rather than promising the C1 result everywhere.

**Active phase: Phase 2 HDMI acquisition and application-owned window research.**
Phase 0 is complete. Phase 1 has useful device evidence but remains partially
validated and its remaining gates are deferred. See [Status](STATUS.md)
for trial readiness and the evidence needed to resume each route.

## Phases and acceptance gates

| Phase | Scope | Acceptance gate / position |
|---|---|---|
| 0A–C | Pinned research, host checks, passive metadata and redacted report | Complete: C1 passive report and clean lifecycle. [Device record](docs/device-tests/c1-journal.md#phase-0) |
| 1 | Two independent local clips on movable video surfaces | Partially validated: explicit main/sub live playback and B geometry observed. Audio, wider geometry, final-build repeatability and full recovery remain open/deferred. [Journal](docs/device-tests/c1-journal.md#phase-1) |
| 2 — current | One live HDMI in MultiView, then two independently live sources in fixed panes inside the same app | First-picture gate achieved once on C1/HDMI 4. [Result](docs/device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound). Pass a pair when both sources keep advancing together and closing either pane leaves the other live. Dual-port proof needs an independent receiver and presentation path. Move/resize, layouts, remote workflows and audio selection follow concurrency proof. |
| 3 | Source management for proven inputs; local/network sources where resources permit | Stable playback and predictable buffering, reconnection and resource contention. |
| 4 | Remote-first picker, PiP/split/grid layouts, focus, audio selection and presets | Complete workflows for each verified combination, including reset and uninstall. |
| 5 | Compatibility matrix and community beta | ABI and device tests for every claimed model/firmware/backend. |
| 6 | More sources, app surfaces and advanced layouts | Research until device evidence supports each combination. |

## Phase 2 route to two pictures

1. **One physical input — verified.** The native app displayed HDMI 4 with sound. The browser probe also displayed laptop HDMI 1.
2. **Two physical inputs — parked.** The available HDMI 4 + HDMI 1 pair handed off between sources. Reopen that route when the app can establish fresh ownership and address its video connector. The defining milestone remains independently live HDMI 1 + HDMI 2.
3. **HDMI + built-in tuner — parked on C1.** The tested browser setup handed off between sources. The gate remains a separate app-owned output for each input and independent cleanup. [Device plan](docs/device-tests/current-plan.md#hdmi-4-and-a-live-tv-channel)
4. **Two built-in TV channels — parked on C1.** The same-multiplex allocator checks returned no second decoder grant. A trial needs an app-owned path to attach a second service and acquire its own decoder and output. [DVB findings](docs/research/c1-hdmi-interface-map.md#dvb-attachment-candidates)

## Phase 2 evidence rules

Distinguish input selection, receiver activation, frame access, presentation
placement/scaling, audio ownership and restoration. Exported symbols, successful
compilation, two local clips or a display/scaler capture tap do not prove two
live HDMI inputs. Keep verified, candidate, unknown, unsupported and unsafe-to-test
findings distinct. [Current trial stop/restoration rules](docs/device-tests/current-plan.md#restoration-and-stop-rules)

Record concurrency by source pair and setup. A failed pair limits that test
configuration. Report the tested limits before reconsidering source scope.
[Prior art and open questions](docs/research/prior-art.md#physical-input-research-gaps)

## Deferred and closed work

Screensaver work is closed for this scope; effective inhibition remains unknown.
Do not reopen idle/endurance or separate Glasshouse/Home work without owner
instruction. Phase 1 gaps remain release limitations, not prerequisites for
repeating old local-clip campaigns before read-only HDMI research.
[Scope decision](docs/decisions/0003-close-idle-work-resume-hdmi.md)

## Release validation

Tie claims to exact hardware, firmware, backend, logs and owner observations.
Target 30 minutes of stable playback and 20 clean start/exit cycles per supported
combination before release claims. Preserve original reports and control IPKs.
Capability summaries use the [schema](schemas/capability-v1.schema.json); native
experiment reports have their own versioned contracts.

Active probes require explicit owner scope, bounded work and reviewed recovery.
A roadmap entry is not authorization to run a TV command. [Safety](docs/safety.md)

Keep this roadmap about phases and gates. Put dated outcomes in device records
and update Status when the single next task changes; do not append a chat history.
