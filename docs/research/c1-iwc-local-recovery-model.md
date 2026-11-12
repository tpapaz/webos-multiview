# Local IWC arming and recovery model

> Research/tool record. [Current status](../../STATUS.md) · [Documentation index](../README.md). Earlier next steps and untested labels describe that stage; use Status and later device records for current results.

Implemented 2026-11-12 from the saved C1 03.53.45 / SDK 6.5.3
[target/baseline/recovery review](c1-hdmi-target-baseline-recovery-review.md),
its QML/manager/compositor trace references and root-read run 002.
**Local deterministic simulation only. No TV connection, app launch, permission
change, geometry/crop call, native build or package occurred.**

Plan: implement a pure state model with strict arming evidence, immutable
target binding, one simulated actor action, irreversible recovery cutoff,
bounded revalidation/reset/cleanup and simulated failure cases. Keep it separate
from the real listing collector, transport and any future privileged helper.

## Contract

`scripts/iwc-recovery-model.cjs` exports `assessArming(evidence, nowMs)` and
`createModel()`. Each model accepts `step(event, nowMs)` and returns simulation
intents plus a redacted `report`; `report()` reads the current assessment.
It has no SSH, process execution, timers, Luna destinations or device adapter.
The harness must deliver events/ticks with monotonic integer milliseconds.
A caller failing to deliver ticks would not be supervised by this model: it
does not provide an independently running recovery process.

Arming requires all of:

- An owner baseline no older than the candidate 1,000 ms freshness limit:
  HDMI port 1–4, normal full view, uncropped, PiP off, expected framing, motion
  and sound, with a view-generation number.
- Equally fresh discovery in that same view generation, exactly one total
  publication and HDMI candidate, a valid complete target tuple matching that
  port, and confirmed logical full-view dimensions. IDs/dimensions have the
  existing 32-bit integral bounds; dimensions must permit a nonzero half-size
  test rectangle. No panel/signal-resolution fallback exists.
- Explicit permitted writer/setter admission, readiness, sole-writer ownership,
  independence from actor and host, bounded cleanup and verified ordering.
  Missing, false and unknown gates refuse arming without producing work.

These writer/ordering flags are **synthetic assertions in tests**, not a way to
turn unproved C1 facts into verified evidence. Run 002's historical owner
confirmation and count-only machine report cannot arm the model. Real writer
lifetime, setter admission and ordering remain unproved on the TV.

The target tuple is copied/frozen in private model state. Simulation action and
reset intents share it with the in-memory fake writer; it never appears in the
sanitized report. Test fixtures use a synthetic target and 1600×900 logical
window, not measured device dimensions. The single simulation action uses
the top-left half-size destination; reset uses the same bound target's logical
full rectangle. Both use explicit priority 0. No crop, priority escalation,
retargeting, arbitrary URI/payload or second actor action is supported.

## Lifecycle and uncertainty

The normal simulated sequence is armed → acting → active → revalidating →
resetting → closing → closed. Tokens bind replies to the one pending intent;
late or wrong-token replies cannot advance another phase.

Cancellation, actor death, host loss or the fixed active deadline closes the
actor channel permanently. New actor requests cannot reopen it, extend the
deadline or write after reset begins. If an action reply is still outstanding,
the model enters stopping and waits for that reply only until its existing
deadline. An unresolved delivery times out to cleanup/inconclusive rather
than blindly scheduling a reset that could be overtaken by a late action.

After a settled successful action reply, recovery requires one fresh accepted
revalidation of the same full tuple, view generation, counts and logical
baseline. Any mismatch, denial, malformed result or timeout ends without reset
or retargeting. A matching revalidation produces at most one reset intent.
Reset rejection/timeout ends with uncertain recovery and no escalation/retry.
Action rejection also stops without a reset attempt. Transport/target loss
before completion ends further mutation intents; target changes during cleanup
or pending observations invalidate the assessment. Supervisor failure cannot
produce a fictitious recovery action or cleanup confirmation.

Candidate simulation bounds, measured from arming:

| Phase | Bound |
|---|---|
| Active/action period | Cut off at 4 seconds; action reply limit 2 seconds, capped by active cutoff. |
| Revalidation | 1 second from request, never beyond arming + 5 seconds. |
| Reset reply | 2 seconds from request, never beyond arming + 7 seconds. |
| Cleanup | 1 second from request, never beyond arming + 8 seconds. |
| Whole attempt | At 8 seconds mark failure and unconfirmed cleanup; no later work is emitted. |

These bound model decisions when ticks arrive, not hardware restoration time.
They do not replace the separate process supervisor needed for a real helper.
Backward/invalid time fails closed; no unresolved call is silently considered
cancelled, retracted or applied. The same-view revalidation is still not an
atomic fence against external controllers.

An accepted reset reply and clean writer exit are insufficient for acceptance.
Separate simulated observations after reset and after writer exit must each
confirm framing, live motion and normal sound. Early observations do not count;
unknown/failure observations cannot be rewritten later to hide the outcome.
Only then can outcome be `simulated_acceptance_passed`. Every report still says
`mode: local_simulation`, `deviceTested: false`, `hardwareRestoration: unknown`.
No report exports live IDs, raw target/event contents or an actual TV pass.

The `manualRecoveryRequired` field is a conservative simulation flag after an
action attempt until simulated acceptance. It does not itself perform remote
recovery or establish a safe physical recovery method.

## Validation and remaining gates

`tests/host/iwc-recovery-model.test.cjs` covers incomplete/unknown/stale gates,
port mismatch, ambiguity, logical dimensions, immutable target/reset coordinates,
one-action cutoff, actor/host loss, in-flight uncertainty, target/view changes,
wrong/late replies, action/reset refusal, every phase timeout, cleanup failure,
supervisor failure, clock regression and separate observation requirements.
It uses explicit fake time and synthetic evidence; there are no real sleeps,
network calls, subprocesses, device traces replayed as live success or UI mocks.

Passed locally:

- `npm run test:iwc-recovery-model`
- `npm run test:iwc-diagnostic`
- `npm test`
- `npm run lint`
- `node --check scripts/iwc-recovery-model.cjs`
- `git diff --check`

No real collector or app was run. Existing saved evidence was preserved.
This supplies a testable local decision contract, not the independent restorer
or a permitted geometry controller. Next review a concrete separate supervisor's
identity/call path, lifecycle and delivery-order guarantees, or prepare the
optional sanitized baseline read extension locally. Geometry/crop remains
unsafe to test until the unresolved device and recovery gates are satisfied.

The subsequent [independent-supervisor design review](c1-iwc-supervisor-design-review.md)
separates synthetic readiness flags, real process independence, local child
serialization and downstream applied ordering. No real supervisor or device
adapter was implemented by that review.

Post-lifecycle reconciliation: [C1 gate review](c1-iwc-gates-after-lifecycle.md)
now records actual normal/EOF fake-worker passes. These establish their exact
root-shell process cases, not unconditional host/actor independence or a real
IWC writer. `assessArming` and its predicates remain unchanged: actual setter
admission, fresh target/baseline and applied ordering are still missing. Next
is a focused real-worker read-only preflight, not another generic fake harness.
