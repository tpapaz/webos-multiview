# Continue here: C1 HDMI discovery

> **Historical handoff, preserved 2026-11-12.** [Current status](../../STATUS.md) and the [active handoff](hdmi-next-chat.md) supersede this chronological task list. Original stage-by-stage text is retained below; do not treat its old next steps as current instructions.

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
4. [C1 Phase 0 record](../device-tests/c1-journal.md#phase-0),
   [Phase 1 journal](../device-tests/c1-journal.md#phase-1) and
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

Completed as static research on 2026-11-11:
[C1 HDMI interface/evidence map](../research/c1-hdmi-interface-map.md).
Fixed-path read-only copies identify `inputcommon` → UTP open/pipeline ID →
numbered port selection, plus IWC exported-window publication and rectangle
handling. No active method or HDMI behavior test was performed. Concurrent
receiver activation and external viewport-controller authority remain unknown.
The [IWC follow-up](../research/c1-iwc-ownership-recovery.md) locates the legacy
native provider and policy and traces setters, priority arbitration and cleanup.
It finds no controller lease or identified disconnect rollback. The subsequent
caller/restoration trace identifies the installed diagnostic's real app identity,
legacy outbound policy and public group, plus the exact C1 compositor path that
clears original-input/crop-source rectangles on ordinary geometry. Actual method
admission and applied restoration remain untested. The subsequent
[admission/reset plan](../research/c1-iwc-admission-reset-plan.md) identifies the
saved hub's permission-query handler and separates policy prediction from actual
list-method admission. The saved client transport now resolves the hub route as
`luna://com.webos.service.bus/isCallAllowed`. The selected first registration is
named `LSRegisterPubPriv(ownAppId, ..., true, ...)` for the proposed dedicated
`io.github.tpapaz.multiview.admission` package; the old diagnostic's handle was
anonymous and does not validate this form. The [admission-only runner](../../native/phase2-admission/README.md)
is implemented, host-tested, ARM-built, statically ABI-checked and packaged.
The executable and 17-file runtime dependency closure passed static checks;
the six newly retrieved core libraries match prior C1 hashes. The IPK is
`dist/io.github.tpapaz.multiview.admission_0.1.0_arm.ipk`; its README records hashes
and validation. The owner installed 0.1.0 without opening it. Its ELF, executable
mode and generated policies were verified by read-only SFTP. A stdout capture
gap prompted owner-approved 0.1.1 preparation; see the
[installation/capture record](../device-tests/c1-journal.md#admission-app).
Install the capture-enabled package and pass read-only preflight before any run.
Update: owner installed 0.1.1; read-only preflight passed. Owner then opened it
once and observed an immediate return to Home. Collection after ten seconds
found no process and no report at either expected path. Admission is unknown;
see the installation/capture record. Do not repeat the run yet: investigate
native startup diagnostics and temporary report lifetime/mapping read-only.
Read-only diagnosis now identifies the startup guard: jailer passes a JSON
metadata argument; retained close records report wait status 16384 (exit 64).
`main.cpp` rejects any argument before report reservation or LS2 work. See the
capture record for redacted log references and limits. Next is a focused local
startup-metadata handling fix and tests, not another launch of 0.1.1.
Update: that fix is implemented in locally built/packaged 0.1.2. Bounded normal
launcher metadata is validated and discarded; invalid startup is captured before
exit without bus registration. Host tests, collector fixtures and ABI checks
pass. Nothing was installed or relaunched. Next is owner review, then separately
authorized installation/preflight with a fresh run-002 directory.
Latest: owner installed and launched 0.1.2 after preflight. Run 002's recovered
report confirms named registration/identity, then a first hub query returning
`allowed: false`; one call, cleanup true, process absent. No IWC list request
was reached. Host/jail paths exposed identical report bytes; the host collector
was fixed/tested to accept identical copies and reject conflicts. Logs show
normal exit statuses, not crash signals. Read the capture record before further
work; next is read-only effective-permission investigation, no relaunch.
That read-only follow-up now found installed wildcard API rule `all: ["*/*"]`;
no matching public rule for ordinary IWC listing appeared in the examined API
files. The app's declared group is `public`, so offline group intersection
predicts the captured denial. See the admission/reset research record for
policy hashes, scope and the limitation that the exited caller's live group
vector was not dumped. Next review a legitimately permitted caller path or a
narrow root-assisted helper design; no policy edits, borrowed identities or
gate bypass. Keep run 002's report intact and the app closed.
Read-only permitted-caller research is now in
[c1-iwc-permitted-caller.md](../research/c1-iwc-permitted-caller.md). Installed
policy grants the actual stock `/usr/bin/luna-send` utility's generated name
pattern `all`; its saved ELF confirms default identity generation/registration.
No invocation occurred. Next prepare a fixed, bounded, redacting root-diagnostic
list collector locally. Do not treat that future path as normal-app admission,
rename our runner to a stock identity, change grants or execute a read yet.
Collector follow-up: `scripts/collect-iwc-diagnostic.cjs` and fixed core
`scripts/iwc-diagnostic.cjs` are implemented and host-tested. See
[collector contract](../research/c1-iwc-diagnostic-collector.md). Eight saved
artifact pins, one constant listing command, strict redaction, eight-second
host bound and channel-only cancellation are covered. No TV connection/run
occurred; the app remains closed. A future execution needs owner instruction.
Latest: owner authorized one execution. Fixed root read 001 passed: all pins
matched, successful IWC listing, zero publications/HDMI candidates, normal
utility exit 0 and cleanup confirmed in 401 ms. See
[device record](../device-tests/c1-journal.md#root-read-001) and ignored
`build/phase-2/iwc-root-read-001/report.json`. No retry, app launch, permission
edit or geometry/crop call. Visible input state is unknown; first establish that
owner context before planning another authorized read. App denial is unchanged.
Subsequent owner-authorized root read 002, after manual live-HDMI selection and
a stable-picture confirmation, passed with one publication and one HDMI-app
candidate. All pins matched; utility exit 0 and cleanup confirmed (449 ms).
See [run 002 record](../device-tests/c1-journal.md#root-read-002). No retry or active
geometry/crop work occurred. Next review target/baseline/recovery preconditions;
port, crop, priority, destination and post-read visible continuity are unknown.
The [target/baseline/recovery review](../research/c1-hdmi-target-baseline-recovery-review.md)
now reconciles those results. Single-target discovery passes; a fresh bound
tuple and full-view logical dimensions/baseline do not. Saved QML binds reset
dimensions to the app window, not panel/input resolution. Independent sole-writer
recovery and applied ordering remain unproved; active geometry/crop is unsafe
to test now. This review used saved evidence only, without another TV connection.
Next useful work is a local arming/recovery model with fault fixtures, optionally
a sanitized read-only baseline-report extension. No new device read is authorized.
Owner subsequently confirmed HDMI 4 and normal view/motion/sound after run 002.
That completes historical owner baseline context, not a fresh target or recovery
gate. The review and separate local owner-confirmation record reflect this reply.
Local-only follow-up: `scripts/iwc-recovery-model.cjs` implements strict arming
and sole-writer simulation, with tests in `tests/host/iwc-recovery-model.test.cjs`
(`npm run test:iwc-recovery-model`). See
[contract/limits](../research/c1-iwc-local-recovery-model.md). No device adapter
or real supervisor exists; flags in tests are synthetic evidence only. All
simulated failure/observation gates pass locally. No TV operation or permission
change occurred. Next review the separate supervisor/lifetime/ordering design;
do not infer that local simulation has made a geometry experiment ready.
That [supervisor review](../research/c1-iwc-supervisor-design-review.md) is now
complete as design only. Candidate is one transient TV-side supervisor owning
fixed stock-utility workers, separate from actor/SSH teardown. Local sole-issuer
serialization does not prove downstream application ordering; setsid/background
launch alone does not prove C1 lifetime. Own-supervisor failure remains outside
automatic recovery. No TV work occurred. Next useful implementation is a local
real-process harness with fake workers and no device/geometry adapter, followed
only on later authorization by any non-mutating C1 lifecycle investigation.
The [local process harness](../research/c1-iwc-local-process-harness.md) now
passes 13 real Linux-process cases under WSL (`npm run test:iwc-process`). It
reuses the model with fixed fake workers and synthetic gates. Actual actor/
launcher loss, status-pipe loss, hangs, partial replies, delayed exit and
TERM/KILL/reaping are covered. Supervisor death/suspension stays inconclusive;
outer-controller cleanup is recorded separately. No TV access or live adapters.
Next prepare a non-mutating C1 lifecycle-only contract, not an active IWC test;
device execution still needs owner instruction and downstream ordering is open.
The [C1 lifecycle-only plan](../device-tests/archive/c1-lifecycle-only-plan.md) is now
prepared. Next implement one minimal C/POSIX helper and fixed controller,
validate locally and against saved ARM ABI, then offer the normal-control run.
Only fake processes/pipes/reporting: no LS2, graphics, media, target IDs or
active payloads. No TV connection/staging/run occurred during planning. Initial
device scope is normal control, then separately selected control-channel loss;
the plan specifies bounds, capture and exact-owned-process cleanup. Do not add
another broad review phase before that minimal implementation.
That native helper is now implemented under `native/phase2-lifecycle/` with
local tests/controller in `tests/host/native_lifecycle_test.py`. See its README
for artifact hash and commands. Host process tests and rejection gates passed;
ARM ELF passed the shared verifier's `--lifecycle` profile (four saved runtime
files, 206 symbol/version references). The
[fixed staging/capture controller](../research/c1-native-lifecycle-controller.md)
now passes 47 simulated SSH/SFTP cases. It supports fixed normal control and
control EOF, pins helper/runtime, gates EOF on readiness/worker metadata,
captures before removal and refuses uncertain
process identity. Owner-authorized
[C1 normal control 001](../device-tests/c1-journal.md#native-normal) now passed:
284 ms helper, actual exit/reap and no survivors, stage removed without host
rescue. App absent before/after, zero IWC calls or existing permission changes.
Owner confirmed normal picture/motion/sound afterward; before/during unknown.
The owner-authorized [C1 control-loss 001](../device-tests/c1-journal.md#native-control-eof)
also passed: EOF sent at host 128 ms, observed by the supervisor, helper duration
108 ms, both children reaped, launcher exit 0, no survivors, stage removed with
no host rescue. Owner confirmed normal picture/motion/sound before/after.
No app launch, permission edit or IWC/geometry operation occurred. Both planned
normal/EOF device controls now pass. The
[post-lifecycle gate review](../research/c1-iwc-gates-after-lifecycle.md) maps
the exact guarantees; no model arming flag was relaxed. Next prepare one fixed
real-worker read-only preflight: actual stock utility self-policy queries for
listing/setter prediction, then a single HDMI publication read exporting only
sanitized port/logical dimensions. Setter URI is query data, never a destination.
The existing helper is fake-only; implement/test/ABI-check the focused adapter
locally before an owner-directed TV run. No further generic normal/EOF work is
queued. Full SSH/app survival, actual setter admission and applied ordering
remain unproved; active geometry/crop stays gated. This review used saved
evidence only, with no TV connection or permission change.
Do not treat the bare helper as a ready
unattended device test or as an IWC/recovery controller.
Actual named registration, effective permissions and listing remain untested.
The reset plan uses
a candidate sole writer, fixed deadlines and no automatic priority escalation;
ordering, restorer lifetime and residual arbitration remain unresolved.
No geometry experiment is ready or authorized. Arbitrary prior crop rollback is
not established. The HUD-only candidate remains unbuilt and untested.

The map covers these boundaries; retain them when extending the research:

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
- `build/phase-2/hdmi-discovery-20261111/`: ignored fixed-path inventories,
  firmware/QML/policy copies and static export evidence for the interface map.
  Preserve locally; do not redistribute proprietary files or rerun collectors
  merely to reread evidence already retained.
- `build/phase-2/iwc-trace-20261111/`: ignored IWC service/role/executable
  copies, forced-Thumb disassembly, method/import review and evidence hashes.
  These are static evidence, not a successful IWC call or recovery test.
- `build/phase-2/iwc-caller-restore-20261111/`: ignored app/provider manifests,
  caller roles, hub policy and client/compositor geometry traces. Do not reuse
  the retained diagnostic for active IWC tests; it was only a policy specimen.
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

## Suggested commit for the pending HDMI research

```text
docs: trace C1 IWC admission and bounded full-view recovery

- Map selected-HDMI routing and IWC caller/publication boundaries
- Trace the C1 compositor crop reset path and permission-query handler
- Specify admission-only and bounded full-view reset gates
- Preserve unknown device behavior and defer all active geometry experiments
```
