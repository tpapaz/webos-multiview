# C1 HDMI evidence map

LG OLED C1, firmware 03.53.45. [Current status](../../STATUS.md) · [Device journal](../device-tests/c1-journal.md)

[HDMI 4 + HDMI 1 plan](../device-tests/current-plan.md#hdmi-4-and-hdmi-1) · [HDMI 1 ownership](#where-does-the-hdmi-video-connector-get-its-owner) · [Playback-frontend candidate](#can-the-playback-frontend-route-physical-hdmi-1-and-preserve-the-owner) · [Receiver decoder reference](c1-receiver-decoder.md)

## Verified result and limits

Version 0.1.12 showed continuously moving HDMI 4 with audible sound during
one eight-second trial. The 960 × 540 picture appeared in the center of the
app's window. Open, select, stop and close returned acknowledgments. The
app terminated independently and the owner observed normal picture, sound
and remote control again without recovery. Hardware resource release and
independent audio ownership remain **unknown**.
[Observed trial](../device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound)

The earlier local-media trial showed that the main and secondary views can
display independent local clips. [Local-media findings](c1-smp-ndl-resource-path.md)

## Independent second-path research

The saved C1 configuration lists the `MAIN` and `SUB0` presentation routes.
The offline review distinguishes physical input selection, receiver
allocation and presentation placement. Window creation, a successful
selector response and a cached association do not establish that two
receivers independently own their inputs.

**Unknown.** The evidence has yet to show HDMI 2 getting its own secondary
route before its first scaler request. It also has yet to show two physical
sources moving together or one session releasing its resources while the
other keeps playing.
[Dual-input design under review](../device-tests/archive/c1-dual-hdmi-design.md#review-only-dual-source-experiment)

### What can a passive trace attribute to an HDMI port?

**C1 03.53.45, offline replay.** The saved service records can identify which port connected to a display output. They do not establish which port held or lost a video receiver during the browser pair handoff. The actual [HDMI 4 → HDMI 1 → HDMI 4 trial](../device-tests/c1-journal.md#browser-hdmi-pair--40-second-retry) recorded page events. The service records below come from separate runs. Sequence numbers refer only to the named run.

| Saved run | Port and display evidence | Receiver evidence |
|---|---|---|
| Browser HDMI 1 | Backend switch 15 and accepted HDMI output connection 96 use the same backend ID on `MAIN`. Child registration 59, owner proposal 63 and scaler request 80 identify the video child even though the owner proposal was rejected. | Receiver registration 17 returned the ID used for `HDMI_INPUT` and `VHDMIRX` at 21 and completion calls 27 and 32. The receiver ID appears in no recorded pipeline, owner, output context or media-ID field. |
| Remote-selected HDMI 1 | Backend switch 59 and accepted output connection 146 match on `MAIN`. Child registration 106, owner proposal 111 and scaler request 134 give the same kind of video-child evidence. | Receiver registration 63 returned the ID used at 73 and completion calls 80 and 83. Again the receiver has no recorded identity link to the port. |
| Stock HDMI 2 | Backend switch 333 matches output connection 395 on `MAIN`. Output connection 653 belongs to a different context. | The combined Luna record contains no `VHDMIRX` request. The earlier scaler request alone cannot identify the HDMI 2 receiver. |

The saved HDMI 1 projectors retain resource names and a call's acknowledgment. They omit the completion payload's `state` and the returned resource indices. Counting two completion envelopes does not establish two allocations. The separate rotated HDMI 2 log projection retains explicit success for four acquisition responses, but none contains `VHDMIRX`. None of these records observes a port-specific receiver release during the pair handoff. A missing release cannot demonstrate continued possession. [HDMI 1 receipts](../device-tests/c1-journal.md#hdmi-1-selected-with-the-lg-remote) · [HDMI 2 capture](../device-tests/c1-journal.md#stock-hdmi-2-switch--read-only-log-capture)

The [allocator trace](#how-does-the-hdmi-session-reach-the-receiver-allocator) identifies two possible observations for a future capture: a TVRM reply keyed to the backend session, and conditional diagnostics linking an internal request slot to the central media connection. Neither was retained during the handoff.

**Reproduce offline.** Compare `events` within each `monitor-result.json` under `build/phase-2/`: `c1-hdmi1-app-owner-20261118-001` (`b457165d98af`), `c1-stock-hdmi1-monitor-20261121-001` (`383f6dde54ac`) and `c1-hdmi2-luna-join-20261118-001` (`b18967d046e7`). Match a successful backend switch's `pipeline` to the output's `context`. Separately compare the receiver registration's returned `child` to each receiver request and completion's `child`. The log cross-check uses `c1-stock-hdmi2-focused-log-20261118-001/rotation-projection.json` (`a9ad1107a8a1`), response lines 164, 782, 3690 and 3826. All digests here are SHA-256 prefixes.

### How does the HDMI session reach the receiver allocator?

**Verified in the saved C1 03.53.45 firmware for a fresh physical HDMI session.** The HDMI backend pipeline ID that accompanies the physical port switch also travels in the TV resource manager's `requestResource` call. Its matched reply therefore provides a candidate passive observation of what the allocator returned for that input. This route can identify the session even if the HDMI video child's owner proposal fails. The pair capture omitted TVRM, so its receiver handoff remains **unknown**.

| Link | Evidence in the saved binaries |
|---|---|
| Physical port → backend pipeline → TVRM request | The [fresh backend trace](#can-the-playback-frontend-route-physical-hdmi-1-and-preserve-the-owner) follows the service key into the HDMI watcher and GIBB pipeline. In `libgibb-pipeline.so.1.0.0` (`98c22261bab5`), the physical-input load reads the pipeline string at offset 96 and passes it to the resource connector (`0x2519a–0x2523e`). The connector passes its string data to `tvrmclient_request_resource` at `0x295be–0x295c2`. In `libtvrm_client.so.1.0.0` (`db04ad77bd0b`), the client serializes that value as `pipelineId` and dispatches the request (`0x5dfa–0x5e42`, `0x5eb4–0x5eb6`). |
| TVRM request → allocated resource list | In `tvrm.elf` (`82b6ef471b79`), `TVRMClass::request_resource` decodes the pipeline ID, input and purpose at `0x64f64–0x64f86` and passes the ID into `API_RM_RequestResource` at `0x64f96–0x64faa`. It serializes the returned list and reports `resources`, `tvcoResult`, `conflictResult` and `returnValue` (`0x64fc4–0x6509c`). The list serializer writes its own `pipelineId` at `0x5f0e8–0x5f140`. The client parses the resource records, including type and resource port, at `0x9c86–0x9e60`. The resource port belongs to the allocator. Use the original backend switch to identify the physical jack. |
| Pipeline → internal request slot → central connection ID | The allocator looks up the pipeline text at record offset `0x803` (`0x467fc–0x46814`). It first checks occupied slots using a comparison of at most 31 bytes, otherwise it searches for a free slot among eight (`0x495a6–0x495ac`, `0x4af98–0x4afce`, `0x4b85c–0x4b86c`, `0x4a690–0x4a6aa`). One conditional diagnostic logs the slot, pipeline text and enabled flag (`0x45f08–0x45f68`, stride and loop bound at `0x45f8c–0x45f94`). The registration diagnostic at `0x39940–0x39974` can then tie a slot to a media connection ID during the same lifetime. Successful emission of these two diagnostics together remains unobserved. |
| Copy, move and release | An existing client allows connect to return early (`0x3985c–0x39876`). Copy can leave two slots referencing one handle (`0x3ab68–0x3ab86`), move transfers it and clears the source (`0x3ac3e–0x3ac74`), and disconnect checks for other references before unregistering (`0x39b34–0x39b4c`, `0x39bb4`, `0x39d40–0x39d9a`). The ordinary TVRM `releaseResource` handler separately parses the session ID, input and purpose before calling the release API (`0x64b96–0x64bc0`). Its reply gives an operation result. It leaves physical release and the other input's continued motion unverified. |

**What to retain in a passive trace.** Match each backend port switch to the TVRM request by full pipeline ID within one capture. Pair its reply by endpoints and call token. Check success, `resources.pipelineId`, and `resources.data[]` for TVRM type 19 (`VHDMIRX`) and its returned `port`. The client initializes the wire keys `data`, `type` and `port` at `0x31fa–0x320c`, `0x323a–0x324c` and `0x325a–0x326c`. GIBB's internal type for the same resource is 15. Keep request slots, central connection IDs, allocator resource ports and HDMI jack numbers distinct. Ambiguous truncated IDs, slot reuse without a recorded lifetime, an unrelated output, or an absent release leave the affected conclusion unknown. Two initial allocations alone cannot establish that HDMI 4 still held its receiver when HDMI 1 played.

### Where does the separate receiver get its index?

**Verified offline on C1 firmware 03.53.45, 2026-11-22.** The central media resource manager writes the assigned index into the successful `acquireComplete` payload for the registered media connection. For HDMI, look for `state: true` and an entry in `resources` with `resource: "VHDMIRX"` and an explicit nonnegative integer `index`. That number identifies a media resource unit. Attribution to an HDMI jack requires a separate identity match.

| Evidence | What the saved C1 code or trace shows |
|---|---|
| Assignment | In `libresource_mgr.so.1.0.0` (SHA-256 prefix `241500b9b1ad`), `ResourceManager::acquire` writes initial state and connection ID at `0x21a80–0x21aae`, calls the resource pool and checks the result at `0x21d6c–0x21d74`, then sets success at `0x22370–0x22390`. On the indexed path it loads the acquired unit's index at `0x22462`, writes it under `index` at `0x22470–0x22472` and appends the entry at `0x224b8`. The common serializer writes `resources` at `0x2201a–0x2201e`. The shortage path also writes an index at `0x21e80`. A separate `no_index` path emits a quantity without an index at `0x2257c–0x225d8`. Either a failed completion or a missing index leaves the assignment unknown. |
| Delivery | In `resource-client.elf` (`5f731199a4af`), `acquireCompleteResponse` reads `state` as a boolean and `connectionId` as a string at `0x10766–0x107ba`, then passes the ID, state and message to the waiting acquisition at `0x107ea–0x10826`. The saved stock HDMI 1 trace shows registration at 63 → 65, the receiver request at 73, and the **media-server-originated** completion at 80. The receiver caller sent another completion at 83 for the same ID. The browser trace has the same directions at 27 and 32. Both projectors kept the resource names and omitted the state and index. [Stock HDMI 1 receipt](../device-tests/c1-journal.md#hdmi-1-selected-with-the-lg-remote) |
| Physical jack | In `tvrm.elf` (`82b6ef471b79`), the conditional slot dump at `0x45f0e–0x45f68` prints the pipeline text and enabled slot. A second conditional diagnostic in `rmc_getAcquireCondition` reads the slot's current client handle, obtains its connection ID and logs both slot and ID at `0x3a890–0x3a8f6`. The caller passes the same slot to the condition check and can use it for acquisition at `0x45a7e–0x45ab8`. The slot dump runs on a separate branch. Whether both diagnostics appear for one HDMI acquisition at the TV's existing log level is **unknown**. |

**What the recordings can establish.** The stock and browser HDMI 1 completions identify the receiver connection. The [later reconnect](../device-tests/c1-journal.md#hdmi-1-reconnect-under-observation) identifies the backend for port 1 and contains a TVRM reply with no type-19 entry. These are separate sessions. An older stock HDMI 2 log mentions the receiver on request line 659 and completion-tagged line 761. That projection reached its cap and retained neither a success state nor an index (`c1-stock-hdmi2-log-20261118-001/projection.json`, SHA-256 prefix `eb9b65445162`). None of these receipts establishes either jack's receiver index or release time.

**Candidate port match.** Within one continuously observed slot lifetime, match the accepted backend switch's full pipeline ID to the enabled-slot diagnostic, the same slot's current connection ID to the receiver registration, and that connection to the media server's successful indexed completion. A reused slot, a copied or moved handle, truncated or conflicting IDs, ambiguous overlapping requests, or missing coverage breaks attribution. An indexed completion can still be reported for the media connection alone. Release needs its own evidence.

The indexed assignment also appears in the [pinned upstream resource manager](https://github.com/webosose/umediaserver/blob/af89f8ac3355027a90d7b299a78fb6fab9b6ffca/src/resource_manager/ResourceManager.cpp#L554-L626). To reproduce the C1-specific branches, inspect the saved provider under `build/phase-2/c1-resource-owner-provider-20261118-003/private/` or the local ARM SDK listing `build/phase-2/c1-receiver-completion-acquire-20261122.asm` (SHA-256 prefix `f3db98effc86`).

### Can existing C1 logs establish a continuous slot lifetime?

**Unknown on C1 firmware 03.53.45.** The two diagnostics use the same PmLog context, `TVRMSRV`, at different levels. The saved evidence does not establish its effective level during any HDMI capture. Even at Debug, the pipeline dump covers only the slots visited on a conditional branch. Leave `tvrmSlotCoverage` unset for these runs.

| Observation | Verified in the saved TVRM executable |
|---|---|
| Pipeline and enabled slot | The level-7 **Debug** call prints slot, pipeline text and enabled flag at `0x45f36–0x45f68`. A non-null context at level 6 or lower skips it. A nonzero acquire condition bypasses the scan at `0x45a84–0x45a98`. Simulation also bypasses it at `0x45ee4–0x45eea` and `0x4621c–0x46220`. |
| Slot and current connection | The level-6 **Info** call in `rmc_getAcquireCondition` reads the slot’s handle, gets its connection ID and emits `RMC_PROXY` at `0x3a890–0x3a8f6`. A non-null context at level 5 or lower bypasses the log and still returns the condition at `0x3a87a–0x3a888`, `0x3a8fa–0x3a912`. |
| Handle copy, move and disconnect | The copy and move messages identify the source and destination slots at Info. Each precedes the actual store. The severity checks can skip the message while the operation proceeds. Copy leaves the source handle in place (`0x3ab12–0x3ab90`). Move stores the destination and clears the source (`0x3abc6–0x3ac80`). A shared disconnect can clear one slot without unregistering the connection (`0x39b3a–0x39b4c`, `0x39d4c–0x39d9a`, `0x39c2e`). |
| Slot reset and reuse | The release path passes the slot to `_RM_InitTvPipeline` at `0x4ef64–0x4ef6a`. Its normal path clears the entire 0x828-byte record at `0x4bc08–0x4bc10`. The clear emits no lifetime marker of its own. A subsequent allocation can select a disabled slot at `0x4b85c–0x4b86c`, `0x4a696–0x4a6aa`. Equal slot numbers before and after a gap can therefore describe different lifetimes. |

**Configuration evidence.** Under `build/phase-2/`, the TVRM binary is `hdmi-tvrm-allocator-evidence-20261116-001/tvrm.elf` (SHA-256 prefix `82b6ef471b79`). Its saved listing is `hdmi-tvrm-receiver-trace-20261116-001/raw/allocator.asm` (`1881603be61a`). `GetPmLogContext` resolves the context name at `0x24734–0x24754` (string `0x733c8`). In `admission-runtime-20261111/libPmLogLib.so.3` (`1b6311667b7c`), `PmLogLevelToString` at `0x2088` uses the table at `0x14c80`, whose entries for 6 and 7 name Info and Debug. File offsets `0x3d04`, `0x3d3c` and `0x3d4c` name `/etc/pmlog.d`, `default.conf` and `/var/preferences/pmloglib/overrides.conf`. The reviewed C1 inventory contains neither the corresponding configuration contents nor an effective-level readout.

**Capture evidence.** The stock HDMI 1 monitor selected Luna calls and replies. The separate reconnect monitor also selected bus traffic. Neither sampled internal TVRM log messages. The stock HDMI 2 projection reached its 384-event cap. Its separate rotated-log reader processed 5,262 in-window lines without overflow, but its selectors omitted slot identities and transfers. An omitted record cannot establish that logging was disabled or that a slot stayed unchanged. The relevant selectors are in `c1-stock-hdmi2-log-20261118-001/capture.cjs:31–59` and `c1-stock-hdmi2-focused-log-20261118-001/read-rotated-switch.cjs:37–90` under the same build directory. [HDMI 1 receipts](../device-tests/c1-journal.md#hdmi-1-selected-with-the-lg-remote) · [HDMI 2 observations](../device-tests/c1-journal.md#stock-hdmi-2-switch--read-only-log-capture)

### Offline receiver decoder

**Bounded capture path, host-tested with synthetic transport.** The monitor now calls the stock decoder after both output streams end and SSH closes. In the shell test, a substitute producer returned 17 after writing a valid callback. AWK still produced its normal end marker and exited 0. The independently reported producer status prevented a receipt. Tests also withhold a plausible grant on early EOF, cancellation, a short window or missing transport closure. A completed synthetic capture saved one connection-level grant with the jack unknown. Actual C1 receiver assignment remains unknown. [Monitor acceptance](../../tests/host/stock-hdmi1-monitor.test.cjs) · [Device procedure](c1-receiver-decoder.md#bounded-stock-hdmi-1-monitor)

**Stock HDMI 1 filter replay, verified offline.** The [replay filter](../../scripts/stock-hdmi1-monitor.awk) reproduces the AWK program in `c1-stock-hdmi1-monitor-20261121-001/monitor.cjs:32–45` (monitor SHA-256 prefix `906a1e4a1a7a`). In the synthetic replay, the registration reply at filtered envelope 3 and server callback at 5 produced one redacted grant with receiver index 2 and `port: null`. The client duplicate carried index 0 and added no grant. Changing the server state to false or removing its index left the index unknown even with the successful client copy. The old stock projector’s resource-name list at lines 60–63 had discarded this distinction. The saved TV receipt still has no measured index. [Replay procedure](c1-receiver-decoder.md#stock-hdmi-1-filter-replay) · [Host acceptance tests](../../tests/host/hdmi-receiver-decoder.test.cjs)

**Verified with synthetic C1 media traffic.** A callback from the media server to the registering client, carrying the returned connection ID, `state: true` and one indexed `VHDMIRX`, establishes a grant for that connection. In the host fixture, index 0 maps to HDMI 1 through the full backend pipeline ID and the current connection in enabled slot 5. With a gap, slot reuse or an ambiguous handle, the same fixture reports index 0 with the jack unknown. The client-originated callback adds no grant. The public report refers to the registration by reply line. [Decoder tests](../../tests/host/hdmi-receiver-decoder.test.cjs) · [Normalized slot evidence](c1-receiver-decoder.md#offline-receiver-decoder)

**HDMI 1 controls checked separately.** The stock server callback at event 80 matches registration reply 65. In the browser run the corresponding events are 27 and 19. Both summaries retained resource names and omitted success state and index. The reconnect receipt retains `no_receiver_in_reply` at lines 17 → 19. Each receipt leaves the actual receiver index and release time unknown. [Capture references and digest prefixes](#what-can-a-passive-trace-attribute-to-an-hdmi-port) · [Reconnect receipt](../device-tests/c1-journal.md#hdmi-1-reconnect-under-observation)

**Host-tested with synthetic traffic.** In the interleaved fixture, HDMI 4 received allocator index 1 and HDMI 1 received index 0. Both callers used token 70. HDMI 1's reply arrived first. Its release acknowledgment at line 12 (1,100 ms on the synthetic clock) points back to its allocation at line 6. The decoder also handles missing or contradictory replies, unrelated sessions, port rebinding, and release calls nested in a close. It emits no pipeline or endpoint IDs. [Acceptance cases](../../tests/host/hdmi-receiver-decoder.test.cjs) · [Input and output](c1-receiver-decoder.md#hdmi-pair-handoff)

**Earlier ownership captures.** The saved browser and stock HDMI 1 ownership monitors each retained 24 calls. The combined stock HDMI 2 monitor retained 21. Among these 69 calls there were zero TVRM request or release exchanges. The saved HDMI 4 + HDMI 1 page log has 14 playback and UI events. It cannot supply receiver indices or release acknowledgments. During the later HDMI 1 reconnect, this decoder matched a successful port-bound TVRM reply with zero type-19 entries. The actual assignments and their lifetimes remain unknown. [Reconnect receipt](../device-tests/c1-journal.md#hdmi-1-reconnect-under-observation) · [Capture references](#what-can-a-passive-trace-attribute-to-an-hdmi-port) · [Pair receipt](../device-tests/c1-journal.md#browser-hdmi-pair--40-second-retry)

## Can the app wait for HDMI 2 to confirm SUB0?

**Unknown on C1 03.53.45.** Fresh port selection creates and starts the
connector in the same request. Once ready, a connector with its default type
requests `MAIN_SCALER`. Deferred window attachment and cached sink replay
give the app no verified way to hold this HDMI 2 connector until its own
`SUB0` update takes effect.

## Does browser load start HDMI scaler preparation?

**Verified in saved C1 code for a fresh, non-autoplay element.** DOM `load()`
opens a logical input session. DOM `play()` drives physical port selection,
which creates and starts the connector in one request. Holding `play()` delays
creation as well as scaler preparation. The browser exposes no verified
interval to apply `SUB0` to the fresh connector before it starts.

## Can HDMI 2 select SUB0 during setup?

### Does the stock HDMI 2 caller select SUB0 before its first scaler request?

**Unknown on the C1 running 03.53.45.** The saved stock switch identifies
physical port 2 and its output on `MAIN`. The reviewed callers and captures
do not establish who could apply the secondary type to that port's fresh
video connector before its first scaler request.

| Saved caller or capture | Where the evidence ends |
|---|---|
| Stock InputCommon app | `DisplayVideoModel.qml` maps HDMI 2 to port 2 and passes it to `switchExternalInput` (lines 1293–1302, 1323–1328). Its guide PiP handler returns immediately unless the input type is `TV` (148–158, 185–188). The stock open supplies the app and window IDs (both paths in `ExternalInputService.qml`, lines 61 and 90). Saved as `hdmi-discovery-20261111/route-5.qml` and `route-1.qml`, SHA-256 prefixes `d61ee398fef6` and `2ecc5608daa2`. |
| Native HDMI video sink | Both element configurations create the same kind of video sink (`libextinput-service.so.1.0.0`, `0x40b76–0x40b92`, `0x41686–0x416a2`). The sink creates a proxy, saves it at offset `0x18c` and initializes it (`video-sink.elf`, `61fcee10303e`, `0xaf20`, `0xaf8a`, `0xb07e`). Its start builds a `MAIN` payload, reloads that proxy and sets render-ready (`0x9b8e–0x9bae`, `0x9c1c–0x9c20`). Load and play occur inside one switch (`0x97c22–0x97c4e` in the service library). If the connector still has its initial type 2 when eligible, it selects `MAIN_SCALER` (`libav-connector.so.1`, `c7cffeb1437f`, `0x12094`, `0x12df6–0x12e00`). This predicts the default request. It does not measure the hardware grant. |
| Stock port-2 Luna capture | Backend switch 333 and output connection 395 share a context. Request 343 asks for `MAIN_SCALER`, but its connection lacks a matching registration and accepted owner. The same capture **does** join child registration 591, accepted ownership 595 and scaler request 623 for a different pipeline. The monitor omitted `setSink` from its method filter. See `c1-hdmi2-luna-join-20261118-001/monitor-result.json` (`b18967d046e7`) and adjacent `monitor.cjs:26–42`. |
| Separate stock file captures | In `c1-stock-hdmi2-log-20261118-001/projection.json` (`eb9b65445162`), lines 56 and 111 contain `SUB0` before the HDMI 2 switch records at 495–499. Each retains only a line number, a video-connection tag and the word `SUB0`. Neither identifies a port, caller or child. This projection reached its cap. The separate rotated projection (`c1-stock-hdmi2-focused-log-20261118-001/rotation-projection.json`, `a9ad1107a8a1`) retains a `MAIN_SCALER` request at 719 but no ownership link from that requester to the port-2 switch. Each capture was evaluated independently. |

The HDMI backend also contains the strings `multiview` and `hdmi2`.
`AdapterApplicationManager` references them during construction at
`0x62378` and `0x62402` in `extinput-integration.elf` (`4caec3536b68`).
The adapter subscribes to foreground app changes at `0x6224a`. Its callback
classifies the app ID by substring and gets an integer back
(`0x629b2`, `0x61fc0–0x61fd4`). Those references identify app names.
They provide no connector handle or secondary type assignment.

**What would reopen the route.** A C1 physical-input caller would need to
carry the port-2 binding to its own fresh video child and apply the
secondary type to that child while scaler preparation is still held.
A continuous trace could establish stock ordering if it records the binding,
child registration and accepted owner, applied type, and first scaler request
for that child. An accepted owner alone does not order the cached sink
update against startup. [Ownership and ordering requirements](../device-tests/archive/c1-dual-hdmi-design.md#hdmi-2-first-scaler-request)

## HDMI 1 ownership and secondary placement

### Could a native helper prepare HDMI 1 for the browser?

**Candidate mechanism, ordering and ownership unknown on C1 03.53.45.**
The native connector can request `SUB_SCALER` and route video to `SUB0`
when its secondary video type is set before its first scaler decision
(`libav-connector.so.1` at `0x12df6` and `0x13c3e–0x13c6e`). Two
possible helper designs face different constraints.

- **Prepare the browser's session.** Browser `load()` saves the logical
  input ID returned by open (`libcbe.so`, `0x328d5f0–0x328d5f4`). On a
  fresh session the HDMI connector is created inside the later port switch,
  which proceeds from load to play in one backend call
  (`libextinput-service.so.1.0.0`, `0x97c22–0x97c4e`). The media server
  can cache a sink for a resource owner and replay it once a child joins.
  The cached command is sent without a completion callback
  (`media-server.elf`, `0x4b9fa–0x4ba04`). A helper would need both the
  resource owner for this browser session and evidence that its HDMI 1
  child applied the selector before requesting a scaler. Neither follows
  from the logical ID or the owner-association reply. Sending a selector
  to an owner with existing children can also reach multiple children.
- **Open HDMI 1 in the helper and hand it to the browser.** The traced
  browser constructs its own open request using its window and consumes the
  returned ID. The saved ATSC UTP implementation has a boot-session
  handoff (`utp-atsc.elf`, `0x5627f0–0x5627f2`, `0x5c4092–0x5c40ee`,
  `0x5c75e4–0x5c75fc`). The reviewed browser request has no field for
  adopting a chosen helper session. Opening the same port twice therefore
  provides no verified transfer of the helper's sink or resource ownership.

The missing evidence is a C1 caller that binds the intended owner and
applies the secondary type before starting that connector. The browser pair
trial observed sequential pictures. This helper assessment used saved
firmware only. [Device result](../device-tests/c1-journal.md#browser-hdmi-pair--40-second-retry)

### Move HDMI 1 to SUB0 before opening HDMI 4

**Candidate for HDMI 1 + HDMI 4: move the first input after it starts.**
Start laptop HDMI 1 alone on the ordinary route. A native component that owns
that session could then request secondary video for its existing connector.
On C1 03.53.45 the normal-window branch of `libav-connector.so.1` handles
an already-connected sink: disconnect at `0x19b8c`, retained-resource release
when applicable at `0x19dde`, and type update at `0x19bd8`. The selector
attempts reconnection at `0x1d0ca`. A brief interruption of HDMI 1 during
this move is possible. HDMI 4 would only be opened after evidence that the
laptop is moving again on `SUB0` and its former `MAIN` binding is clear.
The second input could then use the default route with no pre-play selector.

The first decision is whether an app can address just its own running HDMI 1
connector and observe its completed move. The setter reply alone cannot
answer it. If that one-input gate passes, simultaneous receiver eligibility
and sustained distinct motion still need a two-input test. This is an
offline design candidate. The [previous pair trial](../device-tests/c1-journal.md#browser-hdmi-pair--40-second-retry)
used default routing for both elements.

**Candidate observation for the move.** In the saved C1 `videooutput.elf`,
`VideoService::getStatus` calls `buildStatus` at `0x6c25a`. That builder
calls `buildVideoSinkStatus` at `0x6be28` and `0x6be74`. The sink builder
uses `sink`, `connected` and `context` at `0x6b79a–0x6b7cc`, then
`appId`, `connectedSource` and `connectedSourcePort` on its client path
at `0x6b8c4–0x6b920`. These fields could corroborate the same HDMI 1
session moving from MAIN to SUB0 and MAIN becoming disconnected. The
status is service bookkeeping. It supplies neither a scaler release receipt
nor a resource-manager owner ID for a targeted selector. The evidence here
comes from the saved executable. A live HDMI 1 move remains untested.

### Which resource ID did HDMI 1 propose as its owner?

On C1 firmware 03.53.45 the app's HDMI receiver resource client obtained a
connection ID in its registration reply and used it to request `HDMI_INPUT`
and `VHDMIRX`. The two AV connectors each registered separately. Both proposed
the HDMI backend's video-output context as their parent. That context differed
from the receiver's returned connection ID and matched zero earlier registration
replies in the capture. Both child IDs matched their own callers' registrations.
The server rejected both associations. In a separate **non-HDMI** playback
pipeline observed during the stock capture, the accepted parent matched an
earlier registration whose client requested `VDEC`. Each comparison joins
IDs and call/reply order within one capture.
[HDMI 1 trial](../device-tests/c1-journal.md#browser-hdmi-1-connector-ownership) ·
[Stock comparison](../device-tests/c1-journal.md#stock-hdmi-2-switch--read-only-log-capture)

The saved C1 allocator calls `ResourceManagerClientRegisterPipelineWithApp`
at `0x39914` and `ResourceManagerClientTryAcquire` at `0x3a1ea`. The C1
media server generates a registration ID, passes it to the manager at
`0x5537c` and sends the reply at `0x558c2`. For ownership the C1 server
delegates to its resource manager at `0x4b808`.

**Comparison, G4 firmware 03.11.20.** In the retained
`libresource_mgr.so.1.0.0` (SHA-256
`85cedf79cc5779cf6eedc43469d59cad22ea1edc63c858b040383df2b5132a82`),
`setOwnerPipeline` looks up the supplied owner at `0x1432c` and the child
at `0x1433a` in the same connection table. Each missing-key path returns
false. With both records present, it links them at `0x14344–0x14356` and
returns true. The G4 method occupies virtual offset 68. The C1 wrapper calls
offset 64.

**Verified in the C1 on-disk library.** The collected
`libresource_mgr.so.1.0.0` has SONAME `libresource_mgr.so.1` and SHA-256
`241500b9b1add5101af72865e11ab75f9df75acd86f4178605f9e9e8390505d9`.
Its ResourceManager vtable binds offset 64 to `setOwnerPipeline`. The method
looks up the owner at `0x1209c` and the child at `0x120ac` in the same
connection table. The missing-owner branch at `0x120a4` and missing-child
branch at `0x120b4` have distinct diagnostics and return false. When both
entries exist, it links them at `0x120b6–0x120c8` and returns true at
`0x120cc–0x120da`. The inspected success branch has no HDMI-port or
scaler test.

Both children in the HDMI 1 trace had already registered. Their proposed
owner matched the video-output context and none of the earlier registration
replies captured. The receiver's separate registered ID had already requested
`VHDMIRX` before either association. A missing parent entry is therefore
the best-supported explanation. The live failing branch and loaded-library
identity were not recorded. The receiver ID meets the **observed registration
prerequisite**. Recovering an owner relationship through a supported,
app-scoped caller and moving only the video connector remain **unverified**.

### Where does the HDMI video connector get its owner?

**Verified for the JS probe on C1 03.53.45.** The saved read-only Luna bus
trace covers HDMI 1 from both open calls. webOS rejected the proposed owner
of the same connector that went on to acquire the main scaler. The table
uses call → reply sequence numbers from the 0.1.3 receipt. Each reply
matches the call token and the two endpoints in reverse order.

| Question | Events | Identity check in the saved rows |
|---|---|---|
| Which input opened? | UTP 5 → 11 and backend 7 → 9. Port selection 13 → 204 and 15 → 202. | Each open identifies the pair app and HDMI. At each layer the same caller used its own returned pipeline ID to select port 1. The two IDs differ. Selection began at 15 and its reply arrived after the resource requests. |
| Which connector handled video? | Registration 59 → 61, scaler acquisition 80 → 89, output connection 96 → 101. | The same caller used its returned AV connector ID for the accepted `MAIN_SCALER` request. The accepted HDMI connection on `MAIN` used the backend open's ID as its output context. The receiver had its own registration at 17 → 19 and requested `VHDMIRX` at 21. |
| Did webOS accept that connector's owner? | Ownership 63 → 67. | The registered caller sent the child ID from 61 and proposed the backend ID from 9 as its owner. The reply echoed that child as `mediaId` and returned `false`. No earlier registration reply in this capture returned that proposed parent ID. The other AV connector has a separate rejection at 166 → 170. |

**How to reproduce the read.** In the private directory
`build/phase-2/c1-hdmi1-app-owner-20261118-001/`, read
`monitor-result.json` (`events`, keyed by `sequence` and `replySequence`).
The adjacent `verification.json` records the summary and receipt digest.
The receipt has both stream markers, zero malformed rows and conflicts, and
no reported cap. The as-used `monitor.cjs` builds its `associations` summary
from successful replies only. Use the event rows for rejections.
[Receipt hash and observed laptop picture](../device-tests/c1-journal.md#browser-hdmi-1-connector-ownership)

The saved C1 code explains how that ID reaches the connector. In
`gibb-load.asm`, the load path takes the string at `PipelineBase+96` at
`0x255a2` and passes it to `Element::Base::open` at `0x255c0`. The base
appends it to the element's pipeline records at `0x1a41e–0x1a48c`. On a
fresh open the video sink copies the first record's ID at `0x8c38–0x8c44`
and passes it to the AV proxy builder at `0xae8a–0xaecc`. The proxy saves
the ID at `0x5848–0x5854` and uses it for the ownership request at
`0x712e–0x7148`. A shared element can skip the plugin open and retain its
first parent. The receiver has a separate ID lookup in `tvrm.elf` at
`0x3aad0–0x3aaf0`. Both direct calls to that wrapper in the saved allocator
disassembly are in `TVRMClass::debug_feature` at `0x61816` and `0x61f54`.
Neither call feeds the HDMI video sink.

### Does the stock HDMI caller supply a registered parent?

**Verified in the saved C1 input app.** Both first launch and ordinary open
construct a new request with `inputSourceType` and two options, `appId` and
`windowId`. The caller supplies neither `mediaId` nor `mediaFrontend`. It saves
the `pipelineId` **returned by open**, then uses it to select the physical port.
The nearby code that saves `response.mediaId` belongs to DVR/media playback and
writes a different variable. In the collected `com.webos.app.inputcommon`
sources, see `ExternalInputService.qml:47–64,76–93,163–168` and
`DisplayVideoModel.qml:345,360,495–497,710–717,972–975,1300`
(`hdmi-discovery-20261111/route-1.qml` and `route-5.qml`, SHA-256 prefixes
`2ecc5608daa2` and `d61ee398fef6`).

**Verified in the native open path.** The earlier description of a top-level
backend `mediaId` was incorrect. On a fresh external-input open, the field stays
nested throughout:

| Stage | Evidence on firmware 03.53.45 |
|---|---|
| UTP admission of the field | Both regional handlers read `options.mediaId`. With an empty `mediaFrontend`, they clear the ID for an ordinary window and reject `InitialWindow`. ATSC `utp-atsc.elf` at `0x5625ac–0x5625c0`, `0x56272e–0x5627be`; DVB `utp-dvb.elf` at `0x5624fc–0x562510`, `0x56267e–0x56270e`. |
| Fresh open versus reuse | ATSC `TVExternalManager::open` queues a fresh `TVPlayer::extinputsOpen` at `0x5c42a2–0x5c4384`. A stored boot session can take a separate adoption branch at `0x5c4092–0x5c40ee`, `0x5c429e`. On the fresh path the serializer writes a retained nonempty ID into `options` at `0x5d2d66–0x5d2db2` and dispatches `open` at `0x5d2e2e`. The saved HDMI provider mapping selects the HDMI backend. |
| HDMI backend | In `extinput-integration.elf` (SHA-256 prefix `4caec3536b68`), `HdmiService::open` parses the outer `options` into a JSON object at `0x51150–0x51156`. It checks that object's `mediaId` and reads the string at `0x51290–0x512d8`. A nonempty value takes the service-key path to `createService` at `0x5139c–0x513ca`, `0x51432–0x51436` and `0x51482–0x51486`. An empty value takes the ID-generation branch at `0x51842`. Service creation supplies no resource-manager ownership receipt. |

A **different native caller**, `UTPConnector::registerId` in
`libav-connector.so.1` (SHA-256 prefix `c7cffeb1437f`), does send a
`mediaFrontend` and a `mediaId`. Its constructor copies a caller-supplied
string at `0x15752`, `0x15802–0x1580a`. The open builder serializes that
string at `0x159a0–0x159c0`. Its port switch uses the fixed value 5 at
`0x160bc–0x160dc`. The [native caller trace](#which-native-caller-registers-the-parent-before-hdmi-open) identifies where Starfish obtains that string.

**Remote-selected HDMI 1.** The 2026-11-21 capture saw both HDMI opens omit
`options.mediaId`. The video child proposed the backend ID as its owner,
received an explicit rejection, then acquired `MAIN_SCALER`. The owner saw
the laptop on HDMI 1. Exact caller package attribution remains unknown.
[Matched exchanges and receipt](../device-tests/c1-journal.md#hdmi-1-selected-with-the-lg-remote)

**Stock HDMI 2 ownership remains unknown at runtime.** The saved HDMI 2 monitor
contains zero HDMI open calls. Its request projection also retained only top-level
`mediaId` (`c1-hdmi2-luna-join-20261118-001/monitor.cjs:76–85`, adjacent
`monitor-result.json` SHA-256 prefix `b18967d046e7`). Events 331 and 333 select port 2, and 395/398 tie its backend
to video output on `MAIN`. The scaler request at 343/347 lacks an HDMI 2
child association. The only accepted ownership call/reply, 595/599, joins
a different registered parent and child (569/573 and 591/593). That parent
requested `VDEC` at 612 and had a separate output context at 653. Thus the
stock capture establishes neither acceptance nor rejection for HDMI 2's
video connector. By contrast, the app's HDMI 1 capture recorded two explicit
rejections. [Stock HDMI 2 capture](../device-tests/c1-journal.md#stock-hdmi-2-switch--read-only-log-capture) · [App HDMI 1 trace](../device-tests/c1-journal.md#browser-hdmi-1-connector-ownership)

### Which native caller registers the parent before HDMI open?

**Verified in saved C1 code, firmware 03.53.45.** Starfish can register a media
pipeline and use the returned connection ID as `options.mediaId` in an HDMI
open. Its subsequent port selection is fixed at 5. No reviewed native caller
combines that registration with selection of physical HDMI 1 or 2. **Unknown
on the TV:** whether the Starfish branch ran or its video child received an
accepted ownership reply. [Port 5 mapping](#what-does-the-native-callers-fixed-port-5-select)

| Step in the Starfish path | Evidence in the saved ARM binaries |
|---|---|
| Register the parent | In `libplayerAPIs.so.1`, the player constructs its resource manager at `0x39bf8` and retains it at `0x39c00`. With an empty incoming ID the manager calls `registerPipeline("media", …)` at `0x74abc`. It does not check the boolean result at `0x74ac0`. A nonempty incoming ID follows the existing-ID constructor at `0x74c2c–0x74c3e`. |
| Follow the returned ID | In `resource-client.elf`, the client sends registration at `0x8fae`, waits at `0x8fe6`, and on a successful reply reads `connectionId` into its ID string at offset 28 (`0xf71c–0xf74e`, short-string branch `0xfa38`). The player's `getMediaID` reads that same client's string (`libplayerAPIs.so.1`, `0x37244–0x37248`, `0x744c4–0x744c8`). |
| Follow the ID to the port switch | On the qualifying `o208k` playback branch, the player gets the ID at `0x3a6ce`, copies it into the proxy builder at `0x3a75c–0x3a760` and constructs the proxy at `0x3a7d2`. `libav-proxy.so.1` copies that field at `0x58e2–0x58e6`. `libav-connector.so.1` passes it to the UTP connector at `0x1925c–0x1929a`, writes it as the nested `mediaId` at `0x159a0–0x159c0`, then writes literal 5 as `portId` at `0x160bc–0x160dc`. |

**The configurable-port callers have a different ID flow.** In C1
`libcbe.so`, the PHC `InputPlayer` constructs options containing
`appId` and `windowId` (`0x1d7893e–0x1d78a14`). Its open callback reads
the returned `pipelineId` at `0x1d784ee–0x1d78544`. The switch uses that
ID and parses the requested port at `0x1d782ec–0x1d783ae`. The DOM
external-input player likewise constructs those two options at
`0x328d9d6–0x328da48`. In the legacy backend, physical port selection
reaches `API_TVPipelineMng_PlayAction` at `0x18beda` on a legacy pipeline.
Its imported `AdapterAvmutemanager::registerPipeline` belongs to audio/video
mute handling. UTP also adds its own logical key before backend open
(`utp-atsc.elf`, `0x5c4088`, `0x5c410e`), to a map of `TVPlayerResource`
objects at `0x61a7ce`. Neither operation supplies a media-server registration
reply for the HDMI owner. [Observed physical HDMI 1 replies](../device-tests/c1-journal.md#hdmi-1-selected-with-the-lg-remote)

Our native 0.1.12 control registers its app name on Luna. Its HDMI open supplies
`appId`, `windowId` and `windowType`, and its switch uses the returned pipeline
ID with fixed port 4. Its successful picture test establishes no pre-open media
registration. [Luna setup](../../native/phase2-hdmi-dispatch/adapter.h) · [Request builder](../../native/phase2-hdmi-picture/session.cpp)

**Search coverage.** The offline search screened 88 distinct loose 32-bit ARM
ELF images under `build/phase-1` and `build/phase-2` for the UTP and backend
external-input service names, `switchExternalInput`, `inputSourceType` and
`ext://hdmi`. Eight vendor images matched, including both regional UTP service
providers. The screen excluded G4, archives and object files. Dynamically
assembled routes, delegated calls and uncollected binaries remain possible.
Saved binary SHA-256 prefixes for reproduction: Starfish player
`0b0f665415e6`, resource client `5f731199a4af`, AV proxy `bcbd9740e258`,
AV connector `c7cffeb1437f`, browser `2eb542f9011c`, legacy backend
`7d6ed117b10a` and ATSC UTP `721394f165f3`.

### Would our native helper keep its registered media ID on HDMI 1?

**Ordinary HDMI open on C1 03.53.45: no.** Even if the helper obtains a valid
media-server connection ID, adding it to the existing `NormalWindow` open
leaves the HDMI video child without that parent. UTP clears the supplied ID
during open when `mediaFrontend` is absent or empty. The later port-1 switch
uses whichever HDMI backend session the open actually established.

| Stage | What the offline check establishes |
|---|---|
| Obtain the helper's ID | **SDK compile and link verified.** A minimal ARM program constructed `StarfishMediaAPIs(nullptr)` and called the public `const char *getMediaID()` before `Load`. The installed SDK's `StarfishMediaAPIs.h:35–46` declares both. The saved C1 binary reads the connection ID populated by the [constructor's registration path](#which-native-caller-registers-the-parent-before-hdmi-open). The program was linked against `libplayerAPIs` and never run. A nonempty ID and successful registration for the HDMI helper's own session remain **unknown**. Phase 1 exercised that constructor for a local clip without recording its pre-load ID. |
| Open a fresh HDMI session | **Verified in firmware.** The 0.1.12 native HDMI control sends its app ID, exported window ID and `NormalWindow`. The separate registration helper only calls the media-ID getter after constructing its player. Even with an added `options.mediaId`, the ATSC and DVB handlers take the empty-frontend branch and clear it (`0x562734–0x5627be` and `0x562684–0x56270e`). The HDMI backend then takes its ID-generation path at `0x51842`. The distinct playback-frontend branch can forward a supplied ID. On successful fresh backend open, the service key passed to `createService` at `0x51482–0x51486` also populates the returned `pipelineId` in the success reply at `0x51790–0x517b8` in `extinput-integration.elf`. |
| Select physical port 1 | **Verified in firmware.** ATSC UTP reads the backend's returned `pipelineId` at `0x5c74ca–0x5c74ee` and saves it in the logical session's `extinputs` record at `0x5c7538–0x5c7562`. On switch it resolves that record with `toTVPlayerId`, writes the backend ID as `pipelineId`, and sends the port separately (`0x5c6658–0x5c6692`, `0x5c66be–0x5c66e2`). The backend looks up the existing service by that ID at `0x4e480–0x4e488`. Selecting 1 preserves the established backend binding. It cannot restore a parent discarded at open. |

The [playback-frontend trace](#can-the-playback-frontend-route-physical-hdmi-1-and-preserve-the-owner) follows the branch that retains the ID through physical port selection and fresh video-sink creation.

The cross-link check used the existing WSL SDK's
`arm-webos-linux-gnueabi-g++ -std=c++14 -Wall -Wextra -Werror -x c++ - -x none -lplayerAPIs -o /dev/null`
with the two calls above in `main` on standard input. The current 0.1.12
HDMI control has no media-ID registration or getter in its session. Its four
additional UTP permissions establish no result for a media-server registration
under the helper's identity. [Native request builder](../../native/phase2-hdmi-picture/session.cpp) · [Grant scope](../../native/phase2-hdmi-window/policy/README.md)

The [registration helper](../build.md#native-media-registration-helper) now exists as a local ARM executable. The installed SDK's `StarfishMediaAPIs.h` declares the getter and accepts opaque payloads for `Load` and `SetProperty`. It declares no physical HDMI selector or connector-owner attachment method. The header alone therefore supplies no contract for attaching that ID to the laptop input.

### Can a physical HDMI 1 API attach the helper's media ID?

**No such app-facing operation was identified in the reviewed C1 03.53.45 files.** A positive result would require a physical port-1 session and evidence that its video connector acquired the helper's own registered pipeline as parent. The [stock and browser observations](../device-tests/c1-journal.md#hdmi-1-selected-with-the-lg-remote) established a working picture and an explicit rejection for that child. The [ordinary open handler](#would-our-native-helper-keep-its-registered-media-id-on-hdmi-1) also explains why adding an ID to the stock request would lose it before backend open.

| Candidate | What the saved implementation does |
|---|---|
| `extinputs/bind` | The ATSC UTP callback delegates to `UtpBindCall::process` at `0x564bd8`. It resolves a TV resource from hints or current state, tracks the subscription and stores a string-to-string binding in UTP's own TV resource map (`0x51cc56–0x51cc68`, `0x51ce8e–0x51cfdc`, `0x61a938–0x61a94a`). Its response carries `broadcastId`, `binded`, `status` and `subscribed` (`0x51d600–0x51d696`). There is no helper media ID or AV connector ID in this binding result. |
| `setPipelineWindowId` | The HDMI handler parses two strings, `windowId` and `pipelineId`, looks up the existing service with the pipeline ID and passes the window ID to its watcher. This updates the display window. See `extinput-integration.elf` at `0x4ce40–0x4ce68` and `0x4cf38–0x4cf5e`, and `Watcher::setWindowId` in `libextinput-service.so.1.0.0` at `0x992c0`. |
| `pin` and `setProperties` | The stock caller pins an existing session with its `pipelineId` and a boolean `matched` (`ExternalInputService.qml:226–229`, HDMI parser at `0x4f318–0x4f334`). On the traced HDMI controller path, the property handler extracts a key and integer value and sends the fixed `setDiagnosticsExpertSetting` command to the video element (`libextinput-service`, `0x646d6–0x647b2`). Neither trace supplies a parent and video child to the media server. |
| Sink connection and window ownership | Both stock sink wrappers send an existing `context` and `sinkType: MAIN` (`PlayerVideoSinkService.qml:21–23`, `VideoSinkManagerService.qml:29–32`). Window publication supplies an app ID, window ID and dimensions (`InputWindowControlService.qml:37–40`). The HDMI 1 app manifest declares `owner` inside `windowGroup` (`appinfo.json:26–31`). These records describe the app's display objects. None identifies a registered parent for the HDMI video child. |

**Coverage.** The saved UTP policy lists 37 external-input method names (`hdmi-discovery-20261111/policy-4.txt:419–455`, SHA-256 prefix `f80033f99cdb`). The saved provider map routes HDMI to the HDMI backend. The [app's grant](../../native/phase2-hdmi-window/policy/hdmiwindow-utp.api.json) covers open, switch, stop and close. The table describes the vendor handlers independently of app permissions. The offline review used stock QML, the ATSC UTP ELF (`721394f165f3`), the HDMI service ELF (`4caec3536b68`) and its service library (`7e497c76c377`). Other firmware or uncollected callers remain unknown.

### Can the playback frontend route physical HDMI 1 and preserve the owner?

**Candidate on C1 firmware 03.53.45.** For a fresh session on the ordinary
sound-path branch, the saved code targets the model-mapped HDMI 1 input and
carries the supplied media ID to the video connector's ownership request. If
the parent and child are both registered when that request reaches the C1
resource manager, its inspected method links them and returns true. A moving
laptop picture and an accepted reply for this combination remain **unknown**.

| Question | Evidence in the saved C1 files |
|---|---|
| Does port 1 still select a video configuration? | In `libextinput-service.so.1.0.0`, a nonempty frontend installs one video entry with source index 12 (`0x830d4–0x83120`). On the ordinary sound path, selecting port 1 changes only the source index to 8 (`0x8377c–0x83796`, `0x82a14–0x82a1e`). The frontend configuration lookup compares key offset 0 and offsets 8 through 40, skipping the source at offset 4 (`0x41f64–0x41f76`, `0x41fc8–0x42016`). The entry still matches the configured `video-hdmi` and `video-sink` pair. |
| Which input does that configuration target? | The watcher copies the updated input type and index into the load parameters (`0x870fc–0x8712e`). For HDMI source 8 the pipeline calls the TV resource manager to request resources and checks the result. Source 12 has a separate branch that skips this request (`libgibb-pipeline.so.1.0.0`, `0x251f8–0x25200`, `0x25b98–0x25ba0`, `0x2523e–0x25246`). If setup proceeds, the HDMI controller uses port 1's model-map entry. Only port 5 takes the fixed-index branch (`libextinput-service`, `0x654e2–0x6551c`). The video plugin stores the resulting hardware index at `0x38132`. Ordinary HDMI 1 previously reported index 3 on this TV. This frontend has no recorded receiver grant or physical output. |
| Which ID reaches the video child? | The HDMI service key passes unchanged into `WatcherHDMI`, then into its `WatchPipeline` (`libextinput-service`, `0x7b918–0x7b91e`, `0x7aef0–0x7aefc`, `0x9552e–0x95556`, `0x67ecc`). GIBB stores that string in the pipeline and passes it into element open (`0x15d4e–0x15d52`, `0x255a2–0x255c0`). Both frontend nodes have `isHwElement=false` and resource type 255 (`libextinput-service`, `0x416a4–0x416c4`). On this fresh path GIBB calls `getNewElement` with selector 255 (`0x1f206–0x1f224`, `0x1ecbe–0x1ecd6`). That selector is separate from the physical port. The fresh sink uses its first pipeline record's ID as the proposed owner of its own registered AV child. [Sink and proxy ID flow](#where-does-the-hdmi-video-connector-get-its-owner) · [C1 ownership decision](#which-resource-id-did-hdmi-1-propose-as-its-owner) |

**Sound-path exception.** When `getSoundPath()` returns 2, the watcher also
adds an entry with subtype 5 and flags 64 (`0x837c6–0x838d6`). The saved
frontend table contains only the video entry with subtype 4 and flags 32
(`0x4171a–0x41784`). A fresh lookup for the extra entry therefore fails
(`0x870c8–0x870d0`, `0x8756c`). The video entry still matches, but successful
completion of the whole switch or working audio cannot be inferred.

**Which setting selects that branch?** In the saved service library
(`7e497c76c377`), the HDMI watcher checks port 1 at `0x86a3e–0x86a46`.
Its virtual call at `0x86cc2–0x86cc4` resolves through relocation
`0xc8ad0` to `ExtinputConfig::getSoundPath()`. That function reads
`audioDB.hdmi1SoundPath` (`0x52a44–0x52a80`). Its table maps `auto`
to 0 and `av` to 2 (`0x52b64–0x52b9e`). A zero selects the audio
input-map fallback (`0x86cd0–0x86cd6`, `0x86a4a–0x86a54`).
The effective value on this C1 is **unknown**. A saved `av` value from
the applicable configuration would explain why the extra entry is needed.
The string table alone cannot establish the current setting.

The saved remote-selected and JS HDMI 1 runs used ordinary opens. Neither
tested a live helper registration with the playback frontend. Confirming this
candidate would require a receipt tying the helper's registration, fresh
backend key, port-1 binding and accepted ownership reply to the same video
child, alongside a visibly advancing HDMI 1 source. Secondary placement and
simultaneous inputs remain separate questions. [HDMI 1 device record](../device-tests/c1-journal.md#hdmi-1-selected-with-the-lg-remote)

### What does the native caller's fixed port 5 select?

**Verified in the saved C1 firmware (03.53.45).** Logical HDMI port 5 selects
a special media-frontend branch with fixed video hardware index 4. The
reviewed native caller gives the app no way to choose physical HDMI 1 or 2.
The distinction is visible in the port values themselves:

| Input path | How webOS selects it | Video hardware index (`sourcePort`) | Evidence |
|---|---|---|---|
| Laptop on HDMI 1 | Logical port 1, ordinary model mapping | **3 observed** | App trace, port switch 15 and accepted HDMI connection 96. [HDMI 1 trial](../device-tests/c1-journal.md#browser-hdmi-1-connector-ownership) |
| Stock HDMI 2 | Logical port 2, ordinary model mapping | **2 observed** | Stock trace, port switch 333 and accepted HDMI connection 395. [HDMI 2 capture](../device-tests/c1-journal.md#stock-hdmi-2-switch--read-only-log-capture) |
| Native media frontend | Logical port 5, separate controller branch | **4 in code** | The controller passes 4 directly to the video element. Neither saved capture contains a port-5 switch. Its live output and board wiring remain **unknown**. |

**Caller and service.** On a fresh switch, `UTPConnector::_connect()` in
`libav-connector.so.1` constructs the integer 5 at `0x160bc` and writes
it to `portId` at `0x160dc`. The C1 ATSC UTP handler reads the integer at
`0x56457e–0x5645ae`, and its manager forwards the same value as `portId` at
`0x5c66bc–0x5c66e2`. The stock input model exposes HDMI 1–4 and assigns
logical values 1–4 (`DisplayVideoModel.qml:1293–1305`). The HDMI watcher
recognizes a fifth logical value separately: its jump table at `0x83750`
dispatches 5 to `0x83766`, which sets source enum 12.

**Hardware selection.** In `libextinput-service.so.1.0.0` (SHA-256 prefix
`7e497c76c377`), `HdmiController::setResourceInfo` tests for port 5 at
`0x654ea–0x654ee`. Ordinary ports index the model map at `0x6550a–0x65518`.
Port 5 requires a `mediaFrontend` field and sends the video element a fixed
numeric `port` of 4 alongside that string (`0x65ad6–0x65ae6`,
`0x65c24–0x65c8e`). Thus the missing saved model table does not prevent
resolving this branch. In the saved `video-hdmi` plugin (SHA-256 prefix
`f6b8e5c055b4`), `setHwPort` stores the integer at `0x38126–0x38132`.
The driver receives that index plus one, giving driver input 5
(`0x4070a–0x40738`). The video sink reports the upstream `elementPortHw`
index as `sourcePort` (`video-sink`, `0x9cba–0x9cc6`, `0x9b50–0x9b76`).
The 4 in this branch is a hardware index; physical HDMI 4 has its own
logical port and uses the ordinary model map.

The saved kernel converts driver input 5 to zero-based index 4 and checks
it against the configured input count before activation (kernel image file
offsets `0xb316c4–0xb316f4`). The out-of-range branch can also return
success. A successful switch reply alone would leave signal and wiring
unverified.

**Purpose and limit.** The reviewed Starfish player builds this connector
on a platform-specific `o208k` branch with a separate flag
(`libplayerAPIs.so.1`, `0x3a692–0x3a69a`, `0x3a9aa–0x3a9cc`). It
supplies a playback content type as `mediaFrontend` at `0x3a7bc–0x3a7c4`;
examples include `movie_8k` and `dtv_8k`. The video plugin publishes the
nonempty string as `contentType` at `0x3a1c2–0x3a1e6`, `0x3985a`. This
supports a media-playback purpose for the branch. Its activation on this TV,
the signal physically feeding index 4, and any independent `SUB0` routing
remain **unknown**.

### Other setup paths

| Path reviewed | Result on C1 03.53.45 |
|---|---|
| Direct UTP, browser and alternate frontend | The saved HDMI open and switch paths carry no secondary sink into connector creation. |
| Legacy renderer and AV proxy wrapper | Setup and render-ready are separate, but the reviewed caller neither binds physical HDMI 2 nor applies the stored secondary role to the connector before ready. |
| Native input connector | The fixed port-5 media-frontend branch uses hardware index 4. The HDMI 1 and 2 captures reported indices 3 and 2. No initial secondary sink is supplied. |
| SMP/NDL | Early sink selection is evidenced for media playback. The reviewed HDMI resource reports no caller-selected binding to port 2. |

The connector can request `SUB_SCALER` when the secondary type is applied
early enough. The saved C1 callers provide no verified way for the app to
force that ordering on its own HDMI 2 connector. A later `SUB0` descriptor
shows the later route. The first scaler request remains **unknown**.
[Remaining options](c1-hdmi-evidence-ledger.md#remaining-options)

## Glasshouse preview source and owner observation

The pinned Glasshouse code plays one HDMI feed using a video source with
`service/webos-external` and `ext://hdmi:<port>`. **Reported on G3 / webOS
9.2.2**, the project also tested that source from a web app, saw HDMI 4 follow
the video rectangle on `MAIN`, and received `playing` on HDMI 2 with a black
picture while that source was asleep. The C1 owner observed one moving HDMI 4
preview with sound in Glasshouse Home. The installed Glasshouse revision was
unrecorded. Our verified HDMI 4 trial used direct UTP.
[Pinned call site](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L2352-L2379) · [G3 web app measurements](https://rorygallagher2024.github.io/glasshouse/development/TV-RESEARCH/#an-input-or-channel-playing-in-a-web-page-g3-webos-922) · [C1 owner observation](../device-tests/archive/c1-first-picture-campaign-2026-11-15.md#glasshouse-hdmi-preview--owner-observation)

**Verified on C1 03.53.45.** Our standalone web app played moving HDMI 4 with
sound in one window. The saved C1 launch path supplies no initial secondary
sink. Independently live HDMI 1 + HDMI 2 through this path remains **unknown**.
[Browser picture result](../device-tests/c1-journal.md#browser-hdmi-4--moving-picture-and-sound)

## Can JavaScript select the HDMI sink?

**Verified in saved C1 03.53.45 code.** The browser reads `mediaOption` from a
source MIME parameter. Its physical HDMI player logs that payload and builds
the UTP open request separately from the input type, app ID and compositor-issued
window ID. `play()` sends the logical pipeline ID and physical port to the selector.
The HDMI path does not forward `mediaOption` to the selector. The C1 regular
media client reads `option.avSink.videoSink`, and the WebRTC decoder writes
`sub_video`. Those code paths handle decoded video. Their sink values do not
reach this HDMI connector. [LG `mediaOption` interface](https://webostv.developer.lge.com/develop/guides/mediaoption-parameter)

Trace anchors in the saved `libcbe.so` with SHA-256 starting `2eb542f9011c` are
`0x3b3e00c` for MIME parsing, `0x328d97a` and `0x328d9d6–0x328da94` for HDMI
payload and request construction, `0x32965dc–0x3296684` for the native window
callback and `0x3649ce0–0x3649d18` for the WebRTC secondary value.

## Can the compositor or Multi View assign SUB0 before playback?

**HDMI 1 window creation on the C1 browser.** In the same saved `libcbe.so`,
the custom player initializes its window parameters at `0x3296c44–0x3296c54`.
The external-input branch constructs the HDMI pipeline at `0x32970f0`. The
player then gets the first parameter byte from that pipeline's virtual slot
`+0x44` and stores it at player offset `+0x188` (`0x329703c–0x3297046`).
The HDMI slot at ELF virtual address `0x5361d00` resolves to a function
that always returns 1 (`0x3287de0–0x3287dec`). In
`EnsureVideoWindowCreated`, the player passes this parameter block to the
window creation callback at `0x32963b2–0x32963c2`. The reviewed branch
gives HDMI 1 and HDMI 4 the same value regardless of port or element order.
The meaning of that byte and the compositor's eventual scaler grant remain
unknown. Together with the HDMI open and switch traces above, this leaves
no verified JavaScript control for assigning HDMI 1 to `SUB0` before playback.
This was an offline firmware check. [Owner-observed pair result](../device-tests/c1-journal.md#browser-hdmi-pair--40-second-retry)

**Verified in the C1 compositor code.** The foreign-window handler can set
layer order, direct scaling mode and mute. Its general property forwarding
passes a name and value with an existing media context. Attaching the media
layer also takes a context supplied by the caller. The reviewed window-property
path provides no early `SUB0` assignment for a fresh HDMI connector. Exact
anchors in `libWebOSCoreCompositor.so.0.0.1` (SHA-256 starts `32ccefca06c8`)
are `0x67630` for the property handler, `0x67788–0x677b0` for the forwarding
gate, `0x67806–0x6782a` for the context passed to the communicator, and
`0x67412–0x67446` for attachment. [C1 collection](../device-tests/c1-journal.md#c1-compositor-and-multi-view-controller--read-only-lookup)

**The G4 controller registration is absent at its checked C1 path.** LG's
generation table excludes stock Multi View for 2021 webOS 6 TVs. The saved G4
controller shows a conditional secondary route on that model. A different C1
controller or per-app route remains **unknown**. [LG model table](https://www.lg.com/it/supporto/supporto-prodotto/risoluzione-anomalie/help-library/cs-CT20154005-20152532939115/) · [G4 comparison](prior-art.md#retail-g4-comparison)

Each web element passes the decimal port in its `ext://hdmi:<port>` URL to
`switchExternalInput`. In the 0.1.2 default-routing trial, HDMI 4 stopped
while HDMI 1 played and resumed when HDMI 1 closed. The two web elements
did not produce concurrent pictures. Secondary assignment before the second
connector's first scaler request remains **unknown**.
[Device result](../device-tests/c1-journal.md#browser-hdmi-pair--40-second-retry)

## HDMI 4 with a built-in tuner feed

**Candidate.** The saved Glasshouse source plays a single tuner preview
using a broadcast preview media type and a `tv://` channel source. The
maintainer reports that this preview worked on a G3. The saved C1 browser
engine contains the broadcast preview media type and `tv://` strings.
Those observations give us a known caller and a starting point for tracing
the C1 implementation offline.
[Glasshouse call site](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L2299-L2379) · [C1 browser capture](../device-tests/c1-journal.md#c1-browser-engine--read-only-capture)

**Unknown on C1.** The missing chain is preview creation under the app's own
identity, binding an independent tuner session to the secondary window while
HDMI 4 stays live, and closing only that tuner session. The code for a lone
preview gives no evidence of a secondary assignment or of coexistence with
an owned HDMI session. If the tuner route resumes, those three steps can be traced through the saved C1 browser and broadcast evidence.
