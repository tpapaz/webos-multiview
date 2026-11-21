# C1 Phase 2 device plan

[Current status](../../STATUS.md) · [Trial receipts](c1-journal.md) · [Route history](../research/c1-hdmi-evidence-ledger.md#research-history)

## HDMI 1 and a live TV channel

**Current task — offline feasibility.** Use laptop HDMI 1 as the known moving primary picture and one already-tuned, receivable antenna or cable channel as the proposed secondary picture. An internet channel uses a different playback path. [Tuner preview evidence](../research/c1-hdmi-interface-map.md#built-in-tuner-preview)

- **Before a TV run**, trace the C1 browser preview open, window assignment and close. Require an app-owned tuner session that can target the secondary surface and release only its own session. A MIME string, two HTML rectangles or a successful play callback alone leaves this unresolved.
- **If those checks pass**, prepare one separately scoped trial with two nonoverlapping windows. First confirm HDMI 1 motion, then observe the channel and laptop advancing together. Close only the tuner preview and confirm HDMI 1 keeps moving. Exit and confirm normal viewing, sound and remote operation.
- **Stop** if the preview replaces HDMI 1, either picture freezes, the channel changes unexpectedly or teardown is ambiguous. If ownership or placement cannot be established offline, park this combination and use the [clip workaround](#workarounds-if-native-ownership-ends-here).

## HDMI 4 and HDMI 1

**Pass condition.** The owner sees different content advancing on both inputs during the same interval. Closing HDMI 4 leaves the laptop on HDMI 1 advancing. After exit the owner confirms normal viewing, sound and remote control.

### Completed attempts

- **Default browser pair, closed.** The first attempt produced no visible first picture. The second missed the HDMI 1 start deadline. The third reached both inputs with HDMI 4 still attached. Its picture stopped when HDMI 1 played and resumed when HDMI 1 closed. Changing the timeout, CSS or button sequence leaves the routing unchanged. [Pair trials](c1-journal.md#browser-hdmi-pair--40-second-retry)
- **Ordinary HDMI 1 ownership, closed.** In independent browser and remote-selected runs, the same child that requested the main scaler received a rejected owner reply (63 → 67 and 111 → 114 respectively). The ordinary open clears a supplied parent ID. A repeat of either open has no new ownership mechanism. [Browser trace](../research/c1-hdmi-interface-map.md#where-does-the-hdmi-video-connector-get-its-owner) · [Stock trace](c1-journal.md#hdmi-1-selected-with-the-lg-remote)
- **Receiver monitoring, closed for this decision.** The reconnect reply contained no receiver entry. The later bounded window retained no reportable completion. Even an indexed grant alone would not give the app control of the video child. [Receipts](c1-journal.md#stock-hdmi-1-receiver-grant-window) · [Decoder and completed procedure](../research/c1-receiver-decoder.md)
- **Other selectors, parked.** The stock Starfish caller selects fixed port 5. The reviewed window and pin handlers supply no ownership attachment. Output capture samples the selected picture. HDMI 2 has its own parked design. Reopen any of these only with evidence of a different physical-input or ownership mechanism. [Caller findings](../research/c1-hdmi-interface-map.md#what-does-the-native-callers-fixed-port-5-select) · [Capture review](../research/prior-art.md) · [HDMI 2 design](archive/c1-dual-hdmi-design.md)

### One remaining native candidate

1. **Parent lifetime prepared and tested offline. Device adapter unresolved.** The [native probe core](../../native/phase2-media-registration/ownership.cpp) holds its Starfish player through playback, stop, close and local teardown. The host fixture supplies the fresh, rejected and uncertain open outcomes. For the C1 the adapter still needs an evidenced app-owned physical port-1 open and a way to distinguish fresh creation from boot-session reuse before touching the logical session. The open reply's ID alone cannot establish this. The applicable frontend and effective port-1 sound path are unresolved. The ARM artifact is a linked core without a launch entry point. Keep the trial parked until the device adapter can meet this contract. [Build and test record](../build.md#hdmi-1-ownership-probe-core) · [Physical branch](../research/c1-hdmi-interface-map.md#can-the-playback-frontend-route-physical-hdmi-1-and-preserve-the-owner)
2. **Test ownership once if preparation succeeds.** This would be a separately scoped single-input trial. Pass only with a moving laptop picture and one ordered receipt joining the app's fresh parent registration, backend open, port-1 selection, video child's registration and accepted owner reply for that child. Close the owned session while the parent is alive, then release the parent and confirm restoration. A denial, missing join, failed picture or inconclusive cleanup ends this version of the experiment. A repeat needs a named change that addresses the recorded failure.
3. **Test the move before starting HDMI 4.** Only after ownership passes and an app-permitted selector uniquely targets that video path, observe the same HDMI 1 context move from MAIN to SUB0, MAIN clear and the laptop resume motion. A setter acknowledgment alone is insufficient. If the move fails, stop there. [Move and observation contract](../research/c1-hdmi-interface-map.md#move-hdmi-1-to-sub0-before-opening-hdmi-4)
4. **Test overlap once after the move passes.** Start HDMI 4 on MAIN, verify the pass condition above, close each owned session and record restoration. A freeze or handoff closes this configuration. Record which gate failed in the journal before considering a different mechanism.

### Workarounds if native ownership ends here

- **Controlled alternative if the tuner route stalls.** The [freshness review](../research/c1-hdmi-interface-map.md#does-the-port-1-open-reply-establish-a-fresh-session) leaves the native probe parked. Prepare the HDMI 4 + silent clip test offline. Inject stalls in clip startup, feed and unload and verify that HDMI can still submit stop and close within its existing deadlines. A stalled clip leaves its cleanup uncertain. If that check passes and worker teardown is bounded, the first C1 mixed-source trial should show both pictures advancing, then HDMI 4 continuing with sound after clip close. [Timing and cleanup constraints](../research/c1-smp-ndl-resource-path.md#isolating-clip-playback-from-hdmi-cleanup)
- **Use the laptop as the second feed.** Keep the physical HDMI 4 picture and send an owner-selected laptop window over the LAN. A silent local clip on the secondary surface is the smaller coexistence test before adding network transport. HDMI plus that clip, and HDMI plus a laptop stream, both remain untested on this C1. [Mixed-source feasibility](../research/c1-smp-ndl-resource-path.md#hdmi-4-with-a-secondary-local-clip)
- **Combine the two cables upstream.** A two-input HDMI multiviewer can compose one output for the C1. The external device controls the layout. This solves the two-picture viewing goal independently of C1 connector ownership. [External multiviewer reference](../research/c1-hdmi-evidence-ledger.md#remaining-options)

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

## Browser HDMI 4 preview

All browser trial scopes are spent. Preview 0.1.0 and pair 0.1.3 were last confirmed closed. The one-shot backup closes were observed during those specific trials. Behavior during a media hang and physical release remain unknown. Any future move or pair trial needs evidence identifying the app-owned connector, an observable move, reviewed cleanup and fresh owner scope. [Pair result](c1-journal.md#browser-hdmi-pair--40-second-retry) · [Last HDMI 1 trace](c1-journal.md#browser-hdmi-1-connector-ownership)

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
