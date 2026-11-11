# Continue here: C1 HDMI discovery

Handoff: 2026-11-11. Workspace: `D:\Development\webos-multiview`.
Use the existing local working tree, including its uncommitted changes.
Do not reset it, commit it, push it, create a worktree or invoke GitHub Actions.

## Owner objective and current scope

Build a root-assisted standalone MultiView app for two independently live
**HDMI 1 + HDMI 2** inputs using the TV's hardware, with movable/scalable PiP
or split screen. Local/IP clips are diagnostic groundwork, not a substitute.

Next is **Phase 2 read-only HDMI input/presentation discovery**. Dual HDMI
is unknown; the current setup has **one connected HDMI source**. Start from
existing evidence and identify the next narrow acceptance gate before any
new IPK or active device experiment. Phase 1 is incomplete and its deferred
audio/geometry/endurance gaps must not be silently marked passed.

The owner closed screensaver work as low priority. Do not reopen it or
investigate the separate Glasshouse/Home behavior without a new request.

## Read first

1. [Contributor instructions](../../AGENTS.md) and [roadmap](../../ROADMAP.md).
2. [Closure/scope decision](../decisions/0003-close-idle-work-resume-hdmi.md).
3. [Prior-art HDMI boundaries](../research/prior-art.md#hdmi-routing-and-capture-boundaries)
   and [pinned source inventory](../research/source-lock.json).
4. [C1 Phase 0 record](../device-tests/lg-c1-phase-0.md),
   [Phase 1 journal](../device-tests/lg-c1-phase-1.md) and
   [main/sub resource path](../research/c1-smp-ndl-resource-path.md).
5. [Build guide](../build.md) and [safety/privacy](../safety.md).

The long device journal is historical evidence. Its earlier “next test”
paragraphs describe plans at that time; decision 0003 sets the current scope.

## Established facts

- Reference hardware: rooted LG OLED C1, firmware **03.53.45**, webOS SDK
  **6.5.3**. These are owner-supplied device facts and are tied to the retained
  authorized runs. Recheck if the device/firmware changes.
- ARM32 EABI5 soft-float userspace, glibc 2.28, loader `/lib/ld-linux.so.3`.
  Do not confuse the aarch64 kernel with the application ABI.
- Explicit SMP A `main_video` / B `sub_video` achieved visible independent
  local playback and B geometry. Default-main two-SMP and mixed SMP/NDL
  failed because B's separate presentation registration reclaimed MAIN_SCALER.
  NDL wraps SMP; a SUB_SCALER media token alone does not select a sub sink.
- Older Endurance 0.1.0 passed 20 processes. Version 0.1.1 reached 30-minute
  overlap but failed recovery at a screensaver focus transition. That full
  gate remains failed; no need to repeat it before read-only HDMI research.
- Veto 0.1.3 smoke: 8.056 s overlap, 3.049 s A recovery, successful service
  registration/cleanup and owner clocks. Final request mode: 60.022 s,
  no request/NACK, cleanup/exit passed, **inconclusive**. Actual veto unknown.
- No HDMI viewport, active HDMI capture, independently addressable second
  receiver or simultaneous HDMI pair has been demonstrated by this repository.

## First research deliverable

Prepare a concise interface/evidence map covering:

1. Current selected-HDMI owner and the distinction between selecting an
   input app and acquiring a receiver/session. HomeBack's EIM inventory and
   application-manager launch are selection leads only.
2. Presentation ownership/viewport path: assess whether the observed main/sub
   sink plumbing has a real physical-input entry point on this firmware.
3. Capture boundary: Hyperion's audited DILE/VT taps represent display/scaler
   output. Numeric capture handles are not demonstrated HDMI port selectors.
   Do not execute its active capture or low-level memory/module paths.
4. Whether retained configuration/ABI exposes independent port activation
   and arbitration, or only one selected input. Acknowledge absent evidence.
5. The smallest future selected-HDMI test, with expected observation, bounded
   cleanup/normal-view restoration and stop conditions. A dual-port test
   remains pending a second source and a justified independent path.

Use cached upstream trees and local firmware first. Look up primary sources
if needed and pin any newly used revision. Record provenance and licensing;
do not copy upstream implementation without a compatible license review.
Use `verified`, `candidate`, `unknown`, `unsupported`, `unsafe_to_test`
precisely. Record fixed-path read-only TV queries if needed; never print
profile contents, credentials, IPs, serials, raw IDs or unrestricted logs.

## Workspace map and local artifacts

- `native/probe/`: passive file-presence inventory only; no HDMI API proof.
- `native/phase1/`: SMP session and exported-window adapter.
- `native/phase1-sinks/`: staged main/sub control.
- `native/phase1-endurance/`: retained short veto control, not the active work.
- `scripts/phase1-device.cjs`: authorized local SSH profile loader. Consume
  its interface; do not display the profile or private key files.
- `scripts/phase1-native-ssh.cjs`: app-scoped identity/hash/signal/report pattern.
- `build/phase-1/firmware-inspection/`: ignored C1 SMP/NDL/AV-proxy/SDL/helper
  copies, disassembly, symbol inventories and resource configuration. Its
  `native-idle/` subdirectory holds tvpower/LS2/JSON artifacts. These are local
  evidence, not redistributable repository source.
- `build/reports/`: ignored versioned reports; preserve original attempts and
  owner observations. Do not infer a missing artifact exists on another host.
- `dist/`: retained control IPKs. Installed current control is Endurance
  **0.1.3**, title **MultiView Native Veto Probe**. It was closed after testing.

The final control IPK SHA-256 is
`82916a4f25ab3e904bcad508f310e54cad122220b227c4c10290bd2261820e5b`;
ELF SHA-256 is
`e693f742284c1d3b4ad7c57a4a6dd3c788657343e1977c2102765b6e1fbb0cc6`.
It is built/packaged/C1 ABI-checked and smoke-TV-tested; no HDMI claim follows.
Key reports: `c1-phase1-veto-smoke-0.1.3.json`,
`c1-phase1-veto-request-0.1.3.json`, their archived attempt-1 originals,
and `c1-phase1-veto-build-0.1.3.json` under `build/reports/`.

## Tooling and workflow

Use PowerShell on Windows. Linux ARM builds use the existing Ubuntu WSL SDK:
`/home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot`.
Existing Linux Node 22:
`/home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node`.
Reuse the original video-only fixtures; do not regenerate them casually.

Run `npm test`, `npm run lint` and the host CMake/CTest checks in the build
guide when changes warrant them. Tests cover business/acceptance rules, not
framework boilerplate. Every codebase task ends with a suggested commit
message. Never commit or push; all pending work is left for owner review.
No dev server is needed for the next research task.

## Suggested commit for the entire pending work

```text
feat: add bounded C1 screensaver diagnostics and prepare HDMI research

- Add the native veto probe with bounded playback, cleanup and error logging
- Retain CPU/temp sampling, build identity checks and control packages
- Record the successful 0.1.3 smoke and inconclusive request test
- Close screensaver work and consolidate the HDMI research handoff
```
