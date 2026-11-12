# C1 native lifecycle staging and capture controller

> Research/tool record. [Current status](../../STATUS.md) · [Documentation index](../README.md). Earlier next steps and untested labels describe that stage; use Status and later device records for current results.

Prepared and locally tested 2026-11-12 for LG C1 03.53.45 / SDK 6.5.3.
**Simulator-tested controller; ARM helper built and statically ABI-checked.
Preparation involved no TV staging/execution.** The later owner-authorized
[C1 normal control 001](../device-tests/c1-journal.md#native-normal) passed with
confirmed cleanup. No app launch, existing permission change, LS2, geometry or
crop operation occurred.

## Evidence and acceptance gate

Use the [lifecycle-only plan](../device-tests/archive/c1-lifecycle-only-plan.md) and
[native helper record](../../native/phase2-lifecycle/README.md). Existing Linux
process tests establish fake-worker behavior locally; the retained ARM ABI
record establishes compatibility with saved userspace files. Neither establishes
C1 execution or independent recovery of HDMI geometry.

The controller pins the existing 17,780-byte helper to SHA-256
`375e17c98229221392a98fc11ffacadfb713dd50a09b1d425002af0dcb07bec0`.
Its four loader/libc/librt/pthread size/hash pins were checked locally against
`build/phase-2/admission-runtime-20261111/` and the lifecycle ABI record.
No new runtime file or proprietary implementation was downloaded or bundled.

Implementation plan completed: share staging/capture for two fixed operations,
retain normal control's open stdin, gate one loss-case EOF on readiness/worker
metadata, and test the loss acceptance and refusal paths locally.

## Fixed operation and lifetime

- [Core controller](../../scripts/lifecycle-controller.cjs) accepts a connection
  factory and durable report writer. No configurable command, URI, PID, remote
  directory, binary pin override or arbitrary case. Two fixed wrappers select
  normal control or control-channel loss.
- [CLI](../../scripts/run-native-lifecycle.cjs) consumes the existing root SSH
  profile interface without exposing its contents. Import, help and invalid
  arguments never connect. Each fixed operation has an explicit live flag.
- [Acceptance tests](../../tests/host/lifecycle-controller.test.cjs) use fake
  SSH/SFTP clients and a fake clock; no subprocess or network operation.

A future authorized run checks the local artifact/ABI record and reserves a new
local report. Two SSH connections must be ready before TV file creation. It
checks the known admission executable is absent from `/proc` and compares four
saved runtime pins using fixed stat/hash operations. Changed runtime, active
app, unsafe `/tmp` or an existing run directory refuses execution.

It exclusively creates one random root-owned `/tmp/multiview-lifecycle-*`
directory, mode `0700`, uploads the pinned helper with mode `0700`, then verifies
its bytes. One non-PTY command executes only the selected fixed `normal` or
`control_loss` case. The generated path has the fixed prefix and 32 hex digits.
Normal stdin stays open; the loss case sends one gated EOF as described below.
The second connection reads bounded private metadata/report files and
the `/proc` fields needed for identity and app-absence checks. No retries, input
changes, service operations, installs or existing-file permission changes.

Preflight has a 10-second budget. After exec, readiness must arrive within
2 seconds; collection has a separate 15-second budget (about 25 seconds total,
subject to host scheduling). The helper retains its own monotonic deadlines and
8-second alarm. Cancellation requests TERM on the owned control channel while
keeping verification available for bounded capture.

At 10 seconds after exec, or on cancellation, the host may attempt emergency
cleanup. Metadata admits at most four fixed roles with numeric original PIDs
and start times. Each target must match its start, staged executable, exact argv
and executable hash. A fixed command repeats these guards immediately before
TERM, then KILL after 250 ms if still owned. Reused/foreign identities are not
signalled; no process-name/group kill exists. The old-kernel PID checks are
**not atomic with kill**: a residual identity race remains. This is a bounded
candidate cleanup mechanism, not a pidfd guarantee.

## Capture, cleanup and claim boundaries

A normal pass requires an allowlisted native report, timely readiness, launcher
exit plus channel close/code 0, four recorded roles, successful fake reply,
child reap/session evidence, app absence and final helper absence. A report
alone does not establish supervisor exit. Any host rescue is inconclusive even
if cleanup later succeeds.

Only validated report fields leave the private metadata boundary. PIDs/start
times, SSH profile, network identifiers, raw stderr and raw exceptions are not
exported. The random temporary directory is retained in the host report to
support exact follow-up when cleanup is uncertain; no publication ID is stored.

Before removing TV files, the host saves and fsyncs the validated report. CLI
updates use an exclusive local `.pending` file and rename, preserving an earlier
capture if a final-status update fails. Review an existing `.pending` file
instead of overwriting it. Remote removal also requires launcher exit and helper
absence, then removes only the three known regular root-owned files and their
empty exclusively created directory. No recursion or symlink traversal.
Invalid evidence, unknown survivors, lost verification, failed capture or an
unexpected file retains the stage and reports failure. A failed pre-exec upload
can remove its own known files without claiming a lifecycle pass.

## Local validation

Passed on 2026-11-12:

```powershell
npm run test:lifecycle-controller
npm run test:iwc-diagnostic
npm run test:iwc-recovery-model
npm test
npm run lint
node --check scripts/lifecycle-controller.cjs
node --check scripts/run-native-lifecycle.cjs
node scripts/run-native-lifecycle.cjs --help
git diff --check
```

The original suite passed 32 simulated scenarios: normal control; artifact/runtime
drift; active app; unsafe staging/collision; corrupt upload; malformed, extra-field
or symlink evidence; missing exit/close; stderr/nonzero exit; late readiness;
cancellation; control/verification loss; stuck workers; reused/foreign PIDs;
refused signal guards; unexpected files; failed/stalled report save; connection
and read deadlines. Assertions require capture before removal, open helper
stdin, one execution, redaction and released controller timers/connections.
Local saved binary/runtime hash and ABI-record comparisons passed too.

No C source or ARM artifact changed, so native builds and real-process cases
were not repeated in that preparation task. Subsequent C1 run 001 tested this
exact controller over real SSH and passed normal control.

## First device execution and next step

The owner subsequently authorized and completed one normal control using this
command (already executed; do not repeat or overwrite its report):

```powershell
node scripts/run-native-lifecycle.cjs --stage-run-normal build/phase-2/lifecycle-c1-normal-001.json
```

The helper finished in 284 ms, launcher exited 0, no processes remained, and
the stage was removed without host rescue. The owner confirmed normal viewing
afterward; before/during viewing is unknown. See the linked record for hashes.
The control-loss operation was locally validated below and subsequently passed
one [owner-directed C1 run](../device-tests/c1-journal.md#native-control-eof).
App/jailer survival, downstream IWC ordering, hardware restoration and simultaneous
HDMI remain unknown. No geometry/crop experiment is authorized or ready.

## Control-channel loss prepared locally — 2026-11-12

Saved normal-report SHA-256 remains
`1bcae74a7dee81bf8af005c3189f765c64e75ef21d073ff5f58c6806c249e053`.
The ARM helper and ABI record still match the original pin. No native source,
ARM artifact or runtime library changed; no rebuild or new ABI analysis was
needed. The device record's source hashes identify the earlier run-001 revision;
its report is preserved unchanged.

`runControlLoss` executes only `--case control_loss`. After timely readiness and
four append-only ownership rows, including the worker recorded before its gate
opens, it ends the owned helper stream's stdin **once**. Supervisor/child session
metadata must agree. Injection must occur within 2 seconds and before any
observed exit/close. It sends no data or signal and closes neither SSH connection.
The launcher converts stdin EOF to supervisor control-pipe EOF. The verification
connection remains available. This tests **control EOF**, not abrupt SSH transport
loss or launcher destruction. No host tick drives supervisor cleanup.

Host report fields `case`, `controlEofSent` and `controlEofMs` record selection
and injection. Passing requires actual injection, matching-case native
`cancelled_cleanly`, `hostControlLost: true`, both children started/reaped,
separate session, no actor loss, no completed fake-reply claim, launcher exit/close
code 0, app absence, no survivors and no host emergency rescue. Unobserved loss
never passes. A missed short worker window fails/inconclusive with no retry.
Both cases share runtime/artifact pins, identity guards, 10/15-second budgets,
durable capture and exact cleanup.

Local validation passed:

- `npm run test:lifecycle-controller`: **47 simulations**, original 32 plus
  15 loss cases covering successful gated EOF, ignored/unobserved EOF, missing
  worker, inconsistent sessions, malformed/late readiness, wrong case, unconfirmed
  cleanup, missing exit/close, verification loss, cancellation, failed capture
  and host-rescued cleanup.
- Real Linux host helper suite: **nine cases** plus rejection gates. Newly added
  EOF-after-worker case observed loss, reaped children and confirmed normal
  supervisor/launcher exit in **9 ms**, with no KILL or fixture descendants.
  Exact PowerShell command and saved record:

  ```powershell
  wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/tests/host/native_lifecycle_test.py --binary /mnt/d/Development/webos-multiview/build/phase-2/lifecycle-host/multiview-lifecycle --output /mnt/d/Development/webos-multiview/build/phase-2/lifecycle-host/test-004.json
  ```

- `npm test`, `npm run lint`, `npm run test:iwc-diagnostic`,
  `npm run test:iwc-recovery-model`, `node --check` for controller/CLI,
  CLI `--help`, artifact/ABI/report pin comparisons and `git diff --check` passed.
  No unrelated process harness/build was repeated.

**Ready for the next explicitly authorized TV test. No further broad research
or implementation is required first.** No TV connection, staging, run, app
launch, permission change or geometry/crop call occurred during this preparation.
For the eventual run, use stable HDMI viewing and obtain owner picture/motion/
sound observations before and after. Future command only, with a new report:

```powershell
node scripts/run-native-lifecycle.cjs --stage-run-control-loss build/phase-2/lifecycle-c1-control-loss-001.json
```

The command was subsequently executed **once** with owner authorization and
passed. Its report now exists; do not repeat or overwrite it. This establishes
only the root-shell fake-worker EOF case, not HDMI/geometry recovery or
app/jailer/transport-failure survival.

Local preparation summary/source hashes are retained in
`build/phase-2/lifecycle-control-loss-preparation-001.json`. It records zero TV
connections/stages/runs for this task and does not replace the original C1 report.

## C1 control-EOF execution — 2026-11-12

The linked device record retains the complete result and owner observations.
Controller status `control_loss_passed`: EOF sent at host 128 ms, native host-loss
observation and `cancelled_cleanly`, helper 108 ms, both children reaped, launcher
exit/close 0, no survivors, stage removed without host rescue. App absent
before/after; zero IWC calls or existing permission changes. Owner confirmed
normal picture/motion/sound before and after. Whole-controller elapsed 5,025 ms.
Host/native clocks have different origins; these elapsed times are not offsets
on one shared timeline.

Report `build/phase-2/lifecycle-c1-control-loss-001.json` SHA-256:
`718d53e62b4aea4b80fce5370c57e37f052281f1e8c671173902ff284cb000fe`.
Owner observations and exact source/artifact hashes are saved separately in
`lifecycle-c1-control-loss-001-observations.json` beside it. Both planned
normal/EOF controls now have C1 evidence. Next reconcile those lifecycle gates
with the IWC arming record; real-worker admission/ordering and geometry recovery
remain unresolved. No other test is authorized by these results.
