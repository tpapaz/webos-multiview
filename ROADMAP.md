# webOS MultiView Roadmap

Build a standalone Homebrew app for two independently live HDMI sources on
the TV's own hardware. The reference device is the rooted LG OLED C1 (2021,
firmware 03.53.45, webOS SDK 6.5.3). Simultaneous HDMI remains **unknown**.
The current setup has one connected HDMI source.

## Current position

Phase 0C is complete. Earlier default-main SMP/NDL comparisons failed visible
overlap: B Load reclaimed A's MAIN_SCALER. Retained logs established the
ownership handover, and firmware inspection identified explicit sink selection.
[Phase 1 test record](docs/device-tests/lg-c1-phase-1.md)

**Verified on this C1:** explicit SMP A main_video + B sub_video showed both
local clip clocks advancing together in the full staged run. B moved/shrank
and A stayed live after B release; cleanup and process exit passed. Logs
attribute MAIN_SCALER to A and SUB_SCALER to B with distinct decoder
allocations. This is a short video-only result, not physical-input evidence.

Phase 1 remains active: continuous stability, fixture wraps, wider independent
geometry and audio focus need validation. The separate endurance 0.1.0 IPK
is built locally, packaged and C1 ABI-checked. Smoke and 20 distinct app
start/exit cycles passed progress, A continuation, cleanup and exit. The
owner confirmed both clocks and normal viewing afterward. Four cycle
collectors flagged stderr; resource ownership remains unknown for this run.
The earlier smoke-controller scope error was fixed without an IPK change.
The first five-minute attempt ended with native cancellation after 21.343 s,
with no observed progress stall and successful cleanup/exit. Screensaver
launch/visibility in retained logs is the leading lifecycle explanation;
the exact SDL event remains unknown. Endurance 0.1.1 now requests app-scoped
SDL inhibition during bounded playback, restores it afterward, selects the
LG app-specific Type 2 idle policy and logs distinct exits. It is locally
built/packaged/C1 ABI-checked, **not TV-tested**. CPU samples were collected; standard temperature paths
exposed no readable sensors. [Attempt details](docs/device-tests/lg-c1-phase-1.md#five-minute-c1-attempt--interrupted-not-a-duration-pass)
Current gates:

1. Completed: eight-second smoke cycle with owner-confirmed visible overlap and A continuity.
2. Completed: 20 distinct app start/exit cycles with owner-confirmed clocks and normal viewing.
3. Pending: install 0.1.1, pass its own smoke test, then retry five minutes including wraps and owner spot checks.
4. Pass 30 minutes, then review cleanup, logs and normal viewing after exit.
5. Prepare wider independent geometry and audio-focus experiments separately.

The targeted 0.1.1 five-minute lifecycle retry requires its own same-build
smoke and owner confirmation; the 30-minute run requires a same-build
five-minute pass. The 20-cycle evidence remains specific to 0.1.0; repeat
20 cycles on the final candidate before claiming its repeatability gate.
This sequence validates local playback before returning to
physical-input research. [Run instructions](docs/build.md#repeatability-and-endurance)
and [decision](docs/decisions/0002-main-sub-validation.md). [Sink investigation and exact
C1 evidence](docs/research/c1-smp-ndl-resource-path.md).

## Phases and acceptance gates

| Phase | Scope | Gate |
|---|---|---|
| 0A–C | Pinned research, host checks, passive metadata and redacted report | C1 report collected, app closes cleanly and can be removed. [Phase 0 record](docs/device-tests/lg-c1-phase-0.md) |
| 1 | Two independent local clips on movable video surfaces | Both clocks visibly advance together, geometry works independently, and audio focus and cleanup work. |
| 2 | Selected HDMI overlay and viewport controls, then HDMI 1 + HDMI 2 and, if warranted, HDMI + tuner | Observe two distinct live physical inputs together. The dual-port test requires an evidenced per-port path and a second independent source. |
| 3 | Source management for proven inputs, then local and network streams where resources permit | Stable playback and predictable handling of scarce resources, buffering and reconnection. |
| 4 | Remote-first source picker, PiP/split/grid layouts, focus, audio selection and presets | Complete workflow for each verified source combination, including reset and uninstall. |
| 5 | Device compatibility matrix and community beta | Validate ABI and run hardware tests for each claimed model, firmware and backend. |
| 6 | More sources, independent app surfaces and advanced layouts | Research until device evidence supports the combination. |

## Physical-input evidence

Establish concurrent input activation, independent per-port frame access,
surface placement and scaling, and audio ownership. Each is a separate
capability. Decoder sessions, compositor planes, app lifecycle, and
receiver limits need their own evidence. [Research questions](docs/research/prior-art.md#physical-input-research-gaps)

If dual HDMI works, prioritize its source picker and layout controls.
If only a selected HDMI plus overlay works, document that supported
combination. If bounded tests find no viable second input path, publish
the measured limits and revisit scope with the owner. An IPTV pivot
requires a separate product decision.

## Validation

Tie claims to exact hardware, firmware, backend and logs. Before release,
target 30 minutes of stable playback and 20 clean start/exit cycles for
each supported combination. Reports use the
[capability schema](schemas/capability-v1.schema.json) for capability summaries;
native experiment traces have their own `schemaVersion: 1` report format.
Preserve unknowns in both.
Active probes require explicit owner opt-in, bounded execution and recovery.
[Safety and privacy](docs/safety.md)
