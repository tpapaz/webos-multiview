# Local Linux process harness with fake workers

> Research/tool record. [Current status](../../STATUS.md) · [Documentation index](../README.md). Earlier next steps and untested labels describe that stage; use Status and later device records for current results.

Implemented/tested 2026-11-12 from the saved
[supervisor review](c1-iwc-supervisor-design-review.md) and
[arming/recovery model](c1-iwc-local-recovery-model.md).
**Real host Linux processes, synthetic evidence and fake workers only. No TV
connection, stock utility execution, app launch, permission edit or actual
geometry/crop operation. No device supervisor, ARM build or IPK was produced.**

Plan: reuse the decision model and synthetic fixtures, introduce separate
launcher/supervisor/actor/worker processes, inject real process/pipe failures,
require reply validation plus owned-child exit, and distinguish emergency test
cleanup from a supervisor's own completion.

## Implementation

- `scripts/iwc-local-process-harness.cjs`: local supervisor with monotonic time,
  model ticks, fixed fake-child creation, bounded output, TERM/KILL handling and
  a redacted report. Imports no SSH/profile/TV transport and contains no device
  command, Luna URI or active payload builder.
- `tests/fixtures/iwc-fake-process.cjs`: fixed launcher, actor and worker roles
  for an explicit allowlist of fault scenarios. Only the running local Node
  binary and this fixture can be spawned; no shell or executable/command input.
- `tests/fixtures/iwc-synthetic-evidence.cjs`: shared synthetic arming inputs;
  reused by the existing model acceptance test instead of duplicating them.
- `tests/host/iwc_process_harness_test.py`: Linux test controller and assertions.
- `scripts/test-iwc-process-harness.ps1`: Windows entry point using existing WSL
  Ubuntu and cached Linux Node 22.17.0, without downloading tools.

The launcher creates the supervisor with a new session and separate control/
status pipes. Tests verify its actual Linux session identifier. The actor has a
separate private local IPC channel and cannot send arbitrary command data.
Launcher death closes the simulated SSH control pipe; it does not terminate the
supervisor. Status-pipe loss is tested independently, including handling EPIPE.
Private local status files remain writable after either pipe disappears.
These pipes simulate SSH ownership/loss; no actual SSH client/server is used.

The supervisor feeds the existing model at 10 ms intervals and launches at most
one fake worker at a time. A reply is not forwarded until the owned child has
both exited and closed its streams. Output is bounded at 1 KiB and must be the
exact fake acceptance object. Partial output, nonzero/signal exit or stderr
cannot advance the operation. Worker output is not a real service reply.

On cleanup the supervisor requests TERM only on retained owned ChildProcess
objects, escalates to KILL after 200 ms when needed, and waits for child exit/
stream-close evidence. Model phase deadlines remain 2/1/2/1 seconds with the
eight-second whole-attempt limit. A separate 8.5-second local watchdog bounds
cleanup attempts in a responsive supervisor; it cannot run while that process
is suspended. The outer test controller has a separate 12-second scenario cap.
These are host fixture limits, not guarantees of TV restoration.

The controller is a Linux child subreaper **only for its own test process**,
so orphaned fixture descendants remain waitable rather than depending on WSL
init to reap them. Emergency cleanup checks recorded PID/start-time identity,
signals only registered descendants and reaps them. It never searches/kills
unrelated process names/groups. Child session/PID/start records are private
temporary fixture metadata; all per-case directories are removed after cleanup.
Final summaries contain no process IDs or raw synthetic target IDs.

Host API references: [Node 22.17 detached process/stdio/exit documentation](https://nodejs.org/download/release/v22.17.0/docs/api/child_process.html#optionsdetached)
and [Linux child subreaper semantics](https://man7.org/linux/man-pages/man2/PR_SET_CHILD_SUBREAPER.2const.html).
The implementation does not change cgroups, namespaces, OS service settings or
any TV configuration. A new session alone still does not prove C1 jail/job
independence; that remains a separate gate.

## Acceptance results

| Scenario | Observed host result |
|---|---|
| Normal sequence | Serialized fake action/revalidation/reset; children exited; supervisor exited normally. |
| Actor killed after action acknowledgment | Supervisor observed actual actor exit and continued fake recovery/cleanup. |
| Launcher killed after action acknowledgment | Supervisor observed control EOF, continued independently and exited normally. |
| Launcher killed before any action | No action/reset worker; bounded cleanup and normal supervisor exit. |
| Status output pipe broken | Output error did not kill supervisor; later cancellation completed cleanup. |
| TERM-resistant action worker hangs | Action delivery stays uncertain; no reset; KILL escalation and confirmed reap. |
| Partial action reply | No accepted action/reset; child exit checked; cleanup completed. |
| Revalidation worker hangs | No blind reset/retarget; escalation and cleanup completed. |
| Reset worker hangs | One reset attempt only; no fake acknowledgment/retry; escalation and cleanup completed. |
| Actor ignores TERM during cleanup | KILL escalation; actual exit confirmed before cleanup accepted. |
| Worker writes valid reply then delays exit | No phase advancement until child exits; revalidation follows the reap event. |
| Supervisor killed | No final supervisor report or invented recovery; outer controller cleaned owned descendants. |
| Supervisor suspended past watchdog | No completion; after 8.6 seconds stopped, outer controller killed it and cleaned descendants. |

Final suite: **13/13 passed**. The 11 responsive-supervisor cases verify normal
supervisor exit separately from controller cleanup. All 13 verify final
controller cleanup with no registered fixture descendants remaining. In the
two supervisor-failure cases, this is **test-controller cleanup**, not a claim
that the supervisor recovered itself or a TV picture.

No simulated owner observations are supplied, so even the successful fake
reset sequences stop at `awaiting_simulated_observations`. Every summary marks
`deviceTested: false`, hardware restoration unknown and downstream ordering
untested. The readiness/ordering flags used to arm are synthetic assertions.

## Reproduce locally and retained evidence

From repository PowerShell:

```powershell
npm run test:iwc-process
```

Or explicitly through the existing Linux environment:

```powershell
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/tests/host/iwc_process_harness_test.py --node /home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node --output /mnt/d/Development/webos-multiview/build/phase-2/iwc-process-harness/new-local-report.json
```

The Linux controller refuses to run on Windows directly. Reports are created
exclusively and never overwritten. The PowerShell entry point generates a fresh
local output name; it has no device profile, SSH alias or destination argument.

Final 13-case report is ignored local evidence at
`build/phase-2/iwc-process-harness/local-20261112T091306968Z.json`, SHA-256
`cfa267064a2fbfb47358b57ffa22298244826777007717b191157dfd8aab0679`.
Earlier 11/12-case reports were preserved while coverage was expanded.

Also passed: `npm run test:iwc-recovery-model`, `npm run test:iwc-diagnostic`,
`npm test`, `npm run lint`, Node syntax checks for the harness/fixture,
PowerShell wrapper parsing and `git diff --check`. No ARM build, package,
simulator or device test was performed.

## What remains unresolved

This supplies host Linux evidence of local cutoff, process serialization,
pipe-loss handling and owned-child cleanup. It does not establish independence
from C1 app/jailer/cgroup teardown, a new privileged identity, setter admission,
fresh HDMI target/baseline or IWC→frontend→hardware ordering. The listing
collector and its earlier real read evidence remain unchanged.

Next prepare a non-mutating C1 lifecycle-only plan/adapter with no IWC setters
before any separately authorized device test. No TV upload, process launch or
probe is authorized by this host result. Active geometry/crop stays blocked by
the existing readiness and downstream-ordering gates.

Follow-up: the [bounded C1 lifecycle-only plan](../device-tests/archive/c1-lifecycle-only-plan.md)
now specifies the next native helper, local/ABI gate, first control/disconnect
cases and exact cleanup evidence. It has not been implemented, staged or run.
