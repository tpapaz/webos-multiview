# C1 HDMI interface and evidence map

> Research/tool record. [Current status](../../STATUS.md) · [Documentation index](../README.md). Earlier next steps and untested labels describe that stage; use Status and later device records for current results.

Research date: 2026-11-11. Reference: rooted LG OLED C1, firmware 03.53.45,
webOS SDK 6.5.3, with one connected HDMI source. **Simultaneous HDMI 1 + HDMI 2
remains unknown.** This step inspected retained firmware/SDK material and
pinned upstream sources, then retrieved fixed firmware files read-only over
the existing authorized SSH profile. No Luna method, input switch, playback,
capture, settings change, build or packaging operation was performed.

Plan/gate: separate selection, receiver sessions, capture and presentation;
identify the C1 frontend's ownership path; preserve provenance; propose the
smallest bounded observation without assuming a second receiver exists.
Phase 1 remains partial; [decision 0003](../decisions/0003-close-idle-work-resume-hdmi.md)
continues to close idle and Glasshouse/Home work for this scope.

## Findings

Here, **verified/static** describes bytes, declarations or source flow,
not successful calls. **Candidate** needs device validation; **unknown** means
the required evidence is absent. **Unsupported** is limited to a demonstrated
interface limitation, not a verdict that the C1 cannot support dual HDMI.
**unsafe_to_test** marks paths excluded by the project safety rules.

| Boundary | Status and evidence | What remains unproved |
|---|---|---|
| Input selection | **Verified/source:** HomeBack inventories EIM inputs and launches their app IDs [U1]. **Verified/static C1:** the HDMI 1 manifest uses the native `inputcommon` executable [F1]. | Which input currently owns the running receiver was not queried. Launching an input app is not allocating a receiver per port. |
| Receiver/session ownership | **Verified/static C1:** `ExternalInputService.qml` opens `utp.extinputs` with app/window identity and input-source type, receives a pipeline ID, and uses that ID for switch, pause, stop and close [F2]. UTP role files declare this service under `utp-atsc` and `utp-dvb` [F4]. | Active server variant, allocation/arbitration, resource reclamation and second-session behavior. Role files do not identify a running owner. |
| Numbered port selection | **Verified/static C1:** `DisplayVideoModel.qml` maps HDMI1/2/3/4 to source type HDMI and port IDs 1/2/3/4; it switches its stored pipeline to the selected port [F3]. | Independent concurrent per-port activation. A numbered selector on a pipeline can still feed a shared mux. |
| Physical-input viewport | **Verified/static C1:** the frontend publishes its exported window to IWC, handles rectangle/crop commands and has a full-window recovery path [F3, F5]. The native executable imports `WebOSExported` geometry APIs [F6]. The [IWC follow-up](c1-iwc-ownership-recovery.md) identifies one-shot setters and priority arbitration, with no controller lease. **Candidate:** owner-mediated selected-HDMI geometry. | Effective Homebrew caller admission, exact prior-state restoration, controller-death recovery and TV behavior. Do not take over the stock app's publication. |
| Main/sub presentation | **Verified/device for local clips only:** explicit SMP main/sub passed both clocks, B geometry and A continuity [D1]. **Verified/static:** connector sink selection requests MAIN_SCALER versus SUB_SCALER [F7]. | No evidenced bridge from a second physical UTP session to `sub_video`/SUB0. Do not transfer the SMP Load option to UTP by analogy. |
| Output capture | **Verified/source:** Hyperion selects display/scaler taps; its DILE backend uses active capture and `/dev/mem` [U2]. **Unsafe_to_test** here. | Inactive-port frame access. Video-window indices and buffer counts are not demonstrated HDMI selectors [U3]. |
| SDK entry point | **Verified/declaration:** the installed Starfish and NDL headers expose media Load/window/area controls [S1]. A typed HDMI/UTP acquisition API is **unsupported by those inspected declarations**. | A JSON payload API's arbitrary contents are not fully described by its C++ signature. Header absence does not prove firmware absence. |

## C1 session and viewport path

The shipped frontend provides the clearest physical-input entry point:

1. `MainView.qml:101–103` forwards its assigned exported-window ID to
   `DisplayVideoModel.openFirstLaunch`. The model's lines 338–345 select the
   HDMI source type/port mapping before opening the external-input service.
2. `ExternalInputService.qml:58–64,87–93` supplies `options.appId`,
   `options.windowId` and `inputSourceType` to `open`; lines 39–49,69–78
   consume the returned pipeline ID. Lines 142–145 and 163–167 use the owned
   pipeline ID for `close` and `switchExternalInput` respectively [F2].
3. `DisplayVideoModel.qml:707–718` stores that ID. Its startup path at
   391–417 and 491–497 leads to `initVideo`; lines 1293–1304 define port
   numbers and 1313–1329 switch the stored pipeline [F3]. This is an actual
   firmware client contract, not proof that two opens remain independently live.
4. The model's lines 95–104 publish/cancel its window through IWC.
   `InputWindowControlService.qml:39–53` supplies app/window identity and
   dimensions to `publishWindow`, then uses a publish ID for `stopPublishWindow`
   [F5]. Model lines 1146–1204 handle matching-publish commands, validate
   rectangles and forward geometry to the frontend. Lines 1207–1227 restore
   the original full-window rectangle on a stop-publish response, subject to
   the frontend's PiP state [F3]. This does not establish restoration if a
   separate controller dies or the service refuses a release.

The HDMI 1 manifest declares a transparent native app and an owned window
group with anonymous attachment disabled (lines 5–8,26–30) [F1]. Its app role
has wildcard outbound permission [F4]; that is the **stock app's** role, not
permission inherited by a Homebrew app or permission to impersonate it.
UTP's inspected API files list the relevant extinputs methods in `private`
(lines 2,420–455). The videooutput API lists `getStatus` and display setters
under `media`, `public` and `private` [F4]. These are policy declarations;
neither a callable schema nor a successful authorization check follows.
No service call was used to test permission.

The retained AV connector is a second, narrower client lead. Its
`UTPConnector::registerId` at `0x158c0` builds an HDMI open request;
`_connect` at `0x16048` supplies a pipeline ID and a **fixed integer 5** for
`portId` (`0x160bc–0x160dc`). `setWindowId` at `0x163e4` builds pipeline/window
binding; `unregisterId` at `0x15c54` builds close. Endpoint strings are at
file offsets `0x22788–0x22860` [F7]. The meaning of this client's port 5 and
its applicability to physical jacks are **unknown**. It is not an app-selectable
HDMI1/2 recipe. The frontend's explicit 1–4 map must not be conflated with it.
Instruction addresses here are ARM ELF virtual addresses, Thumb bit cleared.

The retained example resource configuration declares `VHDMIRX=3` (92–94),
`AHDMIRX=2` (98–100), `HDMI_INPUT=8` (248–250), `MAIN_SCALER=1` (278–280)
and `SUB_SCALER=3` (284–286) [F8]. These are resource-manager declarations,
**not measured receiver counts or proof of simultaneous physical ports**.
No UTP server allocation trace, live grants or HDMI session log was collected.

## Provenance and local evidence

All new copies remain ignored under
`build/phase-2/hdmi-discovery-20261111/`; do not redistribute firmware/QML.
The `*-fixed-path-inventory.json` files record exact TV paths, local filenames,
sizes and SHA-256 values. Initial failed filename guesses are retained as
`unavailable`, not service absence. Directory reads were limited to fixed
policy/QML directories and selected service/component filenames. Collectors
use the existing profile loader, SFTP reads and 20/30-second connection caps;
file bounds were 512 KiB, or 16 MiB for the executable collection. No profile,
private key, live pipeline ID, network identifier or unrestricted log is exported.

| Ref | Original path / local copy and location | SHA-256 |
|---|---|---|
| F1 | `/usr/palm/applications/com.webos.app.hdmi1/appinfo.json` → `fixed-0.txt` | `c8bcb07519c404a361a9706d83c1cb59376681875717ae8f4375e5bd06d91092` |
| F2 | `inputcommon/qml/Service/ExternalInputService.qml` → `route-1.qml` | `2ecc5608daa23a44d39347654b9b13693d04e64768024bd7a8748cf0749f26b9` |
| F3 | `inputcommon/qml/Model/DisplayVideoModel.qml` → `route-5.qml` | `d61ee398fef6a9ff4e60155041965684657f4b4cfa0c87006f7cc90fc665437f` |
| F4 | `/usr/share/luna-service2/roles.d/`: HDMI1 app, UTP ATSC/DVB, videooutput roles → `policy-0..3.txt`; `api-permissions.d/`: UTP ATSC/DVB → `policy-4..5.txt`, videooutput → `fixed-7.txt` | Full individual hashes in `policy-fixed-path-inventory.json` and `fixed-path-inventory.json`; both UTP API files: `f80033f99cdbddb7ffccd4221b822a4dbed3110a34dcc275932d0ca1ef8bfd07` |
| F5 | `inputcommon/qml/Service/InputWindowControlService.qml` → `route-2.qml` | `5d55de45567e6c320b48ce71fff5e58e48f1a80a838820fe0b75c0d4a606fc50` |
| F6 | `/usr/bin/com.webos.app.inputcommon` → `followup-0.bin`, `inputcommon.symbols`; `InputCommon::setExportedWindow=0xce2c`, `setCropRegion=0xcfb0` | `39c2e04867c7b77150c81e5aec2c06221c960584dd5f4b1805d8f6cbb708f16f` |
| F7 | Retained `/usr/lib/libav-connector.so.1`, symbols/assembly under `build/phase-1/firmware-inspection/` | `c7cffeb1437f3b785782467cced052cefa3ed3f9d0a7689bb49db3b494f5aff3` |
| F8 | Retained `/etc/umediaserver/umediaserver_resource_config.txt`, same directory | `50609323ba9e200de509c793f0e4aee420a935ab94b757877423b7db62e46ea8` |

The abbreviated `inputcommon/` paths above expand to
`/usr/palm/applications/com.webos.app.inputcommon/`. Its `MainView.qml`
is `policy-7.txt`, SHA-256
`bcd9bf3f4773ecebc664c98917d42036408c8db1055f0f314f6ef178a8be704a`.
IWC/videosinkmanager policy filenames guessed in `viewport-fixed-path-inventory.json`
were unavailable. The [IWC follow-up](c1-iwc-ownership-recovery.md) subsequently
located its legacy service/roles and native provider. Effective Homebrew caller
admission and videosinkmanager's implementation remain unresolved; initial
filename misses are not service-absence evidence.

**S1:** existing Linux SDK `2026.08-webos`, rooted at
`/home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot`.
In its `arm-webos-linux-gnueabi/sysroot/usr/include/`:
`starfish-media-pipeline/StarfishMediaAPIs.h:48–49,64,67` has SHA-256
`cc988911df505cff5acdee5dd175a7fedc0998e50561315cdb7ed049fa97cfcd`;
`libndl-media/NDL_directmedia_common.h:43` has
`fdf4b1ef202d89dccffa2571229a6246e94b72dfcd268e440f8df1d575c0527f`;
`NDL_directmedia_v2.h:75,82` has
`ae6574f061dae3c7d812e69a6aee4c81a0a5ac4c1fccd1ba74fb92657b5e71e7`.
This newer SDK is declaration evidence, not a retail C1 ABI/behavior guarantee.

**D1:** [Phase 1 journal](../device-tests/c1-journal.md#phase-1), explicit main/sub
stages, and `build/reports/c1-phase1-sinks-stages-0.1.0.json` with its resource
report and owner observations. The [resource-path analysis](c1-smp-ndl-resource-path.md#exact-firmware-path)
records sink parsing/cleanup addresses. These existing TV-tested local-clip
results are retained unchanged; this HDMI research has no behavioral TV test.

## Pinned upstream boundaries and licensing

- **U1:** HomeBack [input inventory](https://github.com/angelcode1/webos-HomeBack/blob/27e5f4543a39a50484a3f184fe36a92cea565368/packages/app/src/shared/services/launcher/providers/input-manager/input-manager.provider.ts#L10-L50)
  and [launch delegation](https://github.com/angelcode1/webos-HomeBack/blob/27e5f4543a39a50484a3f184fe36a92cea565368/packages/app/src/shared/services/launcher/model/launcher.service.ts#L119-L122)
  establish selection only. Its app-PiP orchestration is separately bounded
  in the [prior audit](prior-art.md#network-playback-and-app-lifecycle-prior-art).
- **U2:** Hyperion's [DILE backend](https://github.com/webosbrew/hyperion-webos/blob/00c932f092084b234b3f619b060a98fa134c12bd/unicapture/backends/libdile_vt.c#L35-L165)
  and [VT backend](https://github.com/webosbrew/hyperion-webos/blob/00c932f092084b234b3f619b060a98fa134c12bd/unicapture/backends/libvtcapture.cpp#L32-L180)
  tap output paths, not independent HDMI jacks. No capture backend was run.
- **U3:** the older DILE header defines [video-window indices](https://github.com/webosbrew/webos-userland/blob/00a5f8721e15d5c10030b99b2f3e73e0c527bcce/include/dile/dile_vt.h#L72-L80)
  and names Create/CreateEx parameters [videoWindowID and bufferNum](https://github.com/webosbrew/webos-userland/blob/00a5f8721e15d5c10030b99b2f3e73e0c527bcce/include/dile/dile_vt.h#L410-L430).
  Its [provenance](https://github.com/webosbrew/webos-userland/blob/00a5f8721e15d5c10030b99b2f3e73e0c527bcce/include/dile/README.md#L1-L6)
  points to webOS 5 sysroot material; C1 runtime mapping is unknown. Despite
  the repository Unlicense, this [header retains an LG reproduction restriction](https://github.com/webosbrew/webos-userland/blob/00a5f8721e15d5c10030b99b2f3e73e0c527bcce/include/dile/dile_vt.h#L1-L8).
  Do not copy it as cleared Unlicense implementation.
- **U4:** an [overlay manifest](https://github.com/iDaddyCz/ha-lg-webos-pip/blob/c9e22766b7e045810cda7aafe63f4f732d0f5f18/webos-app/app/appinfo.json#L1-L17)
  supplies a presentation candidate, but its [reported target is G4/webOS 24](https://github.com/iDaddyCz/ha-lg-webos-pip/blob/c9e22766b7e045810cda7aafe63f4f732d0f5f18/README.md#L18-L33), not this C1.

All revisions already appear in [source-lock.json](source-lock.json).
Unlocated cached trees were not assumed present; pinned primary files supplied
the upstream follow-up. No upstream implementation was copied. Existing
license boundaries for samples, HomeBack and Hyperion remain in the prior audit.
The community proposal, network players and unread LG combination table there
add no C1 dual-port evidence.

## Smallest proposed active experiment — selected-HDMI HUD only

**Candidate, not built/packaged/ABI-checked/simulator-tested/TV-tested.**
After explicit owner opt-in, an original decoder-free transparent overlay
could test whether the already selected HDMI picture survives a diagnostic
surface. It would own only its app window, with no UTP, IWC, videooutput,
capture, audio-focus or input-selection calls. Overlay admission on C1 is
unknown [U4]; rejection ends the test without policy edits or retries.

1. The owner manually selects the sole connected, unprotected HDMI source
   with a visibly advancing clock. Record port number, model/firmware and
   baseline picture/sound as human observations; do not export source labels.
2. Open the future diagnostic explicitly. Show a small HUD with its own
   changing counter for **8 seconds**, with a **12-second whole-run cap**.
   No menu wait or idle campaign. The HDMI clock must remain visible outside
   the HUD; a transparent background alone is not a successful result.
3. Back/Exit, loss of visibility/focus, cancellation or deadline closes the
   app and releases its window/timers. Use an identity-checked app-only host
   close at the cap if normal closure stalls; never signal the HDMI frontend
   or a system service. A forced stop is recorded separately from clean exit.
4. Acceptance: owner sees both counters advance during the same interval,
   followed by HUD removal, confirmed process exit and normal HDMI picture
   and sound. Denied admission, black/frozen HDMI, unexpected input/mode change
   or failed cleanup is a stop/failure, never a reason to acquire another input.
   The remote's normal controls are the manual restoration route if needed;
   unconfirmed restoration leaves the gate failed and ends further tests.

Record only app/build hash, elapsed times, fixed lifecycle/cleanup outcomes
and separate owner yes/no/unknown observations. No screenshots/raw service
payloads, live IDs or vendor logs are needed. This can establish **selected-HDMI
overlay coexistence only**. It cannot pass the viewport or dual-HDMI gates.

The [IWC ownership/recovery follow-up](c1-iwc-ownership-recovery.md) now traces
the provider, legacy policy, setter fields, priority arbitration and recovery
boundary. It finds **no controller lease or identified disconnect rollback**.
Its caller/restoration follow-up identifies a declared own-app identity and
verifies that ordinary C1 compositor geometry clears crop state. Actual caller
admission and applied restoration remain untested. Next review a full-view-baseline
plan with independent bounded restoration before any geometry request. Do not
invoke publish/open/set methods merely to discover behavior. A direct UTP
experiment additionally needs server allocation/cleanup evidence; dual HDMI
also requires a second independent source.

## Validation

Static inspection used PowerShell, bounded SFTP collectors saved locally,
existing ARM SDK `objdump -TC` for `inputcommon`, retained connector
`objdump -dC`/symbol inventories, hashes and exact QML/policy line references.
REA's portable export inventory corroborates connector identity/exports only:
parent Evidence `ev_2d7eb4ba0a48b558843b8d234d20065fb98e5c06b1cffcb73662e49af85eea14`,
saved in local `rea-evidence.json`. No decompiler or runtime result is claimed;
no native analysis session was opened.

Validation commands/outcomes: `npm test` passed all existing host acceptance
checks; `npm run lint` passed ES5/JSON checks; `git diff --check` passed.
A read-only Node check verified all 17 successfully retrieved inventory
entries against their retained bytes/SHA-256, 32 local documentation links
and absence of trailing whitespace in the four changed Markdown files.
No tests were added. Native CMake/CTest builds, IPK packaging, simulator work
and device experiments were not run for this documentation-only change.
