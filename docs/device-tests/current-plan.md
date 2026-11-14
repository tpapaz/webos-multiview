# Current C1 HDMI acquisition plan

Updated 2026-11-14. [Status](../../STATUS.md) · [Actual outcomes](c1-journal.md) ·
[Candidate contract](../../native/phase2-hdmi-window/README.md) · [Evidence map](../research/c1-hdmi-interface-map.md)

## Objective and authorization

One advancing physical HDMI-4 picture inside our own `(480,270,960,540)` region
in 1920×1080 app coordinates. Two independently live HDMI 1 + HDMI 2 follow only
after single-picture evidence and an independent allocation path.

**No app launch or HDMI acquisition is authorized yet.** Installation/readback
and narrow activation are completed scopes, not permission to repeat them.
No further TV operation, mode change, removal or boot is queued. This plan is
not authorization. The next active scope is one owner-attended picture trial.

## Verified starting state

| Prerequisite | Result |
|---|---|
| Candidate | 0.1.4 built/host-tested/packaged/direct-ABI checked; installed files and generated policy verified on C1. Not executed or simulator-tested. |
| Modes/owners | ELF `0755`, appinfo/icon `0644`, app files `1000:1000`; generated policies root-owned `0644`. **Skip correction.** |
| Admission coverage | Latest capture: fresh denied baseline, one acknowledged add from the held manifest, then exact own-app/four-method `[1,1,1,1]`, no unrelated additions. Core/content bindings pass and connection closed. |
| Policy disposition | The grant remains loaded pending trial/separate cleanup; manifest remains outside scan roots. No repeat activation, hot removal or routine boot. |

[Installed-file result](c1-journal.md#014-installed-files-and-modes-verified) ·
[Activation result](c1-journal.md#014-narrow-permission-activation-and-coverage-verified).
Exact artifact hashes and launch/report fields live in the candidate contract;
coverage semantics and offline commands live in the [policy guide](../../native/phase2-hdmi-window/policy/README.md).
If bindings or permission state change, stop and review the specific difference;
do not silently repair modes or reactivate the grant. No extra firmware is needed.

## Bounded capture and first-picture procedure

Before the separately authorized trial, confirm the owner is present, HDMI 4
shows moving content, sound/remote work, and safe restoration access is available.
An active update, panel maintenance or unsafe recovery access makes acquisition
`unsafe_to_test`. Agree the stop/restoration rules below; no deliberate stuck
session, broken transport, broad grant or direct backend call is included.

1. Reserve one fresh host capture directory. Read-only preparation verifies the
   exact package/generated-policy bindings, strict modes/owners, app absence and
   absent versioned picture report. The collector never launches or writes on TV.
2. Generate the private launch payload immediately before submission: host issue
   time precedes boot ID → uptime → boot ID reads. The four fixed picture fields
   are `acquireHdmi4:true`, `launchBootId`, `launchStartByBoottimeMs` and
   `launchStartByRealtimeMs`. Both three-second clock windows must pass before
   report reservation and before SDL/LS2. UUID equality alone is not restart proof.
3. Check expiry immediately before dispatch, checkpoint intent and submit exactly
   once through `luna://com.webos.applicationManager/launch` with
   `{id,subscribe:false,params}` using stock `luna-send` default own identity.
   Never invoke the ELF directly as root. Admission-only delivery on this route
   was verified with 0.1.3; picture delivery and 0.1.4 runtime remain untested.
   No edited/queued payload, clock setting change, wider expiry, refresh or retry.
4. Start the owner's independent **27-second timer at submission**. Observe at
   most eight seconds after accepted selection. Moving physical HDMI content
   must appear inside the fixed rectangle. Graphics, service success or a
   full-screen takeover alone do not pass.
5. Progress dispatch ends at sampled uptime +17 seconds; cleanup dispatch at
   +22 seconds, including suspend time. Replies are bounded to two seconds.
   The process alarm is armed before validation for 22 seconds from entry,
   ending by sample +25 seconds for an admitted start. No late-entry extension.
6. Confirm exit by owner submit +27 seconds. Error, wrong/frozen picture, missing
   exit or transport loss ends the trial. No second acquisition attempt.
   Collect only when safe; the collector's separate 30-second/1,024-process
   bounds never extend the owner timer or delay restoration.

A clock disagreement or expired payload fails closed; this is an integration
outcome to record, not permission to widen or bypass the guard. The exact normal
submission must be bound to fresh preflight before the active trial.
Reports are `picture-0.1.4.json` under `/tmp/io.github.tpapaz.multiview.hdmiwindow/`
or the jail alias: owned 0700 directory, exclusive 0600 file, at most 2 KiB,
no symlink/overwrite. Missing, partial or conflicting reports leave cleanup unknown.

## Restoration and stop rules

Client cleanup drains the bounded current reply, then stops/closes only the ID
returned by this attempt and tears down its own export/window/registration.
No usable ID means no guessed close. Failed cancellation may leave close unsent.
Acknowledgments and process absence do not prove hardware release; saved backend
stop-routing mismatch and untimed resource release remain unresolved limitations.

Owner may attempt Back/Exit once, then select HDMI 4 once through responsive
normal UI. Budget 15 seconds to return and observe motion/sound for 10 seconds;
stop keys if unresponsive. Recovery of viewing after a lost session does not
convert the trial into a normal-close pass. Stop further experiments until the
uncertain session/recovery has been reviewed.

No routine boot or policy-cleanup cycle is part of the trial. A stuck/lost session
has no proven bounded software reset. Before acquisition the owner must accept
whether safe physical power recovery would be available if required. Any actual
power recovery requires separate scope; do not force interruption of updates or
panel maintenance, restart critical services or improvise commands. No power
operation is authorized by this plan.

## Acceptance and next experiment

Record owner-observed motion in the intended rectangle, timely exit and restored
HDMI motion/sound separately from machine results. A normal-close result requires
both outer acknowledgments and local cleanup; retain `hardwareRelease:unknown`.
Keep failed/partial reports unchanged. Append only actual outcomes to the journal.

Only after single-picture evidence and a separate receiver/presentation path
justify it, connect distinct moving sources to HDMI 1 and HDMI 2. Both must advance
concurrently in separate fixed regions without freezing, replacing or switching.
Two opens/IDs do not pass. Move/resize, layouts and audio controls wait.
