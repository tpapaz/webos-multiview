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

The capability-file collection below is **completed and closed; do not repeat**.
The own-session SUB0 grammar and allocation/reuse evidence contract are now
source-bound; runtime own-client target/delivery/grants remain unknown. The media
process/link lookup and inert executable capture are completed and closed.
Saved-byte tracing reached an external manager-provider boundary. The single
bounded passive ResourceManager mapping lookup timed out during SSH connect and
is **spent**. Use saved evidence for further offline review. No lookup retry,
library-content read or active experiment is queued.
The owner grants [standing bounded read-only
research permission](../safety.md#standing-read-only-permission), superseding old
per-file approval wording. Keep the TV operational and preserve critical files.
No active trial is authorized by this plan.

Completed dependency scope for that contract: one inert
/usr/share/luna-service2/services.d/com.webos.media.service descriptor, grounded
by LG's pinned OSE registration template and the saved C1 client's com.webos.media
destination. Read only with the existing saved TOFU/endpoint binding, one SSH/SFTP
connection/open, zero links/retries/exec, four exact ancestor-directory checks,
64KiB/two-read EOF bounds and18 metadata checks. Retain30s outer/27s work/3s
operation/shared-cleanup bounds, cancellation and confirmed closure, fresh
owner-only private output and frozen as-used sources. Offline acceptance precedes
dispatch. **Actual outcome: exact leaf absent; closed, no opens/reads, no retry
or alternate lookup.** The descriptor did not bind an executable. Do not replay
this scope or substitute an upstream executable path. The result does not prove
that the running media service is absent.

### Completed media executable-identity lookup

The immutable as-prepared process-metadata request is recorded in
build/phase-2/hdmi-own-sub-contract-20261117-001/identity-request.json.
Its original status is preserved; the separately implemented fixed reader passed
74 offline acceptance cases, then ran once on2026-11-17. One allowed candidate
target was returned in23 stdout bytes, zero stderr, exit0,292.343 ms; channel
and SSH closure confirmed. Do not repeat or change the completed command.
[Actual outcome and hashes](c1-journal.md#media-executable-identity--single-bounded-lookup).
As-used source/preparation/acceptance/audit:
build/phase-2/hdmi-media-identity-read-20261117-001/verification.json.

The fixed command uses pidof on that literal name, rejects empty/multiple or
nonnumeric results, then readlink on only the matched /proc/PID/exe. It launches
no media app, sends no signal and never opens/executes the returned target. One
SSH/exec channel, zero SFTP/retries,30s outer/27s work,3s connect/command/shared
cleanup,1KiB stdout/1KiB stderr and one nonempty stdout line; cancellation,
confirmed channel/SSH closure, existing endpoint/pin and fresh owner-only private
capture are required. Reject unexpected target syntax, deleted links, failures,
limits or uncertain closure; stop without fallback. Raw PID/path/endpoint and
unrestricted stderr stay private. A process-name match/link is not an atomic
birth identity or proof of active loaded binary bytes.

The successful closed result grounded the separate request below. No executable
file was opened/collected, and no service query, selector delivery or active
trial followed this lookup.

### Completed media executable-file read

Immutable request:
build/phase-2/hdmi-media-identity-read-20261117-001/executable-request.json,
SHA25625885dd02bc8da537c1b507e4323745f763000dd5214308c6e8b42c66008568b.
The request's original prepared status is immutable. **Completed once after87
offline acceptance cases, 2026-11-17:**529,960 bytes, ten reads including EOF,
12 stable metadata checks and452.084 ms; file handle/SFTP/SSH closure confirmed.
One connection/read-only open, no links, exec, retry or forced closure. The
observed private candidatePath and two exact ancestors were used without
substitution. Do not repeat this capture or identity/descriptor discovery.
[Actual outcome and hashes](c1-journal.md#media-executable--single-bounded-inert-file-capture).
As-used reader/dispatcher/18 frozen pins, acceptance and verification:
build/phase-2/hdmi-media-server-read-20261117-001/verification.json.
The following bounds describe the completed scope, not a queued replay.

The fixed reader was offline-validated before the single SFTP dispatch under
standing read-only permission. One SSH/SFTP connection, one
read-only regular-file open, zero links/exec/retries; exact mode/type/uid/gid/size/
mtime checks for both ancestors and leaf/handle, at most12 metadata calls.
Retained raw size1..33,554,432 bytes,64KiB buffer, at most513 reads including EOF,
one growth-probe byte may be observed (33,554,433 maximum) but not retained or
accepted. Fragmentation requiring another read stops without widening the bound.
Retain30s outer/27s work/3s clipped connect-operation/shared-cleanup limits, timers
before lazy profile/key/transport creation, cancellation, late-callback refusal
and confirmed handle/SFTP/SSH closure. Callback-time elapsed checks must prevent
late success even when a timer callback was delayed.

Use a fresh exclusive owner-only
build/phase-2/hdmi-media-server-evidence-YYYYMMDD-NNN slot; preserve raw/partial
bytes, metadata, hashes, receipt and frozen as-used sources. Stop on absence,
denial, links/special files, mutation, trust/endpoint mismatch, any bound or
uncertain cleanup; no repair/fallback/retry. Raw capture and closed-local-byte
ELF-header interpretation are separate. No vendor loader/parser execution,
service invocation, receiver/sink operation, TV write or active-loaded identity
claim follows from the file. Keep the observed path and raw identifiers private.

### Spent bounded ResourceManager path lookup

The [offline manager/ownership pass](../research/c1-hdmi-interface-map.md#independent-second-path-research)
resolved server+32 as PipelineManager and server+28 as ResourceManager, generated
resource ID→actual registering sender service, associated-record fan-out and
cached selector replay after successful owner association. It did not recover
the exact external virtual implementations or membership validation. setSink
can cache/forward while returning false; owner success can precede failed replay.
Do not use either reply as a completion/no-action receipt or retry trigger.

**Spent on 2026-11-17.** The one permitted connection attempt hit its 3-second
connect deadline. The saved SSH close event was verified offline. No exec channel
opened and no provider path was returned. Keep the occupied output slot and
original receipts. Do not dispatch this lookup again.
[Actual outcome and hashes](c1-journal.md#resourcemanager-mapping-lookup--connect-timeout).

The following provenance and bounds describe the completed attempt. Immutable request:
build/phase-2/hdmi-resource-provider-lookup-20261117-001/request.json;
SHA25693b0270ec4ef26e6069ec673720b0bc33d42604151b2a266b7cfe1c97131cd7d.
Fixed command SHA256d959646d09cb4d0d267d2993e26936ffa3303811c336d442073f8420b4c17dad.
Request/26 frozen as-used source/helper/evidence pins,109 offline cases
(49 transport/cleanup,60 protocol including19 synthetic Git Bash command cases),
private ACLs and201 preservation/43 working pins passed:
build/phase-2/hdmi-resource-provider-lookup-20261117-001/verification.json.
No profiles/keys were read and no TV connection occurred in preparation.

| Bound | Fixed lookup scope |
|---|---|
| Identity and paths | One literal pidof umediaserver; require one positive decimal PID, no leading zero, at most10 digits. For that fresh PID only: readlink /proc/PID/exe twice, bounded prefixes of /proc/PID/stat twice, one bounded /proc/PID/maps prefix. Compare both exe links to the saved private executable candidate and both PID/starttime values. No stale saved PID, alternate process/path, fd/environment/memory reads, directory scan or target execution. |
| Maps input and filtering | head emits at most1,048,577 maps bytes into awk; accept at most1,048,576 counted bytes,8,192 rows and8,192 bytes per source line. A fixed end marker propagates head failure. Filter only basename libresource_mgr.so plus numeric version suffixes; retain deleted candidates for explicit refusal. At most16 matching records. No PipelineManager selection or library content read. head's emitted-prefix bound is not a claim about internal read syscall sizes. |
| Identity/output bounds | Each stat head emits at most8,193 bytes. Host retains at most65,536 stdout bytes/1,024 stderr bytes and23 nonempty stdout lines. Closed interpretation rejects lines over8,192 bytes, malformed/missing framing, any stderr, failed/signalled exit, bad encoding or partial output. Raw/partial bytes/hashes stay private. |
| Transport/time | Saved immutable TOFU pin and configured endpoint-binding match only; one SSH connection/one exec channel, no PTY/SFTP/retries.30s outer,27s work,3s connect/command clipped to remaining time and3s shared remaining cleanup. Timers precede lazy profile/key/client work; cancellation and callback-time/late-closure checks remain mandatory. Require channel/SSH closure; timeout/forced or uncertain cleanup cannot pass. Channel closure alone is not proof of remote child-process absence. |
| Local output | The dispatcher reserved the exclusive owner-only build/phase-2/hdmi-resource-provider-evidence-20261117-001 slot before transport. This slot is occupied and preserved. Raw stdout/stderr and inventory were saved; interpretation was skipped. |
| Candidate acceptance | Required stable bracketed PID/starttime/exe, valid scan counts, exactly one strict absolute ASCII ResourceManager path, one device/inode identity, nonoverlapping records and at least one executable mapping. Actual remote utility behavior remains untested. |

A maps path is a **mapped candidate**, not proof of ELF symbol/vtable resolution,
regular-file identity or active loaded-byte equality. Process identity brackets
and maps are not an atomic snapshot and cannot exclude intermediate exec/remap.
M's libresource_mgr.so.1/libums_pipeline_mgr.so.1 needed names remain provider
candidates. The timeout established no mapped path, so no exact-file request
follows. Preserve both empty raw streams with the saved receipts.

The missing bodies are RM vptr byte offsets12/16/64/68 (lookup, registration,
association checks and ID-tree insertion/removal), then PM offset200. Accept only
source-bound function/vtable/provider linkage; stop at unresolved identity or
indirection. The [offline replay trace](../research/c1-hdmi-interface-map.md#independent-second-path-research)
identified an early selection interval. Actual delivery order and provider
validation remain unknown. Preserve all
existing raw bytes/receipts and distinguish ELF VAs from runtime addresses.
The own-session join, effective caller policy, non-displacing pre-MAIN ordering
and resource update/unsubscribe/release semantics remain unknown.
trackResourcesStatus adds a subscriber and observer state; its acknowledgement
is not a grant getter. No service call/subscription, vendor execution,
replacement app/package or active trial is queued.

All completed collections are closed and immutable; use the [evidence ledger](../research/c1-hdmi-evidence-ledger.md)
and [journal](c1-journal.md) for earlier scope, actual outcomes and original hashes.
Do not repeat setup, activation, clock/mode repair or completed collection as
preflight. No runnable dual HDMI/app trial is currently prepared. The milestone remains
one moving HDMI-4 picture with sound; independent HDMI1+HDMI2 is unproven.

### Completed capability-file read

**Completed once, 2026-11-17:** one exact regular inert file,
/etc/palm/val/device-cap.json. The saved loader builds this path at ELF0x15866–0x15886;
243 raw bytes passed EOF/hash/metadata and confirmed closure. Original and sorted
unique names are [MAIN,SUB0], deriving ordinals0/1 for the saved C1 provider;
current loaded configuration remains unknown. A plane listing cannot prove ingress.
[Actual outcome and hashes](c1-journal.md#val-capability-json--bounded-single-file-collection).
The following fixed bounds describe the completed read, not a queued replay.

| Item | Fixed request |
|---|---|
| Path/ancestors | Only /etc/palm/val/device-cap.json; lstat /etc, /etc/palm, /etc/palm/val as directories. Reject all links/special files; no directory scan, realpath expansion or alternate path. |
| Transport | Existing configured endpoint and saved immutable TOFU pin/endpoint binding; one SSH connection, one SFTP subsystem, one read-only open, zero retries. TOFU is not independently verified. No remote exec. |
| Bytes/reads | File and retained raw bytes1..65,536;64 KiB buffer; at most two reads including EOF. One extra EOF/growth probe byte may be observed (at most65,537 bytes total), never retained or accepted; any growth stops. Fragmentation requiring a third call stops without widening the bound. |
| Metadata | At most15 metadata calls: three ancestor lstats, leaf lstat; repeat ancestors/leaf before open; fstat+leaf lstat after open; fstat+leaf lstat+three ancestor lstats after reading. Compare mode/type/uid/gid/size/mtime; no SFTP inode or atomic-snapshot claim. |
| Time/closure |30-second outer,27-second work cutoff;3-second connect/operation limits clipped to remaining time. Start timers before lazy profile/key/transport construction. At most3 seconds shared remaining cleanup; close handle once, end SFTP/SSH and confirm closure. Cancellation, late callbacks or uncertainty cannot resume/retry. |
| Private output | Fresh exclusive build/phase-2/hdmi-val-capability-evidence-YYYYMMDD-NNN; owner-only ACLs; device-cap.json plus inventory.json. Preserve partial bytes/receipt and hashes; never overwrite occupied slots or print raw config/private identifiers. |

Validate complete, closed local bytes as strict UTF-8 JSON with object root.
Treat optional planes explicitly: preserve original array order/duplicates, then
model unique byte-sorted names separately only for an unambiguous array of
nonempty ASCII strings without NUL. Unsupported/ambiguous content stops mapping
interpretation and remains private raw evidence; do not silently repair it.
A missing key is consistent with default MAIN, while an empty accepted array
clears the saved provider's default. Neither proves currently loaded state.
Associate only the first at most two derived sink ordinals with software
planeIDs44/45 and nodes0/1; report extra ordinals and actual MAIN/SUB0 presence.
No receiver/scaler grant, active routing, release or dual-HDMI claim follows.

Stop on missing/denied/unexpected path, link/type/size/metadata change, key/endpoint
mismatch, timeout/cancellation, exceeded read/byte/metadata bounds or unconfirmed
closure. Record unavailable/partial outcome and close; no repair operation,
alternate file, retry, device/service access or TV change. JSON failure prevents
usable mapping even if raw capture completed. No vendor parser execution.

Immutable as-prepared full request/provenance/acceptance matrix:
build/phase-2/hdmi-val-capability-request-20261117-001/request.json.
SHA256 68f0d2b231bb9a86890488e373f9e7a201f7bbdb996448deaa9924343e115001.
The request pins the saved VAL trace, loader literals and existing control/trust
chain. The reader reuses unchanged metadata/private-output/saved-pin helpers;
completed scopes and existing collectors remain unchanged.
Fixed reader/capture/CLI: scripts/collect-val-capability.cjs. The completed run used the explicit
--allow-one-val-capability-evidence-read flag, --device plus the existing alias,
and fresh build/phase-2/hdmi-val-capability-evidence-20261117-001 output slot.
No path or bound overrides. Default/refusal/--plan never import live transport or
read real profiles/keys. Explicit dispatch reuses the unchanged saved-TOFU endpoint
binding and private-output/metadata helpers; it does not create a new trust pin.

Offline acceptance passed87 cases with synthetic SSH/SFTP and injected clocks:
exact path/link/metadata changes, inclusive64 KiB/two-read/EOF/growth limits,
strict encoding/JSON/duplicate keys, missing/empty/unsupported/extra plane records,
deadlines/cancellation/late callbacks, shared cleanup budget, closure uncertainty,
occupied output and native Windows owner-only raw/receipt ACLs. Tests block real
transport imports and profile/key reads. The reader retains at most64 KiB payload
for local interpretation alongside its64 KiB read buffer; raw bytes remain exact.
A retrieved result establishes raw capture only: inspect interpretation.status
separately. Malformed content keeps its private hash/bytes and no derived mapping.
Active-loaded configuration and dual HDMI always remain unknown.

Request as-prepared status and original readiness audit remain immutable:
build/phase-2/hdmi-val-capability-preparation-20261117-001/verification.json.
Completed as-used16 source snapshots, unchanged pins, dispatch result and local
raw/metadata/closure/ACL/preservation verification:
build/phase-2/hdmi-val-capability-run-20261117-001/verification.json.
No reader/helper/guard,0.1.12 or TV file change; no native build/package.

## Review-only dual-source experiment

**Design draft ready for separate review; not runnable, packaged, installed or
authorized.** This is the smallest sequence that separates the remaining
explanations. Static saved code and on-disk configuration cannot establish active
chip/HAL/MCU behavior or advancing frames. Direct UTP remains selected; unchanged
0.1.12 remains the single-HDMI4 control and cannot execute this sequence.

### Required before a runnable proposal

1. Bind an evidenced selector to the **new attempt's own** second avconnector,
   selecting type4/SUB0 and requesting SUB_SCALER without reconfiguring A.
   Offline review resolved the request body and evidence requirements. Accepted
   delivery to the app's own connector remains unknown.
   [HDMI evidence summary](../research/c1-hdmi-interface-map.md#independent-second-path-research).
   Omit audioSink and streamType: empty audioSink clears the audio type. A callback/true setter
   result does not acknowledge reconnection or grants. Do not borrow an identity
   or add policy grants.
   The saved server fallback can fan out over associated record IDs, and owner
   association can replay a cached selector. Prove membership and exact own-child
   targeting before using either route; false setSink replies can still follow
   forwarded messages and must not trigger an automatic retry.
   Establish that B's own child applies type 4 before its first scaler request
   and retains it through the first lower video connection, or establish a
   supported SUB-first construction route. Cached replay can arrive on either
   side of render-ready. The owner reply and a later SUB0 binding leave the
   first scaler and sink choices unknown. The [offline caller trace](../research/c1-hdmi-interface-map.md#can-the-app-wait-for-hdmi-2-to-confirm-sub0)
   places fresh child setup and play inside the same port-selection request.
   Waiting between open and select supplies no own-child confirmation.
   The [saved construction trace](../research/c1-hdmi-interface-map.md#independent-second-path-research)
   found window and element configuration fields in the HDMI load. The
   explicit sink-type Load example uses local playback. A construction route
   that sets type 4 on the new physical-HDMI connector remains unknown.
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
normal remote/Home restoration path and independent timer. Connection/readiness
is not established by this task; earlier records had only one source connected.
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
