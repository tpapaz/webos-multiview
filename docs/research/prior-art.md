# Prior-art audit

> Research/tool record. [Current status](../../STATUS.md) · [Documentation index](../README.md). Earlier next steps and untested labels describe that stage; use Status and later device records for current results.

Historical upstream audit, retained for provenance and licensing boundaries.
For the next HDMI task, begin with the [handoff](../handoff/hdmi-next-chat.md)
and [current scope decision](../decisions/0003-close-idle-work-resume-hdmi.md).
Current C1 results and direction are in the [Phase 1 device record](../device-tests/c1-journal.md#phase-1),
[firmware/resource investigation](c1-smp-ndl-resource-path.md) and
[main/sub decision](../decisions/0002-main-sub-validation.md).

Audit date: 2026-11-09 UTC. Default branches were downloaded as shallow trees and
pinned below. This is static source/documentation research, **not TV testing**.
No source, proprietary headers, binaries or artwork from these projects is copied
into this repository. Repository guidance was supplied by the user in the ZIP.

`verified` below means the narrow fact is directly visible in the cited source;
upstream hardware reports are attributed reports, not our verification. C1
model, firmware, backend and logs were **unknown at this initial audit**;
later consented device results are recorded in the linked Phase 1 record.
No public dual-HDMI demonstration was found in this bounded set of sources;
that is not a proof of hardware impossibility.

## Snapshot and reuse decisions

| Upstream | Commit | License observation / reuse boundary |
|---|---|---|
| [webosbrew/samples](https://github.com/webosbrew/samples/tree/e95eed3afa7896894f811b84d8e9e277e9e2b74c) | `e95eed3afa7896894f811b84d8e9e277e9e2b74c` | No LICENSE found in tracked tree; no reuse permission established. |
| [webosbrew/hyperion-webos](https://github.com/webosbrew/hyperion-webos/tree/00c932f092084b234b3f619b060a98fa134c12bd) | `00c932f092084b234b3f619b060a98fa134c12bd` | MIT (LICENSE); preserve notice if reused. |
| [sharktie/lg-iptv](https://github.com/sharktie/lg-iptv/tree/37776484ebc340b7cc0b7a674254b60c2f2bd8c6) | `37776484ebc340b7cc0b7a674254b60c2f2bd8c6` | package.json declares ISC; no root LICENSE found; bundled third-party assets need separate review. |
| [angelcode1/webos-HomeBack](https://github.com/angelcode1/webos-HomeBack/tree/27e5f4543a39a50484a3f184fe36a92cea565368) | `27e5f4543a39a50484a3f184fe36a92cea565368` | GPL-2.0-only lineage stated in README; native hooks have separate GPL-3.0 obligations. Do not copy application/native code into an unreviewed license combination. |
| [iDaddyCz/ha-lg-webos-pip](https://github.com/iDaddyCz/ha-lg-webos-pip/tree/c9e22766b7e045810cda7aafe63f4f732d0f5f18) | `c9e22766b7e045810cda7aafe63f4f732d0f5f18` | MIT (LICENSE); preserve notice if reused. |
| [webosbrew/webosbrew.org](https://github.com/webosbrew/webosbrew.org/tree/fc4b8aaa23cbb4784f8eabc540a778d44965b3ab) | `fc4b8aaa23cbb4784f8eabc540a778d44965b3ab` | Documentation research only; no redistribution/license conclusion. |
| [webosbrew/webos-userland](https://github.com/webosbrew/webos-userland/tree/00a5f8721e15d5c10030b99b2f3e73e0c527bcce) | `00a5f8721e15d5c10030b99b2f3e73e0c527bcce` | Repository LICENSE is Unlicense; individual headers can retain vendor restrictions. The DILE VT header is declaration research only; see the [C1 map's licensing note](archive/c1-hdmi-investigation-2026-11-12.md#pinned-upstream-boundaries-and-licensing). ABI declarations are not vendor guarantees. |

## SMP, NDL, video-plane ownership and ABI

- **verified/source:** the samples feed elementary streams into hardware media
  APIs; they do not select physical HDMI inputs. SMP uses `libplayerAPIs` and a
  window ID. NDL owns the media plane through its API. See [sample inventory](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/README.md#L5-L190),
  [SMP payload](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/media/smp/common/smp_payload.c#L19-L137), [NDL v2 implementation](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/media/ndl/directmedia/directmedia_v2.c#L1-L110).
- **verified/source:** the modern SMP path calls
  `SDL_webOSCreateExportedWindow(SDL_WEBOS_EXPORED_WINDOW_TYPE_VIDEO)`, stores its
  returned ID, supplies `windowId` to the pipeline, sets source/destination
  rectangles with `SDL_webOSSetExportedWindow`, and destroys the exported window
  on teardown: [exported_window.c](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/media/smp/webos5/exported_window.c#L11-L109). It creates **one** exported window;
  there is no dual-input session demonstrated by this code.
- **verified/source:** older ACB samples attach a media pipeline to an ACB owner,
  order lifecycle transitions and request a display window: [acb_plane.c](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/media/smp/acb/acb_plane.c#L25-L155).
  This is media/plane ownership; no HDMI receiver allocation is established.
- **candidate/C1:** SMP exported windows are the most relevant later presentation
  route for the webOS 6 generation. The [README ABI/status tables](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/README.md#L5-L190)
  distinguish SMP C++ constructor/Load/string ABI variants across webOS 1–5+,
  ACB on 2–4 and exported windows on 5+. It attributes modern sample tests to
  **65UP7560/webOS 6.5.2** and **OLED77C5/webOS 10.3.1**, with reruns pending after
  ordering changes. Those claims do not verify C1, two simultaneous planes, or
  HDMI ingress. Exact firmware is not supplied for all sample runs.
- **verified/source:** NDL v2's sample explicitly uses a single global player and
  has a policy resource-release callback. Its API v1/v2 differences and PCM audio
  restrictions make cross-generation assumptions inappropriate ([NDL](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/media/ndl/directmedia/directmedia_v2.c#L1-L110)).
  A second decoder session, scaler count, plane reservation and shared audio
  ownership are all **unknown** on C1.
- **verified/source:** link-time stubs and `-verify` symbol dumps can catch missing
  exports but cannot establish behavior. The sample README gives LGNC on webOS 5
  as a symbol-present but nonworking example. The probe therefore does not use
  symbol/file presence to mark playback or concurrency verified.

## HDMI routing and capture boundaries

- **verified/source:** HomeBack inventories inputs via
  `com.webos.service.eim/getAllInputStatus`, maps returned `device.appId` to launch
  points ([input provider](https://github.com/angelcode1/webos-HomeBack/blob/27e5f4543a39a50484a3f184fe36a92cea565368/packages/app/src/shared/services/launcher/providers/input-manager/input-manager.provider.ts#L9-L52)), and delegates launches to the application
  manager ([launcher](https://github.com/angelcode1/webos-HomeBack/blob/27e5f4543a39a50484a3f184fe36a92cea565368/packages/app/src/shared/services/launcher/model/launcher.service.ts#L96-L126)). Its README gives `com.webos.app.hdmi1` as a launch
  example. This establishes a **selection/launch route**, not a frame surface or
  session per port. The underlying C1 HDMI owner, receiver mux, resource policy,
  port arbitration and per-port surface interface are **unknown**. This probe
  does not enumerate attached-device labels or launch any input app.
- **verified/source:** Hyperion calls `DILE_VT_Create(0)` / `CreateEx(0,1)` and
  chooses `DILE_VT_DISPLAY_OUTPUT`, falling back to `DILE_VT_SCALER_OUTPUT`
  ([libdile_vt.c](https://github.com/webosbrew/hyperion-webos/blob/00c932f092084b234b3f619b060a98fa134c12bd/unicapture/backends/libdile_vt.c#L30-L180)). Its capture setup changes region/state and opens
  `/dev/mem` with `O_RDWR`, then maps frame buffers. It is **active**, not a
  passive query. Numeric handles are not demonstrated HDMI port selectors.
- **verified/source:** the higher-level backend sets a dump tap among scaler
  input/output, display, blended and OSD output; its default is DISPLAY_OUTPUT
  ([libvtcapture.cpp](https://github.com/webosbrew/hyperion-webos/blob/00c932f092084b234b3f619b060a98fa134c12bd/unicapture/backends/libvtcapture.cpp#L32-L180)). No independent HDMI 1/HDMI 2 selector is present in
  the audited backend. It captures the output path represented by that tap;
  this is not evidence of an inactive physical port being simultaneously live.
- **unsafe_to_test in Phase 0:** Hyperion's force-capture kernel-module quirk and
  low-level memory/capture operations are excluded. The [README quirks table](https://github.com/webosbrew/hyperion-webos/blob/00c932f092084b234b3f619b060a98fa134c12bd/README.md#L1-L73)
  describes them; we neither ship nor invoke them. No HDCP/DRM behavior is tested
  or bypassed. No protected content is needed for future experiments.

## Network playback and app lifecycle prior art

- **verified/source:** lg-iptv's [multiview implementation](https://github.com/sharktie/lg-iptv/blob/37776484ebc340b7cc0b7a674254b60c2f2bd8c6/js/livetv/multiview.js#L1-L83) manages a grid
  of network channel players, staggers startup, and stops the main player to
  avoid decoder contention. [boot.js](https://github.com/sharktie/lg-iptv/blob/37776484ebc340b7cc0b7a674254b60c2f2bd8c6/assets/boot.js#L37-L80) derives `maxDecoders` as 2 or 4 from
  legacy/browser heuristics. These values are **not measured C1 hardware limits**
  and must not be copied into a capability registry as facts. No physical-input
  concurrency follows from network multiview. Audited files provide no C1
  firmware plus dual-HDMI logs.
- **verified/source:** HomeBack uses
  `com.webos.service.multiviewcontroller/launchApps` with main/sub app roles and
  `setAppCoordinate`; it checks foreground surfaces for `mvpip` admission and
  handles a separate camera CARD app ([manual-camera-pip.ts](https://github.com/angelcode1/webos-HomeBack/blob/27e5f4543a39a50484a3f184fe36a92cea565368/packages/service/src/manual-camera-pip.ts#L1-L260)). Its
  [README](https://github.com/angelcode1/webos-HomeBack/blob/27e5f4543a39a50484a3f184fe36a92cea565368/README.md#L70-L104) reports **C5**, webOS SDK **10.0.0**, firmware **33.00.71**
  testing and says automatic PiP may interrupt video and transfer D-pad focus.
  Its declared webOS 6+ target is not a C1 PiP test. Root input hooks/injection
  and boot modifications elsewhere in that project are excluded from this work.
  An open [installation report](https://github.com/angelcode1/webos-HomeBack/issues/75)
  describes package verification failing before playback on a C1 with firmware
  03.53.45. It provides no runtime PiP result for that firmware.
- **verified/source:** ha-lg-webos-pip declares a transparent `overlay` window
  ([appinfo](https://github.com/iDaddyCz/ha-lg-webos-pip/blob/c9e22766b7e045810cda7aafe63f4f732d0f5f18/webos-app/app/appinfo.json#L1-L17)), draws camera/network video, and attributes testing to an
  **OLED G4 / webOS 24 / firmware 43.21.73** ([README](https://github.com/iDaddyCz/ha-lg-webos-pip/blob/c9e22766b7e045810cda7aafe63f4f732d0f5f18/README.md#L18-L33)). Focus stays
  with the overlay while visible. This supplies app-overlay precedent, not a
  second HDMI receiver or arbitrary existing-app surface embedding on C1.
- **unknown/C1:** foreground policy, background suspension, input focus,
  protected surfaces, audio focus and teardown when combining apps. A Wayland
  window, a video plane, a decoded pipeline and an HDMI session are different
  resources. More windows cannot establish more receiver pipelines.

## Community proposal and official documentation

- [apps-repo #87](https://github.com/webosbrew/apps-repo/issues/87) was open,
  labeled `idea`, unassigned when fetched. It asks for arbitrary-source PiP;
  it is not an implementation. [mariotaku's comment](https://github.com/webosbrew/apps-repo/issues/87#issuecomment-2563482634)
  reports webOS **8/9** allowlist editing and notes video failures for some apps;
  a [follow-up](https://github.com/webosbrew/apps-repo/issues/87#issuecomment-2568651814)
  confirms the list was modified by the author, not an LG default. Persistent
  config edits in the comment are outside Phase 0 and are not probe actions.
- The live [Homebrew Multi-View guide](https://www.webosbrew.org/guides/customize/multiview/)
  returned HTTP **403**. Its [pinned source](https://github.com/webosbrew/webosbrew.org/blob/fc4b8aaa23cbb4784f8eabc540a778d44965b3ab/src/views/guides/customize/multiview.md#L1-L17) says “some models running
  webOS 7 and above,” pre-defined apps/layouts, and warns apps may break. This
  supplies no claim that C1 has built-in Multi-View or arbitrary HDMI+HDMI.
- The roadmap's [LG Multi-View support article](https://www.lg.com/us/support/help-library/lg-tv-how-to-use-multiview--20153280988637)
  returned HTTP **403**. No model/combination claim is attributed to its unread
  contents. Its current combination table remains **unverified** here.
- **verified/documented:** LG's [TV Device Information / getSystemInfo](https://webostv.developer.lge.com/develop/references/tv-device-information#getsysteminfo)
  documents `modelName`, `sdkVersion`, `firmwareVersion`, `boardType` and
  one-shot `subscribe:false`. Some keys require user agreements; missing keys
  are possible. The web probe requests **only the first three**, exports C1
  family plus validated numeric versions, and never requests a unique device ID.
  Denial/missing metadata stays unknown. Board family is deliberately deferred.
- **verified/documented:** LG's [webOS.deviceInfo reference](https://webostv.developer.lge.com/develop/references/webostvjs-webos#deviceinfo)
  exposes model/version/SDK information, but this project uses the narrower
  one-shot service request rather than bundling a library that may query more.
  A small original `PalmServiceBridge` adapter performed the metadata query
  on firmware 03.53.45. In-flight cancellation on the C1 remains **unknown**.
  [Phase 0 C1 result](../device-tests/c1-journal.md#phase-0)
- **verified/documented:** LG's [ACG guide](https://webostv.developer.lge.com/develop/guides/acg-guide)
  maps `getSystemInfo` to `systemconfig.query` on current ACG platforms. The
  manifest declares precisely that group. This contemporary declaration is not
  evidence that webOS 6 uses the newer ACG mechanism.
- LG's [CLI guide](https://webostv.developer.lge.com/develop/tools/cli-dev-guide)
  documents `ares-package`, install/launch/remove and device information queries.
  CLI packaging is separate from native NDK compilation and TV installation.
  No public API inspected here documents acquiring concurrent independent HDMI
  frames or an exclusive-input bypass for C1. webOS OSE and commercial Signage
  APIs must not be treated as consumer C1 contracts.

## Stock LG Multi View and physical HDMI

Checked 2026-11-17. LG documents two distinct HDMI sources in **Dual PC
Monitor** on supported webOS 23 models, and simultaneous HDMI in **Dual
Screen** on supported webOS 24 models. LG Italy lists no stock Multi View
feature for 2020/2021 webOS 5/6 TVs. This bounds the stock UI on the C1
generation. Its independently live HDMI capability remains **unknown**.
[LG model and mode notes](https://www.lg.com/it/supporto/supporto-prodotto/risoluzione-anomalie/help-library/cs-CT20154005-20152532939115/)

| Lead | Evidence and limit |
|---|---|
| 77-inch G4 (OLED77G4WUA, webOS 24) | **Verified/documented:** LG specifies Multi View with up to two HDMI inputs for this exact model. The 03.11.20 package has been inspected offline. The HDMI load route remains **unknown**. [Product specifications](https://www.lg.com/us/tvs/lg-oled77g4wua-oled-4k-tv) · [Firmware inspection](#g4-031120-offline-inspection) |
| `com.webos.app.multiview` and `com.webos.app.multiviewsettings` | **Identity leads:** the older ID appears in the public SAM configuration and a first-person webOS 3.8 report names a native executable with that basename. A later owner report identifies the second ID as the Multi View settings entry. The executable or service that loads the second HDMI on the G4 remains **unknown**. [SAM configuration](https://github.com/webosose/sam/blob/master/files/conf/sam-conf.json.in) · [Older executable report](https://gist.github.com/Informatic/1983f2e501444cf1cbd182e50820d6c1) · [Settings entry report](https://community.openhab.org/t/lg-web-os-issue-with-multiview-after-recent-major-webos-update/156098) |
| `com.webos.service.multiviewcontroller` | **Reported from stock QML:** Glasshouse's G3 / webOS 9.2.2 source inspection follows LG Home's single-HDMI recent-input preview through App View. Its request carries the HDMI guest and a layout. The guest opens UTP with app/window IDs and selects the port. That evidence ends at one HDMI preview. The Dual PC Monitor request and the controller's sink assignment are **unknown**. [Stock G3 App View source report](https://rorygallagher2024.github.io/glasshouse/development/TV-RESEARCH/#lgs-recent-input-preview-g3-webos-922) |

The bounded check of saved C1 HDMI clients, UTP/media backends and related
registration files located neither a stock Multi View component nor a
physical-HDMI load that passes SUB0. Those captures cover selected paths,
so the full installed inventory remains **unknown**. The decisive evidence
would be a versioned stock Dual PC Monitor or Dual Screen client and its
matching loader, showing how the second physical port reaches its connector's
first scaler decision. This comparison remains separate from C1 hardware
verification. [Saved C1 construction trace](c1-hdmi-interface-map.md#can-hdmi-2-select-sub0-when-its-connector-is-created)

### G4 03.11.20 offline inspection

**Verified.** LG's US and Canadian OLED77G4WUA listings agree on the ZIP
name, size and August 27, 2024 release date. The Canadian listing supplied the
LG download link. One HTTPS GET returned HTTP 200 with zero redirects or
retries. The saved ZIP contains one member. Reading it to EOF verified its
ZIP CRC-32 (`858e8fb2`). The SHA-256 values below identify the local copies.
[LG US listing](https://www.lg.com/us/support/product/lg-OLED77G4WUA.AUS?tab=1) · [LG Canada listing](https://www.lg.com/ca_en/support/product-support/cs-OLED77G4WUA.ACC/)

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `Software_File(Version_03.11.20).zip` | 1,859,391,821 | `0cd48602bfb061b8ee32b43f254b35398eb44d6c2c5edb3280e2b02015e7a26e` |
| `lib32-starfish-global-secured-o24-oeta-48-03.11.20_prodkey_usb_V3_SECURED.epk` | 1,878,619,461 | `d81c112fadea573106fb8050bb56be562548fd0f97d806226c1dbfe9f1e29be9` |

The EPK contains `9.1.0` at offsets `0x6b4` and `0x6c4`. Its package
header has no clear `EPK3` magic at either known offset. A full raw-byte
scan found no named Multi View client/controller, `switchExternalInput`,
`SUB0`, scaler labels or SquashFS magic among the patterns checked. The
two apparent ELF and ZIP signatures had invalid headers. The public EPK
reader documents that secured EPK v3 extraction requires matching keys.
[EPK header layout](https://github.com/openlgtv/epk2extract/blob/master/include/epk3.h#L87-L112) · [Reader format support](https://github.com/openlgtv/epk2extract#supported-formats)

**Unknown.** The stock caller and handler could still be inside the secured
payload. No readable call site ties the second physical port to its own
connector or orders its sink assignment against the first scaler request.
Continuing requires readable files from this build. The archive and inspection
receipts are in `build/phase-2/g4-03.11.20-offline/`. No TV access or active
test occurred.

### G4 03.11.20 search for readable stock files

The firmware catalog's US entry matches the saved EPK SHA-256. It identifies
the image as `03.11.20.01`, OTA ID `HE_DTV_W24O_AFABATAA`, webOS
`9.1.0-48 (ombre-oeta)`. The UK and contributed entries have the same EPK
hash. These entries supply release metadata and packaged updates. The nearby
community firmware study explicitly lists the G4/O24 as unextracted.
[Catalog metadata](https://tv.slada.sk/processed_fw.json) · [Firmware study, G4 row](https://github.com/josippapez/dts_restore_plus/blob/cae1a97f2ee8aa3ea8d37f3ca5fd7919db16e802/webos25/docs/FIRMWARE-COMPATIBILITY.md#older-generations-webos-22--23--24-c2--c3-and-the-realtek-b2--b3)

LG lists five open-source disclosures for `OLED77G4WUA`. The nearest notice
by date is `OSSNotice-6948_webOS 24 O_2.0_240724.html`, catalog record
`511783`. It names `lib32-com.webos.service.videooutput`. The notice gives
neither a firmware identifier tying that component to `oeta-48` nor a stock
Multi View caller or HDMI load handler. [LG exact-model source catalog](https://opensource.lge.com/product/list-data?keyword=OLED77G4WUA&schType=1)

The first disclosure source archive was readable through EOF. The second and
third transfers ended early (1,080,515,111 of 3,925,163,125 bytes and
1,080,512,181 of 5,038,420,275 bytes respectively). Only their available
prefixes were inspected. The second contains a complete nested GStreamer
source ZIP labelled webOS 9.0.0. In the third, LG's Chromium 108 browser role
lists `com.webos.avconnector.*` with outbound access to
`com.webos.service.multiviewcontroller`, `com.webos.service.utp.extinputs`
and `com.webos.service.videooutput`. This identifies services to look for in
a readable G4 image. The permission list specifies no method, HDMI port, sink
or event order. The archive suffixes remain unexamined. Local evidence:
`build/phase-2/g4-03.11.20-offline/lg-oss-6948/browser-role.json`, lines 50–57,
and `index-1.json` through `index-3.json`.

The local workspace and download archives yielded only the previously saved
G4 update and its receipts. Searches of the public webOS Brew native API,
sample and app repository trees also yielded no matching stock pair.
[Native API tree](https://github.com/webosbrew/tv-native-apis/tree/052b449aceabe3aa0eb5e90d02f3b11b4608a000) · [Samples](https://github.com/webosbrew/samples/tree/e95eed3afa7896894f811b84d8e9e277e9e2b74c) · [App repository](https://github.com/webosbrew/apps-repo/tree/8d4495b93edf34c3827a5877baf07814ecf56eb6)

| Repository | What it establishes for this app |
|---|---|
| webos-userland | ACB declares an external-input player type, a media ID setter and a MAIN/SUB setter. Its linker script maps the setter to `dummy`. The names are useful when inspecting a real client. The header does not map SUB to HDMI 2's `SUB0` or establish call order. [ACB header](https://github.com/webosbrew/webos-userland/blob/00a5f8721e15d5c10030b99b2f3e73e0c527bcce/include/appswitching-control-block/AcbAPI.h#L10-L56) · [Linker stub](https://github.com/webosbrew/webos-userland/blob/00a5f8721e15d5c10030b99b2f3e73e0c527bcce/src/AcbAPI.lds#L18-L24) |
| starfish-media-pipeline-api | The ACB sample selects MAIN. Its direct-media sample supplies elementary-stream data. Neither sample loads a second physical HDMI port. [ACB sample](https://github.com/webosbrew/starfish-media-pipeline-api/blob/3287b9a97268f931ee8e820aecf35f13b8cf202f/sample/src/acb_sample.cpp#L32-L45) · [Stream payload](https://github.com/webosbrew/starfish-media-pipeline-api/blob/3287b9a97268f931ee8e820aecf35f13b8cf202f/sample/src/StarfishDirectMediaPlayer.cpp#L72-L88) |
| SDL-webOS | The SDL2 Wayland backend exports an existing surface and receives its compositor-assigned window ID. The prototype already uses transparent export and rectangle placement. The export and generic property calls contain no physical-port acquisition or first-scaler selection. [SDL implementation](https://github.com/webosbrew/SDL-webOS/blob/aa478daf3fc38fc70a3da8ddc0e09fb1ab367459/src/video/wayland/SDL_waylandwebos_foreign.c#L123-L159) · [Protocol](https://github.com/webosbrew/SDL-webOS/blob/aa478daf3fc38fc70a3da8ddc0e09fb1ab367459/wayland-protocols/webos-foreign.xml#L53-L80) |
| native-toolchain | Its CMake recipe imports a Buildroot SDK sysroot for cross-compiling native apps. It provides the compiler-side environment for headers and libraries. Its inputs do not identify an installed G4 image or either stock component. The project's existing WSL SDK remains the build path. [Sysroot recipe](https://github.com/webosbrew/native-toolchain/blob/730dbd680cc319935655b1b04c2d80fcb62fdb22/sysroot/CMakeLists.txt#L1-L21) · [Project build guide](../build.md) |

An older LG Chromium 53 external-input client provides a readable comparison.
It binds the external-input ID to ACB and waits for the matching ACB load task
before switching the port. Its switch request carries input and port identifiers.
That client shows no sink setter, and the callback reports ACB state. The
matching G4 caller, connector's sink assignment and first scaler request
remain **unknown**. [Initialization](https://github.com/webosose/chromium53/blob/54c144dac6d3d0744792b18629f19a313df797c4/src/media/blink/webos/extinput_pipeline.cc#L82-L115) · [Switch payload](https://github.com/webosose/chromium53/blob/54c144dac6d3d0744792b18629f19a313df797c4/src/media/blink/webos/extinput_pipeline.cc#L151-L183) · [Callback](https://github.com/webosose/chromium53/blob/54c144dac6d3d0744792b18629f19a313df797c4/src/media/blink/webos/extinput_pipeline.cc#L319-L326)

#### Chromium 108 connector follow-up

The saved disclosure prefix contains the browser role and ends in
`chromium108/src/content/browser/web_contents/`. Of the 57,159 tar member
headers read, none falls under `chromium108/src/media/`. The complete
Starfish 9.0.0 SDK inside that prefix has 21,147 tar entries. Its inventory
showed no matching stock client, controller or HDMI loader. The SDK archive
was read as data. A search of 5,614 source and configuration files in the
disclosure's complete nested GStreamer ZIP found none of the seven checked
connector, switch, or scaler identifiers. The private receipts are
`chromium108-prefix-coverage.json`, `starfish-sdk-inventory.json`, and
`gstreamer-connector-search.json` in
`build/phase-2/g4-03.11.20-offline/lg-oss-6948/`.

The G4 image's catalog entry identifies Chromium `108.0.5359.211`. The
32 public OSE Chromium 108 submission tags report `108.0.5359.217`. At the
checked OSE revision, `MediaPlayerNevaFactory` returns
`kMediaPlayerTypeNone` for `service/webos-external`. Its supported branches
construct a UMS player or an optional camera player. This source ends before
any HDMI port or scaler request.
[G4 catalog](https://tv.slada.sk/processed_fw.json) · [OSE version](https://github.com/webosose/chromium108/blob/431ed1c647b24f2337a5883e8011a0c4da73e710/src/chrome/VERSION) · [Factory dispatch](https://github.com/webosose/chromium108/blob/431ed1c647b24f2337a5883e8011a0c4da73e710/src/media/neva/webos/media_player_neva_factory_webos.cc#L30-L70)

**Unknown.** HDMI 2's first scaler choice requires the retail Multi View
caller and its physical HDMI load handler for this O24 build. The archive
transfers were left spent. No TV access or active tests occurred.

### Retail G4 extraction and call trace

One offline `epk2extract -s -n -c` run on the saved G4 image completed in
92.62 s with exit 0 and 312 successful signature checks. The tool identified
EPK3, firmware `03.11.20.01`, and OTA ID `HE_DTV_W24O_AFABATAA`. The input
SHA-256 matched the earlier receipt after the run. We built upstream
`a0ccd8a4b4f48d05675a4cddd233f8780ee36767` in the existing WSL environment with
workspace-local development dependencies. The build reported clock skew on
the shared filesystem and produced the extractor successfully. Using
`dpmeta.pak`, we carved four readable SquashFS partitions from `super.pak`.
The `rootfs` SHA-256 begins `8f4a19c9ad577618`. The stock client and HDMI
handler were recovered from that partition. The independent public catalog
search found no matching readable artifacts in its checked coverage.
[Extractor source](https://github.com/openlgtv/epk2extract/tree/a0ccd8a4b4f48d05675a4cddd233f8780ee36767) · [Public symbol inventory](https://github.com/webosbrew/dev-toolbox-cli/tree/2d5a7b6881850d825aa7fdc6c0b5e53c91dc40d3/common/data)

| Stock artifact | Observed behavior |
|---|---|
| `com.webos.app.multiviewsettings/main.js` and O24 `multiview.json` | The configuration lists HDMI 1 and HDMI 2 in order under `recommendedAppsMulti.2screen` at lines 595–600. The UI builds ordered `appId` and `order` entries at bytes 716756 and 717131 and sends the list and mode to `multiviewcontroller/launchApps` at byte 705704. That request carries no sink. |
| `/usr/sbin/multiviewcontroller` | The foreground-window callback binds the HDMI app's window at `0xd57e–0xd58a`. The binding callback maps the returned window to its port and stores the broadcast ID as the pipeline ID at `0xeb02–0xeb30`. The switch constructs `portId` and `pipelineId` at `0xe63a–0xe67c`. A separate `trackPipelineInfo` subscription observes the reported scaler resources at `0x1b094–0x1b0ea`. |
| `libextinput-service.so.1.0.0` and `libelement-video-hdmi.so.1.0.0` | HDMI post-load reads Multi View information at `0x779c6`. The HDMI element separately emits `requestSubScaler` through `subScalerResource` at `0x373e4–0x373f8`, and the watcher handles it at `0x77d44`. These messages are distinct from the connector's first scaler acquisition below. |
| `libav-connector.so.1.0.0` | A fresh video connector starts at type 2 (`0x18140–0x18144`). The side-by-side changed callback maps priority 1 to type 4 at `0x34630–0x34636`, calls `changeSink` at `0x3415c–0x34162` and then calls `tryConnect` on the same implementor at `0x342c2–0x342ce`. The normal window path writes the new type to the video connector at `0x21280`. |

**Verified in the code.** `VideoConnector::_prepare` reads the current type
at `0x18c28` and builds `MAIN_SCALER` for type 2 and `SUB_SCALER` for type
4. `connect` calls prepare at `0x229d4` before `acquire` at `0x22a78`.
Connection information has its own translation of a MAIN descriptor to
`SUB0` for type 4 at `0x19f06–0x1a1f6`. Seeing that descriptor by itself
cannot establish the type used by the first prepare.

**Candidate and unknown.** The G4 has a conditional delay for the normal-TV
HDMI path. `delayConnect` checks the source and feature flag at
`0x1edf2–0x1ee12`. A matching side-by-side request sets the flag at
`0x33ba2` and inhibits automatic connection at `0x33bb0`.
`setRenderReady` can clear readiness bit `0x40` at `0x22066`.
`tryConnect` requires status `0x7f` and an empty policy list. If HDMI 2's own
connector receives the matched priority-1 callback before its first
`_prepare`, and retains type 4, that request is `SUB_SCALER`. The fresh
delay flag starts clear. The stock trace has yet to establish that binding,
readiness and callback order always provide that condition. This is static
evidence for the G4 package. The C1 and hardware concurrency remain
unverified.

Extraction, partition and selected-file receipts are under
`build/phase-2/g4-03.11.20-offline/epk2extract-a0ccd8a/`. See
`single-extraction/result.json`, `single-extraction/partitions/inventory.json`,
`controller-trace/addresses.json` and `connector-timing-static/`.
This work used the saved update once with zero retries. No TV access or
active device tests occurred.

## SDK boundary for the C1 investigation

Checked 2026-11-11 after the owner's SDK question. LG's public
[TV SDK tools](https://webostv.developer.lge.com/develop/tools/sdk-introduction)
cover app development, packaging, installation and debugging. Its
[public TV Luna API inventory](https://webostv.developer.lge.com/develop/references/luna-service-introduction)
does not list IWC or a simultaneous-HDMI acquisition API. This is a bounded
documentation finding, not proof that no partner/private SDK exists.

LG also supplies an [OSE native development kit](https://www.webosose.org/docs/guides/setup/setting-up-native-development-kit/)
and LS2 library documentation. These are useful reusable foundations, but LG
explicitly does not guarantee [OSE APIs on retail TV products](https://www.webosose.org/docs/reference/).
The [OSE bus query documentation](https://www.webosose.org/docs/reference/ls2-api/com-webos-service-bus/#iscallallowed)
corroborates our admission-query route; the exact C1 binary verifies availability.
Reuse documented LS2 mechanics rather than reconstructing them unnecessarily.

The project already uses the community Linux ARM SDK recorded in the build
guide. [Homebrew native guidance](https://www.webosbrew.org/pages/native-development.html)
provides toolchain and reverse-engineered API leads; compilation support alone
does not supply LG's proprietary HDMI ownership/recovery contract. LG's newer
[Flutter SDK announcement](https://webostv.developer.lge.com/news/flutter-for-webos-tv-is-now-available-for-developers)
requires webOS TV 26 Re:New or later, outside the recorded C1 webOS 6.5.3 runtime.
None of these sources establishes independently live HDMI 1 + HDMI 2 on C1.

## Physical-input research gaps

| C1 capability | Status | Evidence needed |
|---|---|---|
| Concurrent HDMI activation and per-port frames | **Unknown** | Evidence of an independently addressable receiver path, then two distinct live HDMI clocks advancing in the same view without switching. |
| Selected HDMI viewport and overlay | **Unknown** | Verify ownership and placement of the selected HDMI surface while a separate overlay remains visible. |
| Capture of active HDMI | **Unknown** | An authorized output-capture test with unprotected input would address only the selected output. Forced capture and `/dev/mem` are **unsafe to test**. |
| HDMI plus tuner or app | **Unknown** | Verify each source stays live on the exact firmware, including foreground policy, input focus and cleanup. |
| Decoder, scaler and plane counts, 4K120/HDR/VRR, audio focus | **Unknown** | Allocation and teardown evidence for each claimed combination. |
| Built-in Multi View on C1 | **Undocumented for C1** | LG's feature list excludes the 2021 webOS 6 generation. Exact firmware component availability remains unknown. [Stock feature and model evidence](#stock-lg-multi-view-and-physical-hdmi) |

Seek C1-specific documentation for input ownership and video resource policy.
Use observed interfaces and bounded probes. [C1 playback evidence](../device-tests/c1-journal.md#phase-1)
