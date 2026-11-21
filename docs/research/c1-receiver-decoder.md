# C1 HDMI receiver decoder and completed monitor procedure

[Current HDMI pair plan](../device-tests/current-plan.md) · [Observed receiver results](../device-tests/c1-journal.md#stock-hdmi-1-receiver-grant-window)

## HDMI pair handoff

Use saved records first. The [pair trial](../device-tests/c1-journal.md#browser-hdmi-pair--40-second-retry) recorded page playback and unload events. The later single-input monitor selected media registration and acquisition plus video output registration and connection (`c1-stock-hdmi1-monitor-20261121-001/monitor.cjs:27–38`). It omitted release and disconnect. Those captures cover different sessions and cannot identify when HDMI 4 lost the picture at the service level.

The [pre-reconnect retry](../device-tests/c1-journal.md#hdmi-1-reconnect-under-observation) matched the HDMI 1 backend to a successful TVRM reply with no type-19 receiver entry. In the earlier [stock HDMI 1 trace](../device-tests/c1-journal.md#hdmi-1-selected-with-the-lg-remote), the media server sent a separate `acquireComplete` at event 80. Its recorder kept the resource names and omitted the grant state and index.

### Stock HDMI 1 filter replay

Run `node --test tests/host/hdmi-receiver-decoder.test.cjs` to replay synthetic envelopes through the stock [AWK filter](../../scripts/stock-hdmi1-monitor.awk) and the decoder’s `--stock-hdmi1` stdin mode. The test uses Git for Windows’ AWK on Windows and `awk` on PATH elsewhere. It covers the HDMI switch, registration and reply, acquisition, server callback, acquisition reply, client duplicate and switch reply in the saved order.

The mode reads one filter invocation’s newline-terminated output, from `FOCUSED_STREAM_READY` through `FOCUSED_STREAM_END`. The limits are 3 MiB for the filtered stream, 32 KiB per envelope and 4,096 envelope lines. A cap marker, broken framing, malformed envelope or exceeded bound invalidates the whole replay. Output identifies the connection by its registration reply line and the grant by its callback line, counting filtered envelopes from 1. The filter supplies no slot evidence.

### Bounded stock HDMI 1 monitor

**Completed once on the C1.** The [receipt](../device-tests/c1-journal.md#stock-hdmi-1-receiver-grant-window) recorded no reportable receiver completion. The following is the as-used procedure for that window. The command uses the existing pinned local profile alias in PowerShell.

~~~powershell
node scripts/monitor-stock-hdmi1.cjs --capture-stock-hdmi1 --device $deviceAlias
~~~

Start before the normal input selection. `MONITOR_READY` means the filter observed matching bus traffic. The owner handles normal viewing with the remote. The monitor only listens. It makes one connection, runs the existing 46-second filtered listen and has a 54-second total deadline. Ctrl+C cancels. Filtered envelopes stay in memory under the replay bounds above.

The producer reports the exit code of `timeout -t 46 ls-monitor` and samples `/proc/uptime` around that command. The saved direct C1 listener returned code 0 (`c1-hdmi2-luna-monitor-20261118-001/monitor-result.json`, `terminalCode`). Require code 0 across the full window, an independent clean AWK channel exit, both output streams ended, and SSH closure after the host requests disconnect. An early upstream exit can still produce a valid AWK end marker. Any failed integrity or closure check stops without publishing a result.

On completion, the new private `build/phase-2/c1-stock-hdmi1-grant-<timestamp>/inventory.json` contains the redacted decoder report and the verified exit/closure fields. A complete, ready window with no server callback records `unknown / no_media_completion`; a failed or unindexed callback leaves the receiver index unknown. An indexed grant carries `port: null`. Record the owner’s viewing observation separately. [Monitor](../../scripts/monitor-stock-hdmi1.cjs) · [Offline acceptance](../../tests/host/stock-hdmi1-monitor.test.cjs)

### Offline acceptance criteria

The [host tests](../../tests/host/hdmi-receiver-decoder.test.cjs) exercise these cases with synthetic data derived from the [C1 completion and slot findings](c1-hdmi-interface-map.md#where-does-the-separate-receiver-get-its-index). The saved HDMI 1 summaries are incomplete controls from separate sessions.

| Evidence in one run | Expected finding |
|---|---|
| Media-server-originated completion for the registered connection, `state: true`, one unambiguous `VHDMIRX` entry with an explicit nonnegative integer `index` | Report the indexed grant for that connection. The client-originated completion for the same request adds no second grant. |
| The same grant, plus an accepted physical port switch, a diagnostic matching its full backend pipeline ID to an enabled slot, and a diagnostic matching that slot to the connection within one continuous lifetime | Attribute the receiver index to that HDMI jack. |
| A valid indexed grant with a missing diagnostic, truncated ID, slot reuse, handle copy or move, ambiguous ordering, or a gap between observations | Retain the connection-level grant. Keep the physical jack unknown. |
| Failed completion, quantity-only grant, missing index, or a saved summary with only resource names | Keep the receiver index unknown. A successful TVRM reply without type 19 still describes only that reply. |

Preserve redaction and the existing TVRM decoder results. Receiver release time needs a separate release observation. This offline task requires no TV connection or cable change.

### Offline receiver decoder

Set `$capturePath` to one private JSONL capture and run the decoder from the repository root in PowerShell. Invoke it separately for each capture. Endpoint names, tokens and redacted aliases can recur in a different session.

~~~powershell
Get-Content -Raw -LiteralPath $capturePath | node scripts/hdmi-receiver-decoder.cjs
~~~

**Input.** Supply records in observed order, up to 4 MiB and 4,096 lines. For Luna exchanges, retain the `ls-monitor` envelopes with both unique endpoints, service names, tokens, full payloads, TX/RX direction, returns and bus errors. An optional `elapsedMs` is a nonnegative monotonic integer. The TVRM path reads the HDMI backend switch, open and close and TVRM request and release for HDMI 1 and 4. The media path reads `com.webos.media` registration, unregistration, acquire and tryAcquire calls and the server's outgoing `acquireComplete` call. A registration return supplies `connectionId` and can omit `returnValue`. The callback must go from that server endpoint to the registering client and carry the returned ID.

**Optional slot evidence.** The following JSONL records are the decoder's normalized offline input. Set the first record to `{"type":"tvrmSlotCoverage","continuous":true}` only when the source establishes ordered coverage of slot identities, lifecycle changes, handle transfers and relevant Luna calls in the same run. Preserve an interruption or uncertain ordering as a gap. Two isolated diagnostics, or a merge based only on similar timestamps, leave coverage unknown. Omit the header in that case.

| Record with `type: "tvrmSlot"` | Fields from the observation |
|---|---|
| `kind: "pipeline"` | `slot` (0–7), boolean `enabled`, and for an enabled slot, its complete `pipelineId` and `fullId: true`. |
| `kind: "connection"` | `slot`, its current handle's complete `connectionId` and `fullId: true`. |
| `kind: "reuse"` | The affected `slot`. |
| `kind: "copy"` or `"move"` | Both `fromSlot` and `toSlot`. |
| `kind: "gap"` | Loss of continuity. An incomplete or unrecognized slot record also breaks coverage. |

**Media output.** `media_receiver_assigned` reports the explicit nonnegative integer `receiverIndex`, the callback's `callLine` and the matched `registrationReplyLine`. A connection-only grant has `port: null`. A jack match adds the physical `port` (1–4), `switchCallLine`, `slotPipelineLine` and `slotConnectionLine`. Both diagnostics must follow the switch call and precede the completion, and the connection diagnostic must follow registration. The successful switch reply may arrive after the grant. Reuse, contention over the same identity, or loss of coverage leaves the grant at connection level. A failed or unindexed completion has no `receiverIndex`. A client-originated callback adds no event.

**TVRM output.** `receiver_assigned` gives the HDMI jack and the allocator's type-19 receiver index. `release_acknowledged` gives the call and reply lines, and elapsed times if supplied. When an immediately preceding, nonoverlapping allocation matches the session, caller, input and purpose, `priorAllocationReplyLine` points back to it. `no_receiver_in_reply` describes that one successful allocation list. A missing release leaves release timing unknown.

**Exit status.** Exit 0 means the reported target exchanges were decoded. This includes a verified connection grant with an unknown jack. Exit 1 accompanies partial or unknown results. Hardware release, continued possession and simultaneous pictures each need separate evidence.
