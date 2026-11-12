# C1 lifecycle-only test — bounded plan

> **Archived detail; no test is authorized here.** [Compact C1 journal](../c1-journal.md) · [Current test plan](../current-plan.md). Original stage-by-stage findings, commands and hashes are retained below; old next steps are historical.

Prepared 2026-11-12 for LG C1 03.53.45 / SDK 6.5.3.
Originally a device test plan. The subsequent
[native helper](../../../native/phase2-lifecycle/README.md) is built, locally tested
and statically ABI-checked. Owner-authorized
[normal control 001](c1-lifecycle-normal-001.md) and
[control-loss 001](c1-lifecycle-control-loss-001.md) have now passed on C1;
other device cases remain unexecuted.

## Decision: next device test

The minimal native helper and fixed staging/capture controller are now built,
locally validated and passed one owner-authorized **normal control** on C1.
The owner-directed control-EOF run also passed after readiness/worker metadata.
Both planned lifecycle controls now have C1 evidence. Next reconcile their
specific gates with the IWC arming record; whole-transport and app survival
remain outside this result.
No active IWC experiment is authorized or made ready by this plan.

Saved basis:

- [Root read 002](c1-iwc-root-read-002.md): root listing works, one HDMI-app
  publication; owner confirmed normal HDMI 4 picture/motion/sound.
- [Host process harness](../../research/c1-iwc-local-process-harness.md): 13/13
  Linux fake-process cases passed. Report SHA-256
  `cfa267064a2fbfb47358b57ffa22298244826777007717b191157dfd8aab0679`.
- [Supervisor review](../../research/c1-iwc-supervisor-design-review.md): local
  process serialization is separate from downstream IWC/hardware ordering.

## Minimal artifact and scope

Candidate: one original C/POSIX ARM32 soft-float executable with fixed launcher,
supervisor, actor and fake-worker roles, built using the existing WSL SDK.
Reuse the host-tested lifecycle decisions. Do not assume Node/Python exists on
the TV or upload the host harness as a device-ready implementation.

The helper must contain no LS2 registration/calls, Luna utility execution,
graphics/media/input APIs, real target IDs, geometry/crop payloads or arbitrary
command interface. It performs only test-owned process/pipe/clock/report work.
The app stays closed; existing permissions and system configuration stay intact.

The future test necessarily creates temporary helper files and processes.
That is the entire device-side effect allowed by this proposed test; it is
not zero-effect file inspection. A new private run directory under `/tmp`
would hold only its binary and bounded temporary metadata/report files.
No package installation, persistent service or existing-file mode change.

## Required before staging or execution

1. Implement the helper and fixed host controller, with no device operation
   during development. Source review must confirm the role/operation allowlist.
2. Run the helper locally with real Linux processes for normal completion,
   control EOF, actor loss, worker hang and cleanup. Reuse existing negative
   cases; no need to repeat an open-ended research campaign.
3. Cross-build; verify actual ELF/interpreter/dependency closure and imported
   symbols against saved C1 runtime files. Record exact executable hash/size.
   No proprietary media library should be required. Abort on missing ABI evidence.
4. Prepare bounded capture, exact owned-process identity checks and emergency
   cleanup before asking the owner to run anything. Staging needs a later
   explicit instruction; this plan is not authorization to upload or execute.

## First two candidate cases

| Case | Fixed operation | Pass evidence |
|---|---|---|
| Normal control — first | Supervisor establishes independent session, readiness and TV-local monotonic deadlines. One fake worker returns its fixed reply; cleanup follows. | Valid report, worker reply plus actual child exit/reap, supervisor normal exit, no owned descendants left. |
| Control-channel loss — only after control passes | Same fake work; host closes only the owned test control channel after readiness. A separate verification connection stays available. | Supervisor observes EOF, continues cleanup without host ticks, saves its final report, exits and leaves no descendants. |

Each case is one explicit run with no retries. A later instruction may authorize
a finite named case batch; it need not trigger repeated permission questions.
Stop the batch at the first failed/inconclusive lifecycle or viewing observation.
Do not reset SSH, network links, TV services or the stock HDMI app to inject loss.

Candidate limits: readiness within 2 seconds; fake work at most 2 seconds;
cleanup starts no later than 4 seconds from helper entry; owned-child TERM then
KILL escalation with confirmed reap; supervisor finish by 8 seconds. A separate
host controller attempts identity-checked emergency cleanup at 10 seconds.
Collection/cleanup attempts finish within 15 seconds or report failure and stop.
These bound attempted work, not guaranteed cleanup of an unkillable process.
No deliberate supervisor suspension/crash is included in this first C1 scope.

## Capture, cleanup and stop rules

Record only artifact hash, fixed case/phase/status, elapsed times, session/
parent-independence checks, child exit/signal/reap counts, supervisor exit and
separate owner picture/motion/sound observations. Report at most 8 KiB.
Process IDs/start times may be held in private test metadata for exact identity
checks; do not export them or unrestricted `/proc`, environment or system logs.

The controller must bind any cleanup target to this staged executable, run
directory and original process start time. Signal only those helpers; never
kill by process name or target HDMI/IWC/system processes. Failed identity checks
mean no signal and an inconclusive result. Keep emergency cleanup distinct
from supervisor-confirmed cleanup; a host-rescued run does not pass independence.

Retrieve and verify the host copy first. Remove only the known test-created
files and empty run directory after confirmed exits, with no recursive delete,
symlink traversal or removal of prior evidence. Unknown survivors stop testing;
do not alter system services or hide them with a successful cleanup claim.

Owner confirms normal viewing before and after each case. On any unexpected
picture, sound, input/mode or system behavior: stop helper work, collect bounded
evidence and use ordinary physical remote controls if needed. No automated
input switching or restart is part of recovery.

## Claim boundary

A pass means **C1 root-shell fake-worker lifecycle passed for that case**.
It does not prove app/jailer independence (the app never launches), resistance
to cgroup/OOM/system teardown, supervisor self-recovery, setter admission,
IWC/frontend/hardware ordering or restored geometry. The existing model's
real-device arming gates remain unresolved. Nothing in this helper may issue
an IWC action/reset; any future adapter requires separate review and authorization.

Validation in this planning pass: saved host-report and root-read report hashes,
local documentation links and `git diff --check` passed. No code changed, so
tests/builds/packaging were not repeated. Existing local and device evidence
remained unchanged. Next action is the minimal helper/controller implementation
and local/ABI checks, not another broad design review.

Implementation follow-up: native helper and local controller acceptance passed
seven process cases, a missing-loss refusal case and unsafe/stale-input gates.
The ARM artifact passed static ABI against four saved C1 runtime files and
206 required symbol/version references. No TV connection or ARM execution.
The [fixed staging/capture controller](../../research/c1-native-lifecycle-controller.md)
also passes 32 simulated SSH/SFTP cases. Local preparation is complete for one
normal control. That owner-authorized C1 normal control subsequently passed;
see its linked device record. Any further run still requires owner direction.

Control-loss follow-up: the shared controller now passes 47 simulated cases;
the Linux native suite also verifies worker-started EOF with observed loss,
normal launcher/supervisor exit and no descendants. See the controller record
for commands and `test-004.json`. The ARM helper is unchanged. This case is ready
for the next owner-authorized TV run; no TV connection/stage/run occurred during
its local preparation.

Device follow-up: one owner-authorized control-EOF run subsequently passed
with observed host loss, child reap, normal launcher exit, no survivors and
stage removal without host rescue. Owner confirmed normal viewing before/after.
See the linked device record. No further device case is queued by this plan.
