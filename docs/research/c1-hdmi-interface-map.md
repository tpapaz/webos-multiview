# C1 HDMI evidence map

LG OLED C1, firmware 03.53.45. [Current status](../../STATUS.md) · [Device journal](../device-tests/c1-journal.md)

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
[Dual-input design under review](../device-tests/current-plan.md#review-only-dual-source-experiment)

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

**Verified for the observed HDMI 1 startup on C1 03.53.45.** The backend
returned its pipeline ID at event 9. Port selection began at event 15. The
receiver registered at events 17–19 and requested `HDMI_INPUT` and `VHDMIRX`
at event 21. The video connector registered at events 59–61 and proposed the
backend ID as its owner at event 63. The service rejected it at event 67.
The receiver's registration ID therefore did not exist when this backend
open completed. Event numbers refer to the saved 0.1.3 bus capture.
[Device trace](../device-tests/c1-journal.md#browser-hdmi-1-connector-ownership)

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
`0x160bc–0x160dc`. This identifies a producer of the optional field.
The port trace below resolves how that value is routed. Prior resource
registration of the supplied string remains **unknown**.

**Stock ownership remains unknown at runtime.** The saved HDMI 2 monitor
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
an owned HDMI session. The next offline gate is to trace those three steps
through the saved C1 browser and broadcast evidence.
