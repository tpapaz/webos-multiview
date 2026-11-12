# Native lifecycle-only helper

> Tool record. [Current status](../../STATUS.md) · [Documentation index](../../docs/README.md). Earlier next steps describe their recorded stage; use current Status for the selected task.

Built and host-tested 2026-11-12 for the saved LG C1 03.53.45 / SDK 6.5.3
userspace. **ARM-built, statically ABI-checked and TV-tested** for
[normal control](../../docs/device-tests/c1-journal.md#native-normal) and
[control EOF](../../docs/device-tests/c1-journal.md#native-control-eof).
Temporary stages removed after confirmed cleanup. No IPK or app UI; other fault
cases remain host-only.

Implements the [bounded lifecycle-only plan](../../docs/device-tests/archive/c1-lifecycle-only-plan.md):
one C99/POSIX executable forks fixed launcher, supervisor, actor and fake-worker
roles. It has no exec/network/LS2/graphics/media calls or geometry payloads.
Roles are internal functions; the CLI accepts only a fixed case and an existing
absolute private run directory. No commands, URIs, target IDs or PID arguments.

Cases: `normal`, `control_loss`, `actor_loss`, `worker_hang`, `partial_reply`,
`delayed_exit`, `cleanup_hang`. Normal control and control EOF passed on C1.
Other cases were exercised locally, not approved for
automatic TV fault injection. A missing expected control/actor loss fails that
case instead of producing a false independence pass.

The supervisor creates its own session, checks its parent-death signal, detaches
standard descriptors and observes a separate launcher-owned control pipe. Actor
and worker work begins only after private ownership metadata is recorded. A
worker reply is accepted only after its actual exit/reap and output EOF. Data
is the fixed `fake-ok` marker, not a simulated IWC response or recovered picture.

Own-process monotonic timing bounds readiness (2 s), fake work (2 s), cleanup
start (4 s), TERM/KILL escalation (200 ms) and cleanup wait (1 s). Supervisor
cleanup stops by 7.5 s with an 8-second hard alarm. Child fixture alarms prevent
indefinite fake hangs if the supervisor disappears. Scheduling/kernel stalls
can defeat user-space deadlines; no unconditional process/picture guarantee is
claimed. The code signals/reaps only its own forked children.

The caller must keep launcher stdin open for normal control; closing it or
losing the launcher cancels work through pipe EOF. The launcher prints only a
fixed readiness JSON and returns the supervisor's exit status. It must not be
invoked through a controller that closes stdin immediately and then reports
that cancellation as a normal-control success.

Each run directory must already be owned by the invoking user, mode `0700`,
and not a symlink. `report.json` and `owned.jsonl` are created exclusively with
mode `0600`; existing files are never overwritten. Metadata contains private
process IDs/start times for later exact cleanup checks. The final fixed JSON
report excludes IDs, uses at most 2 KiB and records child cleanup/session/EOF/
reply evidence. The report does not prove its own supervisor exited; the host
controller must separately confirm that exit. No helper file is auto-deleted.

Exit 0 means the selected fake lifecycle case completed with confirmed child
cleanup; 1 means a failed case; 64 rejects arguments; 71–75 classify startup,
report or wait failures; 124 is the hard alarm and does not confirm cleanup.

## Artifacts and offline ABI

- `build/phase-2/lifecycle-arm/multiview-lifecycle`: 17,780 bytes.
- SHA-256: `375e17c98229221392a98fc11ffacadfb713dd50a09b1d425002af0dcb07bec0`.
- ELF32 ARM soft-float; interpreter `/lib/ld-linux.so.3`; no RPATH/RUNPATH.
- Direct dependencies: `libc.so.6`, `librt.so.1`; the existing SDK supplies the
  latter link. Complete saved runtime closure also includes loader and pthread.
- `build/phase-2/lifecycle-arm/abi-validation.json`: static check passed for
  four runtime files and 206 required symbol/version references (37 executable
  references). No LS2, graphics/media, network or command-execution imports.

The shared `scripts/verify-admission-abi.py --lifecycle` reuses the established
ELF version-index/dependency verifier with a fixed lifecycle dependency profile.
It validates saved evidence hashes rather than downloading runtime libraries.
Its static pass proves neither loader execution nor C1 lifecycle independence.
The earlier admission mode remains the default; no existing artifact was rebuilt
or report overwritten by selecting the new lifecycle profile.

## Local reproduction

From repository PowerShell, using the existing Linux SDK:

```powershell
$repo = '/mnt/d/Development/webos-multiview'
$sdk = '/home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot'
wsl -d Ubuntu --exec cmake -S "$repo/native/phase2-lifecycle" -B "$repo/build/phase-2/lifecycle-host" -G Ninja '-DCMAKE_BUILD_TYPE=Debug'
wsl -d Ubuntu --exec cmake --build "$repo/build/phase-2/lifecycle-host"
wsl -d Ubuntu --exec python3 "$repo/tests/host/native_lifecycle_test.py" --binary "$repo/build/phase-2/lifecycle-host/multiview-lifecycle" --output "$repo/build/phase-2/lifecycle-host/new-test.json"
wsl -d Ubuntu --exec cmake -S "$repo/native/phase2-lifecycle" -B "$repo/build/phase-2/lifecycle-arm" -G Ninja '-DCMAKE_BUILD_TYPE=Release' "-DCMAKE_TOOLCHAIN_FILE=$sdk/share/buildroot/toolchainfile.cmake"
wsl -d Ubuntu --exec cmake --build "$repo/build/phase-2/lifecycle-arm"
wsl -d Ubuntu --exec python3 "$repo/scripts/verify-admission-abi.py" --lifecycle
```

These commands never connect to the TV. Tests execute only the Linux host
build, with a local subreaper for orphan fixture cleanup. The latest native
acceptance record is `build/phase-2/lifecycle-host/test-004.json`:
seven process cases, refusal of a falsely claimed control-loss case and actual
stdin EOF after worker metadata passed (nine cases total).
Unsafe directory, stale report, symlink and extra/unknown argument gates passed.
All fixture descendants were checked/reaped; real supervisor exit was confirmed.

Regression validation also passed: the earlier 13-case process harness after
sharing its owned-process test utilities; local recovery-model and diagnostic
tests; existing `npm test` and lint; ELF version-index regression and
`git diff --check`. No proprietary source was copied or runtime library bundled.

The [fixed staging/capture controller](../../docs/research/c1-native-lifecycle-controller.md)
is now implemented and passes 47 simulated SSH/SFTP scenarios locally. It pins
this artifact/runtime, keeps normal stdin open, gates loss EOF on readiness and
worker metadata, and saves the report before exact cleanup.
Owner-authorized C1 normal control now passed in 284 ms, with confirmed child
reap, launcher exit, no helper survivors and stage removal without host rescue.
The owner confirmed normal viewing afterward; before/during viewing is unknown.
The owner-authorized C1 control-EOF run also passed: loss observed, both children
reaped, launcher exit 0, no survivors and stage removal without host rescue.
Owner confirmed normal viewing before/after. Next reconcile the normal/EOF
lifecycle gates with the IWC arming record. Whole-transport/app/jailer survival,
real IWC workers and downstream reset ordering remain unproved.
