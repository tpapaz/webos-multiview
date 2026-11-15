# Physical HDMI candidate 0.1.12

[Status](../../STATUS.md) · [Current procedure](../../docs/device-tests/current-plan.md) ·
[Reviewed adapter/witness](../phase2-hdmi-dispatch/README.md)

**Built, host-tested, sanitizer-tested, ARM direct-ABI checked and packaged offline.**
One archive-verified IPK, now installed-binding verified and **lifecycle-only
TV-tested once**, then **physical HDMI-4 TV-tested once** on C1/03.53.45. Owner
confirmed continuous motion in the centered box and audible sound. No simulator test.
Preserve all prior controls and occupied evidence slots. This contract grants
no installation, connection or run.

This is one physical candidate with two explicit actions in the same ELF. A
non-acquiring lifecycle validation action establishes independent termination and
owner restoration before a separately authorized physical HDMI action. It is not
a replacement browser or another setup-only package. Direct UTP remains selected;
one physical picture precedes independently live HDMI 1 + HDMI 2, still unproven.

## Native actions and strict authority

| Action | Required parameters beyond the original three private clock/boot fields | Native work |
|---|---|---|
| lifecycle_validation | verifyLifecycle true; acquireHdmi4 and gate hash absent | Own registration, dispatcher, graphics/window validation, cleanup and witness; zero UTP calls. |
| physical_picture | acquireHdmi4 true and terminationGateEvidenceSha256 as 64 lowercase hex; verifyLifecycle absent | Same adapter plus original fixed HDMI 4 open/select/eight-second observation/stop/close. |

Default/invalid/old/ambiguous parameters return before report/graphics/IPC work.
Both original strict three-second guards remain: before reservation and again in
the unchanged adapter before registration/SDL. Issue+17-second progression,
issue+22-second cleanup, one-second focus, 32-event bound, two-second exchanges,
eight-second observation, 100 ms dispatcher start/join and native 22-second
immediate-exit alarm stay unchanged. The witness retains the existing issue+25 s
outer bound; collection stays dispatch+27 s. No retry or deadline renewal.

The [main](main.cpp) and [contract](contract.h) reuse the reviewed adapter,
dispatcher, witness and original acquisition/session core byte-for-byte. No
private helper handles, default-context substitution, policy edits or new service
methods. Uncertain cancel/join/unregister retains owner storage with exit intent75.
Parent graphics/LS2 stays in the original SAM PID; witness only observes death.

Native requires the gate digest as an explicit action binding. The host runner
verifies the underlying evidence; native cannot read host evidence files. A hash
alone is not described as native verification or hardware-release proof.

## Schema 2 app trace

Dedicated [decoder](../../scripts/physical-candidate-report.cjs), maximum **2 KiB**.
Header fields in order: schemaVersion 2, appId, appVersion 0.1.12, mode,
gateEvidenceSha256 (null for lifecycle), launchBindingSha256.

The launch binding is SHA-256 of a canonical object containing mode, private boot
identity, both original deadline values and prior gate digest/null. Only its hash
is serialized. Launcher-added nid/metadata is excluded; no raw identifier, absolute
timestamp, pointer, payload or vendor text appears in the trace.

| Record | Meaning |
|---|---|
| `[stage,0,mono,age]` | Stage entry persistence attempted. It does not prove persistence returned or the backend call started. |
| `[stage,outcome,mono,age,callMs]` | Returned outcome; backend timing starts after entry persistence completes. |
| `[92,persistenceMs]` | Cumulative prior-row sink cost at integer-ms resolution. |
| `[90,status,setupReady,opened,selected,stopAck,closeAck,uncertain,localCleanup,ownerRetained,exitIntent]` | Final bounded summary. Missing summary leaves completion unknown. |

Stages 0–7 are witness_start, setup_and_window_id, open, select, observe, stop,
close, local_cleanup. Lifecycle permits only 0,1,7. Picture follows monotonic
progression, with conditional stop/close only for this attempt's returned ID.
Boolean stages return outcome 1 success/2 failure. Exchange stages return 1 reply,
2 not_sent, 3 uncertain; a returned reply does not imply service acceptance.
Status enum codes 1–6 retain setup_failed, open_failed, select_failed, cancelled,
candidate_interval_completed, cleanup_failed; lifecycle code5 is lifecycle_completed.

Timings are relative, reporting-only: -1 invalid/unobserved, -2 backward/before
origin, 0–25000 ms, 25001 saturated above the outer bound. Raw clocks decide
permissions; saturation never widens authority. Setup includes the validated
1920x1080 own-window guard. Trace-write failure stops progression but still runs
owned cleanup and attempts stop/close for an already recovered ID.

## Versioned termination evidence

The witness file is capped at **256 bytes**, with two records:

```text
[2,"0.1.12",actionCode,"launch-binding-sha256"]
{"schemaVersion":1,"kind":"own_parent_termination","state":"observed","exitStatus":"unknown","hardwareRelease":"unknown"}
```

Action code 0 is lifecycle, 1 picture. Parent persists the first record before
fork; the unchanged child appends the second only after kernel death notification,
reparenting and disappearance of the original parent proc entry. Header alone,
old generic marker, wrong version/mode/binding, partial data or mismatched metadata
cannot establish termination. [Witness decoder](../../scripts/physical-candidate-witness.cjs).
Numeric exit status, signal/alarm cause and hardware release stay unknown even
with observed termination. Retail witness survival through parent termination was
observed in the one lifecycle trial; future SAM behavior is not guaranteed.
Missing evidence fails closed. Nothing retroactively changes 0.1.11's unknown exit.

Before arming, the parent also requires /proc/self's PID token to equal getpid().
A missing/unreadable/mismatched procfs PID namespace stops before app registration,
graphics or UTP. No PID token is serialized. This prevents a jail/host namespace
mismatch from turning an unrelated absent proc entry into termination evidence.

Fresh basenames under both existing exact host/jail report-directory aliases:

| Action | App trace | Witness |
|---|---|---|
| lifecycle | lifecycle-0.1.12.jsonl | termination-lifecycle-0.1.12.json |
| picture | picture-0.1.12.jsonl | termination-picture-0.1.12.json |

Each action uses fresh exclusive slots. Four alias files are checked absent
before launch and read once during its bounded collection. Witness oversize is
rejected before reading its body. App cap2KiB, witness cap256, parent0700/file0600,
existing process/log/query limits and two 30-second connection caps remain strict.
No fallback retrieval, deletion, repair, recursive search or reuse of old authority.

## Enforced acquisition gate

The [gate](../../scripts/physical-candidate-gate.cjs) requires a prior scheduled
0.1.12 lifecycle capture from the **same compiled artifact and verified IPK**:

- One acknowledged launch, two closed sub-30-second connections, A closed before
  B, B no earlier than dispatch+27 s; exact raw stage/capture/authority bindings.
- Four absent preflight aliases, exact installed/generated bindings and unchanged
  installed contents afterward, no lifecycle UTP permission-map queries.
- Both raw app aliases identical and valid; setup/localCleanup complete, owner not
  retained, exit intent0, valid in-window timings, no acquisition stages.
- Both raw witness aliases identical and independently observed; version/mode/
  launch hash and restrictive owner/file/parent metadata match that capture.
- Own executable absent afterward and a **separate post-run owner confirmation**
  of normal picture, sound and remote, bound to the exact capture hash.

Missing, stale-artifact, conflicting, partial, unknown or late-collection evidence
keeps acquisition closed before a connection. The freshly sampled boot identity
must also match the prior private authority before SAM dispatch; another boot
stops without launching. No direct gate-hash override exists in the CLI. Readiness
flags cannot substitute for evidence. Synthetic fixtures never become device proof.

The gate receipt contains public hashes only. Raw report bytes are saved privately
once as report-host/jail.jsonl and witness-host/jail.json; launch.json remains
private. owner-restoration.json is created only after explicit post-run owner
confirmation, using the CLI's record-owner-restoration action. Pre-run remote/
timer readiness never supplies that confirmation automatically.

## Runner, archive binding and current readiness

[CLI](../../scripts/run-physical-candidate.cjs) composes the unchanged one-shot
controller through [runner bindings](../../scripts/physical-candidate-runner.cjs).
It awaits collection and closure in the foreground. A subprocess test proves the
cue precedes completion and the process remains alive through the synthetic +27 s
collection. Keep the actual execution/tool session attached; do not detach it
under a short-lived monitor. No code can promise survival after external forced
termination. The cue is submission intent, not launch acknowledgment.

Safe local check:

```powershell
node scripts/run-physical-candidate.cjs --plan
```

Current result is built true, packaged true, acquisition gate closed. The separate
archive receipt is bound locally; physical acquisition refuses before device
import without valid lifecycle/restoration evidence. Live syntax is
version-specific and requires a fresh explicit owner grant:

```text
--allow-one-lifecycle-0.1.12-run --owner-lifecycle-0.1.12-ready --owner-independent-timer-ready <fresh-evidence-directory>
--allow-one-picture-0.1.12-run --owner-physical-0.1.12-ready --owner-independent-timer-ready <fresh-evidence-directory> --gate-evidence <verified-lifecycle-evidence-directory>
```

The immutable candidate-validation.json records build facts, including packaged
false. The **separate** package-validation.json is archive-verified and matches
its hash, binary/manifest/version/schema and fixed IPK path/hash. Gate capture
binds both records and package bytes. No build-time fact needs rewriting after
packaging. Native source/binary acceptance is reused when only these host archive
bindings change; their separate acceptance is recorded and pinned.

## Completed offline checks

Records: build/phase-2/physical-candidate-0.1.12/{candidate-validation,local-validation,direct-abi}.json.
Preservation/frozen bindings: build/phase-2/physical-candidate-0.1.12-preparation-20261115-001/.

ARM ELF: **112,020 bytes**, SHA-256
7df25969c176e6560b4393c3236cd9f974e91f939b6313390e8da265670675e0.
Direct ABI: **118 imports / ten exact saved C1 providers**. No full vendor runtime
closure or ARM runtime execution is claimed. No firmware libraries are bundled.

Two native CTests passed normally/ASan/UBSan. All 16 real C++ trace fixtures decode
and their GLib launch hashes match Node SHA-256; widest output **665/2,048 bytes**.
Two real Linux parent-death files per build append the exact bound prefix and
remain below256 bytes. Scope/gate/report/runner/foreground/CLI tests passed,
including eight CLI cases, six source-tamper refusals and six archive-binding
refusals, with zero device imports. npm test/lint passed. All **272 preservation
pins and 21 IPKs** matched at build time; zero packages or TV actions in that stage.

The reviewed adapter/dispatcher/core tests and source-bound ThreadSanitizer host
memory-mapping limitation are reused unchanged. No host settings changed or
race-detector pass is claimed. No speculative setup-only package is queued.

Reproduction uses fresh versioned output slots and the existing WSL SDK; occupied
outputs are refused:

```powershell
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/scripts/validate-physical-candidate.py
```

## Verified physical archive

IPK: dist/io.github.tpapaz.multiview.hdmiwindow_0.1.12_arm.ipk, **51,124 bytes**,
SHA-256 cb7ec17381a23526299545300f5437c3d1fbeb12e45f1466adc05a71ec829e4f.
Receipt: build/phase-2/physical-candidate-0.1.12/package-validation.json.
Inspection/packaging/runner evidence:
build/phase-2/physical-candidate-0.1.12-packaging-20261115-001/.

The sole pinned CLI invocation used an offline network guard and recorded zero
network attempts. Archive inspection accepted only Debian format/control metadata,
the unchanged ELF/appinfo/icon and generated packageinfo, with exact bytes/modes
and ARM identity. No scripts, links, services, policies or vendor libraries.
25 malformed in-memory archives were rejected; six packaged runner cases and
eight tamper refusals passed with zero device imports. All 271 deduplicated
preservation pins, 43 candidate source pins and 21 original IPKs remain exact;
one new IPK exists. Native/ABI/sanitizer acceptance is reused without rebuilding.

## Observed lifecycle result

The [single lifecycle trial](../../docs/device-tests/c1-journal.md#0112-lifecycle-trial--cleanup-and-independent-termination-observed)
verified exact installed/generated bindings and one acknowledged SAM attempt.
Setup/window-ID validation returned in 635 ms, local cleanup in 170 ms; exit
intent0/no retained owner. Identical 358-byte app traces and 204-byte launch-bound
witnesses independently establish termination. Scheduled collection and both
connection closures passed; owner confirmed picture/sound/remote with no recovery.
No UTP acquisition or permission query. Numeric exit status, alarm cause and
hardware release remain unknown. No change to this package or native source.

Offline raw evidence replay accepted the lifecycle prerequisite before the
separately authorized physical trial below. No additional setup package or
lifecycle repeat was needed. Both grants are consumed; no repeat is authorized.

## Observed physical HDMI-4 result

The [single physical trial](../../docs/device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound)
passed same-boot/current-artifact and exact narrow admission checks. One SAM
attempt, valid identical 588-byte traces and 204-byte launch-bound witnesses:
open/select/stop/close acknowledged, observation8,003 ms, local cleanup172 ms,
no retained owner, exit intent0; termination independently observed. Both scheduled
connections closed, post bindings unchanged. Owner confirmed moving video in our
centered box and audible sound, followed by normal picture/sound/remote without
recovery. This establishes the first single-picture milestone, not dual HDMI,
long-term stability, independent audio control or hardware release.

Keep this unchanged IPK as the working control. Next is saved-evidence research
into an independent second HDMI acquisition/presentation path toward HDMI 1 + 2.
No further device action, new package or automatic trial follows this result.
