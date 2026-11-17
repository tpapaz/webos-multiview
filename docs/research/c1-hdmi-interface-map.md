# C1 HDMI evidence map

LG OLED C1 / firmware03.53.45 / SDK6.5.3. [Status](../../STATUS.md) ·
[Device results](../device-tests/c1-journal.md) · [Current prototype](../../native/phase2-hdmi-candidate-0.1.12/README.md)

## Verified result and limits

**One physical HDMI-4 picture with continuous motion in our app-owned centered
window is verified once, with audible sound reported.** Own live-caller
open/select/stop/close were accepted; local cleanup returned; termination was
independently observed. The owner confirmed restored picture/sound/remote with
no recovery action. [Actual result and hashes](../device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound).

| Boundary | Established / remaining limit |
|---|---|
| Window and acquisition | Own exported1920x1080 SDL surface, centered960x540 destination, UTP NormalWindow open bound to its exported window, then select HDMI4. Owner observed advancing video in that box. |
| Admission | Exact narrow four-method permission coverage and accepted calls from our own named handle passed in this attempt. Exported symbols or permission predictions alone were insufficient. |
| Cleanup/termination | Stop/close acknowledged, local cleanup returned, launch-bound parent-death witness observed termination, app absent and owner controls restored. Numeric exit status/alarm cause/hardware release remain unknown. |
| Audio | Sound was audible during the trial. Independent mixer ownership, routing and audio selection are not established. |
| Concurrency | Independently live HDMI1+HDMI2 remains unproven. Neither a second port selection nor two IP clips would establish it. |
| Repeatability | One short successful physical run; sustained stability and cross-firmware behavior are untested. |

## Current implementation and causal findings

- [Physical contract](../../native/phase2-hdmi-candidate-0.1.12/README.md) binds
  lifecycle/picture actions, schema2 trace and version/action/launch-bound witness.
- [Adapter](../../native/phase2-hdmi-dispatch/adapter.h) owns registration, SDL,
  four stable callback slots and copied synchronized replies. App submissions and
  cancellations run on the GLib context owner.
- [Dispatcher](../../native/phase2-context-dispatch/dispatcher.h) pumps the
  app-owned context during SDL startup and quit, and joins before own unregister/
  unref. The unpumped diagnostic took20.027 s in SDL_Init; the corrected setup
  diagnostic took68 ms. Exact vendor helper branches remain unobserved.
- Named LS2 public/private handles can share transport. A different-context
  attach is rejected, not silently migrated. Registration success did not prove
  the old collision hypothesis. [Exact saved disassembly and review](archive/c1-first-picture-development-2026-11-15.md#ls2glib-context-and-sdl-lifecycle-review).
- [Session core](../../native/phase2-hdmi-picture/session.cpp) selects only HDMI4
  and stops/closes only an ID returned by this attempt. acquisitionUncertain
  intentionally remains true after open dispatch; acknowledgments cannot prove
  backend release.
- [Host runner](../../scripts/run-physical-candidate.cjs) composes the bounded
  controller in normal PowerShell. A stripped persistent child environment caused
  one preconnection failure; the other earlier connection failure is unknown.
  Do not equate those with native app failures.

## Independent second-path research

**Current conclusion:** the saved implementation distinguishes fresh logical
opens, boot-cache adoption, port changes, existing-element reuse and separately
addressed presentation routes. It does **not** establish a second independently
owned HDMI receiver/sink pair on C1/03.53.45. Direct UTP remains selected.
[Source/receipt index and corrections](c1-hdmi-evidence-ledger.md) ·
[Current next task](../../STATUS.md#single-next-task).

The causal chain has two hardware boundaries. Receiver selection reaches the
fixed HDMI driver with a model-mapped port, while presentation passes sourcePort
and a separately chosen sink through videooutput and VAL to VSC. A grant, session,
port, sink ordinal and software planeID are different values.

~~~mermaid
flowchart LR
  UTP[UTP logical session] --> F[Element factory]
  F --> H[video-hdmi]
  H --> RX[HDMI driver: k+1]
  F --> S[video-sink]
  S --> A[AV connector]
  A --> V[videooutput]
  V --> VAL[VAL: kind and port k]
  VAL --> VSC[VSC: node window and port k]
  F --> RM[Resource arbitration]
~~~

The graph shows traced calls/configuration; it is not a diagram of proven
independent live receivers. On-disk MAIN/SUB0 order is now captured below;
active-loaded identity, receiver ownership and isolated release remain unresolved.

### Saved inputs and address convention

ELF sections use virtual instruction addresses with the Thumb bit cleared.
Kernel subsections explicitly use decompressed ARM64 Image **file offsets**. Neither
is a runtime address or application constant. Source aliases are scoped to the
subsection legend; U initially means saved **ATSC**, not an active-variant claim.
The [DVB corroboration](archive/c1-hdmi-investigation-2026-11-12.md#utp-provider-allocation-and-cleanup--2026-11-12)
does not make ATSC interior addresses valid in DVB. Model/firmware attribution
comes from retained device evidence; active-loaded identity remains unknown.

| Ref | Exact local input below `build/phase-2/` | SHA-256 |
|---|---|---|
| U | `utp-provider-20261112-001/utp-atsc.elf` | `721394f165f36cfbfaeabeae4b02a8e388c927a77e0b7613d5c4ba521bff3ed3` |
| B | `hdmi-backend-20261112-001/extinput-integration.elf` | `4caec3536b689815a82081a35f9b177221e51a4294368614e05064441de6c48c` |
| S | `hdmi-backend-library-20261112-001/libextinput-service.so.1.0.0` | `7e497c76c37759bf48e459b157eba2e103b1a572fd24bc1401084661636ebbe7` |
| G | `hdmi-gibb-20261112-001/libgibb-pipeline.so.1.0.0` | `98c22261bab5dcbd95b182b215247228b2002030cb453910d391b606ee6f7ee5` |
| R | `hdmi-release-deps-20261112-001/libtvrm_client.so.1.0.0` | `db04ad77bd0bdec15af06fc04a1283c8e8e9afe367e02d64c9d76205448d2e20` |

B/S/G instruction bodies are in each input's sibling `disassembly.asm`; R uses
`libtvrm_client.so.1.0.0.disassembly.asm`. U uses the address-qualified saved
`TVExternalManager-*.asm` and the cache review linked below. S virtual targets
use its relocation-aware `vtables-v2.json` (table includes two ABI header words);
the original unrelocated table is not authoritative.

### Allocation, arbitration and presentation trace

| Boundary | Verified/static evidence | Consequence / remaining unknown |
|---|---|---|
| Logical creation versus adoption | U `open` generates a key at `0x5c4088`; false final flag plus nonempty manager cache selects copy-and-clear at `0x5c4092–0x5c40ee`, skipping registry add `0x5c410e` and backend open `0x5c4292–0x5c429e`. Ordinary `cb_open` passes false at `0x5627f0–0x5627f2`; bootExternal passes true at `0x4c9c6e–0x4c9c86`, and successful boot onOpen caches at `0x5c75e4–0x5c75fc`. | Cache adoption is a boot-to-client handover, not evidence all ordinary sessions share an active app session. Cache-empty logical creation remains plausible; cache population during the successful 0.1.12 run is unknown. |
| Backend service object | B `open` reads optional `mediaId` at `0x51290–0x512d8`, follows ID-generation code at `0x512f8–0x51452`, then calls S `ServiceManager::createService` at `0x51486`. S gets by key at `0x7b7b8`; absent key plus mode 0 reaches `createWatcher` at `0x7b918–0x7b91e` and keyed insertion at `0x7b8a6–0x7b8b4`. HDMI type 1 constructs a WatcherHDMI at `0x7ae94–0x7aefc`. | Supports multiple logical objects, conditional on key/mode. Another object is not another receiver. The optional media ID is not a demonstrated fresh-allocation or cancellation token. |
| Port state and load | S `_setPort` constructs `HDMI_<port>` at `0x83698–0x83710` and branches by port at `0x83746–0x837aa`; `_load` serializes retained port, app/window/type and pipeline metadata at `0x87164–0x87204`. S `HdmiController::setResourceInfo` forwards `setHwPort`/`port` in branches at `0x654f8–0x65504`, `0x65596–0x655a2`, `0x65696–0x656a2`, `0x65c24–0x65c30`. | Port is explicit state/configuration of a pipeline and its elements. These branches do not prove independent hardware port locks or that an existing receiver keeps its old port. |
| Resource acquisition | G `PipelineManager::load` calls `requestResource` at `0x2523e` and checks failure at `0x25242–0x25246`; it passes returned resources into the factory at `0x253f2`, then creates an element list at `0x25434`. Connector converts input/purpose at `0x2956c–0x29580`, calls R `tvrmclient_request_resource` at `0x295c2`, converts returned list/conflict/result at `0x295ce`, `0x29644`, `0x29652`. R builds pipeline/input/purpose and calls `tvrm/requestResource` through synchronous helper `0x4fd8` at `0x5eb6` (URI file offset `0xb394`). | Identifies the arbitration boundary and a returned resource list. The saved client code does not reveal the TVRM server's second-HDMI grant/preemption decision. Successful request dispatch is not a grant. |
| Element reuse below UTP | G factory calls `getExistElement` at `0x1f25a`; its search compares resource type at `0x1e980–0x1e98a` and PI_PORT-derived selector bytes at `0x1e98c–0x1e994`, then returns a shared existing element at `0x1ea2c–0x1ea5e`. A miss reaches `getNewElement` at `0x1f35a–0x1f3b2`. | A second logical/backend session can still encounter shared lower elements. This is a distinct reuse mechanism from the boot cache. Earlier “type/index” shorthand meant this selector, not the separate PI_PRIDX field; see the factory trace below. Whether two HDMI requests receive the same type/selector is unknown. |
| Receiver capacity versus jack count | G `getPhysicalResourceNum` sends an internal `physicalResourceNum` message (`0x22d9a`), resourceName (`0x22eec`) and reads response `num` (`0x22fee–0x2302c`). S `cbPhysicalResourceNum` distinguishes `HDMI_INPUT` (`0x92ff8`, port-count route `0x930b4–0x930d4`) from `VHDMIRX` (`0x9312a–0x93158`, config key `vhdmirx`) and `AHDMIRX` (`0x9317e–0x931aa`, `ahdmirx`). `ExtinputConfig::getPhysicalResourceNum` at `0x4ac00` reads `extinput-service.physicalResourceNum` (`0x4ac1e–0x4ac42`), selects the requested key at `0x4ac96`, parses its integer at `0x4aca0`; missing value returns 255 (`0x4ac78–0x4ac82`). | A passive config snapshot now reports **vhdmirx2/ahdmirx2**; this is configured capacity, not current free/exclusive grants or independently live receivers. Missing/default255 must not become a receiver count. S's fixed callback returns index255, which G converts to mask0 as traced below; it does not fix each connector to a receiver. |
| Capacity configuration origin | B `xAdapterConfigD::updateConfigdTable` builds category wildcard configNames at `0x6d78c–0x6d7a0` and dispatches `palm://com.webos.service.config/getConfigs` at `0x6d8d0–0x6d8d4`. `ConfigExtinputService::configCB` iterates configs at `0x68d5a–0x68db6`, obtains ExtinputConfig at `0x68dbc`, calls setter at `0x68e96–0x68e9e`. S vtable word `0xc8a84` resolves to Thumb `0x53eed`, `ExtinputConfig::setConfig`; `getConfig` reads the in-memory maps at `0x53d0a/0x53d1e`. | Traced configuration transport/storage, not actual configured capacity. Bounded search of saved Phase 2 and Phase 1 firmware JSON/text/source found no matching physicalResourceNum/vhdmirx/ahdmirx body. The config service's backing-file provenance and actual values remain unknown; do not invent a filename or query it now. |
| Existing window binding | Cache adoption sends setPipelineWindowId only for NormalWindow (U `0x5c4474–0x5c4488`, call `0x5c45d2–0x5c45da`). B `setPipelineWindowId` gets an existing service at `0x4cf3e`. S `Watcher::setWindowId` stores one string at +0x48 (`0x992ea–0x992fa`); its InitialWindow branch forwards setWindowId/windowId at `0x99420–0x9948a`. `ElementController::setWindowId` looks up existing video-sink/audio-sink/subtitle at `0x5ef4c–0x5ef78` and forwards at `0x5f056`, `0x5f142`, `0x5f22c`. | Rebinding existing state is established. This setter does not allocate another sink or receiver. Lower video-sink code deciding presentation resource and MAIN/SUB mapping remains untraced. |
| Sub-scaler naming | S `WatcherHDMI::cbSubScalerResource` reads requestSubScaler at `0x8544e–0x85530`, stores conflict state at `0x855d4/0x855d8`, emits bDolbyConflictStatus and sends resourceConflict at `0x85680–0x856c4`. `HdmiController::setSubScalerRequest` reads that Boolean at `0x64d1c–0x64d28`, negates it at `0x64d48`, sends video-hdmi `setSubScalerAvailable` / `subScalerAvailable` at `0x64da6–0x64e02`. | This body manages availability/conflict, including Dolby state. It does not establish a second HDMI receiver or an application selector for SUB0. Do not infer allocation from the method name. |

The retained example `/etc/umediaserver/umediaserver_resource_config.txt`
(`build/phase-1/firmware-inspection/`, SHA-256
`50609323ba9e200de509c793f0e4aee420a935ab94b757877423b7db62e46ea8`)
declares VHDMIRX=3 (lines 92–94), AHDMIRX=2 (98–100), HDMI_INPUT=8
(248–250), MAIN_SCALER=1 (278–280), SUB_SCALER=3 (284–286).
Those are declarations, not measured C1 counts, and are not shown to supply
`extinput-service.physicalResourceNum`. Neither the literal quantity nor four
physical jacks proves simultaneous independent acquisition.

**Release remains a separate boundary.** U onClose removes its registry key at
`0x5c77e8` and constructs success at `0x5c77fa` without validating the collected
backend result. B `_close` calls Watcher::release at `0x59f3e`, then removes its
service/ID at `0x59f4a–0x5a022` even on returned failure. R release and request
use the synchronous helper `0x4fd8`, whose accepted-send branch waits with
`pthread_cond_wait` at `0x50ec`. There is no local finite wait bound in this
inspected path. The successful short 0.1.12 trial established normal viewing
restoration and termination; it did not prove physical release. Keep existing
guards and conservative acquisitionUncertain unchanged. No new recovery work is
queued by this analysis.

### Element factory and port/sink mapping

`E` below is retained `hdmi-release-deps-20261112-001/libelement-base.so.1.0.0`
under `build/phase-2/`, SHA-256
`951ffed42164945d9b99d86c08d3ee412fcde0023d1a0b120f9b7b886ec6144b`.
Its instruction source is sibling `libelement-base.so.1.0.0.disassembly.asm`;
G/S/R refer to the exact saved inputs above. Fresh hash-bound excerpts and
relocation findings are in
`build/phase-2/hdmi-element-binding-offline-20261115-001/{loader,service}/`.
This uses saved ARM instructions/literals/relocations, not fresh decompilation,
executed plugins, simulator results or a new app build.

| Value / boundary | Exact saved trace | What it means and does not establish |
|---|---|---|
| Logical HDMI source port | S Watcher `+0x90` becomes load JSON `port` at `0x87166–0x8717c`; the load contains elementConfig and app/window/type/pipeline metadata and reaches PipelineBase::load at `0x87344`. | Requested jack selection is separate from resource-manager metadata. No per-jack exclusive receiver follows from storing it. |
| Model input-map index and hardware source-port setting | S `getVideoIndex` `0x4a664` reads `tv.model.videoIndex`; `getAudioIndex` `0x4a7d4` reads `tv.model.audioIndex`. `getInputMapInfo` `0x4fdcc` selects `inputMap.videoInputMapIndexInfo` (`0x5026c`) or `inputMap.audioInputMapIndexInfo` (`0x4fe1a`). `HdmiController::setResourceInfo` obtains video index/map at `0x65442/0x65476`, indexes the resulting map by requested logical port at `0x6550a–0x65518`, and calls existing video-hdmi `setHwPort` with `{port: mapped integer}` at `0x6554e`. | The passive snapshot reports videoIndex3, a table selector rather than receiver3. The requested inputMap key was missing from config-service replies; concrete HDMI1/2 hardware-port numbers remain unknown. Missing config-service data does not prove that an already-loaded service lacks its map. The plugin may still select a shared receiver. |
| Two separate grant fields | R resource-list parser resolves JSON-key globals through GOT slots `0x1df74` → `JKEY_PI_PORT` and `0x1df90` → `JKEY_PI_PRIDX` (literals `0xa0a0/0xa0b0`). It stores their numeric values into each 48-byte TVCO resource record at `+21` (`0x9e60–0x9e64`) and `+25` (`0x9efe–0x9f02`) respectively. G conversion copies `+21` → PipelineResource `+28` at `0x29344–0x293e4`, and `+25` → `+32` at `0x29334/0x293ea`. | PI_PORT and PI_PRIDX are different metadata, neither automatically equal to a physical HDMI jack. The earlier “resource index” description of the factory constructor byte is refined to **grant resource-port selector**. PRIDX is retained separately in factory records (`0x1f500–0x1f504`); no hardware sink routing from PRIDX is established here. |
| Grant selector reaches the plugin constructor | G reads PipelineResource `+28` at `0x1f39e`, passes it to getNewElement at `0x1f3b2`; that function forwards the byte unchanged at `0x1e248/0x1e2ba–0x1e2f2` into E's typed `createElement` overload at `0x2a944`. E resolves `createPlugin` at `0x2a9a4–0x2a9a6`, passes the byte with input/purpose/message at `0x2a9de–0x2aa2a`. The generic typed Base constructor stores its byte at `+0xec` (`0x1966c`); getPort returns that byte at `0x188cc`. | The resource-port selector crosses the plugin ABI without a generic MAIN/SUB or HDMI-jack translation. The collected plugin trace below confirms forwarding to that typed Base constructor, while physical routing uses the separate setHwPort value. |
| Compiled HDMI element list | S ElementConfig constructor builds ordinary nodes video-hdmi / `isHwElement:true` / `hwResourceType:15` at `0x40b76–0x40ba2`, followed by video-sink / false / 255 at `0x40b92–0x40bbe`. Serializer `0x41e5c` explicitly emits elementName/isHwElement/hwResourceType from node fields at `0x41e70/0x41ea6/0x41ede`. G's non-hardware branch passes constructor byte255 at `0x1ecbe–0x1ecd6`, whereas the hardware branch uses the grant selector above. | T's conversion tables now identify pipeline type15 as RM VHDMIRX19 and reverse19→15. This grounds the typed video-hdmi resource. video-sink has no own typed TVRM grant in this factory branch; that does **not** imply a free presentation plane or hardware bypass. |
| mediaFrontend alternative | S `getElementConfigData` chooses its ordinary map for empty mediaFrontend and second map for nonempty (`0x41f64–0x41f72`), exact-matches key words (`0x41fc8–0x42016`) and serializes the selected vector (`0x42020–0x42048`). Alternative HDMI nodes both use false/255 (`0x41676–0x41710`). | A different logical construction route exists. It does not establish new hardware acquisition and is not a second-receiver recipe. Do not change 0.1.12's payload to explore it on this evidence. |
| Plugin identity and file selection | E Manager constructor sets `/usr/lib/element` at `0x2b76c–0x2b7ac` and basename `elementList.json` at `0x2b7c0–0x2b7c6`. Extinput process matching chooses `/etc/extinput/` at `0x2a70c–0x2a724`. Initialization reads the resulting list at `0x2c548`; absent/unusable configuration takes the library-inventory path at `0x2c460–0x2c480`. `readConfFile` consumes partialElementList/elementList/input/elementName (`0x2bb64–0x2bc60`, `0x2be8c`). Named loading constructs `libelement-<name>.so` at `0x2b324–0x2b348`; generic load resolves `pluginInfo` at `0x2b046–0x2b048`, validates its name against the filename at `0x2b074–0x2b116`, stores it under that name at `0x2b124–0x2b13c`. Handler implements dlopen at `0x2a29c` and dlsym at `0x2a15e`. | The derived JSON and both plugin entries have now been captured; each plugin resolved through two links to `.so.1.0.0`. Expected SONAMEs and pluginInfo/createPlugin exports exist. Saved initializer instructions establish both pluginInfo names below; the active list branch/preload set remains unknown. No dlopen/dlsym was executed during this review. |
| Presentation requires sink-plugin tracing | S getInstance searches the supplied element vector by element name (`0x5e440–0x5e48a`), not a global hardware inventory. Its window setter resolves video-sink/audio-sink/subtitle and calls the existing sink's setWindowId (`0x5ef4c–0x5ef78`, `0x5f056`). video-hdmi receives InitialWindow-only setWindowType at `0x65b8a`; setConfigs is forwarded at `0x65a1a`. | No generic code here selects MAIN/SUB or independently allocates another presentation sink. Binding an existing plugin instance to a window is separate from acquiring that instance's hardware output. |

### Collected plugin evidence and static acceptance

| Saved file / SHA-256 | Byte-derived acceptance / exact location |
|---|---|
| elementList.json,1,491 bytes; `a091e7ab53a490c68f05486be31f659024852a27ab17770f3797e45c1b031782` | JSON parses; `$.partialElementList[0].input` is hdmi. Its `elementList[0].elementName` is video-hdmi; `[4].elementName` is video-sink. Other partial inputs are av/component. This does not prove which branch is actively loaded. |
| video-hdmi.elf,341,436 bytes; `f6b8e5c055b41f18695f0b611c36023d0dfee75e7de445b15f6b2b1340ff039d` | ARM32 little-endian DYN/EABI5 soft-float; SONAME libelement-video-hdmi.so.1. pluginInfo is84 bytes at `0x6381c` in `.bss`; createPlugin Thumb symbol `0x36839`,448 bytes. Exact metadata: `static/video-hdmi.sdk-readelf.txt:2479,2495`; `.bss` at line47. Build ID `6f4593ffb8df9d8566dcf686ed7da2430c1ac96a`. |
| video-sink.elf,83,388 bytes; `61fcee10303ead7a29668582024f042c8f08701ab116a7ee87af59ce48ffaad1` | Same ELF class/ABI; SONAME libelement-video-sink.so.1. pluginInfo is84 bytes at `0x241d8` in `.bss`; createPlugin Thumb symbol `0x976d`,448 bytes. Exact metadata: `static/video-sink.sdk-readelf.txt:860,936`; `.bss` at line47. Build ID `95198268e3b0dc5dde406cb3be6e311b990010eb`. |

Both plugins resolved `.so` → `.so.1` → `.so.1.0.0` in `/usr/lib/element`,
with stable recorded links/parents/handle metadata and observed EOF. All hashes
and closure passed; the bundle is **retrieved**, not an atomic-snapshot or
active-loaded-provider proof. Both DT_NEEDED lists include libelement-base.so.1,
matching the saved E provider's SONAME and ARM ABI; its currently loaded TV
identity was outside read scope. The sink also imports libav-proxy.so.1; this
is a dependency fact, not an instruction or authorization to retrieve it.

### Plugin initializers, port indices and presentation selection

**Verified static, 2026-11-16; no TV connection or execution.** H and K below are
the collected video-hdmi.elf and video-sink.elf, with exact hashes above. A is
saved `build/phase-1/firmware-inspection/libav-proxy.so.1`, SHA-256
`bcbd9740e258131596d3ed3be050cf65018a2aa9e1a1e2d0fe90ee83c62fbdfe`;
C is sibling `libav-connector.so.1`, SHA-256
`c7cffeb1437f3b785782467cced052cefa3ed3f9d0a7689bb49db3b494f5aff3`.
Instruction addresses below have the Thumb bit cleared. Static identity does
not identify the instance loaded by a particular past TV run.

Saved instructions/excerpts and constructor/literal checks:
`build/phase-2/hdmi-plugin-trace-offline-20261116-001/`. The source-bound
`raw/hdmi/findings-reviewed.json`, `raw/sink/literals-and-findings.json`,
`excerpts.json` and `reuse-bound.json` are indexed in the evidence ledger.

| Boundary | Exact static evidence | Conclusion / limit |
|---|---|---|
| H identity | `.init_array` slot `0x607e0` → Thumb `0x22f4d`. Initializer `0x22f4c` uses GOT base `0x62358`, slot `0x62fd4` relocated to pluginInfo `0x6381c`. Calls `0x22ff8/0x23004/0x23010` through string constructor helper `0x35650` set name at `0x48e90`, empty description at `0x4bd8c`, version at `0x497d8`. | The initialized name is **video-hdmi**, version **1.0.0**. This closes the earlier `.bss` name gap without loading the plugin. |
| K identity | `.init_array` slot `0x23594` → Thumb `0x84a1`. Initializer `0x84a0` uses GOT base `0x23c7c`, slot `0x23fe8` relocated to pluginInfo `0x241d8`. Calls `0x852c/0x853a/0x8548` through helper `0x8474` set strings `0x11f20`, `0x124bc`, `0x12480`. | Name **video-sink**, empty description, version **1.0.0**. Exports alone were insufficient; initializer argument/data flow establishes the name. |
| Grant byte versus source routing | H createPlugin reads incoming byte `0x3684e`, stores it on the outgoing stack `0x3689c`, calls typed constructor `0x368d0`. Constructor forwards it at `0x35e20/0x35e60` to Base's previously traced `+0xec` field. K does the same at `0x9782/0x97d0/0x9804`, then `0x9258/0x9294`. | This is the **PI_PORT grant selector**, not an established physical jack or presentation plane. PI_PRIDX is separate factory metadata; it is not this constructor argument. No grant-selector → hardware-port or scaler translation is demonstrated in these paths. |
| Logical input label | H `0x35ee8–0x35ef4` switches on PipelineInputType's word at `+4`; codes8–12 map to labels1–5 via `0x36538/0x36542/0x3654c/0x35f0a/0x3652e`, stored at object `+0x184`. | A logical label is separate from the driver index below. Five accepted enum codes do not establish five physical C1 connectors. |
| Actual driver port | H setHwPort reads JSON **port** (literal `0x482d4`) at `0x38126–0x38132`, stores integer **k** at object `+0x188`, publishes it under **elementPortHw** (`0x49034`, put at `0x37ffa`). It allocates HdmiVideoControl at `0x3802c–0x38042`. Control reads k and adds1 at `0x4070a–0x40714`; driver constructor call `0x40738` stores this value at driver `+0x14` (`0x34164`). | Driver port = **k + 1**, where k is the model input-map value delivered through setHwPort; videoIndex selects the table. This is not a proven function of PI_PORT or PI_PRIDX. The model's HDMI-jack → k table values remain unsaved/unknown. |
| Acquisition endpoint | H opens fixed **/dev/video12** (literal `0x48570`) at `0x33964–0x3396e`, flags2. Connect reads stored driver port at `0x3382e`, invokes ioctl **0xc0045627** at `0x3383c`. Relocation of vtable `0x619e4` names v4l2_hdmi_connect; control reaches it at `0x3ebfc`. | Actual character node81:9 matches sysfs/platform **hdmi20_v4l2**. Saved kernel code distinguishes per-file handles, global input readback and per-port activation below; receiver isolation remains unknown. No device open or hardware ioctl was performed during driver research. |
| Sink sourcePort | K `_start` obtains previous linked-element information with selector255 (`0x9a40/0x9cae`). It reads **elementPortHw** (`0x120a4`) at `0x9cba`, converts at `0x9cc0`, stores `+0x1e8` at `0x9cc6`, emits JSON **sourcePort** at `0x9b50–0x9b76`. | Presentation sourcePort = **k**, the upstream hardware index. It is not an evidenced read of the sink's own grant byte. K source mapping uses primary3 → HDMI (`0x8628–0x8638`); primary4 is AVD (`0x8640–0x8652`), whose extra attribute is av. |
| Default presentation | K emits **sink:MAIN**: value literal `0x11fb0`, creation `0x9b90`, put `0x9bae`; JSON reaches AVProxy::setRenderReady at `0x9c20`. A forwards unchanged at `0x5f62–0x5f68`; C wrapper `0x1f3c2–0x1f3c6`, implementor `0x1a9c6`. C initializes current/prior video types to2 at `0x12092–0x12094`; `_prepare` selects MAIN_SCALER at `0x12df8/0x1300a`. | Ordinary construction supplies a MAIN request and defaults to MAIN_SCALER. A second window or grant does not itself select SUB. This is a resource-arbitration boundary, not a free sink. |
| Conditional SUB override | C `updateConnectionInformation` compares explicit MAIN at `0x13c3e`, rewrites to **SUB0** only for video type4 at `0x13c46–0x13c6e`. Its changeSink path can set the type (`0x1a516` → `0x19bd8`); type4 requests SUB_SCALER in the saved preparation path. | SUB is not categorically impossible. The initialized private-command receiver route is traced below; generic callback delivery is traced statically below; effective caller permission and active ownership remain **unknown**. Whole K dynamic-symbol/direct-call and exact-string checks found no direct AVProxy setSink/changeSink or SUB0/sub_video use; callback delivery is a separate path. |
| Fresh object versus window rebind | Each K createPlugin call allocates a fresh504-byte shared-object block (`0x9774–0x9786`). Proxy `+0x18c` starts null (`0x92ea`); setAppWindowInfo creates it only when null (`0xac32`, `0xaf20`, `0xb07e`), rejects repeated initialization. setWindowId requires and forwards the existing proxy at `0x9f0e/0x9fdc`. | Fresh C++ objects/proxies are possible, but generic element reuse can skip the factory. Window rebinding neither allocates another receiver nor changes main/sub type. windowType400/402/401 (default/InitialWindow/NoWindow) is distinct from video type2/4. |
| Release | H control close waits at `0x3b9ce`, calls disconnect at `0x3b9d8`, close at `0x3b9e2`; vtable relocations name those methods. Disconnect uses stored port/control `0x0098590c` at `0x33848–0x33866`; fd close/reset is `0x337d8–0x337e0`. K `_close` logs/returns0 at `0x8ba8–0x8bbe`; its destructor finalizes the proxy at `0x8cb4`. | Static cleanup paths are identified. Successful local close, plugin _close or destructor structure does not prove hardware release or isolation from another owner. |

**Mapping established:** service hardware index **k** → HDMI driver port **k+1**
and sink sourcePort **k**. **Mapping not established:** grant PI_PORT/PI_PRIDX →
independent physical receiver, eligible second grant, or independently owned
presentation sink. Both port changes and default-MAIN contention remain plausible.
The [prior Phase1 main/sub bridge](c1-smp-ndl-resource-path.md#exact-firmware-path)
corroborates connector types/resources, but its app-selectable SMP avSink option
is not an established UTP API and must not be transplanted into0.1.12.

### Connector type4 callers and private-command boundary

**Verified static / candidate end-to-end, 2026-11-16; offline only.** H/K/A/C
retain the hashes and paths above. Generic dispatch was also checked against
saved `hdmi-release-deps-20261112-001/libelement-base.so.1.0.0` and
`hdmi-backend-library-20261112-001/libextinput-service.so.1.0.0`, SHA-256
`7e497c76c37759bf48e459b157eba2e103b1a572fd24bc1401084661636ebbe7`.
Fresh private sources/excerpts and findings:
`build/phase-2/hdmi-sub-selector-offline-20261116-001/`.
`raw/connector/findings.json` binds the callback/type/resource path and14
SDK address excerpts; `raw/utp/dispatch-findings.json`,
`dispatch-excerpts.json` and `setSink-field-provenance.json` bind the independent
UTP dispatch check and video/audio correction. No new firmware was retrieved.

| Question | Exact saved path | Disposition |
|---|---|---|
| Is there a direct VideoSink selector? | K constructor registers **setAppWindowInfo**, **setVideoInfo**, **setWindowId** at `0x93f0/0x943e/0x948c`, resolving member GOT slots `0x23fcc/0x23fc4/0x23fa4`. Base callMethod `0x1a600` looks up its `+0xfc` map (`0x1a6da`) and rejects missing names at `0x1a7a2`. Service setConfigs forwards the name at `0x5f684`; it is absent from K's three registrations. | No direct setSink/changeSink/setRenderMode registration or import was found in this sink. Generic method forwarding does not itself create a selector. This bounded negative does not exclude the callback below. |
| Is the callback part of this sink lifecycle? | K setAppWindowInfo creates A at `0xaf20`, calls A::initialize at `0xb07e`. A allocates its ResourceManagerClient at `0x7184–0x7190`, registers class **avconnector** at `0x7114`, and binds its privateCommandCallback through GOT `0x1af70` (literal `0x72a0`, GOT base `0x1ad74`) into client callback storage `+0x13c` at `0x7088–0x70e2`. | **Yes, static registration path established.** This route exists even though K never directly imports setSink. Which sender can deliver to that exact client is still unknown. |
| What does the callback accept? | A privateCommandCallback `0x6bc8` checks initialized flag `+0x71` at `0x6bec`, compares command **setSink** (`0x91b8`, compare `0x6c72`), calls A::setSink at `0x6c92`. That forwards through C's ordinary setSink API. | Candidate control route to the sink's existing connector. The callback discards the setter result and returns true (`0x6c96` → `0x6bfa`); a successful delivery reply would not prove selection or resource ownership. |
| How does video type4 enter? | C `_setSink` reads **videoSink** (`0x23578`, `0x1cf38`) into stack object `+68`; reads **audioSink** (`0x23584`, `0x1cf66`) into a separate object `+80`. The video branch reads **type** at `0x1d1ea`, converts at `0x1d204`, calls changeSink at `0x1d20c`. Converter builds **sub_video → 4** at `0x1854e–0x1857c`. | A delivered, accepted videoSink configuration can request type4. The direct store at `0x1d17e` is the **audio** branch, not video; the older Phase1 address attribution is corrected without altering actual test results. |
| Is this only a window rebind? | C `_setSink` calls tryDisconnect at `0x1d046` through implementor vtable slot `0x37890`; afterward calls tryConnect at `0x1d0ca` through slot `0x3788c`. changeSink chooses normal-window handling for window type400 (`0x1a4f8–0x1a516`); that path disconnects existing video/graphic connectors if connected (`0x19b8c/0x19ce2`), releases retained resources when present (`0x19dde`), and updates existing connector types (`0x19bd8/0x19bea`). | **Resource reconfiguration**, not merely geometry/window binding. It operates on the existing presentation connectors; it does not create another HDMI receiver or by itself create a second presentation owner. |
| Does it request a real SUB resource? | Type4 reaches VideoConnector::_prepare's non-main scaler branch (`0x12df6–0x12e00` → SUB_SCALER). Normal connect submits ResourceManagerClient::acquire at `0x1b644`; updateConnectionInformation maps explicit MAIN to SUB0 only for type4 (`0x13c3e–0x13c6e`). | **Separate SUB resource request path established statically.** Success, coexistence, preemption and exact granted indices remain unobserved. A type change/request is not an allocation receipt. |
| Does setRenderMode provide an easier route? | A's overloads at `0x6a84/0x6aa4` only warn **Deprecated. Use setSink**, then return0. | These are stubs, not evidence of selectable SUB. |

### Resource-client delivery, owner and allocation

Saved resource-client/connector instructions and reviewed findings:
`build/phase-2/hdmi-resource-client-trace-20261116-001/`. Static command delivery
and owner propagation do not establish effective caller permission or active
hardware ownership. No vendor or private-command execution is claimed.

Source legend, addresses below are linked instruction addresses with Thumb bit
cleared:

- **R:** `build/phase-2/hdmi-resource-client-evidence-20261116-001/resource-client.elf`,
  SHA256 `5f731199a4af70956cb186cd51f5c0d4cc82b16a92519ec0a0ea80b3eb988cd3`.
- **U:** `build/phase-2/hdmi-ums-connector-evidence-20261116-001/ums-connector.elf`,
  SHA256 `1ca5aa376e8d08811a514c5b03f1458eba0603afd0a13533f978083cf63d4f7e`.
- **I:** `build/phase-2/hdmi-ums-connector-impl-evidence-20261116-001/ums-connector-impl.elf`,
  SHA256 `ade285c32b1ea054cf635f9c1ef2a9e3909b69930ebe9df892e8db0ac0d706a2`.

| Question | Exact saved evidence | Conclusion and limit |
|---|---|---|
| Where does the private command enter? | R init builds service prefix **com.webos.rm.client.** (`0x7aa2–0x7ab4`, literal `0x14cc8`) with a generated suffix, passes client `this` as UMS userdata at `0x7ad6–0x7ae2`, registers **privateCommand** at `0x7b84–0x7bba` (literal `0x14d00`). GOT `0x27f8c` points to Thumb thunk `0x14269`; thunk `0x14268–0x14270` reorders handle/message/context and branches to privateCommandResponse PLT. | A per-client command service is registered. Its generated service name is not the resource connectionId, ownerConnectionId or a window ID. No live endpoint or existing owner's private identifier was queried or used. |
| How is the intended client context preserved? | U ctor forwards userdata at `0x43c2–0x43c4`; I stores it in CallbackManager `+8` at `0xb9ba–0xb9ca`. I addEventHandler registers the method map at `0x9f22`, LSRegisterCategoryAppend at `0x9f56`, and LSCategorySetData with the returned CommandCategory at `0x9f68–0x9f70`. Its default category resolves to **/** (`0xa23c + PC0x9eea`). U copies manager userdata into category `+8` at `0x5c08/0x5c5a` or `0x5d32`, and stores the selected callback at map node `+0x28` (`0x5bc4–0x5bc6`). CommandHandlerProxy `0x5080–0x5092` invokes handleCommand, which gets LSMessageGetMethod at `0x4b7e`, looks up the callback and calls it with handle/message/category userdata at `0x4c36–0x4c48`. | Dispatch selects a method on that registered instance and passes its stored client context. This establishes the static receiver binding, not effective caller permission. AVProxy's bus enum3 reaches I's **LSRegister** branch (`0xbb24–0xbb28` → `0xbf4c–0xbf56`); it is not a root/caller-policy bypass. |
| What payload reaches AVProxy? | R parses JSON at `0x11218`, checks **key** (`0x1128e`) and **payload** (`0x11366`), reads/converts them at `0x1138e/0x113aa` and `0x113c8/0x113e4`. It tests callback manager `+0x144`, invokes stored function at `+0x148` with storage `+0x13c` and the two string arguments at `0x11412–0x1142e`. These fields match A's previously traced callback installation and setSink comparison. | The route into AVProxy's setSink callback is now concrete. The handler returns its parser result (`0x1121c` → `0x11258`), including paths where fields/callback are missing; it discards the installed callback's return. No JSON reply send appears in this handler. Neither a Boolean callback result nor successful message dispatch proves selection/grants. |
| What is the resource-session identity? | R ctor initializes service **com.webos.media** at `0x8812–0x8852`. registerPipeline constructs **type/appId/reserved** (`0x8db2–0x8dfc`) and sends `/registerPipeline` at `0x8fa6–0x8fae`, passing self as reply context. openConnectionResponse reads **connectionId** at `0xf71e`, stores the returned string in client `+0x1c` at `0xf73a–0xf754`, signals at `0xf7b2`. Registration waits using waitEvent with30-second argument (`0x8fd0–0x8fe6`) and subscribes at `0x901c`. | Resource service supplies a session ID. It is separate from the locally generated command-service address. Server registration validation and live mapping between these identities are unobserved. |
| What does owner binding do? | R setOwnerPipeline puts client `+0x1c` under **connectionId** (`0xe5d8–0xe5fc`) and its supplied argument under **ownerConnectionId** (`0xe610–0xe634`), sends `/setOwnerPipeline` (`0xe6a0/0xe6ec`). resetOwnerPipeline uses the corresponding fields and `/resetOwnerPipeline` (`0xeab8/0xeaf0/0xeb6c`). | This sends a resource-session ownership relationship. No port/sink/window selection or server acceptance follows from that relationship alone. The setter returns the serialization flag after asynchronous send (`0xe726`), without waiting for owner acknowledgment. A's previously traced call associates its avconnector session with the supplied parent pipeline; it does not create another receiver. |
| Where does allocation happen? | R acquire/tryAcquire wrappers set true/false at `0xa754/0xa75c`; `_acquire` sends **connectionId/resources** (`0x9b74–0x9ba8`) to `/acquire` or `/tryAcquire` (`0x9c02–0x9c0e`, `0xa124–0xa134`) through UMS sendMessage (`0x9d9c–0x9dae`). I reaches LSCallOneReply at `0xaa36`. R builds a connection-keyed waiter, calls **std::condition_variable::wait** at `0x9e38`, copies the received result string at `0x9ecc–0x9ed2` and returns the waiter Boolean (`0x9ede`, return `0x9f58`). | Client requests resources; the media service chooses grants/arbitration. This generic client does not establish the physical meaning of HDMI resource indices. No finite local acquire wait was found on the inspected path; tryAcquire uses the same client wait despite its different server method. Keep existing process guards. |
| What counts as completion or policy action? | R acquireCompleteResponse reads **state/connectionId** (`0x1076e/0x1079e`) and passes Boolean plus the full message to informWaiter (`0x10826`). commandResponse checks returnValue/state and can inform failure at `0x10ef4`. informWaiter finds the waiter by supplied connection key, writes Boolean/result at `0x778a/0x7792` and notifies at `0x779a`. policyActionResponse parses action/connectionId/resources, invokes installed policy callback (`0xff96–0xff9e`) and sends its response at `0xffac–0xffba`. | Completion is correlated to a resource session. The client transports the server's result; it does not demonstrate a second physical receiver or a non-preempting grant. Policy/preemption behavior is delegated to the installed callback/server, not eliminated by a second client object. |
| Does release success prove hardware release? | R release sends **connectionId/resources** to `/release` (`0xa7dc/0xa802/0xa87c`, send `0xa8ce`), then returns serialization flag (`0xa908`). unregisterPipeline sends `/unregisterPipeline` at `0x97b4` and sets local state at `0x97b8–0x97bc`. finalize wakes a waiter with failure at `0x7950`. Destructor stops UMS and calls untimed pthread_join (`0x764a/0x7654`); no unregisterPipeline call appears in this destructor. | Release and unregister dispatch are not release receipts. Server disconnect cleanup, actual resource/hardware release and bounded teardown remain unknown. No active release/reset was attempted during this research. |

### Own SUB0 selector and allocation evidence contract

**Verified static / candidate protocol, 2026-11-17.** A/C/R retain the hashes
above; E/G/K retain the earlier source identities. Full-body review and18
source/hash-bound excerpts are preserved in
build/phase-2/hdmi-own-sub-contract-20261117-001/{selector-findings.json,reviewed/}.
No vendor code or selector was executed. This fixed70-byte body describes the
candidate avconnector privateCommand grammar, **not a dispatch-ready app API**:

```json
{"key":"setSink","payload":"{\"videoSink\":{\"type\":\"sub_video\"}}"}
```

| Contract boundary | Exact saved evidence | Required interpretation / refusal |
|---|---|---|
| Grammar and type | R0x113aa/0x113e4 converts key/payload separately with asString; A0x6c72 compares setSink and0x6c92 forwards the payload string. C0x1ced0 parses it using schema literal{} at0x2194c; videoSink/type reaches changeSink at0x1d1ea–0x1d20c. sub_video at0x231bc maps to type4 at0x1854e–0x1857c. | payload is a JSON **string containing JSON**, not a nested object. Candidate contract accepts only the fixed videoSink/type body; no arbitrary method/type/extra-field input. |
| Empty-field hazard | C0x1cffc checks audioSink presence; serialized{} at0x1d31a clears audio type0 at0x1d362–0x1d366; empty string rejoins via0x1d378–0x1d384. Empty videoSink clears video/surface through0x1d24e–0x1d306. | Omit audioSink and streamType; do not use empty objects/strings as filler. Omission avoids the explicit clear branch but does not guarantee unchanged audio hardware during disconnect/reacquire. |
| Readiness and result | A initialized byte+0x71 is set at0x6eb6 before validation0x6eba, connector initialize0x6ed0 and resource register0x7114. C0x1d614–0x1d61a checks getStatus(1); airplay takes queued work0x1d6ae, other types reach0x1d6e4. C0x1d0ca calls tryConnect(0), then0x1d0ce returns1 without using that result. A and R also discard callback/setter results. | Initialized/delivered/parsed/true means neither completed SUB selection nor granted resources. Require independent post-completion ownership/grant/sink evidence; no setter-reply acceptance. |
| Selection ordering | K's ordinary _start supplies MAIN before setRenderReady0x9c20; C type4 is the conditional MAIN→SUB0 override0x13c3e–0x13c6e. V0x702d0 can disconnect an existing MAIN binding. | **Risk inferred from these calls:** applying SUB after B has already connected MAIN can first displace A. A runnable proposal needs an evidenced non-displacing preparation point before B's first lower MAIN connect, or a supported SUB-first construction route. Neither ordering is established here. |
| Backend parent enters the element | G gibb-load.asm0x255a2 passes PipelineBase+96 to E::Base::open at0x255c0. E libelement-base.so.1.0.0.disassembly.asm0x1a41e–0x1a48c appends that string in a48-byte pipelineInfo record at Base+12/end+16. | The backend PipelineBase ID is separate from our logical UTP returned ID. A current-attempt join is required; do not substitute either ID or infer a join from appId alone. |
| Shared element can retain its first parent | E0x1a50a/0x1a510 creates a share handle/checks isShared; the shared branch skips plugin _open, unshared calls slot+16 at0x1a55c. K video-sink.asm0x8c38–0x8c44 copies the **first** pipelineInfo string into K+0x1c4. K0xae8a–0xaecc passes it to Builder+24; A0x5848–0x5854 stores A+0x74. | setAppWindowInfo does not set or override this parent through a pipelineId JSON key. Reuse can preserve an earlier parent. Refuse ownership claims when the first/current context and reuse disposition cannot be joined to this attempt. |
| Child owner versus command target | A0x710a–0x7114 registers class avconnector with app string and reserved=false;0x712e–0x7148 sends A+0x74 as parent through setOwnerPipeline. R stores returned child connectionId at+0x1c; its command service suffix is generated separately at0x7aa2–0x7ab4. | Require logical UTP ID→backend ID→first/current element context→child resource connectionId→accepted owner association→exact command service. Same-app matching, guessed suffixes and window IDs cannot supply this chain. No borrowed owner or C++ address/pointer calls. |
| Resource observation lead | R trackResourcesStatus0xc5fc constructs connectionId at0xc65e–0xc684, appends /trackResourcesStatus literal0x15210 at0xc6ba–0xc6bc, and subscribes at0xc714. C acquire0x1b644 returns child allocation data separately. | This is a concrete **candidate subscription**, not a proven passive server handler or usable grant getter. Do not call it based on its name. Server behavior, filtering, output and permission must be traced first. |

The evidence contract keeps submission, logical allocation, hardware behavior and
release separate:

| Evidence required per A/B slot | Acceptance / unknown boundary |
|---|---|
| Own logical and backend identities | Returned by this attempt and joined through actual records; raw IDs stay private. Public traces use A/B slots, finite outcomes and counts. Missing, old or ambiguous associations remain unknown and stop progression. |
| Element and child ownership | Classify fresh/adopted/reused, preserve first/current parent and accepted child-owner association, and bind the intended command target. A generated service or a second shared_ptr alone is insufficient. |
| Receiver and presentation grants | Record actual VHDMIRX resource type, grant selector/PRIDX, child MAIN_SCALER/SUB_SCALER completion and policy/preemption disposition. Unequal logical grants do not establish exclusive physical receivers. A missing receipt is unknown, not inferred from cached occupancy/planeIDs. |
| Source and sink binding | Require current HDMI sourcePort/model-map provenance and distinct named MAIN/SUB0 bindings after completion. A reply or same-sink replacement is insufficient. |
| Behavior and cleanup | Independently advancing physical sources together, then A continuity after B-only stop/close, then normal restoration. These establish observed coexistence/isolation only; physical release/reacquisition, audio ownership and stability remain separate unknowns. |

**Missing transport evidence:** these client bodies do not establish a safe
outward-facing UTP selector or own-child lookup. The captured server wrappers
below narrow the delivery path, but their selected-record/owner join and ordering
before B's first presentation connection remain unresolved. Eventual delivery to
some client does not settle either gate.
LG's [OSE registration template](https://github.com/webosose/umediaserver/blob/af89f8ac3355027a90d7b299a78fb6fab9b6ffca/files/sysbus/com.webos.media.service.in#L1)
and [ResourceManagerClient source](https://github.com/webosose/umediaserver/blob/af89f8ac3355027a90d7b299a78fb6fab9b6ffca/src/resource_manager/ResourceManagerClient.cpp#L114)
are pinned at af89f8ac3355027a90d7b299a78fb6fab9b6ffca, Apache-2.0; inspected
privately, no upstream code copied into the application. That older counterpart
lacks the saved C1 privateCommand/setOwnerPipeline paths; it cannot substitute
for the retail server body or prove retail API/permission behavior.

The one bounded read of the OSE-style descriptor path was **absent**; all
connections closed, zero content opens/reads, no retry/alternate lookup or
executable collection. [Actual record](../device-tests/c1-journal.md#media-server-descriptor--bounded-absent-file-result).
This establishes absence of that exact file, not absence of com.webos.media.
The separate fixed process/executable-identity lookup subsequently completed
once: one SSH/exec channel,23 stdout bytes, zero stderr, exit0,292.343 ms and
confirmed closure. [Actual record and raw hashes](../device-tests/c1-journal.md#media-executable-identity--single-bounded-lookup).
Closed stdout and the receipt agree on one allowed private executable candidate
path. No target-file bytes or metadata were read. The procfs observation is not
an atomic process birth identity, regular-file proof or active loaded-byte hash.
As-used sources/74-case acceptance and local verification:
build/phase-2/hdmi-media-identity-read-20261117-001/verification.json.

The separately bounded inert-file request then completed once after87 offline
operational/header acceptance cases. Saved input:
build/phase-2/hdmi-media-server-evidence-20261117-001/media-server.elf,
**529,960 bytes**, SHA256
`1f3a45553139881e2ca978352ae0c87e8654b571b0d439af131b5e2fa82c2d4e`.
[Actual metadata/EOF/closure and receipt hash](../device-tests/c1-journal.md#media-executable--single-bounded-inert-file-capture).
One SSH/SFTP connection/open, ten reads including EOF,12 stable metadata checks,
452.084 ms; no exec/retry/forced closure. Original observed path remains private.

Separate closed-local-byte header inspection recognized ELF32 little-endian,
ET_DYN(type3), ARM(e_machine40), ident/ELF version1, declared header52 bytes.
This is **retrieved inert evidence with a recognized header**, not full ELF
validity, ABI closure, verified service role or equality with active loaded
bytes. The earlier procfs lookup and file read were separate scopes; replacement,
process exec/reuse and mapping identity remain unresolved. No vendor loader,
parser, initialization or code was executed.
As-used sources/header reader/acceptance and independent raw/hash/metadata/ACL/
preservation verification:
build/phase-2/hdmi-media-server-read-20261117-001/verification.json.

### Saved media-server selector and observer handlers

**Verified static / candidate delivery, 2026-11-17.** M is the529,960-byte saved
media-server.elf with SHA256 above. Addresses below are ARM32 ELF virtual
addresses with Thumb bits cleared, not runtime addresses or app constants.
Private evidence: build/phase-2/hdmi-media-server-trace-20261117-001/.
findings.json, seven reviewed excerpts, SDK readelf/objdump output and
verification.json bind16 literal calculations and two registered callbacks to M.
The owner-body excerpt is explicitly unresolved. REA export evidence was saved
and its target cleared; deep native providers were unavailable. No vendor code,
service method or further TV connection was used.

| Boundary | Exact saved instructions | Result and remaining limit |
|---|---|---|
| Registered setSink | Constructor0x23d3c; setSink literal0x74618 at PC0x25c36/pool0x26390. Pool0x26398 resolves via GOT0x90ffc, relocation23, to Thumb thunk0x68361. addEventHandler0x25c56; thunk0x68360 branches at0x68368 to setSinkCommand0x48c38. | This is a registered wrapper in M, beyond an exported name. Effective active registration, bus policy and permission for the own app are unknown. |
| Outer selector grammar | setSinkCommand0x48c38–0x4978c requires mediaId and avSink; key accesses0x48d28/0x48e2c, mediaId asString0x48e74 and avSink JGenerator0x48ea4. | The server serializes avSink; the downstream private command carries a string. Logical UTP IDs cannot be substituted for the unresolved mediaId join. |
| Selection and fallback | server+32/slot200 virtual call0x48ec2; nonzero branches0x491ba. Zero path calls server+28/slot12 at0x48ed6; record traversal+360/+368 at0x49044–0x491b6 and lookup again0x490a8. | Virtual targets, record meaning and selection/fan-out are unresolved. This cannot yet establish delivery only to the new attempt's own second child. |
| Private-command forwarding | key/payload/setSink literals bound through pools0x496b8–0x496c0. Selected record string+80 gains /privateCommand at0x49132–0x49152; UMSConnector::sendMessage0x49170 uses a null callback. | A fallback builds the known key=setSink/string-payload body and sends it to a selected record's command service. Sending supplies no downstream reconnection/grant receipt. |
| Registered resource observer | trackResourcesStatus literal0x7486c at PC0x26756/pool0x27230; pool0x27238→GOT0x90df8→Thumb thunk0x68529, relocation23. addEventHandler0x26778 has explicit bus enum0; thunk0x68528 branches0x68530→handler0x5c404. | The handler exists statically. Enum0's bus/policy meaning and own caller eligibility remain unmapped; do not infer public availability. |
| Observer side effects and reply | Handler0x5c404–0x5cb38 reads connectionId at0x5c604–0x5c622, calls server+28/slot12 at0x5c642; addSubscriber0x5c6b6 uses resourcesStatus_+id and sets record byte+200 at0x5c6c6. Response built0x5c6de–0x5c746, sent0x5c768. | It registers a subscriber and sets observer state. Reply fields include available/resources/subscribed/updateResourcesStatus/returnValue; resources is initialized through the string constructor from literal "{}". This acknowledgement is not a fresh grant list or a plain getter. Actual updates, unsubscribe and cleanup remain untraced. |

**Candidate outer shape inferred from parsing and forwarding**, not a runnable
request or accepted own-session identity:

```json
{"mediaId":"<unresolved own backend/resource join>","avSink":{"videoSink":{"type":"sub_video"}}}
```

The avSink object above is serialized into the privateCommand payload string;
the fixed inner body remains unchanged. No command-service suffix, borrowed ID,
policy grant or live call is proposed. The later ownership pass below resolves
the manager object bindings, registration target and cache replay. Exact manager
virtual implementations remain outside the saved executable. unregisterPipeline
0x55dfc(size1212) and getActivePipelines0x5304c(size4768) remain unreviewed leads.

### Manager bindings, selected records and owner replay

**Verified static / ownership acceptance unknown, 2026-11-17.** Same M source/hash;
new private audit: build/phase-2/hdmi-media-owner-trace-20261117-001/.
inventory.json, findings.json,14 excerpts and verification.json preserve the
object bindings, typed record layout, registration/owner/reset wrappers and
reply dataflow.22 literals, two record-vtable bindings and two singleton imports
are checked against raw M bytes. An independent review corroborated these paths.
All work was offline: zero TV connections, service calls or vendor execution.

| Question | Exact M evidence | Conclusion and limit |
|---|---|---|
| Which manager supplies each virtual call? | ResourceManager::instance(Config) PLT0x18df4/import GOT0x90a10 is called0x24212 and stored server+28 at0x24216. PipelineManager::getInstance PLT0x1889c/import GOT0x9084c is called0x24218 and stored server+32 at0x24220; both imports are R_ARM_JUMP_SLOT22. | setSink0x48ec2 is **PipelineManager vptr byte offset200**; fallback0x48ed6/0x490a8 is **ResourceManager vptr offset12**. Object identity is resolved. Exact function name/address/body and effective dynamic provider are unresolved; do not label offset12 a verified named findConnection function from the older OSE header. |
| What is the returned record layout? | Typed map-copy0x67514 allocates472-byte nodes, constructs key at node+16 at0x6752a–0x67544, installs BasePolicyValue and resource_manager_connection_t vptrs at node+40 at0x6755e/0x6758e. Pool0x680a8+effective PC0x67546 yields GOTbase0x90804; pool0x680b0→GOT0x90cec→record vtable0x8fde0, relocation23. | The resource record begins at node+40, so node+120 is record+80. This layout is instruction-bound; it is not borrowed from the differing OSE struct. |
| Where does the target service originate? | registerPipeline0x54f64 requires type/appId, generates a resource connection ID and calls RM offset16 at0x5537c. After success, getSenderServiceName0x55398 and addRoute0x553aa precede connection-tree search0x55672–0x556ec and sender assignment to node+120 at0x556ee–0x556f4. Reply returns connectionId at0x558b4/0x558c2. | The saved registration wrapper binds the generated resource ID's record+80 to the actual registering message sender. A guessed suffix, appId or logical UTP ID is unnecessary and insufficient. This does not authenticate a later owner request or prove active registration. |
| Which records get setSink fallback? | Returned record's tree uses header/end+360, begin+368 and count+376.0x49044–0x491b6 iterates its string IDs, calls RM offset12 for each at0x490a8 and sends to that returned record+80/privateCommand at0x49170. | **Associated-record ID fan-out**, with no avconnector/type filter in this loop. Candidate children, not verified authorized child membership: insertion/removal and validation are in unresolved manager code. Earlier+376 is a tree count, not an ownership flag. No promise of exactly one target follows. |
| Is selection retained? | Key setSink resolved at0x48fc2; tree rooted at record+404/header+408 is searched, serialized avSink assigned at0x49030–0x49036 or inserted through0x49414–0x4941a. | The fallback retains a selector string before forwarding. Cached adoption/replay must be separated from new selection and fresh hardware acquisition. |
| What happens on owner association? | setOwnerPipelineCommand0x4b564 passes supplied connectionId/ownerConnectionId to RM offset64 at0x4b808. On success: owner lookup0x4b81c, cached setSink search record+404 at0x4b826–0x4b8a0, supplied child lookup0x4b8ba.0x4b8d0–0x4b99c builds key/payload, child+80 supplies service0x4b9c0, append0x4b9e6 and null-callback send0x4ba04. | **Cached selector replay after successful association** is implemented in M. This is a candidate preparation seam before child association, not a proven pre-MAIN ordering route. Missing cache/record or replay failure does not alter the association Boolean stored0x4b80a and used0x4bc02. The wrapper's inspected calls have no direct sender-to-owner comparison; provider checks and caller policy remain unknown. |
| Can a false selector reply mean no change? | PM result stored stack+116 at0x48ec4; only other access is0x491d4, passed to createRetObject0x491dc. That helper constructs JValue(bool)0x2b8c6 and puts returnValue0x2b8e8. Fallback send success and failure/log branches rejoin0x4918a and iterate. | **No.** Initial PM false can coexist with selector caching and zero/one/many forwarded messages, while the outer returnValue remains false. Neither false nor true is a no-action, reconnection or grant receipt. Do not retry based on that reply. |
| Does reset establish release? | resetOwnerPipelineCommand0x4bff4 passes both supplied IDs to RM offset68 at0x4c294; its result flows0x4c29c→0x4c2ca into the reply. | Only an association operation is established at this boundary. Membership removal, validation, resource effects and hardware release require the missing implementation and behavioral evidence. No reset was called. |

**Saved-evidence limit:** bounded inventory used rg over build/dist filenames
ending .elf or .so[.digits]:51 candidates,42 parsed ELF32 little-endian dynamic
symbol tables, nine unparsed files retained as explicit exclusions. No parsed
artifact defined either manager singleton or manager vtable; no matching manager
SONAME was found. This is not a search of all extensionless/embedded artifacts or
runtime mappings. M's DT_NEEDED lists libresource_mgr.so.1 and
libums_pipeline_mgr.so.1; these are provider candidates, not proven symbol
resolution, absolute paths or active-loaded identities. Their exact vtable
entries cannot be reconstructed from M's indirect calls. The older nonvirtual
OSE class declarations cannot supply this retail ABI.

The smallest missing bodies are **ResourceManager offsets12/16/64/68** (lookup,
registration, association acceptance and ID-tree insertion/removal), then
**PipelineManager offset200** for the primary selector path. The
[single passive mapping lookup](../device-tests/c1-journal.md#resourcemanager-mapping-lookup--connect-timeout)
is spent after an SSH connect timeout. No command ran, so the loaded mapping and
provider file path remain unknown. Establishing provider identity still requires
an evidenced path and ELF symbol/vtable linkage. The DT_NEEDED candidates alone
leave singleton/vtable resolution open.
Remaining saved-body work can correlate replay with A initialize and K::_start,
but cannot replace the missing owner-validation implementation.

The runtime join still needs this attempt's logical UTP→backend→first/current
element context→child resource ID→accepted owner association→sender service.
First-parent retention under element sharing remains a direct contradiction to
inferring that join from same-app or distinct UTP IDs. Pre-MAIN ordering,
effective caller permission, actual grant/update/release semantics, concurrent
frames and isolated hardware release remain unknown. The existing five-path
assessment and review-only dual-source draft remain in force, with no runnable
trial. Do not repeat capture/identity/lifecycle work, guess a target or call a
selector/subscription/reset to compensate for this static boundary.

### TVRM grant-to-receiver mapping

**Verified static, 2026-11-16:** allocation-mask encoding and grant packing are
now traced in the saved allocator. Actual receiver independence remains
**unknown**. C1/03.53.45 is the retained device context; file retrieval does not
establish which image is loaded or which branch is active. No vendor image was
executed and no allocation/query API was invoked.

Exact sources, linked instruction addresses with Thumb bit cleared:

- **T:** `/usr/sbin/tvrm`, retained as
  `build/phase-2/hdmi-tvrm-allocator-evidence-20261116-001/tvrm.elf`,550,784 bytes,
  SHA256 `82b6ef471b79ccc506511808ae63aad44fb4504e9ae18343497e2fded2ee4d21`.
- **L:** `/usr/sbin/legacy-broadcast-atsc`, retained as
  `build/phase-2/hdmi-tvrm-backend-evidence-20261116-001/legacy-backend.elf`,
  8,119,652 bytes, SHA256
  `7d6ed117b10a992df888279ba5cb41bcfd10df6fe14240f3e526cbdd1cbd6926`.
- The exact candidate registration
  `/usr/share/luna-service2/services.d/com.webos.service.tvrm.service` was absent.
  Bounded filename listings then grounded the legacy registration and the
  separate `tvrm` executable. Saved
  `.../hdmi-tvrm-legacy-service-evidence-20261116-001/tvrm-service.ini`
  (2,044 bytes, SHA256
  `edfe060173101ca9e939bbaaa75820b77e9dbcfdc1a2439a197866c7ad91404b`)
  names **com.webos.service.legacybroadcast.tvrm**, Exec L, Type static.
  This is not the exact older client URI **com.webos.service.tvrm**
  (saved libtvrm_client string file offset `0xb394`). Alias equivalence and
  active ATSC/DVB selection remain unknown; absence in this one directory is
  not service absence.

| Boundary | Exact evidence | Finding and limit |
|---|---|---|
| Legacy wrapper versus allocator | L API_RM_RequestResource calls **tvrmclient_request_resource@plt** at `0x4c3b4c`. L API_VIDEO_HDMI_GetResourceNum `0x4d8c7c` and GetResourceIndex `0x4d8c88` are `movs r0,#0; bx lr`. AHDMI count at `0x300d94` instead returns constant2. | L does not implement allocation at these entry points. These constants/stubs establish neither zero video receivers nor two concurrently usable audio paths. T contains API_RM_RequestResource at `0x4e2a8` and real port allocation at `0x4b970`. |
| Distinct resource namespaces | T CopyDilResourceToTvResource loads name table through pool `0x4a8d0` / add-PC `0x4a7ec`; table `0x94ca4` has VHDMIRX19 → `0x775dc`, AHDMIRX20 → `0x775e4`, HDMI_INPUT37 → `0x77678`. | Physical input selection and video/audio receiver resources are distinct types in this image. Their type numbers are not connector or receiver indices. |
| Mask representation and allocation | T ConvertToPort `0x49548–0x49556` maps k0..7 to byte `1<<k`, otherwise zero. GetFirstBitPos `0x4952c–0x49546` returns the first set-bit position (8 for zero). Helper `0x4a158–0x4a240` reserves requested/free bits against a used mask and updates it only when the requested count is satisfied. AllocatePortOfResource `0x4b970–0x4baaa` stores allocation results in internal64-byte record `+22/+23`. | Eight bits are the encoding width, not a measured count of C1 receivers. A nonzero returned mask can also originate from reuse, provider fixed-index selection or central allocation. Do not translate k directly into physical HDMI k+1. |
| Connector versus receiver choice | T ext-input predicate `0x499c4–0x499ce` accepts types34..38. CopyDilResourceToTvResource `0x4a828–0x4a83a` masks input byte `+41` with15, converts that ordinal to a bit and stores `+22`. VHDMIRX19/AHDMIRX20 instead dispatch to true at `0x4997e` in fixed-index predicate `0x49960`; `0x4a840–0x4a864` calls GetFixedResourceIndex when its mask is absent. | HDMI_INPUT37 follows the input-port nibble. Receiver resource types19/20 can obtain their mask through a different mapping. This contradicts the shortcut that every HDMI resource index simply equals its connector number. Actual provider values remain unknown. |
| Provider queries and cache | T GetFixedResourceIndex `0x496a8–0x49710` selects provider or cached lookup using registered resource/provider names. `tvinfo_get_fixed_resource_index` builds **hwResourceType/hwResourceName/inputType/purposeType**, **queryType:getFixedResourceIndex**, **queryData**, and a provider **luna://…/getData** request (`0x28768–0x28980`). GetPhysicalResourceNum `0x4975c–0x498c0` caches counts and can call tvinfo at `0x498b8`; that builds **multiQuery/queries/getPhysicalResourceNum** and provider `/getData` (`0x291ba–0x29416`). | Provider-derived fixed-index/count caching is separate from adopting a cached playback session. These code paths do not disclose the effective model values or runtime cache contents. Neither generic uMedia example counts nor stub constants settle them. |
| Reuse and central arbitration | T matching-resource branch copies existing `+22/+23` masks at `0x4a74a–0x4a756`. AcquireResource calls AllocatePortOfResource `0x4c5ee`, then **_CRM_AcquireResource** `0x4c5fe`, before grant packing `0x4c61c`. CRM delegates at `0x46814` to helper **0x4598c**; its failure branch converts release conditions and releases port bookkeeping at `0x4682e/0x46834`. | A response can reflect reuse. Reply reconciliation is now traced below: fill an unset mask, otherwise require equality. Central server selection/preemption remains unknown. Bookkeeping release is not verified physical hardware release. |
| Grant mask → element-factory index | T _PIF_MakeResourceListForTVPipeline uses64-byte internal and48-byte response strides (`0x47c74–0x47ca8`). Load `0x47caa` reads original internal `+22`, GetFirstBitPos at `0x47cae`, store `0x47cba` writes response `+21` (**PI_PORT**). Original internal `+28` is loaded at `0x47cc0` and stored into response `+25` (**PI_PRIDX**) at `0x47cee`. Release-list packing also converts `+22` to response `+21` at `0x47d7e–0x47d9c`. TVRMClass::request_resource invokes allocation `0x64faa` then JSON packing `0x64fc8`. | This connects allocator mask → response ordinal → the previously traced client/factory PI_PORT. PI_PRIDX is a separate field. It establishes index encoding and consumer binding, not how a given receiver was chosen or whether two physical inputs stay live. |

#### Central-RM completion and mask reconciliation

Helper `0x4598c` is traced through normal-mode result copy-back in saved T.
Exact source-bound excerpts/checks:
`build/phase-2/hdmi-tvrm-central-trace-20261116-002/`. The older empty001
ACL-refusal slot is preserved; it is not the source of these findings.

| Step | Exact T evidence | Meaning / limit |
|---|---|---|
| Choose mode | Helper `0x45784` reads readiness and simulation. With readiness nonzero and simulation false it stores **mode3** at control block `0xa27a8 +8` (`0x457dc–0x457f0`). Ready predicate `0x4584c` tests that block's `+4 ==3`. The request copy at `0x44af6` returns without filtering for mode3 (`0x44b00–0x44b08`); other modes have separate branches. | This is the inspected normal mode, not a runtime observation of the current TV. Its full copied working list is used for central reconciliation. |
| Allocate VHDMIRX locally first | The byte jump table at `0x49990` sends types19,20,37 to **true** at `0x499bc` in IsThisUsedForTVServiceOnly. The ready/non-simulation branch calls that predicate at `0x4ba40` and returns these types to local allocation at `0x4b9ca` via `0x4ba46`. | VHDMIRX is not simply deferred to a central free-index picker when CRM is ready. Local/fixed-index selection and reuse must be traced to understand its mask. The predicate name is not a claim that no central request includes this resource. |
| Build central request | `0x44bf0–0x44c1e` copies resource name, count and masks into JSON working fields `+28/+29/+30`. MakeJSonArray `0x4705c` writes **resource/qty**. When mask `+29` is nonzero and qty is1, `0x4712c–0x4713a` branches to write **index**, using GetFirstBitPos at `0x4721e`. The inspected shareable predicate at `0x49950` returns false. | A previously chosen single receiver is sent as an explicit requested index. The shareable predicate here does not rule out sharing/reuse elsewhere. It does not prove exclusive hardware ownership. |
| Deliver and obtain completion data | `0x45ab8` calls rmc_requestResourceToCentralRM `0x39f28` with request/result buffers. That routine passes request text and a result-pointer address to imported **ResourceManagerClientAcquire** (`0x3a05c–0x3a06a`) or **TryAcquire** (`0x3a1ea`). A nonnull result pointer branches from `0x3a0ee–0x3a0f0` to `0x3a440`, which copies `strlen(result)` bytes to the caller buffer and frees the result at `0x3a45c`. | This traces the caller's completion-data consumption, not the implementation of the imported C API. Its slot0..7 check (`0x39f30`) selects a logical pipeline/client handle, not a receiver number. The source also contains retry/release branches; it is not a bounded active-probe contract. |
| Respect the C-library boundary | T requires **libresource_mgr_client_c.so.1**. R_ARM_JUMP_SLOT `0x958d0` resolves Acquire and `0x95904` resolves TryAcquire. That C wrapper is a distinct, unsaved dependency. | Do not silently equate these imports with the previously saved C++ libresource_mgr_client.so.1 methods. C-wrapper wait/callback/error semantics and active central-service identity remain unknown. The earlier C++ client's untimed wait is not direct proof of this caller's wait behavior. |
| Parse reply into masks | After request success, `0x45ad0–0x45ae6` copies/parses result data. ParseJSonObject `0x46da0` looks for **resource**, **index**, **qty**. Index decoding reads the character after `:` and subtracts `'0'`, then ConvertToPort at `0x46e82` writes a bit to temporary `+29`; qty goes to `+28` (`0x46ea4–0x46ed2`). | This is a narrow single-digit parser, not a general JSON-number decoder. Values0..7 encode receiver-mask positions; that width still does not measure available receivers. |
| Match resource and reconcile | GetTargetJSonObject `0x472e0` matches resource names, ORs matching masks at `0x47338–0x47344`, sums quantities and requires exact requested qty at `0x47348–0x47366`. Helper selects relevant records at `0x45b96–0x45bc6`, requires nonzero returned mask (`0x45bd0–0x45bd6`), fills internal record `+22` at `0x45bde` only when its old mask is zero. Otherwise `0x45b3e` compares old and returned masks; mismatch branches to `0x461ba`, then failure at `0x460e0–0x4612c`. Missing/zero matches also fail there. | Central completion can fill an unset mask. It does not silently replace a nonzero VHDMIRX mask with a different receiver in this path. A matching mask is consistency evidence, not a new receiver or concurrency proof. |
| Commit to caller and grant | In mode3, `0x45df8–0x45e18` calls CopyTvRmResource with caller destination and reconciled working source. That delegates at `0x4bce0` to helper `0x4a488`: memcpy of `0x828` bytes (`0x4a490`), then repairs app-ID pointers, preserving mask fields. Acquire continues through grant packing `0x4c61c`, previously traced internal `+22` → response PI_PORT at `0x47caa–0x47cba`. | The returned index is now connected to caller state through the completion path. Mode4 invokes allocation again (`0x4609e`), while mode5 takes a separate release/simulation path (`0x45fec`); neither establishes the normal mode's runtime disposition. |

**Inference from this static path:** adding another window or requesting an
arbitrary central index cannot be assumed to obtain another physical receiver.
For a selected one-resource VHDMIRX mask, the normal path requests that same
index and checks consistency. The next useful discriminator is the registered
provider's fixed-index response for different HDMI inputs, including the
absent-provider/local-allocation branches. Actual index values, central
arbitration/preemption, independent sinks and physical concurrency remain
**unknown**. Direct private acquisition/selector calls remain outside read-only
scope; no new IPK or experiment was prepared.

#### Provider registration, non-fixed reply and physical selection

Saved G/S/T and **Rtv**, the retained
`build/phase-2/hdmi-release-deps-20261112-001/libtvrm_client.so.1.0.0`, SHA256
`db04ad77bd0bdec15af06fc04a1283c8e8e9afe367e02d64c9d76205448d2e20`,
ground the provider trace. **B** is the extinput-integration ELF identified above.
Instructions/config replies and verification:
`build/phase-2/hdmi-tvrm-provider-trace-20261116-001/`. Only passive getConfigs
was used for those snapshots; no allocation or selector was invoked.

| Link | Exact saved evidence | Finding / limit |
|---|---|---|
| Type identity | T RmResourceToPipelineResource at `0x49a0c` reads table `0x787e4`: entry19=15. Reverse at `0x49a24`, table `0x788e4`: entry15=19. | Ordinary element type15 is now grounded as VHDMIRX19. This converts resource types, not port numbers. |
| Provider registration | G init finds **extinput** in the executable name (`0x290f6–0x29106`). Bitmap base `0x451e4 +24`; store at `0x29112` writes base+43, i.e. resource19. It registers the bitmap at `0x2906c–0x29072`. Rtv `0x5c1a–0x5c7a` emits each set byte as **resourceType**, wraps **resourceList**, sends **/registerHandledResource** at `0x5cb6–0x5cb8`. T reads resourceType and task client name at `0x65624–0x6564c`; RegisterHandledResource stores that name in a129-byte per-resource slot (`0x4963c–0x4966a`). | Static extinput→VHDMIRX provider ownership is explicit. The current TVRM registry and loaded instance were not queried; this does not assert live ownership. Registration itself allocates no receiver. |
| Query dispatch | G registers its fixed-index callback at `0x28e8c`; GOT slot `0x44f04` resolves getFixedResourceIndex. Rtv stores it at client storage+60 (`0x38e0–0x38e4`). Its getData method row `0x1e008/0x1e00c` points to Thumb callback `0x70f9`; queryType **getFixedResourceIndex** reaches helper `0x449c`, which invokes the stored function at `0x46b4–0x46c8`. G calls its PipelineManager callback at `0x2b77a`; the manager sends internal **fixedResourceIndex** (`0x2316c`, `0x2332c`). | Provider dispatch is now concrete through the saved client and internal service callback, not inferred from exported names alone. |
| Successful fixed-index reply | S Watcher::cbFixedResourceIndex validates its parameter then constructs **index:255** at `0x92bf6–0x92c1c`. G reads **index** at `0x233d8–0x233ea`; connector `0x2b78a–0x2b79c` calls convertPort. That helper `0x28d48–0x28d56` returns `1<<k` for k0..7 and **0** otherwise. Rtv publishes callback result under **fixedResourceIndex** at `0x742e–0x7454`; T reads that field at `0x28bd8–0x28bf2`. | Successful S index255 becomes **mask0**, not receiver255 or mask255. This provider does not fix HDMI1/HDMI2 to distinct receiver indices. Zero means there is no fixed selection in this path. Query failures/default values remain separate and must not be interpreted as a valid mask/capacity. |
| Local choice and missing registration | T GetFixedResourceIndex returns0 when applicability/provider registration is absent (`0x496b2–0x496c0`, `0x496f6`). A missing fixed mask continues into local allocation; ready VHDMIRX still routes locally via `0x4ba40–0x4ba46`. Helper `0x4a158–0x4a240` searches free bits against existing use and commits only the requested count. | The successful non-fixed reply permits local free-slot choice. It does not bind that slot to a physical connector or demonstrate exclusive hardware. Cached fixed-index results and cached playback sessions remain different mechanisms. |
| Physical HDMI selector | G grant PI_PORT enters H's typed factory/Base constructor (`0x3684e/0x368ba`, `0x35e20/0x35e60`). Separately, S gets videoIndex/map at `0x65442/0x65476`, indexes by logical input at `0x6550a–0x65518`, then setHwPort at `0x6554e`. H stores k at `+0x188` (`0x38126–0x38132`), constructs driver with **k+1** (`0x4070a–0x40738`), opens fixed **/dev/video12** (`0x33958`) and selects using ioctl **0xc0045627** (`0x33828–0x33870`). | The traced driver argument comes from the physical input map, not from PI_PORT. A second logical resource slot is not yet an independently selected hardware context. The saved kernel trace below establishes shared readback and per-port activation flags; independent receiver ownership/release remains unknown. |

**Configured C1 values, verified passive snapshot:** getConfigs returned
`extinput-service.physicalResourceNum = {… vhdmirx:2, ahdmirx:2 …}` and
`tv.model.videoIndex =3`, with returnValue true and subscribed false.
`inputMap.videoInputMapIndexInfo` appeared in missingConfigs. These are service
configuration values, not measured receiver isolation, current free capacity,
active TVRM grants, or proof that a loaded backend has no input map. The saved
generic uMedia example's VHDMIRX3 must not override this C1 snapshot's2.

#### Sysfs driver identity and selection-state boundary

**Verified metadata/static, 2026-11-16–17:** exact saved sysfs reads identify
the video12 class node's bound platform driver as **hdmi20_v4l2**. Its name
attribute is empty; `dev` is **81:9**, with uevent DEVNAME **video12**.
The successful link metadata is:

- `/sys/class/video4linux/video12` →
  `../../devices/platform/hdmi20_v4l2/video4linux/video12`.
- Its `device` → `../../../hdmi20_v4l2`.
- Its `device/driver` → `../../../bus/platform/drivers/hdmi20_v4l2`.

The subsequent actual `/dev/video12` listing confirms character **81:9**.
The observed driver has no `module` link; all30 filtered HDMI kernel symbols
lack module annotations. Matching embedded symbols in the collected kernel
support **built-in ownership**, beyond the missing-link inference alone.
The driver name does not limit its HDMI protocol version or prove singleton
hardware. Original private metadata, immutable one-shot records and analysis:
`build/phase-2/hdmi-video12-driver-trace-20261116-001/`.
Fresh owner/symbol/image evidence and offline trace:
`build/phase-2/hdmi-hdmi20-owner-trace-20261117-001/`.

H gives stronger userspace detail: constructor `0x3415a` initializes descriptor
field `+16`; `0x34164` stores the supplied physical port at `+20`. Open
`0x33958–0x33972` stores the returned descriptor in that object. Connect
`0x33828–0x33842` reads those two fields and sends one four-byte port integer.
Close `0x337d4–0x337e2` closes that descriptor. Disconnect is **not** a no-op:
`0x33848–0x3386c` issues **VIDIOC_S_CTRL**, ioctl0xc008561c, with ID0x0098590c
and the stored port. This corrects the earlier extended-control label: saved
UAPI line2203 defines S_CTRL as number28 / eight-byte v4l2_control; S_EXT_CTRLS
is number72 (line2237). These are static observations, not calls made here.
Separate object fields/fds establish userspace state, not isolated hardware.

The connect opcode0xc0045627 decodes to read/write, size4, type`V`, number39,
matching **VIDIOC_S_INPUT** in the [upstream Linux v4.4 UAPI](https://github.com/torvalds/linux/blob/v4.4/include/uapi/linux/videodev2.h).
The [upstream V4L2 core](https://github.com/torvalds/linux/blob/v4.4/drivers/media/v4l2-core/v4l2-ioctl.c)
passes file/fh/input to `ops->vidioc_s_input`; it does not establish where the
LG driver stores its selection. Unmodified references are retained with source
notices and SHA256s in this trace's raw directory; exact saved lines2211 and
1041–1045 respectively. They are **ABI references, not firmware-matched LG
implementation**. Actual saved LG callbacks and core dispatch are now checked
below; the upstream reference is no longer the sole basis for that route.

**Verified static, C1/03.53.45 saved kernel:** `/boot` exposed a regular
`Image.lz4-4.4.84-229.kcl4tv.6`, matching the passive kernel release. Its
15,822,619 bytes have SHA256
`7c51d5e34aaf1105031386f4a3968aa81c6824191e77d58a0275f2d8859f2ed2`.
Original bytes/inventory: `build/phase-2/hdmi-kernel-image-evidence-20261117-001/`.
Existing WSL liblz4 decoded119 bounded LZ4P blocks to31,112,704-byte ARM64
`raw/kernel.Image`, SHA256
`10adace3603b44e1b900f7c9d1990e65adb6ad2f9becbaac4fe8305635681605`,
under the fresh trace above. Its embedded version matches; all36 saved HDMI
and anchor symbols match recovered kallsyms (109,237 entries,427 marker and256
token-index checks). This is strong static attribution, **not a full running
kernel digest or a live selection test**. The37-byte compressed-file trailer
is retained and not interpreted as code. No vendor code ran.

All following addresses are **decompressed Image file offsets**, not H's ARM32
ELF addresses or exposed runtime addresses. Exact LLVM excerpts, source hashes,
symbol matching and callback/reference checks are in `raw/` of the fresh trace.

| Layer | Verified code and implication | Remaining limit |
|---|---|---|
| Actual dispatch | video_dev pointers at0x1d26430/0x1d26778 bind fops0x1d26b50 and ioctl_ops0x1d267b8. fops+0x20 → video_ioctl2; input callback pointer0x1d269a0 →0xb31694; G_INPUT pointer0x1d26998 →0xb3159c; S_CTRL pointer0x1d269d8 →0x793730. Saved core v4l_s_input0x5426f0–0x542718 forwards file/fh/input through ops+488. Device init0xb319cc–0xb319e4 registers video node12. | Callback bindings establish this static path, not current dynamic instrumentation. |
| Per-file open | open0xb317b4–0xb3189c allocates120 bytes, calls v4l2_fh_init/add and stores fh in file+208. fh+112 is a chip-dependent input count4/5. release0xb3174c–0xb317b4 calls v4l2_fh_release; it does not call port deactivation. | Separate fhs exist, but no receiver grant/index or ownership token is bound by these inspected operations. No hardware-release inference from fd close. |
| Global input readback | S_INPUT0xb316cc stores supplied input into **_g_v4l2_hdmi20_port**, file0x1d26098, before checking input−1 against fh+112. Valid input calls lower activation at0xb316f0 with (input−1,1). Both valid/invalid branches return0. G_INPUT0xb315c4–0xb315d0 reads that same global, ignoring per-file source selection. | This is shared last-request readback; successful return and G_INPUT cannot prove a receiver grant or actual selected hardware. Bounded ADRP/load-store search found these two references; other alias forms were not excluded. |
| Per-port activation | **HDMI21_HAL_Rx_Set_V4l2PortActivate**,0x73a290–0x73a360, writes one byte at `gHDMI21RxHandler + port*0x1060 + 0xea9`; base0x2306938. It checks a global port count, writes1/0 and advances global generation0x229531c. It does not clear another port on activation. Getter0x73a360–0x73a3d8 reads the same indexed byte. | Per-port software activity is real and contradicts equating global G_INPUT with single-receiver hardware. It does not allocate receiver hardware, establish independent processing or bind a sink. |
| Port-based disconnect | S_CTRL0x793730–0x7939d0 routes ID0x0098590c to value dispatch. Values1/2/3/4/5 clear activation for zero-based ports0/1/2/3/4 (calls0x793914/0x793878/0x7939bc/0x793928/0x79393c). Value6 loops over fh's input count and clears all at0x7937d4–0x7937f8. | These flags are indexed by port, with no file-owner check/refcount in the inspected setter/clear path. Same-port sharing and clear-all can affect another user; do not use them as a concurrent cleanup recipe. Other hardware effects/release remain unknown. |

The separate extended-control process_ctrl table's index12 reaches its no-op
case. **That is not the plugin disconnect route:** the plugin uses S_CTRL,
whose distinct handler above actually clears activation. Keep both ioctl types
separate. The direct-call scan of saved code `[0,_etext)` identifies the getter's
consumer at **0x74e538 in __HDMI21_HAL_Rx_MainThread**. Indirect/inlined users
were not covered by that scan. This consumer is now traced below.

#### Main-thread activation consumer and receiver processing

**Verified static, same C1/03.53.45 saved Image, 2026-11-17:**
`__HDMI21_HAL_Rx_MainThread` occupies file0x74dfc8–0x7525c0 (17,912 bytes).
The source SHA256 and36-symbol attribution remain as above; full live-image
identity/current state remain unknown. New exclusive private evidence:
`build/phase-2/hdmi-mainthread-trace-offline-20261117-001/`.
Exact LLVM instruction excerpts, decoded branches/callbacks, source pins and
preservation checks are retained there; all offsets below are Image file offsets.
REA reported no configured native deep provider; existing LLVM20 and the pinned
symbol table supplied the instruction evidence. No new tooling/package, vendor
execution or TV access was needed. This was not a live receiver test.

| Trace question | Supporting exact code | Conclusion and contrary limit |
|---|---|---|
| What does activation gate? | 0x74e4d0–0x74e4dc queries 5V into a stack word. Nonzero goes to0x74e568, then, subject to the PHY-status check,0x74e57c for the signal-present path. On the zero path, additional controls/HPD/state checks precede0x74e534–0x74e540: pass record+4 to activation getter, CBNZ→0x74ee28. That block records reason−2, clears record+4164 and rejoins0x74e3f0. | Nonzero activity result protects part of the no-input path; it does not allocate/start a receiver, and this getter is not the signal-present processing gate. Do not turn a returned activity bit into a second receiver claim. The5V helper0x73da68–0x73dfb8 includes debug/override/filter paths; the branch is based on its reported value, not an independent physical measurement. |
| Does the loop select one global input? | 0x74e3c0–0x74e3e4 establishes base0x2306938 and index0. 0x74e4b0–0x74e4cc forms `base + index*0x1060`;0x74e498–0x74e4ac and0x74ed50–0x74ed90 advance records, compare N, then sleep/repeat. | Verified per-port receiver-maintenance loop over prefix `[0,N)`, rather than selection through global G_INPUT. N and other global controls are shared; not all port/receiver combinations or concurrent frame paths are established. |
| What determines N? | N is gHDMI21RxDevVideoControler+0xa4c (file0x1d19494), labelled HDMI21__NUMBER_OF_ACTIVATED_LINK at0x1d19458, description “# of running HDMI ports” at0x1d19498. It is zero in the saved initialized-data bytes, not a runtime snapshot. Process_Cmd jump table0xe5aa34 maps command33 to0x754118. For chip revision>0x259f,0x754128–0x75413c copies g_hdmi20_number_of_ports to N; older branch0x754930–0x754964 copies count or count−1 according to a display-option field. InitCfg0x6f5530–0x6f5628 sets physical count4/5/4 by chip-revision branches. | N is configured separately from the activity bytes and TVRM VHDMIRX indices. The inspected writer does not count those flags or allocate grants. Actual chip branch, command execution/current N and later debug/alias writes remain unknown. No command33 or other command was sent. |
| Is receiver state per port? | Signal-present work passes record+4 to PHY lock/clock routines at0x74e6a8–0x74e6b4. Calls0x7518dc/0x751a1c pass the current record to UpdateStableTimingInfo0x73e980. Its0x73eb44–0x73eb70 copies60 bytes from record+1764 to stable record+1704; clear path0x73eca4–0x73ecb8 clears that record's stable block. InitDevHandler0x738028–0x738110 zeroes/initializes each0x1060-byte record and stores its own port at+4. | Separate timing/status records and port-parameterized maintenance are verified. Shared PHY, crossbar, clocks, decoder capacity and actual simultaneously advancing frames are not established by separate software records. |
| Are register reads also port-specific? | InitDevHandler0x738244–0x73827c binds each record+176 to LINK_Read_Port0…4 (0x758630+port*0x20). Each wrapper supplies its constant port to common reader0x757e78;0x757e88–0x757eb8 selects that record, loads mapped pointer+48, reads pointer+register-offset, or returns0 for a null mapping. MainThread uses those callbacks, e.g.0x74ee48–0x74ee88. | Concrete indexed register access, not merely five exported names. Distinct wrappers/pointers do not prove distinct physical ranges: the mapper's source bases must still be compared. |
| Where do mapped pointers come from? | InitDevHandler0x738038–0x7380e0 copies per-port bases/sizes from gHDMI21ChipRegHandler (file-relative symbol0x22919d0, beyond file-backed Image in BSS). In particular source table+32+4*port becomes record+40; table+52+4*port becomes record+56. Open0x746c58–0x746ca0 calls __ioremap(base,size) and stores result at that record+48; its loop advances ports through0x746e80–0x746e9c. | Independently stored mappings exist; the initializer decoded below gives distinct compiled LINK ranges. Actual runtime BSS contents are not present in the saved file and must not be fabricated from adjacent bytes. No register read, ioremap or initializer was executed here. |

**Candidate:** more than one physical port can be maintained through separate
records/callbacks. **Unknown:** effective hardware isolation on the C1's
actual chip branch, VHDMIRX-grant-to-bank binding, independently routable video
outputs/sinks, owner-safe release, audio and sustained dual operation.
The shared global input readback supports shared bookkeeping; it does not refute
the per-port maintenance code. Conversely, this loop cannot prove two allocations.
There is no new allocation/session cache mechanism in this trace.

#### Chip table population and LINK-bank intervals

**Verified static/derived constants, same C1/03.53.45 saved Image:**
HDMI20_Module_InitChipRev at file0x6f67e8–0x6f7388 clears then populates the
register table. Its x19 is file-relative symbol0x22918a8; table destination
x19+296 is **gHDMI21ChipRegHandler,0x22919d0**. The272-byte zeroing call is
0x6f683c–0x6f6874. Packed stores then fill per-port u32 fields; they are not
pointers to one shared table entry. InitDevHandler/Open/reader propagate those
fields as traced above. No initializer, memory mapping or register operation
was executed during this analysis.

**Portability requirement:** these offsets/register values remain evidence for
this saved kernel, not constants for the application. Code offsets vary with
firmware builds; register maps vary with chips. The target is broad LG webOS
coverage through available interfaces, runtime capability checks and qualified
model/firmware adapters. Do not ship direct register access, kernel offsets or
an assumption that the C1's interfaces/hardware exist on every TV. No current
prototype code or artifact is changed by this requirement.

| Compiled branch / exact constant blocks | Port0 LINK interval `[base,end)` | Port1 LINK interval `[base,end)` | Comparison |
|---|---|---|---|
| E60A0-labelled, revision>0x259f;0x6f69e4–0x6f6b44 | `[0xc3340000,0xc3350000)` | `[0xc3360000,0xc3370000)` | Distinct64 KiB ranges, no overlap. |
| O20B0-labelled,0x24af<revision≤0x259f;0x6f6b8c–0x6f6d10 | `[0xc9110000,0xc9120000)` | `[0xc9130000,0xc9140000)` | Distinct64 KiB ranges, no overlap. |
| O20A0-labelled,0x249f<revision≤0x24af;0x6f6fd0–0x6f7050, then shared suffix0x6f6bf8–0x6f6d10 | `[0xc9110000,0xc9120000)` | `[0xc9130000,0xc9140000)` | Distinct64 KiB ranges, no overlap. |

For example, E60's x14 materialization at0x6f6a60/0x6f6a8c forms
`0xc3360000c3340000`; store0x6f6aec writes its lower/upper halves into table+32
and+36, the two LINK bases. Both halves are different. A preliminary apparent
alias was rejected by the exact packed-word reconstruction. Lengths at table+52
and+56 decode to0x10000. In all three branches the populated LINK intervals
for the other eligible records are also pairwise non-overlapping; the E60
branch leaves record4's base/length zero, while both O20 branches populate it.
These are compiled table contents, not current free receiver counts.

#### VSC node context, source binding and compiled main/aux routing

Saved VSC instruction ranges and callback/data-table checks:
`build/phase-2/hdmi-vsc-binding-offline-20261117-001/`. Addresses are Image file
offsets. Apply the corrected CSEL condition below and in the VAL trace; the
original private reviewed report retains its preliminary reversed interpretation.

| Boundary | Exact supporting code / data | Conclusion and contrary limit |
|---|---|---|
| S_INPUT is not the selector | v4l2_vsc_vidioc_s_input0x6639c0–0x663a08 only logs the supplied argument and returns0. G_INPUT0x663a08–0x663a50 also logs/returns0, without writing the pointed output. Actual ioctl_ops pointers0x1880d68/0x1880d60 bind these handlers; fops0x1880b50 binds video_ioctl2. | Successful S_INPUT/G_INPUT provides no selection/readback evidence. Do not transplant the HDMI driver's S_INPUT meaning to VSC. |
| Context comes from the video node | Device init requests video numbers30/31/32/33 at0x667080/0x6670d8/0x667130/0x667184. Saved names are vsc-video-dev0…3. Controls0x666438–0x666458 use the node-number field at video_dev+780, subtract30, validate0…3 and map through file0xe258c8 = `[0,1,2,3]`. Open0x667e80–0x667ea8 uses the same mapping and stores fh in a global per-window slot. | This is a requested video-node number, not an observed device minor. Actual node presence/rdev were not queried. Distinct fhs/nodes are context evidence, not four independently granted planes; same-node opens share the index and can replace a global fh slot. |
| Real source setter | S_EXT_CTRLS0x6664b8–0x6664c0 passes control+mapped window to vsc_set_ext_ctrl0x664a50. ID **0x0098290c**, named V4L2_CID_EXT_VSC_CONNECT_INFO by the saved string table, selects0x664d20–0x664d94: copy12 bytes, call vsc_set_input(1,window,payload). | Source kind, port byte and a routing field are separate from the node/window index. The static control name/branch is established. The saved VAL bridge below now binds the caller's payload; no control was sent. |
| Window-tagged source/port request | vsc_set_input0x669fb8–0x66a3b0 validates kind≤7, port-byte≤16, routing-field≤4. At0x66a030–0x66a040, routing values other than2 become the node-window index; value2 remains2. **Correction:** instruction0x1a801280 at0x66a03c is CSEL w0,w20,w0,NE; the earlier private interpretation reversed this condition and remains preserved/superseded. The **kind3** case0x66a248–0x66a25c builds DE kind6 and duplicates payload port byte+4 into the final two words. Call0x66a0c0 sends opcode0x40146114 with five u32s: `[route,6,nodeWindow,port,port]`, using the kernel-buffer flag1. | A concrete port-bearing branch separates route and output-window tag. VAL below now grounds HDMI kind2→VSC kind3→DE source6, with port k unchanged. This does not map a TVRM receiver grant or prove active hardware routing. |
| Lower display-engine path | Kernel DE resource_mgr_ioctl0x6407a0 routes opcode low number20 to _ioctl_source0x63f9d0. That checks the exact opcode at0x63f9e0–0x63f9f8, validates route≤3 and selects per-route state0x63fc90–0x63fcd8, then calls DE_IO_SetWinPortSrc at0x63fcf4. DE_IO0x648f78–0x6493d8 serializes through a global mutex, builds a16-byte HAL request0x64907c–0x64908c and sends the full20-byte request as MCU operation82 at0x649098–0x6490b0. | This is the kernel display-engine resource manager, not proof of a user-space TVRM grant or owner binding. The global lock serializes configuration calls; it does not by itself imply one video source. MCU acceptance/behavior and grant→route ownership remain unknown. |
| Compiled independent-selector candidate | DE_HAL_SetWinPortSrc0x64d600–0x64d678 dispatches through a runtime chip-indexed callback. The compiled O20 callback0x6815e0–0x681700 passes route/source/port to CviMap0x681278. In its kind6 / chip-revision>0x24af branch, route0 writes low5 bits of shadow bytes+12/+14/+15 at0x68157c–0x6815bc; routes1/2 write low5 bits of byte+13 at0x681408–0x681420. Tables0xe277a8/0xe277c8 map port0/1 to distinct values0/1. | Route0 versus the auxiliary selector can represent different sources in this compiled branch. Routes1 and2 share the auxiliary field; route3 does not program these fields here. This is not four independent paths, an established MAIN/SUB0 mapping or evidence that this callback is active on the C1. Shared downstream hardware/firmware behavior remains unknown. |
| Cached state is not routing success | VSC per-window source cache has stride200, base file-relative0x215fba8, fields+4…+15. Kind3 calls the lower manager, but nonzero result0x66a0c8 goes through0x66a1a8–0x66a1c8 back to0x66a0cc, which still copies source/port/routing into that cache before returning the error. vsc_v4l2_get_input0x66c3c8–0x66c3e8 reads cached data. | Distinct cached sources can coexist after failed routing. A cached readback, successful logging stub or object count must never become concurrency proof. These global window records do not supply per-client receiver ownership. |

**Candidate, now narrower:** a node-selected window, separate source/port
payload and different compiled route0/aux selector fields provide a plausible
main/sub presentation mechanism. The VAL trace below now grounds ordinal→node/window/route and HDMI sourcePort
conversion. **Unknown:** actual MAIN/SUB0 capability order, active chip callback,
MCU82 acceptance, eligible TVRM receiver/scaler ownership and independent frames. Existing defaults still request MAIN; a second exported window does not
select another route by itself. Cached adoption/rebinding remains a separate
verified mechanism, with no new attribution of the0.1.12 trial.

#### AV connector to video-output service boundary

**Verified static, 2026-11-17; zero TV connections.** C is the pinned saved
`build/phase-1/firmware-inspection/libav-connector.so.1`, SHA-256
`c7cffeb1437f3b785782467cced052cefa3ed3f9d0a7689bb49db3b494f5aff3`;
sibling `.asm` SHA-256
`37889df0f2c24db9ed2a0fe6f76c9278bfe2224592177b647931db722667f97b`.
Addresses in this subsection are ARM32 ELF virtual addresses, Thumb bit cleared,
not the kernel Image offsets above. Nothing here becomes an application address
or a portable model/firmware assumption. No library was loaded or executed.

| Boundary | Exact source-bound evidence | Conclusion / contrary limit |
|---|---|---|
| Stored connection JSON | C setConnectionInformation0x1218c–0x12192 assigns the supplied string at connector+76. K's upstream sourcePort=k and source=HDMI are traced above. | This setter supplies no grant-index, HDMI-jack or VSC conversion. |
| Sink normalization | C0x13aee reads sink (literal0x21a98); ANY comparison0x13b22 and type tests0x13b2c–0x13b36 choose MAIN/type2 at0x13cd2–0x13cf4 or SUB0/type4 at0x13c0c–0x13c2e; other types fall back to MAIN. Explicit MAIN/type4 rewrites SUB0 at0x13c3e–0x13c6e. SUB0/type2 rewrites MAIN at0x13d0a–0x13d3c. All five DOM put sites use only key sink, then stringify/store at+76. | sourcePort and other DOM values are preserved by this normalizer. A requested SUB0 can be rewritten back to MAIN by a type2 connector; naming two windows does not select two sinks. No numeric VSC node/route/kind/port is constructed here. |
| Normal connect delivery | C0x13edc–0x13f58 normalizes, obtains GOT0x37fc4 relocated to VideoOutputd::CONNECT0x38024, whose `.data` pointer names URI0x22120: **luna://com.webos.service.videooutput/connect**. It passes the URI and stored+76 JSON to caller+72's virtual slot+12, with empty callback and wait argument10. Constructor0x1201e/0x1204a stores the LSCaller* parameter at+72. | This is a concrete service request, not merely an exported symbol/string. This branch provides no evidence of a second HDMI allocation. Both normalization return paths send: parse/empty-input return0 falls through0x13ee6; nonzero takes debug-log0x13fd2–0x13fe0 then rejoins. Nonzero is not an error code here. State2 path0x14066 returns1 without sending another connect. |
| Caller implementation | C LSCaller constructor0x20714–0x20738 resolves the LSCaller vtable and stores address point0x378d0. Its slot+12 relocation0x378dc names invokeSyncCall0x204e0. At0x2051e–0x2052e the wrapper forwards the original URI/payload references to UMSConnector::sendMessage. | No sourcePort-to-VSC translation in this wrapper. Static default vtable binding is established; a substituted runtime subclass remains outside this evidence. Return1 is not independent routing or live-frame proof. |
| Disconnect scope | C0x1233a–0x123a6 resolves GOT0x37f38 to DISCONNECT0x38020 → URI0x220f0, passes the stored+76 connection JSON through the same slot, wait argument1. | Service release request identified; lower port deactivation, owner isolation and hardware release are still unknown. No new lifecycle test is needed to establish this static boundary. |

#### Video-output handler and VAL boundary

**V** is `build/phase-2/hdmi-videooutput-evidence-20261117-001/videooutput.elf`,
591,404 bytes, SHA256
`e3f86a398e68d1fbf895dd1829a87eb07f7c54fd191d19ff44ab9a5f4142415f`.
Its ARM32 ELF virtual addresses are distinct from Image offsets.
`build/phase-2/hdmi-videooutput-handler-offline-20261117-001/raw/findings-final.json`
is the corrected source-bound report; original findings remain immutable.

| Boundary | Exact static evidence | Conclusion / contrary limit |
|---|---|---|
| VAL implementation boundary | Constructor0x6afb2 calls imported VAL::getInstance and stores service+12 at0x6afb6. Lower video interface is its pointer+4. ELF dynamic tag at0x9f6e4 names **libval-starfish.so.1**. | Lower virtual implementations reside outside this service body and are resolved in the saved VAL provider below. A SONAME does not establish an absolute runtime path or active loaded identity. |
| HDMI source descriptor | sourcePort key/unsigned-char parser0x6fad6/0x6fae0 stores a byte at stack+123. HDMI comparison0x6fee4 selects0x6feee–0x6fef8: kind word **2**, descriptor byte+5=sourcePort **k**. The earlier VDEC branch0x6fd86–0x6fd92 uses kind3 and byte+4=1. | This service passes k unchanged; HDMI acquisition separately uses k+1. VAL HDMI2 is not kernel VSC kind3/6, UTP primary3 or a receiver grant. The VAL provider trace below now grounds that conversion. |
| Named sink and numeric ID | VAL video slot+52 returns a vector of36-byte capability records at0x6afda/0x6b062. Constructor copies each name from record+4 and indexes constant table0x8374c **[0,1,2,3]** by ordinal i (0x6b06c–0x6b076,0x6b1e8–0x6b222). That value reaches VideoSink+28 at0x6b0c4/0x6b0d6. getVideoSink0x659a0–0x659d6 matches names in108-byte records. Init explicitly looks up MAIN/SUB0 at0x6a4ca/0x6a4f2. | Sink ID follows the provider list's ordinal and compiled table. Captured on-disk names now derive MAIN=0/SUB0=1 for this saved provider; current loaded configuration is unknown. Runtime capability names/order remain separate from HDMI sourcePort and TVRM indices; do not hardcode this table into a portable app. |
| Actual lower connect | V0x6fdd8–0x6fdea calls VAL video virtual slot+8: r1=sink+28, r2/r3=source descriptor words, stack argument0 and separate output-planeID pointer at stack+124. Response planeID reads that output at0x70476–0x70488. A successful lower result precedes active flag/cache updates at0x6ff2c. | A named presentation context and HDMI source are separate arguments. The output planeID is not an independently allocated HDMI receiver. V delegates VSC construction/control to the saved VAL target resolved below; active-loaded identity remains unknown. |
| Same-sink replacement | Active sink+32 at0x6fdc0–0x6fdc6 branches to0x702cc: doDisconnectVideo at0x702d0, notify sink update, clear old client's connected byte at0x70320 and reset context, then0x70336 rejoins the same sink's connect at0x6fdca. The disconnect result is not checked on that replacement branch. | Two MAIN requests can replace one binding. This is a concrete shared-sink explanation, not a second allocation or per-window ingress. Distinct named sink objects remain a candidate only until lower receiver/scaler eligibility is proved. |
| Context and sender bookkeeping | getClientInfo0x65c64 searches context at client+16 in200-byte records. Connect stores current client context at sink+36 (0x6ff76–0x6ff7e), source string at client+64, sink name at client+40 and sourcePort at client+112. doRegister parses context/appId. ClientStatus::add(JsonRequest) calls LSMessageGetSenderServiceName at0x6a214 and tracking add at0x6a2c6; its wrapper calls this add at0x6a38c. onClientIsDisconnected calls doDisconnect at0x6f840. | Context/sender-disconnect linkage is real; it is not evidence that a PI_PORT/TVRM receiver/scaler is independently granted to this sink. Exact per-method policy, grant owner and active caller identity remain unknown. Connect's context lookup occurs after lower connect succeeds, so response/bookkeeping is not transactional release proof. |
| Disconnect and cache ordering | Context-bearing doDisconnect compares lengths and bytes against the sink's current context at0x6eeec–0x6eefc and0x6f1c2–0x6f1d2. doDisconnectVideo0x65324–0x65344 clears active/cache fields before calling VAL video slot+12 with sink ID. It can then disable dual mode for a SUB name. | Requested-context matching is distinct from hardware ownership. Cleared service state can precede lower failure; it cannot prove hardware release or isolation from another owner. No release test was run. |
| Dual mode and sub occupancy | SUB substring check0x6fdae/0x6fdbc invokes setDualVideo(true). Method0x652e4–0x65312 caches the flag and conditionally calls VAL video slot+32; connect does not gate on that return. checkOccupySubScaler0x6b3ac reads subScalerOccupied/hfrEnabled/hdmiVrrInfo.vrrEnabled only for sink ID0. doOccupySubScaler0x64a28 delegates state/set work to slots+92/+88. | A method named dual video or an occupancy field is not independent HDMI proof. The provider stub/occupancy path is resolved below; active HFR/VRR constraints and eligible resources remain unresolved; sink ID0 is not assigned a portable MAIN meaning here. |

#### VAL provider to VSC port, sink and release

**Verified static, 2026-11-17.** L is the saved
`build/phase-2/hdmi-val-library-evidence-20261117-001/val-starfish.elf`,203,928 bytes,
SHA256 `344afde92a524825b3cc90111c96b32c36d5d5dd6624bf556ded5a03ce8884fa`.
L addresses are ARM32 ELF virtual addresses, Thumb bit cleared. Kernel addresses here
are **file offsets** in the saved kernel.Image under
build/phase-2/hdmi-hdmi20-owner-trace-20261117-001/raw/, SHA256
10adace3603b44e1b900f7c9d1990e65adb6ad2f9becbaac4fe8305635681605.
The two address spaces must not be interchanged. Active loaded identities and
hardware behavior are not established by this static pass.

| Boundary | Exact supporting evidence | Meaning / contrary limit |
|---|---|---|
| Concrete implementation | L initialize0x156b8–0x156c8 allocates156 bytes, calls val_video_impl constructor and stores VAL+4. L0x1e0c2–0x1e0ce installs vtable0x40e68+8 through GOT0x414cc relocation. Slots8/12/32/52/88/92 bind connect0x1e89c, disconnect0x1ea7c, setDualVideo0x1b880, getVideoPlanes0x1dd1c, occupancy0x1bc20/0x1bc84. L0x1e300–0x1e308 installs V4l2vsc vtable0x40324+8 through GOT0x4153c; slot0 binds setConnect0x150f4. | Constructor assignments, relocations and callers bind the default implementation; exported names alone are not the evidence. Runtime substitution remains unknown. |
| Capability names and IDs | L getConfigFilePath0x15866–0x15886 builds **/etc/palm/val/device-cap.json** from literals0x2a804/0x2a814/0x2a818. DeviceCapability defaults MAIN (0x13112/0x1313c), optionally parses planes at0x133a4–0x133bc. parsePlanes0x12f3c inserts unique names into a std::less string tree, clearing the default for an accepted array; ctor0x1e18a–0x1e1fc enumerates sorted names into36-byte records with ordinal IDs. getVideoPlanes0x1dd1c copies that vector. | Captured supported planes [MAIN,SUB0] derive ordinals0/1. This joins the service/VAL ordering for the saved provider, conditional on loading those bytes. Missing/invalid config can retain only default MAIN; current loaded state was not queried. |
| Plane IDs and node handles | L0x1e200–0x1e220 supplies software planeIDs44/45. L0x1e23a–0x1e27e makes at most two SinkInfo records, pairing those with capability ordinals; ctor0x1e3b0–0x1e3b8 calls vscOpen per ordinal. L0x138e2/0x1392c resolve /dev/video30/31 at0x29184/0x29194; open uses flags2, stores fd+4 and sink+8. Other ordinals fail. | A capability list, returned planeID and distinct VSC fd are presentation bookkeeping, not independently allocated HDMI receivers. Constructor does not check vscOpen's return in this loop. Actual node identity/presence was not re-queried. |
| HDMI port and mode conversion | L convertConnectInfo0x1bf14–0x1bf1e maps VAL kind2 to VSC kind3;0x1bf58–0x1bf5c copies descriptor byte+5=k into payload byte+4. Modes0/1/2/3 become payload word+8=1/2/3/4 (0x1bf52–0x1bfc2). L connect0x1e9f6–0x1ea12 sends nonzero-sink/mode0 window properties {1,2,2}, then0x1ea18 rejoins0x1e8e4 with mode unchanged. | HDMI sourcePort k stays zero-based here; the separate HDMI acquisition driver receives k+1. SUB does not force a shared route through this special case. Neither sink ID nor output planeID is a receiver grant. |
| Actual control and corrected route | L0x15128–0x15138 sends12-byte CONNECT_INFO ID0x0098290c on the sink's fd. Helper0x13810 optionally locks a process mutex and issues ioctl0xc0185648 (S_EXT_CTRLS), one ext control of size12, payload pointer. Image+0x664d90 passes the node-derived window to vsc_set_input. **Image+0x66a03c CSEL NE selects nodeWindow when field!=2; field2 keeps2.** Image+0x66a248–0x66a258 constructs DE source6 and duplicates port k. | Normal service mode0→field1→node route0/1, rather than common route1. The prior private kernel report reversed this condition; preserved raw bytes/report are unchanged and this correction supersedes that interpretation. Compiled route0/aux fields now have a concrete caller bridge. Active HAL/MCU82 behavior remains unknown. |
| Cached success | L0x1e8c4 calls isSinkConnected0x1e5ac, which reads SinkInfo+4. On true,0x1e8cc branches0x1e986; both log paths retain r5=1 and return via0x1e8b8. No conversion/control, sourcePort comparison or output-plane write occurs on that branch. New success0x1e944–0x1e952 copies the preassigned planeID and marks connected. | Success can mean an occupied sink was retained. It proves neither a fresh receiver allocation nor a new source binding. The upper service may disconnect first; this branch does not identify which path the0.1.12 run used. |
| Dual mode and occupancy | L setDualVideo0x1b880 is only movs r0,1; bx lr. Occupancy slots reject sink!=0 at0x1bc28/0x1bc8c, then use VSC object0. L0x15476/0x1550c send ID0x00982910 via S_CTRL0xc008561c/G_CTRL0xc008561b. Image+0x66b758 stores a per-window integer at global record+112;0x66b84c reads it. The compiled setter can reconfigure a shared subroute (0x66b884–0x66b8bc). | A dual-mode success stub and cached occupancy do not reserve or prove a second scaler. No owner/session token appears in these reviewed payloads. A configuration mutex serializes calls; it does not establish a one-source capacity limit. |
| Disconnect and teardown | L0x1eaae–0x1eac4 resets nonzero-sink WIN_PROP to12 zero bytes through ID0x00982902. Then0x1ead4 calls setDisconnect0x15358:0x15378–0x15394 sends zero CONNECT_INFO through the same ID0x0098290c. Combined control/VDEC-cleanup errors return-1; only lower success clears SinkInfo+4 at0x1eaea. K kind0 reaches0x66a308 (DE source0), with node route from corrected CSEL. L destructor0x1d676–0x1d680 calls vscClose;0x13958 closes fd>0 and stores-1. | Normal disconnect leaves the fd open. Service cache clears before its lower call, whereas VAL's connected flag clears afterward. No TVRM receiver/scaler return is established in these bodies; source0/reset/close is not proof of hardware release or sibling isolation. Kernel per-window global state is not a per-client lease. |

**Candidate:** two separately addressed presentation routes, conditional on actual
capabilities and eligible lower resources. **Unknown:** two independently allocated
HDMI ingress paths, effective TVRM ownership, active HAL/MCU acceptance, independent
motion, release isolation, audio and stability. **Unsupported inference:** any
combination of two nodes, planeIDs44/45, cache values or success replies proves
simultaneous HDMI. Keep all addresses/IDs as firmware evidence, never app constants;
broad webOS support needs runtime capability discovery and qualified adapters.

### Captured capabilities and ownership discriminator

**Verified raw capture / separate local interpretation, 2026-11-17:** the single
read of /etc/palm/val/device-cap.json retained243 bytes, SHA256
`408f13b13d2c30e1e51765c1b8e6a2dff7224410e8c4c47e057f28f00877b440`.
[Actual bounds, metadata, closure and inventory hash](../device-tests/c1-journal.md#val-capability-json--bounded-single-file-collection).
Raw/inventory: build/phase-2/hdmi-val-capability-evidence-20261117-001/;
as-used pins and independent local replay:
build/phase-2/hdmi-val-capability-run-20261117-001/verification.json.
Strict UTF-8/object JSON and unambiguous supported planes passed. Original array
order is [MAIN,SUB0], with no duplicate names; unique byte-sorted names are the
same, no extra ordinals. No vendor parser or device node was executed/opened.

| Advertised name | Derived ordinal | Saved-provider software planeID | Saved-provider VSC node / normal mode0 route |
|---|---|---|---|
| MAIN |0 |44 | /dev/video30 /0 |
| SUB0 |1 |45 | /dev/video31 /1 |

The **names are verified on disk**; the associations are **candidate runtime
mapping for the saved provider**, using L0x1e18a–0x1e27e and the corrected
Image+0x66a03c. They are not observed active handles/grants, exclusive receivers
or evidence of the configuration loaded into the running service. No application
should bake this C1 table or firmware addresses into its cross-model API.

**Verified static reuse predicate:** G's saved
`build/phase-2/hdmi-second-path-offline-20261115-001/gibb-factory-existing.asm`
compares resource types at ELF0x1e980–0x1e98a and existing record byte+36 against
requested PipelineResource+28 at0x1e98c–0x1e994. A match returns the existing
shared pointer at0x1ea2c–0x1ea36. Sibling gibb-factory-create.asm stores request+28
into record+36 at0x1f4e6–0x1f4ea. These inspected comparisons do not include
sourcePort k, window, app or sink name. Different logical UTP sessions/ports
therefore do not exclude element reuse. Different grant selectors exclude this
particular match, not every other sharing path. The G hash is in the saved-input
table; the new verification receipt pins both unchanged excerpts.

**Ownership/release limit:** H forwards the grant byte to Base at0x35e20/0x35e60,
but driver activation0x3383c carries separately mapped k+1. VAL's12-byte payload
carries source/port/route without that grant or owner. The inspected bodies do
not establish a grant→exclusive physical receiver bridge. Image+0x73a2d4/0x73a308
sets/clears a per-port activation byte without a file-owner check/refcount in
that path; Image+0xb31798–0xb317a0 closes the V4L2 file handle and returns success
without deactivation. Exact saved bodies:
hdmi-hdmi20-owner-trace-20261117-001/raw/{HDMI21_HAL_Rx_Set_V4l2PortActivate,v4l2_hdmi20_release}.full.asm.
Different-port cleanup is a candidate for isolation; borrowed/reused same-port
cleanup cannot be called isolated. Even a cleared flag is not physical hardware
release: the saved main-thread consumer gates part of the no-input path.

| Plausible path | Supporting / contradicting evidence; unknown | Cheapest discriminator, acceptance/stop and practical effort |
|---|---|---|
| Independent direct UTP allocation | Captured MAIN/SUB0, L0x138e2/0x1392c, corrected Image+0x66a03c, distinct LINK banks and compiled route0/aux fields support it. T's free-bit choice0x4a158–0x4a240 and configured VHDMIRX2 support logical eligibility. Against proof: grant→exclusive ingress and active HAL/MCU acceptance remain unknown; ordinary K0x9b90 requests MAIN. | Bind own SUB0 selection and returned receiver/MAIN_SCALER/SUB_SCALER grant/reuse provenance before implementation. Accept independent allocation only with fresh non-preempting pairs plus both distinct sources advancing together; stop on reuse, contention or absent SUB. Several hours of host evidence/contract work, then one separately reviewed bounded active attempt; device success unknown. |
| Cached adoption/rebinding | Boot adoption, G0x1e98c match and L0x1e8cc cached success are concrete. M0x49030 caches selection and0x4ba04 replays it on owner association. Contrary to fresh allocation: VAL cached success does not compare port or issue a control/output write; window binding reuses its proxy. | Existing saved predicates discriminate the possibility. Classify adoption/reuse/replay explicitly; neither replies nor distinct session IDs establish allocation. False M setSink replies can still follow fan-out. Completed wrapper tracing; membership implementation remains external, no lifecycle rerun. |
| One shared receiver with port switching | H0x3383c selects a port; saved G_INPUT reads shared state. Against singleton proof: per-port maintenance, distinct LINK ranges and corrected normal routes0/1. Active crossbar/PHY/MCU behavior is unknown. | Static/configuration evidence cannot settle concurrent frames. Cheapest behavioral discriminator is two distinguishable moving physical sources advancing together, without a switch/freeze, under the review-only sequence. Stop on A interruption when B selects or on preemption; hours of preparation, seconds of future observation. |
| Several windows on the same source | K defaults MAIN, V0x702d0 replaces an active same sink, G can reuse elements and L can return cached success. Against inevitability: a real new-connect payload carries separate k per node. | Bind each own session to its sink/source identity and observe independently changing patterns together, then release B while A advances. Same-source/replacement is a negative result for the objective; IDs/geometry/planeIDs alone never pass. Same bounded trial, no extra package/browser route. |
| Type4/SUB0 and HTML complementary entries | C0x12df6–0x12e00 requests SUB_SCALER;0x13c3e–0x13c6e rewrites MAIN→SUB0 only for type4. M0x490a8/0x49170 forwards by associated ID→registered sender service;0x4ba04 replays cached selection. Accepted membership, intended own child and pre-MAIN timing remain unknown. HTML hides the same lower ownership problem and warns of port switching. | Ground the RM provider and trace offsets12/16/64/68 before qualifying membership/targeting, then resolve timing and actual grants. Stop before borrowed targeting, guessed providers/IDs or new policy. Focused static work likely hours after provider bytes; device behavior uncertain. Retain direct UTP; another browser does not answer HDMI ingress. |

### Candidate decisions and cheapest discriminators

The assessment above is current. Type4/SUB0, SMP main/sub
and HTML HDMI sources are complementary presentation leads; none replaces the
independent-receiver gate or justifies a replacement browser candidate.

**Eventual device acceptance, outside passive scope:** two different moving
HDMI1 and HDMI2 sources must advance together in separately bound windows,
without switching/freezing either. Require independently eligible ownership,
isolated release and normal picture/sound/remote restoration; keep audio ownership
and sustained stability as separate gates. Stop on preemption/shared state,
uncertain cleanup or impaired restoration. The
[concrete review-only sequence](../device-tests/current-plan.md#review-only-dual-source-experiment)
is documented; no runnable dual candidate is prepared and no active run occurred.
Current readiness is owned only by [Status](../../STATUS.md#single-next-task) and
the [current procedure](../device-tests/current-plan.md).

Primary earlier traces:

- [Frontend window-to-UTP binding](archive/c1-hdmi-investigation-2026-11-12.md#the-missing-client-side-connection).
- [Cache eligibility and failed close](archive/c1-hdmi-investigation-2026-11-12.md#cached-session-eligibility-and-failed-close--2026-11-12).
- [Backend release failure](archive/c1-hdmi-investigation-2026-11-12.md#hdmi-backend-implementation-and-release-failure--2026-11-12)
  and [downstream resource wait](archive/c1-hdmi-investigation-2026-11-12.md#stop-routing-resolved-and-downstream-release-boundary--2026-11-12).
- [Admission/policy analysis](archive/c1-hdmi-admission-2026-11-14.md).
- [Paused IWC route](c1-iwc-research.md): stock publication control is not another receiver.

## Glasshouse preview source and owner observation

Owner reports HDMI-4 picture **and sound** in Glasshouse Home dashboard PiP when
HDMI 4 is selected on this C1. This is not a result from our app. After that report,
the owner supplied [Glasshouse source](https://github.com/rorygallagher2024/glasshouse).
Read-only review pinned commit `43ec5ac020838ebee985b1a392c0f9afe7d8f95e`;
the installed version/commit is **unknown**. Nine selected text blobs were checked
against Git object IDs and SHA-256; no upstream code was executed or integrated.
Provenance and source copies are in the private review bundle's `glasshouse/`
subdirectory. [MIT license](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/LICENSE)
permits adaptation subject to its notice requirements.

| Technique | Exact source/API | Finding, applicability and limit |
|---|---|---|
| External HDMI media element | [`server/assets/home.html`, `startPreview()`, lines 2352–2382](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L2352-L2382) | **Verified/static, high confidence:** appends a source with type `service/webos-external`, URL `ext://hdmi:` + port; calls `load()`/`play()`. This is physical-input client code, separate from encoded-network decoding. Complementary reference after our native first picture; underlying LG pipeline/window binding and browser access under our identity remain **unknown**. |
| Fixed/variable placement | [`placeTilePreview()`, lines 2143–2157](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L2143-L2157) | **Verified/static:** CSS position/size/clip track a tile while the video stays attached to its parent. Author warns reparenting/transformed containers drop its native player. Reuse the stable-element approach; no compositor ownership or arbitrary-app embedding demonstrated. |
| Sound and teardown | [`previewMuted()` and `applyPreviewSound()`, lines 2161–2170](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L2161-L2170), [`releaseVideo()`/`stopPreview()`, lines 2207–2237](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L2207-L2237) | **Verified/static:** mute follows settings; teardown removes handlers, pauses, removes children/direct `src`, then reloads. Visibility loss calls `darken()` → `stopPreview()`; `pagehide` also stops ([handlers](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L5963-L5967), [`darken()`](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L1883-L1893)). These are client teardown requests, **not verified hardware release or a bounded process exit**. |
| Tuner source | [`startPreview()`, lines 2358–2360](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L2358-L2360) | **Verified/static:** non-port target uses `tv://<channel-id>` with `service/webos-broadcast-preview` (legacy `service/webos-broadcast` for webOS ≤4). A later mixed-source lead, not HDMI+tuner concurrency proof. |
| C1/webOS 6 setup | [`server/lib/home.js`, lines 1999–2043](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/lib/home.js#L1999-L2043), [web app manifest](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home-app/appinfo.json) | **Verified/static:** webOS 3–6 selects standalone mode; manifest is a web app, `com.tvweb.home`, 1920×1080, with no explicit trust/required-permissions fields. **Reported/device:** comments mention C1 6.5.3. Full installation/security context was not audited; do not borrow its identity, Home-key hooks or infer our app needs no admission. |
| Concurrency | [`home.html`, lines 2025–2033](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L2025-L2033) | **Reported/device:** author describes G3/webOS 9.2.2 preview and says another port takes the receiver off the old input. Implementation has one preview video/target. This is a warning against assuming two sources, not proof of a universal C1 hardware limit. |

**Comparison and roadmap implication:** retain direct UTP as the explicit
acquisition/window research path and Glasshouse as a complementary implementation
reference/possible simpler baseline. No experiment is abandoned and no replacement
client has been selected. The earlier setup-only trace identified a registration
failure; it did not establish a failed UTP call and does not supersede 0.1.12's
verified single-picture result.

| Question | Direct native UTP candidate | Glasshouse media-element path |
|---|---|---|
| What does our client control? | Explicit `open`, returned session ID, own exported window, port selection and own-ID cleanup. Valuable for allocation/binding research. | Source URL, media element geometry/playback and player teardown; session/plane binding is internal to LG's media implementation. |
| What has actually worked? | Unchanged 0.1.12 displayed moving physical HDMI-4 with sound once in our centered window; open/select/stop/close and independent termination evidence passed. | Concrete source plus owner-reported picture in another app; our own browser identity/installation context is untested. |
| Does it reach a different receiver? | Unknown; explicit session creation does not prove independent allocation. | Unknown; it may use UTP or the same lower-level resource manager. Client code does not resolve that trace. |
| What is useful now? | Trace receiver/resource allocation, arbitration and independent sink binding from the saved backend. | Complementary source reference; no replacement browser or new baseline package is queued. |

The media element avoids our manual SDL export/UTP calls at the client layer; it
does **not** establish that LG's backend bypasses UTP, resource management or
permissions. No new package, integration, dependency installation or TV run was
performed. Keep one-picture → independent HDMI 1+2; no product phase change.

Own-identity admission, bounded launch/exit, reporting and physical-motion
observation passed in the one native 0.1.12 attempt; they are not setup work to
repeat now. Do not transplant the Home launcher or weaken the native lease.
The web source establishes its HDMI request; allocation, plane ownership,
hardware release and independent-port capacity remain **unknown**. It is not
evidence of a separate receiver or a reason to replace the working native control.


## Provenance, policy and retained evidence

The [source lock](source-lock.json) and [prior-art audit](prior-art.md) own upstream
revisions/licensing. The [scoped policy](../../native/phase2-hdmi-window/policy/README.md)
adds exactly four methods to our own app. Its loaded disposition is not silently
changed or claimed revoked by this cleanup. No TV/policy action is authorized.

The [development archive](archive/c1-first-picture-development-2026-11-15.md)
preserves saved-library addresses/hashes, rejected hypotheses and correction
analysis. The [journal archive](../device-tests/archive/c1-first-picture-campaign-2026-11-15.md)
preserves dated observations. Private firmware/assembly, original raw reports,
launch authority and frozen inputs stay under ignored build; the working IPK stays
in dist. Never publish/refetch them as part of documentation cleanup.
