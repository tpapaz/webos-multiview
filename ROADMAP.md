# webOS MultiView roadmap

[Current status and next task](STATUS.md) · [Documentation index](docs/README.md)

## Objective and position

Build a standalone, root-assisted Homebrew app for independently live
**HDMI 1 + HDMI 2**, displayed in movable/scalable PiP or split screen on the
TV's own hardware. Additional source types do not replace this objective.

Reference device: LG OLED C1 (2021), firmware 03.53.45 / SDK 6.5.3.
Simultaneous HDMI is **unknown**. One HDMI source is currently connected.

**Active phase: Phase 2 HDMI acquisition and application-owned window research.**
Phase 0 is complete. Phase 1 has useful device evidence but remains partially
validated; its remaining gates are deferred, not passed. The selected next task,
its readiness and latest test results live only in [Status](STATUS.md).

## Phases and acceptance gates

| Phase | Scope | Acceptance gate / position |
|---|---|---|
| 0A–C | Pinned research, host checks, passive metadata and redacted report | Complete: C1 passive report and clean lifecycle. [Device record](docs/device-tests/c1-journal.md#phase-0) |
| 1 | Two independent local clips on movable video surfaces | Partially validated: explicit main/sub live playback and B geometry observed. Audio, wider geometry, final-build repeatability and full recovery remain open/deferred. [Journal](docs/device-tests/c1-journal.md#phase-1) |
| 2 — current | Resolve UTP acquisition/window binding; one live HDMI in our fixed window; then independently live HDMI 1 + 2 in two fixed windows | First require visibly advancing physical HDMI content in an application-owned window and clean exit/restoration. Next require two distinct moving sources to keep advancing together without freezing or switching. Dual-port proof needs an independent receiver/presentation path and explicit owner scope. Move/resize, layouts, remote workflows and audio selection follow concurrency proof. |
| 3 | Source management for proven inputs; local/network sources where resources permit | Stable playback and predictable buffering, reconnection and resource contention. |
| 4 | Remote-first picker, PiP/split/grid layouts, focus, audio selection and presets | Complete workflows for each verified combination, including reset and uninstall. |
| 5 | Compatibility matrix and community beta | ABI and device tests for every claimed model/firmware/backend. |
| 6 | More sources, app surfaces and advanced layouts | Research until device evidence supports each combination. |

## Phase 2 evidence rules

Distinguish input selection, receiver activation, frame access, presentation
placement/scaling, audio ownership and restoration. Exported symbols, successful
compilation, two local clips or a display/scaler capture tap do not prove two
live HDMI inputs. Keep verified, candidate, unknown, unsupported and unsafe-to-test
findings distinct. [Current recovery gates](docs/research/c1-iwc-gates-after-lifecycle.md)

If only selected-HDMI plus an overlay proves possible, report that limitation.
If a second physical-input path cannot be supported by evidence, publish the
measured limits before reconsidering scope. An IPTV pivot needs a separate
product decision. [Prior art and open questions](docs/research/prior-art.md#physical-input-research-gaps)

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
