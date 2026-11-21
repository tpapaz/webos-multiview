# Parked native HDMI 1 + HDMI 2 design

This design targeted a different physical pair. The owner is working with HDMI 4 and the laptop on HDMI 1. [Current pair plan](../current-plan.md) · [Device restoration rules](../current-plan.md#restoration-and-stop-rules)

## HDMI 2 first scaler request

The [offline checker](../../../scripts/hdmi2-scaler-evidence.cjs) uses a private,
source-validated JSON record on standard input. It was exercised with
synthetic records. The capture source and safe selector are unresolved.

Use `version: 1` and an ordered `events` array. Set `startedBeforeOpen`,
`continuous` and `requestStreamComplete` in `coverage` only with evidence for
all three. Keep the raw records and IDs in ignored storage.

| Event `kind` | Evidence fields |
|---|---|
| `open` | This attempt's `logicalId` and observed `disposition: "fresh"`. |
| `bind` | Selection tying `logicalId` to backend `serviceId` at `port: 2`, before element creation. |
| `element_open` | Backend `serviceId`, `pipelineId`, `firstParentId` and observed `disposition: "fresh"`. |
| `register` | Fresh `avconnector` as `connectionType`, with `pipelineId` and returned `childId`. |
| `associate` | Accepted ownership for `childId`, with `ownerPipelineId` and `accepted: true`. |
| `acquire` | `source: "media-server"`, `eventId: "ACQUIRE_REQUEST"` and the private request `message`. |

Match the fresh open to the port 2 binding even if other inputs opened. When the same pipeline registered multiple AV connectors, only one may have scaler evidence, and its own accepted association and first scaler request must both be present. A grant alone leaves the first request unknown. The export
contains the scaler category and association order, or a fixed reason for
unknown. Host acceptance runs with `node tests/host/hdmi2-scaler-evidence.test.cjs`.

### Rotation-independent ownership evidence

The service-filtered Luna monitor carried stock port binding, video output,
resource requests and an accepted ownership reply in one stream. The reply
belonged to a different pipeline. To classify the stock HDMI 2 first request,
a new source would need to tie its backend ID to its own connector and
observe that connector's requests from registration onward. A repeat with
the same monitor setup is closed. [Capture findings](../c1-journal.md#stock-hdmi-2-switch--read-only-log-capture) · [Upstream monitor guide](https://www.webosose.org/docs/tools/commands/ls-monitor/)

## Review-only dual-source experiment

**Design draft ready for separate review; not runnable, packaged, installed or
authorized.** This is the smallest sequence that separates the remaining
explanations. Static saved code and on-disk configuration cannot establish active
chip/HAL/MCU behavior or advancing frames. Direct UTP remains selected; unchanged
0.1.12 remains the single-HDMI4 control and cannot execute this sequence.

### Required before a runnable proposal

1. Show that this attempt's fresh HDMI 2 connector applies `SUB0` before its
   first scaler request and retains it through its first video connection,
   with HDMI 1 unaffected. The selector must target only the owned connector.
   A reply or later descriptor leaves the first request unknown. Using any
   route with uncertain targeting or effects is **unsafe_to_test**. Keep the
   existing permission scope and stop on ambiguous responses.
   [C1 readiness finding](../../research/c1-hdmi-interface-map.md#can-the-app-wait-for-hdmi-2-to-confirm-sub0)
2. Define how the attempt records fresh versus adopted/reused acquisition and
   returned receiver/scaler eligibility, owner relationships, distinct sink/source
   bindings and preemption. Use actual returned records or an already-understood
   passive observation; no invented getter or cache-to-grant inference. Treat
   missing evidence as unknown. Explicitly join logical UTP ID, backend ID,
   first/current element context, child resource owner and command-service target;
   sharing can retain the first parent's ID. An appId or setAppWindowInfo field
   cannot replace that join. G's resource-type/selector reuse match and the
   port-based release path require this distinction; see the
   [C1 evidence summary](../../research/c1-hdmi-interface-map.md#independent-second-path-research).
3. Bind model HDMI1/2 mapping through supported runtime discovery/the service's
   own model map; videoIndex3, PI_PORT, ordinal0/1 and planeID44/45 are not jack
   numbers. Qualify the provider/model adapter and actual named-sink availability.
   No register address, firmware interior address or device ioctl in app code.
4. Review the isolated stop/close route and owner restoration contingency.
   No known passive field proves physical release. If cleanup can touch borrowed
   same-port/sink state, ownership is uncertain, or the existing bounded guards
   cannot cover both sessions, the runnable proposal is unsafe_to_test. Resolve
   the contract without extending deadlines or repeating setup/admission tests.

### Single-attempt sequence and evidence

The eventual separately authorized owner must have two connected independent,
recognizably different moving sources on HDMI1 and HDMI2 and be present with the
normal remote/Home restoration path and independent timer. Confirm the ports and
live sources for that trial. The earlier browser pair used HDMI 4 and HDMI 1.
Use two fixed nonoverlapping windows in the existing validated1920x1080 surface,
e.g. left/right960x540 rectangles. Move/resize and audio selection follow concurrency.

| Step | Required observation / acceptance | Stop condition |
|---|---|---|
| A: own UTP open/select HDMI1→MAIN | Returned own A ID; classified acquisition/grants; identifiable A motion in the first fixed window. | Cached/adopted state cannot be claimed fresh; failed/uncertain ownership or binding stops progression. |
| B: own open/select HDMI2→verified SUB0 | Separate own B ID, evidenced own SUB selector and non-preempting receiver/SUB scaler eligibility; A stays bound and moving. | Default-MAIN replacement, reused ingress, denied SUB, policy action/preemption, same-source output or any A disruption. |
| Concurrent observation | At least5 continuous seconds with both distinct patterns/time counters advancing together. Owner observation is recorded separately from machine replies; caches/planeIDs/window count cannot substitute. | Either freezes, switches, blanks or displays the same source. Missing allocation records leave allocation unknown even if behavioral coexistence passes. |
| Isolated B cleanup | Stop/close only this attempt's returned B, once; A continues advancing for at least2 seconds afterward with its binding retained. | B cleanup failure/uncertainty or A interruption. This proves only observed sibling continuity; it does not establish complete physical receiver release or future reacquisition. |
| Final A cleanup/restoration | Stop/close only returned A; local cleanup and independent process termination evidence; owner confirms normal picture/sound/remote with no recovery. | Missing/partial evidence or impaired operation; stop and use only the separately accepted owner restoration, no automatic retry. |

All stages must fit the original issue+17-second progression and issue+22-second
cleanup/alarm envelope, including two-second exchanges; insufficient remaining
budget stops before the next acquisition/observation. Do not shorten accepted
observations to call a timeout successful. Retain both strict3-second guards,
1-second focus,32-event/2KiB app trace,100 ms worker bounds, issue+25-second
witness/256-byte cap, dispatch+27-second collection and two30-second connection
caps. A future versioned report/runner must represent both owned sessions within
those existing limits and pass host acceptance before any build or deployment.
Do not modify/replay0.1.12 authority or treat its old four-method admission as a
new selector grant. No app, HDMI, install, policy, service, vendor-init, ioctl or
power operation has run as part of this draft.

**Claim levels:** independent motion and isolated sibling continuity are observable
acceptance; independent allocation additionally needs fresh ownership/grant
evidence. Full physical release, reverse release order, audio ownership, sustained
stability and broad-model compatibility remain separate unknowns. Do not add
reacquisition, reverse-order repetition or endurance to this smallest attempt.
