# C1 HDMI target, baseline and recovery review

> Research/tool record. [Current status](../../STATUS.md) · [Documentation index](../README.md). Earlier next steps and untested labels describe that stage; use Status and later device records for current results.

2026-11-12; reference LG OLED C1, firmware 03.53.45, SDK 6.5.3.
**Saved-evidence review only. No TV connection, app launch, permission edit,
utility execution, geometry/crop request, build or package in this pass.**

Plan: reconcile the successful root listing with the existing IWC contract,
trace what published dimensions represent, separate discovery from an armable
target, and audit failure recovery before proposing any further device work.

## Decision

**Verified:** root diagnostic listing admission and discovery of one HDMI-app
publication while the owner had selected a stable live HDMI picture.
**Candidate:** that publication could become the target of a later experiment.
**Owner-confirmed/historical:** HDMI 4, normal full view, motion and sound after the read.
**Unknown:** a fresh complete target tuple and logical dimensions for a future trial,
setter admission/application and independent ordered restoration.
**Unsafe_to_test now:** active geometry/crop, including a nominal full-view
"reset-only" or supposedly harmless no-op setter. None is read-only.

Root diagnostic run 002 is evidence of the selected source's published window;
it is not a second HDMI receiver, a controller lease, a geometry snapshot, or
a saved target handle. The normal app's permission-query denial remains intact.

## Acceptance ledger

| Gate | Saved result | Requirement before an active trial |
|---|---|---|
| Diagnostic read caller | **Verified/device:** stock utility's own role; all eight pins matched; listing succeeded. | Recheck exact permitted context/pins for each later operation. Do not move the app into that identity. |
| Clean read completion | **Verified/device:** utility exit 0 and channel close, cleanup true, 449 ms. | Keep utility cleanup separate from visual restoration and provider lifetime. |
| Single HDMI-app publication | **Verified/device at read time:** one total publication, one HDMI-app candidate. | Resolve a fresh unique target immediately before arming; old counts are not a live lock. |
| Selected port/publisher agreement | **Owner-confirmed HDMI 4; machine agreement unknown:** HDMI app classification passed but port was not exported. | Owner port and freshly classified publisher must agree. Stop on disagreement. |
| Target binding | **Unknown for reuse:** no live IDs or exact dimensions were retained. | Pin publish ID, window ID, publisher app and logical dimensions together in private process memory. Never save/reuse stale IDs. |
| Full-view visual/audio baseline | **Owner-confirmed for run 002:** normal view, motion and sound; no zoom/crop/PiP problem reported. | Reconfirm normal uncropped full view, framing, live motion and expected sound immediately before any future arming; a historical confirmation is not perpetual readiness. |
| Logical reset rectangle | **Unknown numerically.** Reply validated positive dimensions but exported only counts. | Fresh published dimensions must be consistent with current normal app-window coordinates. Do not use panel/signal resolution or assume 1920×1080. |
| Current geometry/crop/priority readback | **Unsupported by the inspected list/protocol**, not proven absent from every TV interface. | Cannot promise arbitrary previous-state rollback. Scope any future reset to an explicitly confirmed full-view baseline only. |
| Setter admission | **Unknown/device:** no setter or setter-policy query was sent by the root collector. | Review effective permissions for the future writer; root listing does not pass setter admission or application. Do not probe with a setter. |
| Independent recovery writer | **Unknown/unimplemented.** Current collector is one-shot and host-controlled. | One locally testable sole writer, permitted call path, immutable target, fixed deadline, actor-command cutoff, and evidenced lifetime independent of actor/host SSH. |
| Ordered application and visual recovery | **Unknown.** IWC replies are not applied acknowledgments. | Resolve late-command/reset ordering; require owner observations after reset and after helper exit. Timeouts/disconnects remain uncertain outcomes. |
| Dual HDMI | **Unknown.** One source connected. | Separate per-port evidence, second source and separate authorization. |

An owner's later clarification may complete historical viewing context. It
cannot retroactively make a target fresh or pass independent recovery.
The owner replied “normal. everything is ok, its hdmi4” to the bundled port,
normal-view and post-read motion/sound question. That is retained separately in
`build/phase-2/iwc-root-read-002/baseline-owner-confirmation.json`; original
machine evidence and earlier observations remain unchanged. The machine report
cannot independently identify HDMI 4 because it exported only candidate counts.

## What the dimensions mean

Saved `build/phase-2/hdmi-discovery-20261111/route-5.qml` is C1
`inputcommon/qml/Model/DisplayVideoModel.qml`, SHA-256
`d61ee398fef6a9ff4e60155041965684657f4b4cfa0c87006f7cc90fc665437f`.

- Lines 10–11 bind `originalWindowWidth/Height` to `mainViewRoot.width/height`.
- Lines 95–104 publish the exported window ID with those values when the
  activation/non-live-menu-PiP condition changes to true.
- Lines 1213–1218 recover destination `(0,0,originalWindowWidth,originalWindowHeight)`.

**Verified/static implication:** these are app-window coordinates, not an
automatic declaration of physical panel pixels or HDMI signal resolution. The
publication reports dimensions supplied when published; this inspected block
does not republish on every possible window-size change. Thus a positive width/
height alone does not prove current full view. Source, foreground, mode or
window-size changes invalidate a prepared baseline until reviewed afresh.
The C++ path's fixed 1920×1080 logical source rectangle is not an alternative
source of full-window dimensions.

The current diagnostic intentionally discards IDs and dimensions after
validation. Its one-candidate count cannot be converted into numeric reset
coordinates without another separately authorized fresh read in the eventual
target-owning process. Do not add persistent raw reply/ID capture to compensate.
A future read-only report could export bounded logical dimensions and port
classification as sanitized fields; no such collector change is made here.

## Recovery requirements that listing cannot satisfy

The [saved ownership trace](c1-iwc-ownership-recovery.md) locates no controller
lease or disconnect rollback in IWC. Manager lookup uses publish ID and window
string (`0x6008–0x6050`); publisher app checking is an additional client guard.
Listing/revalidation followed by a write is not atomic and cannot fence stock
or other controllers. Shared subscription delivery adds another routing risk.
Stop on competing activity; never retarget after a mismatch.

The only justified **candidate** inverse is ordinary full-view destination
setting for the same still-live publication. The C1 compositor handler
`0x6533c` clears crop-related rectangles at `0x653e8–0x653f6` and forwards the
destination at `0x653fa`. This is a static dispatch path, not TV-tested recovery.
There is no observed current-destination/crop snapshot or geometry-applied
acknowledgment in the inspected list/Wayland interface. Stopping publication,
destroying the window, switching inputs or restarting services is not an
automatic reset contract.

A host SSH timer and separate `luna-send` processes do not establish an
independent restorer. If actor and restorer can both write, queued actor work
may arrive after reset. A future supervisor would need to be the sole command
issuer and irrevocably reject new actor work once resetting; its local protocol
must be fixed, private and validated rather than a generic command/URI proxy.
If it delegates to the stock utility, that actual utility retains its own
identity. An arbitrary new root executable does not acquire its role by naming
itself similarly. No helper design or permission expansion is implemented here.

Priority must be explicit: zero maps to 0; omission/nonzero maps to 99. Equal
priority may replace and lower priority may be refused. The least intrusive
candidate remains explicit 0 for both action/reset, subject to refusal; never
escalate to force recovery. A 99 reset can leave residual arbitration state
and cannot restore an unknown previous controller priority.

The earlier 4-second action/reset transition and 8-second finish limits remain
**candidate bounds on attempted work**, not a promise of restored video within
eight seconds. Actor death, host disconnect, late reply, hung transport, stale
publication and supervisor failure must have explicit outcomes in local fault
tests. A successful setter response or utility exit cannot pass visual recovery.
Owner acceptance must separately cover framing, continuously live motion and
expected sound after reset and helper exit. Ordinary physical remote controls
remain a manual contingency; they do not pass automated recovery.

## Next work and validation

The next independent work can be entirely local: define a small baseline/arming
decision model and sole-writer lifecycle with fake-transport fault cases. It
must refuse arming for missing owner baseline, stale/ambiguous target, missing
logical dimensions, denied writer, missing recovery readiness or unproven
ordering. Do not add active methods to the existing listing collector.

If more target detail is needed, first prepare/test the optional sanitized
read-only report extension locally. Any new TV read still needs owner direction;
do not repeat the collector just to complete this review. No geometry/crop
experiment is ready on the present evidence.

Validated against the saved report hash
`3e46d5953b2aa0928581e3f1ebb6261c5d6ffd93c43dbe930309389d44e2e695`,
the frontend hash above and existing C1 static trace references. Original
evidence stayed unchanged. Local hashes, documentation links and
`git diff --check` passed. No production code changed, so host tests/builds,
packaging, simulator runs and TV checks were not repeated.

Follow-up: the [local arming/recovery model](c1-iwc-local-recovery-model.md) is
implemented and passes simulated fault cases. It has no device adapter, does
not establish independent process lifetime or applied ordering on C1, and does
not advance the active-test gate. The existing real collector is unchanged.

After the normal/EOF C1 lifecycle controls, the
[reconciled gate review](c1-iwc-gates-after-lifecycle.md) selects a supervised
read-only real-worker preflight with self-policy predictions and sanitized
HDMI-port/published-dimension reporting. Historical target/baseline evidence
remains stale for arming; dimensions alone do not pass applied geometry or
reset ordering. This follow-up used saved evidence only, without TV operations.
