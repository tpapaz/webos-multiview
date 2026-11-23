# C1 Phase 2 device plan

[Current status](../../STATUS.md) · [Trial receipts](c1-journal.md) · [Route history](../research/c1-hdmi-evidence-ledger.md#research-history)

All pair trials use a single foreground MultiView app with a separate pane for
each source. Success requires independently advancing pictures in those panes
during the same interval and continued playback in the remaining pane when
one source closes.

The [C1 readiness table](../../STATUS.md#c1-trial-readiness) lists the
evidence needed to reopen each parked trial.

## Two built-in TV channels

**Parked on C1.** The offline allocator rejected a second ordinary DVB
watch at tuner allocation. The dual-stream purpose and legacy PiP caller
did not attach a second DVB service. Reopen with evidence of an app-owned
watch session that shares the tuner and acquires a distinct demux, decoder
and secondary output. Use two distinct free-to-air services from the same
multiplex. Verify both panes advance, closing the second leaves the first
live, and normal viewing returns after exit.
Correlate tuning status with each owned `broadcastId` and confirm a separate
decoder grant for each full backend pipeline ID. The global current-video
status covers the active broadcast.
[DVB attachment checks](../research/c1-hdmi-interface-map.md#dvb-attachment-candidates)

## HDMI 4 and a live TV channel

**Default browser trial complete.** HDMI 4 moved first, the live channel
replaced it, and HDMI 4 resumed when the tuner closed. The scheduled app
close and normal viewing were confirmed. **Active trials are paused.** Reopen
when a route under the app's own identity can acquire the secondary scaler
for either source. A move after startup would need to show the same owned
session advancing on `SUB0` and release of `MAIN_SCALER` before the second
source opens. The read-only snapshot showed the stock tuner on `MAIN` and
`SUB0` idle. The examined tuner and HDMI selectors have no group coverage
for the probes. [Playback result](c1-journal.md#hdmi-4-and-live-tuner-playback) · [Tuner evidence](../research/c1-hdmi-interface-map.md#tuner-secondary-allocation) · [HDMI 4 evidence](../research/c1-hdmi-interface-map.md#hdmi-4-secondary-allocation)

The eventual trial would pair the PS5 through the physical HDMI 4 jack with an
already-tuned antenna or cable channel from the C1's built-in tuner. Pass when
both pictures advance together and HDMI 4 keeps moving
after the tuner closes. Stop if the preview replaces HDMI 4, either picture
freezes, the channel changes unexpectedly or teardown is ambiguous.

## HDMI 4 and a silent local clip

**Deferred fallback.** The installed 0.1.13 probe passed idle setup and
cleanup. Its playback preflight found zero coverage for the four HDMI methods
and submitted zero launches. [Playback preflight](c1-journal.md#hdmi-4-and-silent-clip-playback-preflight) · [Probe and worker design](../research/c1-smp-ndl-resource-path.md#isolating-clip-playback-from-hdmi-cleanup)

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

All completed browser trial scopes are spent. Preview 0.1.0 and the browser
pair trials closed, including the 0.1.5 tuner trial. Behavior during a media
hang and physical release remain unknown. A new pair trial needs an evidenced
change to placement, reviewed cleanup and fresh owner scope.
[HDMI pair result](c1-journal.md#browser-hdmi-pair--40-second-retry) · [Tuner result](c1-journal.md#hdmi-4-and-live-tuner-playback)

## Active experiments and restoration

### Restoration and stop rules

Acquisition, app install/launch, permission/policy changes, service restarts and
power actions are outside passive permission. Any future active proposal must
retain the [0.1.12 contract](../../native/phase2-hdmi-candidate-0.1.12/README.md):
both strict three-second guards, issue+17-second progression, one-second focus,
32-event bound, native22-second immediate-exit alarm,100 ms dispatch and witness-arm sub-bounds,
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
