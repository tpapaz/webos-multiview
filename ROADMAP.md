# webOS MultiView Roadmap

Build a standalone Homebrew app for two independently live HDMI sources on
the TV's own hardware. The reference device is the rooted LG OLED C1 (2021,
firmware 03.53.45, webOS SDK 6.5.3). Simultaneous HDMI remains **unknown**.
The current setup has one connected HDMI source.

## Current position

**Active: Phase 2 read-only HDMI discovery**, by owner decision. Phase 0
passive discovery is complete; Phase 1 is partially validated and its remaining
gaps are deferred, not passed.
[Scope/closure decision](docs/decisions/0003-close-idle-work-resume-hdmi.md)
and [next-chat handoff](docs/handoff/hdmi-next-chat.md).

Verified on C1 03.53.45: two local video-only SMP sessions using
`main_video` / `sub_video` showed owner-confirmed live clocks, B geometry
and A continuity. Default-main SMP/NDL comparisons contended for MAIN_SCALER.
Endurance 0.1.1 reached long overlap but failed its full recovery gate.
The 0.1.3 short smoke passed registration/playback/cleanup; its final
60.022-second request test received no request and was inconclusive.
[Phase 1 journal](docs/device-tests/lg-c1-phase-1.md).

Screensaver work is **closed/deferred for this scope**, with effective veto
unknown. No further idle, long endurance or Glasshouse/Home work is scheduled.

## Next research gate

1. Read existing pinned upstream sources, C1 firmware/SDK declarations and
   policy/configuration. Produce a cited interface map for input selection,
   receiver/session ownership, output capture and surface/viewport control.
2. Distinguish selected-input/output capture from independently addressable
   HDMI ports. Neither local dual playback nor a display/scaler tap proves
   simultaneous HDMI.
3. Propose the smallest bounded selected-HDMI presentation experiment only
   after identifying a plausible C1 path, permissions and cleanup/restoration.
   Do not switch inputs or invoke active methods during read-only discovery.
4. A simultaneous HDMI 1 + 2 experiment requires a second independent source,
   an evidenced per-port path and owner opt-in. Only one source is connected.

Remaining Phase 1 audio/geometry/repeatability/recovery gates stay visible
before release claims. The owner approved read-only Phase 2 research without
repeating those local-clip campaigns first. Preserve all control packages,
original reports and human observations; detailed history stays in the device
journal and research records, not in this action list.

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
