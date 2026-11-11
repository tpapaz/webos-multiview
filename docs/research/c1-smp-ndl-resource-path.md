# C1 SMP / NDL Load takeover review

Date: 2026-11-11. Device: rooted LG OLED C1, firmware 03.53.45,
webOS SDK 6.5.3. This review uses the owner-operated Phase 1 runs,
read-only SSH copies of firmware libraries/configuration, ARM disassembly,
and attributed upstream source. No new IPK or active playback run was made.

Review plan: trace NDL Load into SMP, inspect firmware resource acquisition
and presentation choices, compare with the stage traces, then choose a
bounded experiment with a discriminating result before changing playback.

## What the evidence establishes

**Verified/device:** two-SMP hardware, SMP software-request B, and mixed
SMP/NDL runs all first show sustained A callback/PTS starvation at B Load.
In the mixed run, A holds at 6.866 s before B feeding starts. Init and the
explicit foreground stage leave A progressing. SetArea occurs after the
stall. Releasing B restores A callbacks. The owner saw A, black, B, A and
never two visible clocks together. See [device record](../device-tests/lg-c1-phase-1.md)
and `build/reports/c1-phase1-mixed-0.1.0.json`, ELF
`a719fd64e879ef093bcde95b4e1639badbb2a83936287ff24e367b8aeb432a32`.

**Verified/static firmware:** NDL is a wrapper around the same Starfish
engine, with extra video-output/lifecycle setup inside Load. It is not
independent ingress into another decoder stack. Addresses below are ELF
virtual instruction addresses (Thumb bit cleared), not string offsets.

| Firmware artifact | SHA-256 | Relevant locations |
|---|---|---|
| `libNDL_directmedia.so.1` | `11344351eb85261685eb60c70df375518d56242946658f9f14975082458564a0` | C1 Init forwarding at `0x12b0` (prior ABI review) |
| `libNDL_directmedia_impl.so.1` | `a8977319badb37cb2aa5d2d39f4c0d753e4fa6423046d6e61a8d024a7c25fe75` | `DMPlayer::Load` at `0x1298c`; calls Starfish constructor `0x129f2`, `DVPlayer::Open` `0x12a90`, internal `SetAppState` `0x12b0e`, Load-parameter builder `0x12c18`, and Starfish Load `0x12fb4` |
| `libplayerAPIs.so.1` | `0b0f665415e61e24d2a9ace42c25b04c5386fe8756b5cdd9c72380fb1bb24e77` | Resource acquisition calls at `0x7762e` and `0x784b0`; policy handler entry `0x757f4`; policy callback registration at `0x371b0` / context form `0x371b8` |

The NDL import is the three-argument Starfish Load overload; the project's
SMP adapter uses the context-callback overload. Both resolve into
`libplayerAPIs.so.1`. A different callback ABI does not establish another
engine. NDL `DVPlayer::Open` calls `SetVisible` at `0xdb26`; an internal
SetAppState happens during Load even though the earlier explicit foreground
call returned -1. Therefore the staged Load interval bundles multiple native
operations. It cannot identify a single internal cause by timing alone.

NDL `createLoadParameter` begins at `0x1154c`. H.264 capability lookup at
`0x1191e` fills stack slots 72/76/80. At `0x11ef2` and `0x11f14`, positive
input dimensions are used as `adaptiveStreaming.maxWidth/maxHeight`;
only nonpositive dimensions branch to capability-derived values (`0x126a8`,
`0x126c6`). Our supplied 640/360 are positive. `maxFrameRate` uses the
capability-derived slot at `0x11f36`, unlike the SMP adapter's explicit 30.
The captured codec configuration lists H.264 4096x2304/60, but the runtime
helper's exact return and resulting reservation were not captured.
Resolution inflation is ruled out for this input; frame-rate reservation
remains a secondary candidate, not a demonstrated cause.

## Resource ownership versus window placement

The firmware `/etc/umediaserver/umediaserver_resource_config.txt` has SHA-256
`50609323ba9e200de509c793f0e4aee420a935ab94b757877423b7db62e46ea8`.
It declares VDEC quantity 4 (lines 50–52), VTG quantity 1 (272–274),
MAIN_SCALER quantity 1 (278–280), and OVERLAY_VIDEO quantity 1 (302–304).
These are configuration declarations, not tested decoder or HDMI counts.
The example-style configuration can be augmented by platform logic.

Lines 340–358 map media to Starfish, priority 4, and a warm process pool
of one. **Do not interpret `pool_size = 1` as a one-player maximum**:
the comment describes a pool of precreated processes. Lines 488–514 give
foreground/subtype policy levels. An exported window or destination rectangle
does not select a unique decoder, scaler, or resource-manager entitlement.

Starfish acquisition functions build resource lists and call
`ResourceManagerClient::acquire`; the misc-resource calculator dispatch is
indirect at `0x78308`. The complete sink-to-resource mapping was not recovered.
The firmware exposes sink-type parsing and app-type conversion
(`convertAppTypeToVideoSinkType` at `0x39dec`), but the actual sink/resource
assigned to either session was not observed. Neither a guessed numeric sink
value nor a configuration quantity is enough to select a safe working second
plane. Read-only retrieval of the calculator library did not succeed in this
session; no conclusion is drawn about its absence on the TV.

**Candidate explanation:** B Load reserves/reassigns a scarce media or video
presentation resource, leaving A without render progress until B releases it.
The unchanged A player and later PTS jump fit temporary starvation or
presentation disconnection. They do not establish that A's decoder stopped
or that it was destroyed. A display route switch could also suppress
frame-ready callbacks; these callbacks are not an independent decode counter.

[Upstream AcquireQueue.cpp, commit af89f8ac3355027a90d7b299a78fb6fab9b6ffca,
lines 99–133 and 154–171](https://github.com/webosose/umediaserver/blob/af89f8ac3355027a90d7b299a78fb6fab9b6ffca/src/resource_manager/AcquireQueue.cpp#L99-L171)
provides a candidate mechanism: a shortage can trigger policy action against
another holder, then acquisition retries after release. It is historical OSE
source, not proof of the C1 service implementation or of a policy event in
our runs. The pinned URL was not retrievable by the web reader; master was
read and the GitHub commit API confirmed that exact SHA. The
[pinned NDL sample, lines 30–45](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/media/ndl/directmedia/directmedia_v2.c#L30-L45)
also describes its Starfish event lineage. No upstream code was copied.

## Recommended next experiment

First capture the resource decision for an unchanged staged Load, rather
than try another backend or change sink/decoder options simultaneously.

1. Prepare bounded, redacted collection of resource acquisition/release and
   display connection messages available at current logging levels. Limit it
   to our app/session during the native stage timestamps. Keep only resource
   enum names, quantities, action codes and A/B labels. Drop connection IDs,
   app/window tokens, network/serial identifiers and arbitrary vendor strings.
   Do not change logging configuration, restart services, or issue privileged
   media-control Luna calls. No new IPK is needed for this passive observer;
   a replay requires the owner to reopen the installed mixed app.
2. Replay A baseline, B Init/foreground/Load, hold without feeding, release B,
   and A recovery. The Load-only interval separates resource/output setup
   from compressed-video consumption. Use the existing bounded controller
   pattern and verify the installed ELF before any signals.
3. If existing logs do not expose the decision, the next **local** IPK should
   be a diagnostic two-SMP build with A/B policy callbacks, numeric lifecycle
   events, Feed acceptance/backpressure, callback/PTS samples and exact
   generated Load parameters. Validate the C1 policy-callback ABI before
   using it. The callback observes and returns normally; it must not deny,
   delay or override resource reclamation. Raw strings remain unexported.

Required outcome is a resource name or display-disconnect reason correlated
with A's stall, not merely another reproduction of the stall.

| Observation | Follow-up experiment justified by it |
|---|---|
| A releases VDEC or codec/bandwidth tokens | Compare explicit small 640x360/30 reservations; then revisit software decoding only after a solo run actually renders with that request. |
| A releases MAIN_SCALER/OVERLAY_VIDEO or loses its display route while retaining decode resources | Trace and validate an alternate sink/sub-scaler path; first solo, then A plus B. Software decode alone would not remove a shared presentation requirement. |
| No policy event; a display disconnect occurs | Investigate display routing, same-app ownership and internal NDL visibility setup. A separate process test is justified only after an ownership collision is evidenced. |
| Neither policy nor display reason is observable | Report the instrumentation gap and inspect calculator/AV-proxy implementations before another playback variant. |

Avoid opaque resource-policy options, forced acquisition, config edits,
`acquireSubScalerResource` calls without a matched ownership/release design,
and treating the failed software-request run as a software decoder control.
These tests remain Phase 1 local-clip research. Simultaneous HDMI, audio
focus and any generally unsupported combination remain unknown.

## Reproduction and limits of this review

Local evidence is under ignored `build/phase-1/firmware-inspection/`:
firmware copies, configuration, `.symbols`, `.strings` and `.asm` indexes.
Disassembly was generated with the existing 2026.08 SDK's
`arm-webos-linux-gnueabi-objdump -dC`, symbols with `-TC`, strings with
`arm-webos-linux-gnueabi-strings -tx`. SHA-256 values identify exact inputs.
REA identified the ARM ELF/hash but had no configured compatible native
decompiler; the analysis above uses binutils, not REA pseudocode. The REA
session was closed. No firmware binaries or configuration copies are added
to tracked source. Documentation-only changes need no runtime tests;
`git diff --check` is the relevant local validation.

## Load-only follow-up, 2026-11-11

The owner-operated repeat using installed mixed 0.1.0 reproduced A's
Load-stage disappearance with zero B packets and no explicit SetArea.
The owner confirmed A returned with its clock advancing after release.
The bounded syslog collector captured MAIN_SCALER release/acquire categories
near both boundaries, plus policy and disconnect categories. This makes
presentation-resource contention a more specific candidate; per-player
ownership and the actual policy decision remain unknown because those
entries were not app/session attributed. See the
[Load-only device record](../device-tests/lg-c1-phase-1.md#load-only-resource-experiment--c1-run-2026-11-11)
and `build/reports/c1-phase1-mixed-load-only-0.1.0.json` for the trace,
redacted log projections, acceptance checks and owner observation.

## Retained-log attribution — MAIN_SCALER handover verified

A later read-only review of the existing logs on 2026-11-11 resolved the
ownership question without replay or a new IPK. The active log no longer
contained the experiment, but `/var/log/messages.0.gz` did. Its decompressed
content SHA-256 is
`9c4f646dc5384c679a1007a931b97b0034369139a7509a1400cc6f18b924adbb`.
Line references below count decompressed lines from 1. Raw identifiers were
compared in memory and replaced with `A_media`, `A_scaler`, `B_media`, and
`B_scaler`. They were not saved or printed.

Evidence: `build/reports/c1-phase1-load-only-attribution-0.1.0.json`
(schema 1, 33 projected source records), linked to the installed/tested
mixed 0.1.0 ELF and the original Load-only native report.

The two media-to-scaler registration links occur 7.247 s apart, consistent
with the native A run-start to B Load-begin gap of 7.298 s. The small
difference includes startup work before A registers. Both sessions have
this app's exact ID in resource snapshots. The registration records link
each media UID to a distinct scaler registration, so this attribution uses
identifier equality as well as stage order; it is not timing alone.

| UTC time, 2026-11-11 | Source line(s) | Redacted evidence |
|---|---|---|
| 08:00:52.803586 | 2311 | A media UID's `registerPipeline` message links A's scaler registration. |
| 08:00:52.806461 | 2330 | A media holds VDEC index 3 and G1_H264 index 7, quantity 1 each. |
| 08:00:52.842386–.842920 | 2353, 2360 | A scaler holds MAIN_SCALER index 0, with successful resource state. |
| 08:01:00.050629 | 3277 | B media UID's registration message links B's scaler registration. |
| 08:01:00.057396 | 3304 | B media holds SUB_SCALER index 2, VDEC index 2 and G1_H264 index 6. |
| 08:01:00.066189 | 3348 | `policyActionInfoUpdate` names B scaler as acquired and A scaler as released; released resource is MAIN_SCALER quantity 1. |
| 08:01:00.087103–.087398 | 3493, 3495, 3498 | Successful MAIN_SCALER index 0 grant to B; A scaler's resource list becomes empty; B's contains MAIN_SCALER. |
| 08:01:07.176375 | 4063 | At B release, B scaler's resource list becomes empty. |
| 08:01:07.177810–.178357 | 4090, 4096 | A's original scaler registration reacquires MAIN_SCALER index 0, successful state. |
| 08:01:07.192303–.192396 | 4192, 4194 | B media is left with SUB_SCALER, then becomes not alive with an empty list during cleanup. |
| 08:01:10.204527–.225029 | 4938, 5014 | Final A cleanup empties its scaler and media resource lists. |

**Verified/logs:** the handover is A to B at B Load, then back to A when B
is released. This is an observed resource-policy handover, not merely the
previous keyword/category coincidence. The separate AV/scaler registrations
explain why exported-window separation did not avoid contention: both
presentation paths acquired the same MAIN_SCALER index 0.

**Verified allocation, unknown execution:** A and B obtained distinct VDEC
and H.264 token indices. No A decoder-resource release was observed at B
Load; the explicit policy release names MAIN_SCALER. This does not prove A
continued decoding while disconnected, nor prove how many independent live
sources the TV can support. The PTS jump remains a timestamp observation,
not a measurement of frames decoded during the invisible interval.

B's media pipeline already held SUB_SCALER while its separate presentation
registration still acquired MAIN_SCALER. Therefore simply acquiring another
SUB_SCALER token is not an evidenced fix. The next research task is to trace
how AV-proxy/sink selection creates that presentation registration, and
whether a supported alternate sink can retain an independent scaler path.
Validate any selector and ownership/cleanup semantics before a solo test,
then concurrency. Do not alter resource policy or force a grant.

Validation: the attribution script asserted four distinct in-memory
identities, both media-to-scaler links, the explicit A-release/B-acquire
policy record, and A's later successful reacquisition. Projected snapshots
preserve resource names, quantities, indices, source lines and timestamps;
no raw log text or identity mapping is persisted. `git diff --check` passed.
No new device playback, native build, IPK, service change or runtime test
was required for this retrospective analysis.

## Why MAIN_SCALER was selected, and the independent-sink candidate

Review date: 2026-11-11. **Verified/static and retained logs; alternate sink
not TV-tested.** No new IPK or playback run. Plan: follow empty sinkInfo,
Load-option parsing, AV-proxy forwarding, connector resource/output mapping,
and teardown; then specify a bounded acceptance experiment.

The earlier media-pipeline SUB_SCALER allocation does not choose the
presentation connector's sink type. They are separate resource-manager
registrations. In the existing run, both A and B passed empty sinkInfo.
The connector kept its default MainVideo type 2, whose presentation
request is MAIN_SCALER. B therefore displaced A even though B's media
registration already held SUB_SCALER. This is a selection/configuration
problem in the tested path; it is not evidence that the TV has only one
decoder or that independent presentation is impossible.

Retained-log evidence, with identifiers privately matched and discarded:

- Decompressed log hash remains
  `9c4f646dc5384c679a1007a931b97b0034369139a7509a1400cc6f18b924adbb`.
  The same archive has rotated from `messages.0.gz` to `messages.1.gz`;
  content hash and decompressed line numbers identify it across renames.
- Lines 2316–2318: A's empty sinkInfo and empty-configuration warning;
  line 2365: MainVideo enum 2.
- Lines 3286–3288: B's empty sinkInfo and warning;
  lines 3358 and 3499: MainVideo enum 2 during B Load.
- The explicit policy record and grants established in the attribution
  section above identify the associated MAIN_SCALER handover.

Only observations during each setup are used to infer its selection;
later diagnostic UID labels alone are not treated as player identity.
The redacted projections are in
`build/reports/c1-phase1-sink-log-evidence.json`.

### Exact firmware path

All addresses are ARM ELF virtual instruction addresses, Thumb bit cleared.
The existing `libplayerAPIs.so.1` hash is
`0b0f665415e61e24d2a9ace42c25b04c5386fe8756b5cdd9c72380fb1bb24e77`.
Newly read-only copied libraries:

| Library | SHA-256 |
|---|---|
| `libav-proxy.so.1` | `bcbd9740e258131596d3ed3be050cf65018a2aa9e1a1e2d0fe90ee83c62fbdfe` |
| `libav-connector.so.1` | `c7cffeb1437f3b785782467cced052cefa3ed3f9d0a7689bb49db3b494f5aff3` |
| `libmedia-resource-calculator.so.1` | `f7e86c495370e108c2dd9b3a22c1d49cc8ad15e6ee5820ed428af79722fa1e19` |

1. SMP `parseLoadMessage` reads the optional `option.avSink` object at
   `0x4163c` and stores its JSON as sinkInfo (`0x41666–0x41676`). It reads
   `option.avSink.videoSink.type` as a string at `0x416ac–0x416c6`.
   `main_video` sets enum 2 (`0x424aa–0x424c0`); `sub_video` sets enum 4
   (`0x42a46–0x42a5c`).
2. SMP's Load callback creates/initializes AV-proxy and passes the stored
   sinkInfo to `AVProxy::setSink` at `0x4a470`. AV-proxy's forwarding method
   is at `0x5e74` in its own library.
3. AV connector `setSink` checks for an empty string at `0x1d61c` and
   returns after its warning at `0x1d638`. This matches our old empty
   configurations. With a videoSink object, `_setSink` reads its `type`
   at `0x1d14a`, converts it at `0x1d168`, and writes the selected type to
   the video connector at `0x1d17e`. Its converter recognizes the strings
   directly: main_video=2, sub_video=4, graphic=8 (`0x18540–0x1859a`).
4. `VideoConnector::_prepare`, entry `0x12dac`, branches on type 8 for
   graphic/no scaler list, then compares video type to 2 at `0x12df8`.
   Type 2 selects MAIN_SCALER (`0x1300a–0x1300e`); the non-main video
   branch selects SUB_SCALER (`0x12dfe–0x12e00`), quantity 1. Thus this
   changes the presentation resource request, not just window placement.
5. `updateConnectionInformation`, entry `0x13a2c`, resolves an ANY output
   using the selected type (`0x13b2c–0x13b36`). Main maps to MAIN;
   sub type 4 maps to SUB0 (`0x13c0c–0x13c20`). The connector then uses
   its normal video-output connection path, not an app-issued privileged
   Luna call.
6. Teardown stays under the existing ownership machinery. Connector
   `disconnect()` calls resource-client `release` at `0x1c314`;
   AV-proxy's destructor destroys the connector (`0x5cfc`) and then its
   resource-manager client (`0x5d14` diagnostic before client deletion).
   Existing MAIN cleanup was TV-tested; alternate-sink cleanup still
   requires its own device check.

**Conclusion:** there is an evidenced, app-selectable alternate presentation
request in this C1 firmware. It is a reverse-engineered firmware option,
not an LG public API guarantee or a demonstrated concurrent-playback pass.
The machine-readable static review is
`build/reports/c1-phase1-independent-sink-review.json`.

### Selector and next experiment, without building yet

Use SMP's existing Load options; the B fragment is:

```json
"avSink": { "videoSink": { "type": "sub_video" } }
```

Place it inside the existing `args[0].option` object, alongside appId and
windowId. Set A explicitly to `main_video`. Preserve both clips, dimensions,
30 fps bounds, hardware-default decoder request, window geometry and feed
settings. Specify this at Load time, not by first loading a default-main
player and switching afterward. The asynchronous ordering still needs
observation: reject a run with transient MAIN_SCALER reclamation by B.

The inspected NDL v2 data interface, its firmware wrapper exports and its
Load-parameter builder offer no corresponding sink field/entry point.
SetWindowId and SetArea are presentation identity/geometry controls, not
this selector. Therefore the next controlled package should use the
already implemented SMP adapter for **both** A and B, not modify the NDL
implementation or reach into its private Starfish object. The adapter needs
only a validated Load JSON option; no new proprietary ABI import is needed.

Proposed bounded sequence and gates:

1. B alone on sub_video: verify the clock advances and the presentation
   registration receives SUB_SCALER/SubVideo/SUB0, with no MAIN_SCALER
   request. Verify geometry and Unload/process cleanup. A recognizable
   selector that produces black video does not pass this control.
2. A main_video baseline, then staged B sub_video Load-only hold: require
   A callback/PTS progress and its visibly advancing clock throughout.
   Confirm A retains MAIN_SCALER and B's presentation gets a distinct
   SUB_SCALER allocation. Record the media and presentation registrations
   separately; B may hold more than one SUB_SCALER reservation.
3. Only after those gates, feed/play B and require both on-screen clocks
   advancing together; measure callbacks, geometry, B release and A
   continuity. Preserve cancellation, deadlines, identity checks, redacted
   A/B resource attribution and full cleanup verification.

Do not combine this with software decoding, a graphic-buffer compositor,
window-type changes or policy edits. Graphic type 8 is a separate rendering
path with buffer-delivery/composition requirements, not a drop-in substitute
for the exported-video-window experiment. Success of main/sub local clips
would still not establish concurrent physical HDMI.

Validation: fixed-path read-only firmware copies, hashes and existing SDK
`objdump -TC/-dC` and `strings -tx`; assertions require empty sinkInfo for
both setup labels and MainVideo enum 2 in B's setup projection. No decompiler
result is claimed (the previously reported REA provider limitation remains).
No upstream code was copied. Runtime tests/builds were not run because this
change records research only; `git diff --check` passed.

## Device outcome of explicit main/sub selection, 2026-11-11

The candidate selection passed the sequential device gates: B alone was
visibly live on SubVideo/SUB0; loading B preserved A; the subsequent full
Feed/Play run showed both visible clocks advancing together, B geometry
changing and A continuing after B release. A retained MAIN_SCALER and B's
presentation registration obtained SUB_SCALER without an observed main
handover. Both players had separate decoder allocations and clean teardown.

This verifies the short local-video main/sub combination on the specified
C1/firmware. It does not establish long-run stability, audio ownership or
physical HDMI concurrency. Detailed measurements and owner observation:
[full staged device result](../device-tests/lg-c1-phase-1.md#main-sub-010-full-staged-feedplay--visible-overlap-verified),
`build/reports/c1-phase1-sinks-stages-0.1.0.json` and its redacted resource
attribution companion. No new IPK was needed after the 0.1.0 build.
