# C1 IWC recovery gates after normal/EOF controls

> Historical recovery-gate review. **The proposed three-call IWC preflight is paused** by the owner's acquisition/window-prototype direction. The decisions and “next” statements below describe the earlier proposal, not the current task. Follow the [single current plan](../device-tests/current-plan.md) and [Status](../../STATUS.md). Retained IWC arming limits still apply to that route.

2026-11-12. LG OLED C1, firmware 03.53.45 / SDK 6.5.3.
**Saved-evidence review only. No TV connection, app launch, permission change,
IWC call, geometry/crop experiment, build or package in this task.**

Review plan: verify original report/artifact hashes, map the two C1 lifecycle
passes to their exact guarantees, leave unsupported arming predicates unset,
and select one bounded read-only device test that advances real IWC integration.

## Decision

The next concrete TV test is **one supervised read-only IWC preflight** with
the actual stock `/usr/bin/luna-send`: two self-policy predictions followed by
one selected-HDMI publication read. Report the publisher-derived HDMI port and
published logical dimensions. Keep the app closed and perform no setter.

Do not repeat generic fake-worker lifecycle tests before this step. Normal and
EOF controls have already supplied C1 evidence for their scope. The useful next
gap is a real privileged utility child under the supervisor, with bounded reply,
exit/reap and sanitized baseline reporting.

**Candidate plan, not implemented or device-ready.** The existing native helper
only forks fake roles (`native/phase2-lifecycle/main.c:18–20,78–120`); it cannot
execute these requests. The current listing collector exports counts only
(`scripts/iwc-diagnostic.cjs`, `parseReply`). A focused real-worker adapter,
local tests and saved-runtime ABI check are needed before the single TV run.
This review does not implement, stage or authorize that run.

## Reconciled gate ledger

| Gate | Current evidence | Disposition |
|---|---|---|
| Real caller for listing | Root reads 001/002 executed the stock utility with its own default identity; read 002 found one HDMI-app candidate. | **Verified/device for root diagnostic listing.** Normal app remains denied at policy query; no permission change is proposed. |
| Normal TV-local lifecycle | Normal control 001: separate session, fake reply, both children reaped, launcher exit 0, no survivors, stage removed without host rescue. | **Verified/device for the fake-worker root-shell normal case.** |
| Control EOF cancellation | Control-loss 001: EOF at host 128 ms; native host-loss observation, both children reaped, helper 108 ms, launcher exit 0, no survivors, no host rescue. | **Verified/device for stdin/control-pipe EOF.** Both SSH transports stayed connected. |
| Whole SSH/launcher/actor/jailer/cgroup failure survival | EOF did not kill launcher/actor, disconnect transport, or launch an app. Other fault cases exist only locally. | **Unknown on C1.** Do not turn `independentOfHost` or `independentOfActor` into unconditional true flags. |
| Real IWC worker under supervisor | Root listing and native supervision were tested separately; native workers were fake. | **Candidate/unimplemented integration.** Next test addresses actual executable identity, bounded output and owned child reap. |
| Setter policy prediction | Saved stock utility role/client grant intersects `all` wildcard; no live exact-setter prediction from this caller has been retained. | **Verified/static grant path; unknown live prediction.** Query its own real utility identity without invoking the setter. |
| Setter handler admission/application | No setter has run. A hub `allowed` Boolean predicts permission only. | **Unknown.** Keep `setterAdmissionVerified` false/unknown even after a successful prediction. |
| Fresh unique target and port agreement | Root read 002 retained counts only; owner historically identified HDMI 4. | **Candidate historical target; unknown for a new trial.** Fresh app/window/publication tuple stays in private memory; match current owner port. |
| Full-view extent | Listing validates positive dimensions but discarded them. QML binds published dimensions to the app root. | **Verified/static coordinate basis; unknown current numeric extent.** Next report may retain published logical dimensions, not panel/signal resolution or proof of current geometry. |
| Normal viewing baseline | Owner confirmed picture/motion/sound before and after EOF run; normal run's before/during context was unknown. | **Verified historical observations.** Reconfirm current port, uncropped full view, PiP off, framing/motion/sound for the next test. No perpetual freshness claim. |
| Sole issuer / irreversible actor cutoff | Local model/harness verifies decisions using fake transport/workers. | **Verified locally only.** No real IWC writer or actor-command API exists; no global IWC lock is established. |
| Action → reset application ordering | Static IWC relay/frontend/compositor path; no applied-state fence was identified. | **Unknown end-to-end.** Utility exit, hub permission and IWC success cannot close this gate. |
| Arbitrary state rollback | Inspected list has no current destination/crop/priority snapshot; exported-window v1 has no applied-geometry event. | **Unsupported by inspected interfaces.** Full-view reset is only a candidate inverse, not TV-tested recovery. |
| Simultaneous HDMI 1 + 2 | One source; neither lifecycle test used IWC or HDMI media APIs. | **Unknown.** No receiver/concurrency claim follows. |

The pure model's strict arming rules stay unchanged. Evidence does not satisfy
all predicates in `scripts/iwc-recovery-model.cjs:assessArming`; no synthetic
ready/ordering flags are promoted to device truth. Active geometry/crop and
even a nominal full-view/no-op setter remain **unsafe_to_test under the current
recovery contract**.

## Selected test and remaining limit

The single [current C1 test plan](../device-tests/current-plan.md) owns the fixed
three-call operation, identity checks, bounds, capture and acceptance criteria.
It is a candidate plan, not implemented or ready for a TV run. The existing
fake-only helper cannot execute it. This review owns the gate analysis and
static provenance; do not maintain a second procedure here.

Afterward, address the remaining application-ordering/reset contract directly.
The inspected interface has no applied acknowledgment; repeating passive reads
or fake-process tests cannot manufacture one. If no adequate fence/contract can
be evidenced, report automated recovery unsupported by this route rather than
promise it. A differently scoped empirical media trial would need a separate
explicit contract; this review does not relax the existing arming rules.

## Saved evidence and validation

Locally verified six original SHA-256 bindings:

- Normal control report: `1bcae74a7dee81bf8af005c3189f765c64e75ef21d073ff5f58c6806c249e053`.
- Control-EOF report: `718d53e62b4aea4b80fce5370c57e37f052281f1e8c671173902ff284cb000fe`.
- Root read 002: `3e46d5953b2aa0928581e3f1ebb6261c5d6ffd93c43dbe930309389d44e2e695`.
- Saved stock utility: `b9b25626a9d7295cfcaca45052555952dd9113707a45893b4b35c27497d9c2af`.
- Saved hub: `fe05e830674fd80b99d24d9707926b130d978f62cde0690502c898a614c18299`.
- Saved `route-5.qml`: `d61ee398fef6a9ff4e60155041965684657f4b4cfa0c87006f7cc90fc665437f`.

Sources: [normal record](../device-tests/c1-journal.md#native-normal),
[EOF record](../device-tests/c1-journal.md#native-control-eof),
[root read 002](../device-tests/c1-journal.md#root-read-002),
[permitted caller](c1-iwc-permitted-caller.md),
[target/baseline review](c1-hdmi-target-baseline-recovery-review.md),
[ownership trace](c1-iwc-ownership-recovery.md) and
[supervisor ordering ledger](c1-iwc-supervisor-design-review.md).
Default-name construction is at saved utility `0x1b2c–0x1b3c`, with literals
`0x280c`/`0x2c60`; hub query is at `0x4319c–0x43744`. QML lines 10–11/95–104
bind/publish app-root dimensions and lines 1213–1218 construct full-view reset.
These remain static findings, not new runtime observations.

Original reports/owner observations and all artifacts remain unchanged. Local
hash/status assertions, documentation links and `git diff --check` passed.
Documentation-only review: no code change, tests/builds/ABI reruns or TV operation
was needed. No upstream source was copied or external lookup used.
