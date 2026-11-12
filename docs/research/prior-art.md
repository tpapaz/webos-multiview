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
| [webosbrew/webos-userland](https://github.com/webosbrew/webos-userland/tree/00a5f8721e15d5c10030b99b2f3e73e0c527bcce) | `00a5f8721e15d5c10030b99b2f3e73e0c527bcce` | Repository LICENSE is Unlicense; individual headers can retain vendor restrictions. The DILE VT header is declaration research only; see the [C1 map's licensing note](c1-hdmi-interface-map.md#pinned-upstream-boundaries-and-licensing). ABI declarations are not vendor guarantees. |

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
| Built-in Multi-View on C1 | **Unknown** | Exact model and firmware evidence. The Homebrew guide covers some webOS 7+ models. |

Seek C1-specific documentation for input ownership and video resource policy.
Use observed interfaces and bounded probes. [C1 playback evidence](../device-tests/c1-journal.md#phase-1)
