# webOS MultiView — Engineering Roadmap

- **Status** — Phase 1 / local media feasibility
- **Version** — 0.2
- **Updated** — 2026-11-11
- **Reference device** — rooted LG OLED C1 (2021, webOS 6 generation)
- **Deployment goal** — standalone Homebrew app for compatible rooted LG webOS TVs
- **Hardware constraint** — TV hardware only for the core use case

> This is an evidence-driven R&D project. Two independent live HDMI inputs on an LG C1 are **not yet demonstrated**. Root access does not create additional HDMI pipelines, hardware video decoders, compositor planes, or app surfaces. Nothing in this roadmap should be described as supported until verified on hardware.

## Current position

Phase 0C passed on the C1 with firmware 03.53.45 (webOS SDK 6.5.3).
Metadata, redacted Inspector retrieval, navigation, Close, normal HDMI viewing
after exit, and uninstall are **verified**. The on-TV download result remains
**unknown**. [Phase 0 device record](docs/device-tests/2026-11-10-csp-startup.md)

Phase 1 has **verified** single-clip SMP playback and exported-window geometry.
B's SMP Load stalled A's frame callbacks and release restored them. B's
software decoder request returned zero frame callbacks in its solo run.
Browser solo clocks advanced, and A paused after B was requested in the dual
browser run. The exact media resource decision and software decoder selection
remain **unknown**. [Phase 1 device record](docs/device-tests/lg-c1-phase-1.md)

1. Run the ABI-checked one-clip NDL v2 package on the C1 and confirm that its
   clock visibly advances and cleanup restores normal viewing.
2. If the baseline passes, stage one NDL B session alongside SMP A and compare
   against the existing SMP Load and release trace. Record the failing NDL
   stage and stop the mixed comparison if the solo baseline fails.
3. Continue read-only research for an independently addressable physical-input
   path. The current setup can exercise selected-HDMI controls under a separate
   opt-in protocol. The dual-input gate requires a second independent HDMI source.

## 1. Product vision and distinctive scope

Build **webOS MultiView**, a standalone on-TV application that lets users choose **two or more live sources** and arrange them into customizable Picture-in-Picture (PiP), side-by-side, grid, and freeform layouts.

### Source priority

1. **Physical HDMI inputs** (e.g., HDMI 1 + HDMI 2 simultaneously): the **defining feature**, and highest-priority feasibility question.
2. **HDMI + internal tuner**: a second physical-input combination.
3. **HDMI/tuner + a webOS app**: conditional on surface and application lifecycle constraints.
4. **Network streams** (local media, HTTP/HLS/other compatible protocols): useful complements and validation sources, but **not substitutes** for the physical-input goal.
5. **More than two sources**, if hardware resources and compositing permit.

This is **not** an IPTV-only multiview player and **not** a Home Assistant dashboard or camera overlay. Existing projects are prior art and potential integration references, not a reason to abandon the distinct physical-input use case.

### User-facing capabilities (aspirational; unlock according to hardware evidence)

- Source picker: physical HDMI ports, available tuner, compatible app surfaces, IP streams.
- Layout editor: 50/50 split, PiP, primary + two, 2x2, custom size/position/z-order.
- Live viewports with preserved aspect ratio, optional cropping and snapping.
- Focus control, fullscreen handoff, swap sources, source reassignments.
- Single selected audio focus initially; optional expanded routing only if tested.
- Saved presets per device, hotkeys and Magic Remote directional/pointer input.
- Self-diagnosing hardware compatibility screen and understandable unsupported-state messages.
- No silent replacement of live video with a screenshot, stale frame, or replicated source.

## 2. Feasibility model: independent hardware questions

Treat these as **separate questions**, not as one `supportsMultiView` flag:

1. **Concurrent activation:** Can HDMI 1 and HDMI 2 be electrically and logically active at the same time, or does selecting one deactivate the other?
2. **Per-input frame access:** Is there an API to acquire independently updated frames/surfaces from each input? Capturing the *currently selected display output* does not prove this.
3. **Concurrent rendering:** Can two distinct native video surfaces/planes be active with independent positions, or only one full-screen hardware surface?
4. **Recomposition:** Can the native compositor move/scale those input surfaces independently? If not, can a permitted graphics composition path meet acceptable performance?
5. **Tuner co-existence:** Can the tuner remain live while HDMI is active, and can its video be presented independently?
6. **App co-existence:** Can existing webOS app surfaces remain live, visible and optionally interactive outside the normal foreground lifecycle?
7. **Resource boundaries:** Decoder sessions, scaling engines, plane ownership, memory, bandwidth, thermal behavior, 4K/120, HDR/VRR/ALLM and audio selection.
8. **Content protection:** Some inputs/streams cannot legally or technically be captured or transformed; respect HDCP/DRM and app restrictions. Never implement circumvention.

### Critical interpretation rules

- Successful **symbol lookup** does not prove a callable API functions on the target TV.
- Successful **video capture of active HDMI** does not prove **two HDMI ports can be active concurrently**.
- Successful **two-stream IPTV playback** proves concurrency of a media path, not simultaneous HDMI ingest.
- Successful **overlay window** proves graphics overlay, not independent HDMI surface embedding.
- Success on webOS 7+/new LG models or commercial **Signage** is not evidence of support on consumer C1.
- Root may permit inspection and authorized service calls, but cannot overcome physical silicon constraints.

## 3. Existing research to audit (read first, do not blindly copy)

| Resource | Research question | Caveat |
|---|---|---|
| [webosbrew/samples](https://github.com/webosbrew/samples) | SMP/NDL native playback, exported SDL windows, ABI generations, firmware verification | Decoder sample success != multiple HDMI inputs |
| [webosbrew/hyperion-webos](https://github.com/webosbrew/hyperion-webos) | Reverse-engineered video/UI capture via libdile_vt and libvtcapture | Usually captures the selected signal; optional invasive quirks excluded |
| [webosbrew/apps-repo issue #87](https://github.com/webosbrew/apps-repo/issues/87) | Community proposal for freeform PiP and source selection | An unassigned idea, not a shipped implementation |
| [sharktie/lg-iptv](https://github.com/sharktie/lg-iptv) | Multiple network stream playback and decoder contention | IPTV-only scope, distinct from physical inputs |
| [angelcode1/webos-HomeBack](https://github.com/angelcode1/webos-HomeBack) | LG native PiP integration and window focus behavior | Newer generation; primarily dashboard use case |
| [iDaddyCz/ha-lg-webos-pip](https://github.com/iDaddyCz/ha-lg-webos-pip) | Overlay app window for camera content | Overlay != simultaneous HDMI routing |
| [webOS Homebrew Multi-View notes](https://www.webosbrew.org/guides/customize/multiview/) | Model restrictions, official multiview enablement and app allowlists | Present for some webOS 7+; not assumed for C1 |
| [LG Multi-View support](https://www.lg.com/us/support/help-library/lg-tv-how-to-use-multiview--20153280988637) | Officially supported combinations on newer models | Device/model-specific; do not extrapolate |

Audit current upstream branches, relevant source paths, **license compatibility** and technical constraints before deciding whether to reuse code. Link findings to repository commits/lines in `docs/research/` with the audit date.

## 4. Proposed architecture

### 4.1 Layers

```text
[webOS Homebrew application / UI]
     | Layout editor, source picker, presets, diagnostics
     v
[Controller / IPC interface]
     | Permission-scoped validated commands, lifecycle, session IDs
     v
[Capability registry & resource scheduler]
     | Detect features, reserve scarce resources, reject unsupported layouts
     v
[Source adapters]             [Compositor adapters]         [Audio manager]
  HDMI / tuner / webOS apps    Native video surfaces          audio focus
  Local/network media         SDL/OpenGL ES if usable        mute/routing
     \                              |                          /
      +-----------------[webOS platform integration]---------+
                             TV hardware
```

### 4.2 Components

- **Capability probe** (first deliverable): a standalone, minimal diagnostic `.ipk` with *passive* system discovery, optional manual tests, JSON export.
- **Device profile registry:** model, board, SoC, webOS version, firmware, candidate media/capture paths, known quirks, evidence.
- **Resource scheduler:** reserves decoders/planes/pipelines, enforces exclusivity and ordering, handles teardown.
- **Source adapters:** independent implementation for HDMI/tuner/app/network; a backend is disabled until supported by evidence.
- **Rendering adapters:** place native video surfaces or compose where legally/technically possible; do not assume GPU texture access to HDMI frames.
- **UI:** TypeScript/HTML/CSS with compatibility-conscious output, remote-first focus model.
- **Native service:** small C/C++ program using proven webOS interfaces; run with least privilege possible; isolate root-only probes in a tightly scoped helper.

### 4.3 Capability record — draft schema

```json
{
  "schemaVersion": 1,
  "probeVersion": "0.1.0",
  "device": {
    "modelFamily": "LG C1",
    "webosVersion": "unknown",
    "boardFamily": "unknown",
    "firmwareVersion": "unknown"
  },
  "capabilities": {
    "smpPlayback": "unknown",
    "ndlPlayback": "unknown",
    "multiNativeSurfaces": "unknown",
    "activeHdmiCapture": "unknown",
    "simultaneousHdmiInputs": "unknown",
    "hdmiAndTunerCoexistence": "unknown",
    "appSurfaceComposition": "unknown",
    "audioFocusSwitching": "unknown"
  },
  "tests": [],
  "redactionApplied": true
}
```

Status values: `unknown`, `candidate`, `verified`, `unsupported`, `blocked`, `unsafe_to_test`. Every non-unknown finding needs `method`, `deviceFingerprint`, `firmware`, `backend`, `result`, `logs`, and `limitations`. Do not represent null/unknown counts as zero.

### 4.4 Initial repository structure (adjust if upstream sample tooling suggests a better layout)

```text
webos-multiview/
├── AGENTS.md
├── ROADMAP.md
├── README.md
├── apps/
│   ├── probe-ui/
│   ├── phase1-browser/
│   └── multiview-ui/            # later
├── native/
│   ├── probe/
│   ├── phase1/
│   ├── phase1-ndl/
│   ├── core/                   # later
│   ├── sources/                # later
│   └── renderers/              # later
├── services/                   # later
├── schemas/
├── docs/
│   ├── research/
│   ├── device-tests/
│   ├── decisions/
│   └── safety.md
├── tests/
│   ├── host/
│   └── fixtures/
└── .github/workflows/
```

Suggested technologies: C/C++ native modules, CMake/Ninja and the appropriate openlgtv NDK; portable host tests; TypeScript or a lightweight JS frontend. Adapt to real tooling documented in the samples rather than making framework commitments before an audit. Avoid bundling system libraries where incompatible with old firmware.

## 5. Staged implementation with acceptance gates

### Phase 0A — Research audit and build foundations (Codex Cloud, start here)

**Deliverables**

- `docs/research/prior-art.md`: upstream links, relevant code, licenses, tested hardware, uncertain assumptions.
- `docs/research/c1-hypotheses.md`: list of experiments needed for simultaneous HDMI and allowed observable outcomes.
- `docs/decisions/0001-probe-first.md`: decision record explaining why native HDMI feasibility precedes the full UI.
- Repository skeleton, host CI, `AGENTS.md`, initial JSON schema, local mock adapter tests.
- An explicit list of prerequisites for any on-device tests.

**Gate:** research facts are sourced; unsupported hypotheses are clearly labeled; host tests pass. No TV interaction necessary.

### Phase 0B — Safe, passive C1 capability probe (`.ipk`)

**Deliverables**

- Small installable app that reads permitted model/firmware/device metadata and candidate library/interface availability.
- Capability report with source-specific evidence and PII redaction.
- Report viewer/export instructions and reliable app cleanup.
- Build script, packaging verification (if toolchain available), reproducible install/uninstall documentation.
- No automatic probing that changes active input, display mode, service state, or firmware.

**Gate:** builds and passes host CI; packaging checks pass if dependencies available. **On-TV success remains unverified until manually tested on the C1.**

### Phase 0C — First actual C1 hardware validation (human-operated)

**Deliverables**

- Run the passive probe and collect a redacted, consented report.
- Record exact firmware, backend candidates and logs.
- Confirm no persistent system modifications.
- Prioritized experimental matrix and rollback plan based on observed hardware.

**Gate:** a genuine C1 report exists and the test protocol is safe; otherwise stop active experimentation.

### Phase 1 — Native dual-surface proof of concept (current)

**Experiment:** two **independent local video clips**, not duplicate renders of one feed, on simultaneous movable video surfaces.

**Controls:** SMP staged Load and release, the solo software decoder request,
and HTML5 clock telemetry are recorded. The one-clip NDL baseline is next.

**Gate:** both independently advance in real time, geometry changes work, audio focus and cleanup behave predictably. If this fails, document where the limit lies and possible alternative graphics paths; do not declare multi-HDMI impossible solely because one decoder path failed.

### Phase 2 — Physical HDMI feasibility, prioritized

**Experiment A:** retain a selected HDMI signal while presenting a separate native graphics/video overlay.  
**Experiment B:** place selected HDMI in a smaller viewport without stopping it.  
**Experiment C (key):** attempt to activate and independently expose **HDMI 1 + HDMI 2** concurrently through observed API paths, with explicit opt-in and watchdog/manual recovery.  
**Experiment D:** HDMI + tuner coexistence if the HDMI results justify it.

**Gate:** independent simultaneous physical-input video must be directly observed; no fabricated success from active-output capture. If blocked, report the exact measured failure and stop unsafe/invasive approaches.

### Phase 3 — Source manager and selective network streams

Implement sources proven by earlier phases; add local/network streams only where real decoder resources permit, including buffering, reconnection and backpressure.

**Gate:** stable playback; clear behavior for scarce resources; test stream is not a stand-in for HDMI feasibility.

### Phase 4 — Standalone MultiView interface

Remote-first source picker, layouts, PiP, side-by-side, preset save/restore, single audio focus and explicit unsupported cases. Prioritize two physical sources whenever supported.

**Gate:** demonstrable end-to-end workflow on C1 for **each verified source combination**, uninstall/reset and regression tests.

### Phase 5 — Device matrix and community beta

Expand to older/newer rooted webOS versions with adapter and model-specific feature gating. Publish **evidence-backed** device matrix; accept anonymized volunteer probe reports only after informed opt-in. Validate ABI/toolchain differences before enabling a backend.

**Gate:** release claims tied to exact device/firmware/backend tests.

### Phase 6 — Advanced modes, research-only until verified

Investigate >2 HDMI feeds, tuner + multiple video surfaces, independent webOS app windows, and performance-intensive mixed layouts. Work within available hardware and DRM restrictions.

## 6. Security, safety, privacy and recovery

- **Passive by default.** The metadata probe is read-only. For Phase 1, the owner opens the specific diagnostic and opts in to a remote-button run or explicitly authorizes the app-scoped SSH test.
- Do **not** flash firmware, patch kernels, load modules, modify persistent system services, change boot settings, or kill/restart critical compositor/input services in initial phases.
- Do **not** attempt to circumvent HDCP, DRM, or content protection.
- Do **not** use `ptrace`, memory writes, hooking, or privileged UI injection by default; any future invasive experiment needs a new reviewed plan.
- Minimize privileged code; never expose arbitrary-command shell execution via public Luna IPC endpoints; validate all incoming parameters.
- Never change TV input automatically in a passive test.
- Cleanly release all opened resources, use timeouts and cancellation, restore previous state where supported, and log failure safely.
- PII redaction: serial numbers, IP/MAC addresses, tokens, credentials, account details, device IDs tied to owner, and crash dumps are excluded by default.
- Build environment must never receive SSH passwords, root keys, or production network credentials.
- **Do not remotely connect to or control the user's TV without explicit instruction and access authorization.** Cloud compilation alone is not device validation.

## 7. Validation and performance targets (targets, NOT promises)

| Criterion | Target / proof |
|---|---|
| Passive probe | No mode changes, reboot or persistent writes |
| Compile and package | Reproducible artifacts; ABI verification where supported |
| Native two-surface PoC | Two independently advancing clips, side by side |
| Physical-input goal | Two distinct live HDMI ports simultaneously displayed |
| Stability | 30-minute controlled test for each declared supported combination |
| Reliability | Repeatable startup/exit over 20 cycles without manual service recovery |
| UI interaction | Responsive Magic Remote navigation; measure rather than assume latency |
| Failure handling | Unsupported combinations rejected with useful explanations |
| Compat claims | Only if tested on precise model + firmware + backend |

## 8. Initial issue backlog (suggested labels)

| Issue | Phase | Priority |
|---|---|---|
| Audit SMP/NDL exported video window paths | 0A | P0 |
| Audit HDMI input selection/capture and hardware ownership | 0A | P0 |
| Design capability schema and evidence states | 0A | P0 |
| Implement passive model and firmware inventory | 0B | P0 |
| Implement local redacted JSON report viewer/export | 0B | P0 |
| Build Homebrew `.ipk` and verify ABI | 0B | P0 |
| Write repeatable C1 on-device test protocol | 0C | P0 |
| Prove dual independent native media presentation | 1 | P0 |
| Prove selected HDMI + independent overlay | 2 | P0 |
| Determine whether HDMI 1 + HDMI 2 can coexist | 2 | P0 |
| Tuner and native app surface investigation | 2/6 | P1/P2 |
| Network media sources and layout UI | 3/4 | P1 |

## 9. Decision gates / continue-or-pivot criteria

- **Green:** dual HDMI surfaces verified -> prioritize multi-HDMI UI and hardware scheduling.
- **Amber:** HDMI + one overlay works, dual HDMI cannot be proven -> continue limited mixed-source support **without** representing it as arbitrary physical-input MultiView.
- **Red:** input switching remains exclusive and no viable second input surface found after bounded experiments -> publish negative findings, seek community expertise, and **re-evaluate** whether a different product direction is worthwhile. Do not turn an HDMI-focused application into IPTV-only MultiView without a new explicit product decision.

## 10. Documentation and collaboration

- `ROADMAP.md` is the authoritative product scope and phased plan.
- `AGENTS.md` is the operating contract for Codex and contributors.
- `docs/research/` stores exact upstream links, citations, commit hashes, observed limitations, and unknowns.
- `docs/device-tests/` contains reproducible protocols and redacted measured results.
- `docs/decisions/` records scope changes and consequential architectural choices.
- Keep PRs scoped to a single phase/experiment; report tests run vs not run; do not mark device tests complete without on-device logs.
- Before copying external source, inspect license; prefer linking to code and designing compatible clean interfaces when uncertain.
