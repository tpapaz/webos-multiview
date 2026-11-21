# C1 current research procedure

[Status](../../STATUS.md) · [Actual outcomes](c1-journal.md) · [Prototype contract](../../native/phase2-hdmi-candidate-0.1.12/README.md)

## TV readiness

- **Offline work** can proceed with the TV off. Use saved files and receipts when
  they answer the question.
- **Live read-only work** needs a reachable TV. For ordinary reads, use the TV
  while it is awake in normal use. Defer when the owner says it is off or in
  standby. When power state is unknown, use the connection attempt already in
  the bounded procedure. Home and a new owner timer are unnecessary for an
  ordinary read. A connect timeout leaves the TV's power and service state
  unknown. Stop at the attempt's bound and preserve the receipt.
- **State-dependent evidence** should come from the state being investigated.
  For HDMI runtime questions, record the known power, viewing and source state
  that matters to the result. Keep owner observations separate from machine
  receipts. Use passive reads alongside normal viewing when they can answer the
  question within their bounds.
- **Physical HDMI trials** require the awake TV, the specified live sources,
  owner observation and restoration access, and explicit trial scope. Put any
  required evidence collection inside the trial's existing time and cleanup bounds.

Powering on the TV does not reopen spent attempts or authorize app acquisition.
Keep live research within the [standing read-only scope](../safety.md#standing-read-only-permission).

## Current read-only research procedure

The active procedure is offline receiver attribution. The HDMI 1 ownership capture is complete, and the native two-input design remains under review. [Status](../../STATUS.md#single-next-task) · [Research history](../research/c1-hdmi-evidence-ledger.md#research-history)

### HDMI pair handoff

Use saved records first. The [pair trial](c1-journal.md#browser-hdmi-pair--40-second-retry) recorded page playback and unload events. The later single-input monitor selected media registration and acquisition plus video output registration and connection (`c1-stock-hdmi1-monitor-20261121-001/monitor.cjs:27–38`). It omitted release and disconnect. Those captures cover different sessions and cannot identify when HDMI 4 lost the picture at the service level.

The [pre-reconnect retry](c1-journal.md#hdmi-1-reconnect-under-observation) matched the HDMI 1 backend to a successful TVRM reply with no type-19 receiver entry. In the earlier [stock HDMI 1 trace](c1-journal.md#hdmi-1-selected-with-the-lg-remote), the media server sent a separate `acquireComplete` at event 80. Its recorder kept the resource names and omitted the grant state and index.

#### Offline acceptance criteria

Use the [C1 completion and slot findings](../research/c1-hdmi-interface-map.md#where-does-the-separate-receiver-get-its-index) to implement and test the following cases with synthetic data. Treat the saved summaries as incomplete evidence and keep their session boundaries intact.

| Evidence in one run | Expected finding |
|---|---|
| Media-server-originated completion for the registered connection, `state: true`, one unambiguous `VHDMIRX` entry with an explicit nonnegative integer `index` | Report the indexed grant for that connection. The client-originated completion for the same request adds no second grant. |
| The same grant, plus an accepted physical port switch, a diagnostic matching its full backend pipeline ID to an enabled slot, and a diagnostic matching that slot to the connection within one continuous lifetime | Attribute the receiver index to that HDMI jack. |
| A valid indexed grant with a missing diagnostic, truncated ID, slot reuse, handle copy or move, ambiguous ordering, or a gap between observations | Retain the connection-level grant. Keep the physical jack unknown. |
| Failed completion, quantity-only grant, missing index, or a saved summary with only resource names | Keep the receiver index unknown. A successful TVRM reply without type 19 still describes only that reply. |

Preserve redaction and the existing TVRM decoder results. Receiver release time needs a separate release observation. This offline task requires no TV connection or cable change.

#### Existing TVRM decoder

The current CLI reads the HDMI backend and TVRM service exchanges for HDMI 1 and HDMI 4. From the repository root in PowerShell, set `$capturePath` to a private JSONL file from a single run.

~~~powershell
Get-Content -Raw -LiteralPath $capturePath | node scripts/hdmi-receiver-decoder.cjs
~~~

*Input.* Supply one run in arrival order with one JSON `ls-monitor` envelope per line, up to 4 MiB and 4,096 lines. Include calls to `com.webos.service.extinputs.hdmi` (switch, open and close) and `com.webos.service.tvrm` (request and release), together with returns and bus errors. Preserve unique endpoints, call and reply tokens, full payloads and TX/RX direction. Optionally retain a collector's nonnegative monotonic integer `elapsedMs` on each envelope. Start before the switches and retain the handoff and cleanup. The prior redacted projections and page logs omit required fields.

*Output.* Events are sorted by call line. `receiver_assigned` gives the HDMI jack and the allocator's type-19 receiver index. `release_acknowledged` gives the call and reply lines, and elapsed times if supplied. When an immediately preceding, nonoverlapping allocation matches the session, caller, input and purpose, `priorAllocationReplyLine` points back to it. The release reply itself carries no receiver index. `no_receiver_in_reply` describes that one successful allocation list. A missing release leaves release timing unknown. A different port selection on the same backend ID makes attribution ambiguous for this decoder. Exit 0 means the reported target exchanges were decoded, while exit 1 accompanies partial or unknown results. Absence of a jack, hardware release, continued possession and simultaneous pictures cannot be inferred from exit status.

### HDMI 1 ownership from open

**Completed capture, paused helper trial.** Both the remote-selected stock HDMI 1 session and the JS session reached the video connector. In each run webOS rejected its owner association. The stock capture matched each caller’s open to its port-1 switch and the backend to its video output. The exact stock app package remains unknown. [Stock HDMI 1 receipt](c1-journal.md#hdmi-1-selected-with-the-lg-remote) · [JS ownership trace](../research/c1-hdmi-interface-map.md#where-does-the-hdmi-video-connector-get-its-owner)

The registration helper is a local ARM executable. A distinct physical-input API that passes the helper’s registered parent to the HDMI video child would justify revisiting a device trial. [Reviewed interfaces](../research/c1-hdmi-interface-map.md#can-a-physical-hdmi-1-api-attach-the-helpers-media-id) · [Helper build](../build.md#native-media-registration-helper)

## HDMI 2 first scaler request

The [offline checker](../../scripts/hdmi2-scaler-evidence.cjs) uses a private,
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
the same monitor setup is closed. [Capture findings](c1-journal.md#stock-hdmi-2-switch--read-only-log-capture) · [Upstream monitor guide](https://www.webosose.org/docs/tools/commands/ls-monitor/)

## Browser HDMI 4 preview

All browser trial scopes are spent. Preview 0.1.0 and pair 0.1.3 were last confirmed closed. The one-shot backup closes were observed during those specific trials. Behavior during a media hang and physical release remain unknown. Any future move or pair trial needs evidence identifying the app-owned connector, an observable move, reviewed cleanup and fresh owner scope. [Pair result](c1-journal.md#browser-hdmi-pair--40-second-retry) · [Last HDMI 1 trace](c1-journal.md#browser-hdmi-1-connector-ownership)

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
   [C1 readiness finding](../research/c1-hdmi-interface-map.md#can-the-app-wait-for-hdmi-2-to-confirm-sub0)
2. Define how the attempt records fresh versus adopted/reused acquisition and
   returned receiver/scaler eligibility, owner relationships, distinct sink/source
   bindings and preemption. Use actual returned records or an already-understood
   passive observation; no invented getter or cache-to-grant inference. Treat
   missing evidence as unknown. Explicitly join logical UTP ID, backend ID,
   first/current element context, child resource owner and command-service target;
   sharing can retain the first parent's ID. An appId or setAppWindowInfo field
   cannot replace that join. G's resource-type/selector reuse match and the
   port-based release path require this distinction; see the
   [C1 evidence summary](../research/c1-hdmi-interface-map.md#independent-second-path-research).
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

## Active experiments and restoration

### Restoration and stop rules

Acquisition, app install/launch, permission/policy changes, service restarts and
power actions are outside passive permission. Any future active proposal must
retain the [0.1.12 contract](../../native/phase2-hdmi-candidate-0.1.12/README.md):
both strict three-second guards, issue+17-second progression, one-second focus,
32-event bound, native22-second immediate-exit alarm,100 ms worker sub-bounds,
issue+25-second witness, two30-second connection caps and dispatch+27-second
collection; app report cap2 KiB, witness256 bytes. These are preserved constraints,
not a queued launch or authorization to replay an old runner.

Keep normal PowerShell attached through any separately authorized launch and
collection; deliver the submission cue promptly. Use fresh exclusive slots,
current artifact/boot/admission checks, only owned returned IDs for cleanup and
explicit post-run restoration. Missing/conflicting/partial evidence or impaired
picture/sound/remote stops progression. No automatic retry, extra/late retrieval,
deadline widening, service restart or power action. Collection must never postpone
normal remote/Home restoration. Acknowledged stop/close, cache clearing and
process absence do not prove hardware release.

## Preservation disposition

Preserve working0.1.12 source/IPK/ELF, installed-policy disposition, original raw
reports, private authority, firmware/kernel/providers, immutable receipts and
frozen as-used sources. The owner deleted11 old IPKs; do not recreate them.
[Retention rules](../repository-layout.md) distinguish rebuildable caches from
unreproducible evidence and current toolchain inputs. The passive scopes above
are closed. Current review is offline.
