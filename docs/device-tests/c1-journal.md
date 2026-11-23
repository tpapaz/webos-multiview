# C1 test journal

Reference: LG OLED C1, firmware 03.53.45 / SDK 6.5.3.
[Status](../../STATUS.md) · [Current disposition](current-plan.md)

Entries below retain their **as-used historical scopes and facts**. Old grant and
preparation wording is not current authorization or a replay queue. Current
permission/bounds live in the [current plan](current-plan.md); interpretation
corrections and saved-input locations live in the [evidence ledger](../research/c1-hdmi-evidence-ledger.md).

## Built-in tuner model identification

2026-11-23 (Athens). One pinned read-only connection queried only the model
and firmware through `getSystemInfo` and closed. The TV returned public model
`OLED55C14LB` and firmware `03.53.45`. No tuning or playback calls were made.
Private receipt `build/phase-2/c1-tuner-placement-20261123-001/tuner-model-summary.json`,
SHA-256 `081233a4eb1469296b959cee3d24acfa51327056c4c30e5df61054a24dbd9a83`.

A separate pinned read queried three model flags through `getConfigs` and
closed. `supportDualTuner`, `supportTripleTuner` and `supportNewDualTuner`
all returned `false`. No playback or configuration changes were requested.
Private receipt `build/phase-2/c1-tuner-placement-20261123-001/tuner-flags-summary.json`,
SHA-256 `f6ed06b978753107878c0fb3577b0a74106da0d88a53addb13cd67cbb9df78e6`.
[Two-channel analysis](../research/c1-hdmi-interface-map.md#two-built-in-dvb-channels)

## Built-in DVB resource inventory

2026-11-23 (Athens), OLED55C14LB on 03.53.45. A pinned read-only connection
found one registered DVB resource provider belonging to the legacy broadcast
backend and queried four physical resource kinds for the DTV input. Kinds
`0`, `1`, `2` and `3` returned `1`, `0`, `0` and `1` respectively. In the
saved allocator the tuner selector reads kinds `0–2`. No tune, open, or
simulator request was issued on the TV. The connection closed. A first
provider lookup also closed and issued no resource queries.

A separate bounded SFTP read retained the ARM `libpbnjson_cpp.so.2` required
by the decoder calculator. The handle, subsystem and pinned connection
closed. [Host replay](../research/c1-hdmi-interface-map.md#replay-with-c1-tuner-counts)

| Private receipt | SHA-256 |
|---|---|
| `c1-tuner-placement-20261123-001/tuner-resource-counts-002.json` | `001175125f57d75c16a68794792b175be0b279251d7222862e61b61f003ba6e5` |
| `c1-tuner-simulation-host/json-runtime-private/inventory.json` | `5aa1016dd18af64c9d60aadeea2abedc19a6d415dddfaa17fea1c902d9c4097a` |

## HDMI 4 and live tuner playback

2026-11-23 (Athens), C1 03.53.45, browser probe 0.1.5. The owner authorized
one install and one 40-second trial. Both sources were muted. The owner saw
HDMI 4 moving, pressed OK to start the already-tuned broadcast channel, then
saw the channel while HDMI 4 stopped showing. HDMI 4 came back when the
tuner preview closed. The owner confirmed normal picture, sound and remote
control afterward. **Simultaneous playback failed for this browser path.**

The redacted browser log recorded HDMI 4 `playing` 99 ms after arming and
the tuner `playing` 74 ms after the second OK. Tuner unload came about 5.02
seconds after the tuner callback and about 2.01 seconds before HDMI 4 unload.
The scheduled app close was acknowledged and the process was absent at
40.301 seconds. The trial and trace-read connections closed. Callbacks timed
the sequence. The owner observation established the visible handoff.

Private receipts under `build/phase-2/c1-tuner-placement-20261123-001/`:

| Receipt | SHA-256 |
|---|---|
| `tuner-install.json` | `ada41b4d7056db8b5d8b45464d04e1fa47c28ac8ddfdc4ff62b61708db04ad76` |
| `tuner-trial.json` | `66db725193226066b207604525bbfdaa3d29747d23c866615a53f535d643bd34` |
| `tuner-trace.json` | `357ccb710ab73cf00b74c124c57238033739259484662f4f72f8c97e26e22333` |

## Live tuner and secondary output read-only checks

2026-11-23 (Athens), C1 03.53.45. Six permission queries checked the native
and browser probe identities. The native identity had group coverage for
videooutput register, unregister, connect and disconnect. The explicit UTP
broadcast `setSink` rule covered neither probe identity. In a separate
connection, after the owner confirmed a normal live channel was showing, one
videooutput status query found a stock tuner-owned `VDEC` context on `MAIN`
and `SUB0` disconnected. Both connections closed. These checks issued no
playback or output-routing requests. [Interpretation](../research/c1-hdmi-interface-map.md#tuner-secondary-allocation)

A later bounded read searched display, TV-service and broadcast registration
filenames in the available service directories for the exact `tv.display`
service name. The selected files yielded no registration. The owning process
remains unknown. The connection closed without invoking the service.

Private receipts under `build/phase-2/c1-tuner-placement-20261123-001/`

| Receipt | SHA-256 |
|---|---|
| `secondary-permission-summary.json` | `a3881ff0055bfe324a815e515b0b11b898344f8804f9a51886e9bf6695829563` |
| `builtin-tuner-videooutput-summary.json` | `fae3c5505287b2fac31843dfda27c2b8edfa6f9192b300311cca76056e1e2203` |
| `display-registration-summary.json` | `d6ee2fc6c01acf524713783388b587a860ed3bdce30e016659fcb883efe2a67c` |

## HDMI 4 secondary selector read-only check

2026-11-23 (Athens), C1 03.53.45. One pinned connection completed five bus
permission queries and closed. Neither the native nor the browser probe had
group coverage for the examined media-server or UTP external-input sink
selectors. The current map gave the native probe zero coverage for UTP
external-input open and switch. The check issued no playback or routing calls.
Private receipt `build/phase-2/c1-tuner-placement-20261123-001/hdmi-secondary-permission-summary.json`,
SHA-256 `dcebe10efbb135de6e89be9bdc2a212e72d3ab378c7b9d8a0f33883fcd71aedf`.
[HDMI 4 code findings](../research/c1-hdmi-interface-map.md#hdmi-4-secondary-allocation)

## HDMI 4 and live tuner preparation

2026-11-23 (Athens), C1 03.53.45. The owner confirmed a live channel from the
built-in tuner and reported that Quick Settings on HDMI 4 had no stock
Multi View or PIP option.

One pinned read-only SFTP connection retrieved the DVB broadcast backend
(10,710,536 bytes) and closed the file, subsystem and connection. A separate
pinned read-only connection completed three bus permission queries and
closed. The app's group coverage included UTP tuner open, volatile tune, stop
and close. Both queried broadcast services showed zero coverage for the
sink selector. The preparation connections made no playback requests. [DVB trace](../research/c1-hdmi-interface-map.md#built-in-tuner-preview)

Private receipts under `build/phase-2/c1-tuner-placement-20261123-001/`:

| Receipt | SHA-256 |
|---|---|
| `private/inventory.json` | `95e9eb03b7a48a3a69d46404cc1c3eafc2d550c6f0c24df590fb36e31e7bfa1f` |
| `tuner-permission-summary.json` | `bd856bc786ea761d182c002365037c79aa28852a1dbb48304c059621256cd470` |

## HDMI 4 and silent clip 0.1.13 lifecycle

2026-11-23 (Athens), C1 firmware 03.53.45. The previous native probe was absent.
The owner authorized one install and idle lifecycle launch. The installer
verified the staged IPK hash and installed version, removed its staging
files, and closed its connection.

The C1 accepted one idle launch. Both report aliases matched and recorded
completed setup and local cleanup, worker readiness and reaping, and exit
intent 0. Both independent witness records observed app termination.
Collection began 27.181 seconds after dispatch. Both SSH connections closed
and the app was absent afterward. The owner saw an immediate return to Home
and confirmed normal picture, sound and remote control. The OS exit status
and hardware release remain unknown. This action opened neither playback path.

Private receipts under `build/phase-2/`:

| Receipt | SHA-256 |
|---|---|
| `hdmi-clip-install-20261123-002.json` | `6fe47147db0d10a85551703dd245530ec5f68de789ec4d3029f6fcb4880d7400` |
| `clip-c1-lifecycle-20261123-001/capture.json` | `e59ba39092075d8bb784325187832beb4f5f5336717c8eaf8fea97e6ebe4ec28` |
| `clip-c1-lifecycle-20261123-001/owner-restoration.json` | `06897a0c21044aa05e40768b95dd007e2367e42a94d5d13250c4a19a2ae78b0e` |

### HDMI 4 and silent clip playback preflight

The owner separately authorized one mixed playback trial. The runner read the
installed files and current bus coverage. Two queries returned zero coverage
for each of the four app-specific UTP methods and the grant group was absent
from the replies. The connection closed after 2.897 seconds with zero launch
submissions. Mixed playback and actual admission remain unknown.

The runner initially labeled the permission queries as launch cues. It now
emits the timer cue only at SAM launch submission. Offline replay covers the
missing-admission case and confirms that it emits zero cues.

Private receipt `build/phase-2/clip-c1-playback-20261123-001/capture.json`,
SHA-256 `80ac2ce6c69513ecba4b6c045227f7c3f87acad3ca6fed40537f8977d83be4c4`.

## Stock HDMI 1 receiver grant window

2026-11-22 (Athens), C1 firmware 03.53.45. The owner reported YouTube was open beforehand and confirmed a normal picture on HDMI 1 after the monitor-ready cue.

The 46-second passive capture completed. The monitor and AWK filter both exited 0 and the SSH transport closed. The redacted receipt reports `unknown / no_media_completion` with zero events. The window yielded no reportable media receiver grant. The receiver index, its physical jack association and release time remain unknown.

Private receipt: `build/phase-2/c1-stock-hdmi1-grant-20261121T230928.806Z/inventory.json`, SHA-256 `c44d5f6ce4ef259a8b18961b01f96272fda3ce9d811557bec4c3e3c6d6b82d9f`. The slot name uses UTC. [Capture procedure](../research/c1-receiver-decoder.md#bounded-stock-hdmi-1-monitor)

## HDMI 1 reconnect under observation

2026-11-21, C1 03.53.45. The owner unplugged the laptop while Jellyfin was on screen. The passive monitor reported ready before reconnect. Jellyfin stayed on screen after reconnect. The owner then selected HDMI 1 with the remote, saw the laptop picture moving and returned to normal Jellyfin playback with the cable connected.

The 100-second monitor retained 86 filtered envelopes. UTP accepted a port-1 switch at lines 1 → 36. The HDMI backend accepted its port-1 switch at 3 → 33. Between that call and reply, TVRM accepted a resource request for the same backend pipeline at 17 → 19. The returned resource list contained zero type-19 entries (`VHDMIRX`). The decoder reported `observed / no_receiver_in_reply`. The capture contained no selected open, close or TVRM release call. Session creation, receiver index and release time remain unknown.

The stream and SSH connection closed normally with no cap, malformed envelope or partial line. Private receipt `build/phase-2/c1-hdmi1-receiver-20261121-002/monitor-result.json`, SHA-256 `aa8924c7ac7942ccf59a397d46ff1e22621c68d8c92bd51e56643da140d7750e`. The adjacent collector records the UTP, backend and TVRM filters. The receipt retains redacted switch exchanges and the decoder verdict.

## HDMI 1 receiver capture from Jellyfin

2026-11-21, C1 03.53.45. The owner connected the laptop to HDMI 1 while Jellyfin was on screen. After the passive monitor reported ready, the owner selected HDMI 1, saw the laptop picture moving and returned to Jellyfin. A preceding HDMI 4 listener ended with zero retained envelopes before this run.

The HDMI 1 listener retained 42 filtered envelopes. The decoder matched a successful backend port-1 switch (call at line 1). The capture contained no selected backend open or close call and no TVRM allocation or release call. The decoder returned `unknown / no_tvrm_exchange`. The stream and SSH connection closed normally with no reported cap, malformed row or partial line. Recording began after cable reconnect. An earlier allocation, hardware release and receiver index remain unknown.

Private receipt: `build/phase-2/c1-hdmi1-receiver-20261121-001/monitor-result.json`, SHA-256 `98c555c4c1fbdb27e207c68e137429644f6531cdc4e6c62b3073295fee33d22b`. Only counts and the redacted decoder result were saved. The adjacent `monitor.cjs` records the filter.

## HDMI 1 selected with the LG remote

2026-11-21, C1 03.53.45. The standalone read-only Luna monitor reported ready before the reconnect and input-selection cues. The owner selected HDMI 1 with the remote and saw the laptop. The monitor captured one HDMI open at each service layer and one port-1 selection at each layer. The exact package that issued the logical open remains unknown. The projector's exact `com.webos.app.hdmi` check did not match, and it retained no raw app name.

| Observed exchange (call → reply) | What the saved aliases establish |
|---|---|
| UTP open 49 → 55, HDMI backend open 51 → 53 | Both returned success. Both omitted `options.mediaId` and `options.mediaFrontend`. Each caller used its own returned ID to select port 1 at 57 → 250 and 59 → 247 respectively. |
| AV registration 106 → 108, ownership 111 → 114, scaler 134 → 140 | The same caller supplied its registered child ID and proposed the backend ID from 53 as owner. The service echoed that child and returned `false`. The same child then acquired `MAIN_SCALER`. |
| Video output 146 → 154 | The accepted HDMI connection used the same backend ID as its context, with source index 3 on `MAIN`. The other AV child (206 → 208) received its own rejection at 210 → 214. |

No preceding registration reply in this stream returned the proposed owner ID. The receiver registered separately at 63 → 65 and requested `HDMI_INPUT` and `VHDMIRX` at 73. The stream ended and the SSH connection closed with 300 matching envelopes, zero correlation conflicts, no malformed rows and no reported truncation. The monitor made no input, ownership or sink calls.

Private receipt: `build/phase-2/c1-stock-hdmi1-monitor-20261121-001/monitor-result.json`, SHA-256 `383f6dde54ac59d14ee8a664b768f0c98650f6649610a5bbe8efd39567935c39`. The adjacent `monitor.cjs` is the collector used for this observation.

## Browser HDMI 1 connector ownership

2026-11-18. On C1 firmware 03.53.45 the owner confirmed the laptop picture
was playing in the 0.1.3 HDMI 1-only trace. The app armed once after Ready.
Both the browser and backend open identified the pair app. Each returned a
distinct pipeline ID that its caller then used in a successful port 1 switch.
The backend ID also matched the pair app's video-output registration and
accepted HDMI connection on `MAIN`.

Two `avconnector` registrations identified the app. One of those registered
callers used its returned child ID to request `MAIN_SCALER`, with an accepted
reply before the video-output connection. For each child, the same registered
caller sent its child ID and the HDMI backend ID as the proposed owner.
Both correlated `setOwnerPipeline` replies returned false for that child.
This distinguishes the video connector within this session. The trace does
not establish why the media server rejected the associations or a usable
single-connector route for `setSink`.

The monitor observed the complete bounded stream without recorded truncation
or correlation conflicts. The separate file-log snapshot had zero rows in
its host-clock window. The backup close was acknowledged and webOS confirmed
app absence 40.217 seconds after arm dispatch. The owner confirmed normal
picture, sound and remote operation. No sink change or HDMI 4 start occurred.

App IPK SHA-256 `2f2c5d633514af096ec9e51daddd4e4897885d923e6f35769f4bc5821a1e78ac`.
Private redacted bus evidence in `build/phase-2/c1-hdmi1-app-owner-20261118-001/monitor-result.json`,
SHA-256 `b457165d98afc16a6821147e2edb18ba9600e75aaea6abe836f0063debfc0efa`.
App receipt in `build/phase-2/browser-hdmi-pair-trial-20261118-004.json`,
SHA-256 `bf8abb19f8a880c1be130ef4e59d0dd5d367acca2eb69d1b387795adec2804b3`.

The initial read and an owner-requested retry for the candidate C1
resource-manager library both timed out before SSH readiness. The retry
closed after 3.06 seconds with zero SFTP sessions, file opens or bytes.
Local receipts are `private/inventory.json` in the
`build/phase-2/c1-resource-owner-provider-20261118-001` and
`build/phase-2/c1-resource-owner-provider-20261118-002` directories.

After the owner confirmed the TV was awake, the paired endpoint returned an
SSH greeting. A single pinned SFTP read then copied the 247,192-byte
resource-manager library. The file handle and connection closed. HDMI 1
was disconnected and no app ran for this check. Capture and offline result
are in `build/phase-2/c1-resource-owner-provider-20261118-003/private/`.
[C1 ownership rule](../research/c1-hdmi-interface-map.md#which-resource-id-did-hdmi-1-propose-as-its-owner)

## Browser HDMI pair — 40-second retry

2026-11-18. The owner approved one 0.1.2 default-routing trial with the
existing source on HDMI 4 and the laptop on HDMI 1. Both sources were
confirmed live before returning to Glasshouse Home. The app gave the owner
until 29 seconds after arm to press Start HDMI 1, with a 39-second browser
deadline and a 40-second TV-scheduled app-manager close.

The owner saw HDMI 4 picture and sound. HDMI 4 stopped when HDMI 1 played,
then resumed when HDMI 1 closed. Both windows went idle before the app exited.
The owner confirmed normal viewing and remote operation after exit. This
default-routing attempt did not produce concurrent pictures.

The saved trace records the HDMI 1 press 13.598 seconds after `armed`, HDMI 1
`playing` 67 ms after the press, and `unloaded-1` 5.005 seconds later.
`unloaded-4` followed 2.010 seconds after `unloaded-1`. The page kept the HDMI 4
source attached during the HDMI 1 observation. The trace leaves first-scaler
assignment and physical receiver release **unknown**. WebOS acknowledged close
and confirmed app absence 40.263 seconds after arm dispatch.

IPK SHA-256 `180cdb0913587e24c3ae1f84d15704965f78c662422b5fd8001b9e2c4aef95bd`.
Trial receipt `build/phase-2/browser-hdmi-pair-trial-20261118-003.json`,
SHA-256 `6208ffc80268ddc8d56057c9a03295acd1e440b6db3dd070991864b520b519c8`.
Recovered trace `build/phase-2/browser-hdmi-pair-saved-log-20261118-007.json`,
SHA-256 `cc299de99dbcd61c47673c495365630aa93b22e4e1b261e358ac20b9cafaec47`.

## Browser HDMI pair — Ready and playback retry

2026-11-18. The authorized retry upgraded the pair app to 0.1.1, verified the
installed files and opened the empty Ready screen. The owner reported the Ready
confirmation after pressing OK. A fresh app-manager relaunch armed HDMI 4 and
the TV scheduled close at 17 seconds. WebOS acknowledged both requests and
confirmed app absence 17.217 seconds after arm dispatch. SSH closed normally.
The journal query returned zero browser trace events. The page stores a bounded
on-screen log, whose saved contents were not collected during the trial.

The owner saw moving HDMI 4 before pressing Start HDMI 1. They reported that
HDMI 4 then stopped, the app appeared to crash, and normal viewing returned.
The host verified app absence after the scheduled close. The on-screen log
later showed that the app stopped HDMI 4 through its own deadline path before
any HDMI 1 startup. The earlier interpretation of a default-routing continuity
failure is superseded. Paired motion and first-scaler assignment remain
**untested**.

The separately requested read of the saved trace checked one write-ahead log
and five compacted tables in the shared WebAppMgr storage. It found no matching
probe trace in the inspected data and exported no unrelated storage values.
An owner-approved idle reopen then displayed the probe without arming a
source. WebOS confirmed it was closed 17.208 seconds after launch dispatch.
The owner recalled seeing `owner-ready` on the idle screen. A follow-up read
matched the exact app key under an app-named WebAppMgr origin and recovered
nine fixed events from the shared store. The earlier lookup had filtered out
that origin. Relative to the page opening, `armed` was at 40.449 s,
`playing-4` at 40.553 s, `owner-start-1` and `start-window-expired-1` at
54.810 s, and `unloaded-4` at 54.814 s. The code requires over 10 seconds of
budget for HDMI 1 startup and observation. At the press, at most 1.639 seconds
remained. The trace contains no HDMI 1 load or play event.

IPK SHA-256 `fba05b439e0a82f1316dddc1b243f6da3fd3bfe812ca0621afbceae0cb06ddb6`.
Local trial receipt `build/phase-2/browser-hdmi-pair-trial-20261118-002.json`,
SHA-256 `d756c34bb9559495f06a93ef799fdc5a18688a50c0c74f422219a5001badb559`.
Saved-log lookup receipt `build/phase-2/browser-hdmi-pair-saved-log-20261118-004.json`,
SHA-256 `ef77f4ea82daac5c2a29428ff4f635fedab68f2481eae03a3dfc962f8f6286ac`.
Idle reopen receipt `build/phase-2/browser-hdmi-pair-log-screen-20261118-001.json`,
SHA-256 `eafe8ff304b6130bcb6e6b7c5f7ac9e74c4a47ab3a5c7dde60817b5678e6c2ea`.
Recovered trace `build/phase-2/browser-hdmi-pair-saved-log-20261118-006.json`,
SHA-256 `9bca8a987825dcf85318d1269d5cb256e15e5308876d86efdf5e2a7840226edf`.

## Browser HDMI 4 and HDMI 1 — exploratory attempt

2026-11-18. The owner confirmed both live, distinguishable sources, with the
laptop on HDMI 1, and approved one default-routing trial with a TV-scheduled
close instead of the native hard alarm. Pinned SSH installed and verified the
separate `io.github.tpapaz.multiview.hdmipair` 0.1.0 package. The runner verified
four installed web files, sent one launch and got an acknowledgment. WebOS
acknowledged the scheduled close and showed the app absent 17.234 seconds
after dispatch. Temporary staging and both SSH sessions closed.

The owner pressed Start HDMI 4, saw no picture and returned to Home. The app
allowed the initial Start within three seconds of page initialization. The
receipt does not establish whether the press missed that window or media
startup failed. HDMI 1 start, video continuity and first-scaler choice remain
**unknown**. The package remains installed and closed.

IPK SHA-256 `773165e52cebdd3df71c89e7d54cb776825779a21defe41e17be74ca6696d9ac`.
Local receipts under `build/phase-2/` are
`browser-hdmi-pair-install-20261118-001.json` (SHA-256 `b1cb2e7214f1d097e6cf0360c31539d6ed6a6d7a06e7dba7fcf49c62f7488ace`)
and `browser-hdmi-pair-trial-20261118-001.json` (SHA-256 `b7493240ac1581821ff4d7c55f35de701501cf4b7ef669f331a7736d4a68b962`).

## C1 compositor and Multi View controller — read-only lookup

2026-11-18. One pinned, read-only SSH/SFTP session copied the core compositor
and its extension, 662,608 bytes total. Both file handles, SFTP and SSH closed.
The G4-style `com.webos.service.multiviewcontroller` descriptor was absent at the
checked path, so no controller executable was read. No app or port changed.
The first local preparation stopped before network access because the sandbox
could not set the capture ACL. The owner-context run used a fresh capture slot.

Local receipt `build/phase-2/c1-compositor-controller-20261118-002/inventory.json`,
SHA-256 `28e4a426407d539cdf2d4f8458492b6ebc0a5defaf80f032c957c96d6015e270`.
[Compositor findings](../research/c1-hdmi-interface-map.md#can-the-compositor-or-multi-view-assign-sub0-before-playback)

## Browser HDMI 4 — moving picture and sound

2026-11-18. **Verified on C1 firmware 03.53.45.** The owner confirmed an active
HDMI 4 source, returned to Glasshouse Home, and started the preview in the
standalone 0.1.0 web app. The owner saw moving HDMI 4 in the app window, heard
sound and reported a normal return. Exact playback duration was unmeasured.

Pinned SSH verified the four installed web files against the packaged source.
The owner authorized one TV-side app-manager close scheduled at 15 seconds
in place of the native hard exit alarm, with a separate 22-second owner timer
and remote restoration. The application manager acknowledged one launch and
one close. The running-app list confirmed absence 15.301 seconds after launch
dispatch. SSH closed normally. Hardware release, behavior under a hang and
HDMI 1 + HDMI 2 coexistence remain **unknown**.

Local receipt `build/phase-2/browser-hdmi-picture-20261118-001.json`, SHA256
`56d92a9be03678d247d6d43ba96cf638666d321ef70e65c87b77acfcfc83c9ee`.
[Current disposition](current-plan.md#browser-hdmi-4-preview)

## Browser HDMI preview — idle lifecycle

2026-11-18. **Verified on C1 firmware 03.53.45.** With owner authorization,
the pinned SSH session verified the staged IPK and installed
`io.github.tpapaz.multiview.hdmipreview` 0.1.0. The application manager listed it
after one idle launch, acknowledged the app-specific close, then omitted it
from the running-app list 3.656 seconds after the launch request. The runner
issued no HDMI request, removed its temporary IPK and closed SSH normally.
The probe remains installed and closed.

The owner saw the idle preview screen and reported a return to Glasshouse Home
with normal remote operation. HDMI admission, moving video, sound and media
teardown remain **unknown** for this web app.

Local receipt `build/phase-2/browser-hdmi-idle-20261118-001.json`, SHA256
`83c55011ea3606e683fb814cc25d2aab70481bc63b60b4973a62a1e6a726ed23`.
IPK SHA256 `35aea7c0770a7fdf1c5a718c14a73a8c04a142f5cddce36348e69d8e9c4a679a`.

## Stock HDMI 2 switch — read-only log capture

2026-11-18. The owner selected HDMI 2 from Home Assistant during bounded
read-only captures. The file-based captures surfaced receiver and scaler
requests. An event cap and later log rotation prevented a complete join.

The combined Luna stream matched stock port 2 to its backend video-output
context on `MAIN`. The only accepted connector ownership reply belonged to
a different pipeline with its own output context. An earlier `MAIN_SCALER`
request carried a resource connection ID that could not be joined to HDMI 2.
The first scaler request for stock HDMI 2 remains **unknown**.

The read-only sessions closed. The app stayed closed and no trial ran.
[Capture requirements](archive/c1-dual-hdmi-design.md#hdmi-2-first-scaler-request)

## C1 AV proxy wrapper — read-only capture

2026-11-18. A single-file SFTP read completed and the connection closed.
The owner was notified when TV access ended. The file and receipt stayed
local for offline review.
[Legacy finding](../research/c1-hdmi-interface-map.md#can-hdmi-2-select-sub0-during-setup)

## C1 browser engine — read-only capture

2026-11-18. A single-file SFTP read completed and the connection closed.
The owner was notified when TV access ended. The file and receipt stayed
local for offline review.
[Browser finding](../research/c1-hdmi-interface-map.md#does-browser-load-start-hdmi-scaler-preparation)

## Phase 0

Passive inventory and a clean app lifecycle were verified. [Detailed result](archive/lg-c1-phase-0.md).

## Phase 1

Main/sub local clips advanced together with tested geometry. Audio, extended
geometry, sustained repeatability and full recovery remain partial. This proves
local presentation, not physical input concurrency. [Detailed result](archive/lg-c1-phase-1.md).

## First-picture development summary

| Version/stage | Observed result |
|---|---|
| 0.1.4 | Launch flash; no native report or acquisition proof. |
| 0.1.5 / 0.1.6 | Inert controls isolated TV clock authority; both strict guards accepted in 0.1.6. |
| 0.1.7 | Installed/admission bindings passed; picture attempt failed during setup before acquisition. |
| 0.1.8 / 0.1.9 | Named registration failed after SDL in 0.1.8; registration-first passed in 0.1.9, with focus lease cancellation and quit incomplete. Neither old collision nor crash was proven. |
| 0.1.10 | SDL_Init20.027 s; trace ended at quit entry. Context was not pumped. |
| 0.1.11 | Pumping the app context reduced Init to68 ms; Quit13 ms and local cleanup returned. Scheduled collection was missed; separately approved late read did not prove timed termination. |
| 0.1.12 host starts | Two invocations stopped before SAM; first missing APPDATA, second underlying error unknown. Normal PowerShell subsequently succeeded. |

[Full dated outcomes and original hashes](archive/c1-first-picture-campaign-2026-11-15.md).
[Mechanism/provenance](../research/archive/c1-first-picture-development-2026-11-15.md).
Standalone superseded diagnostics were retired; their old next steps are not a
queue. No historical result authorizes another TV action.

## 0.1.12 lifecycle trial — cleanup and independent termination observed

2026-11-15: owner explicitly authorized one normal PowerShell lifecycle attempt,
installed checks and scheduled collection, remote/timer still ready, acquisition
closed. Baseline remained Glasshouse Home, HDMI preview closed. Installed
ELF/appinfo, generated versioned registration and utility bindings passed; app
and four lifecycle aliases absent. One SAM attempt acknowledged accepted, no
UTP acquisition or permission-map query. Submission cue delivered promptly while
the foreground controller stayed attached through collection. Actual owner timer
start was not separately confirmed.

Matching valid app aliases: **358 bytes**, setup/window-ID returned success in
**635 ms**, local cleanup success in **170 ms**; final issue age **1,245 ms**,
setupReady/localCleanup true, ownerRetained false, exit intent0. Only witness,
setup and cleanup stages; no pending stage or physical acquisition.
Matching valid **204-byte** launch-bound witness aliases independently observed
parent termination via death notification/reparenting/proc absence. App absent
at scheduled collection. This establishes termination, not numeric exit status,
signal/alarm cause or hardware release, which remain unknown.

Connections closed in **4.053 s** and **3.270 s**. Collection connection opened
dispatch+**27.012 s**, within unchanged two <=30-second caps. Post-run ELF/appinfo
still matched. Log size_cap; no further read. Host exited0. Owner explicitly
confirmed normal picture, sound and remote, **no recovery action needed**; separate
owner receipt bound to exact capture. All strict native/host/report bounds stayed
unchanged. No input switch, mode/policy change, restart, power, rebuild or package.
This grant is consumed; no further device action was made or authorized.

Capture/stages/private authority/raw aliases/owner receipt:
build/reports/lifecycle-0.1.12-20261115-003/.
Capture SHA-256 ecf2196c8cdbf0730f3b120810f8ae6ff9e6725d0919eb943f14c1353e51c805.
Trace SHA-256 001238d808c3d156d1a3277f0b23b274f49e6e24f498b5de0bea82e004ee5ab3.
Witness SHA-256 1d3e4d45831a9f833453c8ae150012f9271268ac1c27c47a0c2dc06b6ca5e419.
Frozen as-used inputs, exact offline lifecycle evidence replay and public result:
build/phase-2/lifecycle-trial-0.1.12-20261115-003/.
Replay passed installed/build/package/launch/metadata/raw alias/stage/bounds/owner
bindings, 271 preservation pins, 43 source pins and 21 original IPKs. Existing
native/ABI/sanitizer/archive acceptance reused unchanged. Lifecycle evidence
accepted; **physical acquisition stays closed without fresh separate owner scope**
and the existing same-boot check. No more setup package is needed for this result.


## 0.1.12 physical HDMI-4 — moving picture and sound

2026-11-15, LG OLED C1 / firmware 03.53.45: owner authorized one bounded physical
HDMI-4 trial, installed/admission checks and scheduled collection, no retries.
Owner reported moving video on HDMI 4, Glasshouse preview closed, remote/timer
ready. Normal PowerShell foreground runner passed same-artifact lifecycle evidence,
fresh same-boot authority, installed/generated/utility/app-absence/four-fresh-slot
checks and two exact read-only permission maps. One SAM attempt acknowledged.
Submission cue delivered promptly; actual owner timer start not separately confirmed.

**First physical picture verified:** owner reported HDMI-4 picture and audible
sound, then explicitly confirmed **continuously moving video in the centered box**.
After collection, owner confirmed normal picture/sound/remote, **no recovery needed**.
This is one short single-port result, not dual HDMI, long-term stability, independent
audio routing or hardware-release proof.

Both app aliases identical/valid **588 bytes**; witness aliases identical/valid
**204 bytes**, exact physical action/gate/launch binding. Timings: setup416 ms,
open23 ms, select242 ms, observation8,003 ms, stop12 ms, close215 ms, local cleanup
172 ms. Status candidate_interval_completed; open/select/stop/close/localCleanup
true, ownerRetained false, exit intent0, final issue age9,453 ms. Independent
termination observed; app absent at collection. Numeric exit status, signal/alarm
cause and hardware release remain unknown. acquisitionUncertain remains true by
design after any dispatched open; acknowledgments do not clear backend uncertainty.

Submission/collection connections closed in **4.568/3.370 s**; collection connection
opened dispatch+**27.003 s**. Post-run ELF/appinfo matched. Log size_cap; no extra
retrieval. All native/host/report bounds unchanged; no second attempt, policy/mode
change, restart, power, build or package. Grant consumed; no further TV action.

Original capture/stages/private launch authority/map replies/raw alias pairs and
separate capture-bound owner observations:
build/reports/picture-0.1.12-20261115-001/.
Capture SHA-256 88713048c9bb137c2cb147eda546ee11455b8a1087f5bffa9026e25f2c2965b2.
Trace SHA-256 9c9d000e2d7683699317665215552c5b2e44614b1bbe8a72c7f9ba48e14a4809.
Witness SHA-256 8249d08bacc6ab7d1ea6151523ef2a75b80ed2d779125705f87444913bc085e9.
Frozen as-used inputs and saved-evidence validation:
build/phase-2/picture-trial-0.1.12-20261115-001/.
Exact raw trace/witness/launch/lifecycle/boot/package/stage/closure checks passed;
43 candidate source pins and the 0.1.12 package remained exact. Existing native/
ABI/sanitizer/archive acceptance reused unchanged.

Preservation exception: all 21 original IPKs matched immediately before the run.
Post-run local audit found 11 older hdmiwindow IPKs absent from dist, with 274
other unique preservation pins matching and no changed contents. The owner then
confirmed intentionally removing those packages. The agent issued no deletion/move. Current
0.1.12 IPK and all current/lifecycle evidence remain present and matched. No files
were recreated or package rebuilt. This exception does not invalidate the observed
picture; exact historical package reinstall/replay is unavailable for those versions.
The owner does not need them for current work; leave them absent, retaining hashes.

## Passive HDMI collection

15–17 November 2026. The read-only campaign collected HDMI element, resource-client, allocator, video-output and media-service evidence. Configuration reported two video receiver resources and listed `MAIN` and `SUB0`. Independent per-port allocation and concurrent motion remained unknown. The final ResourceManager mapping lookup timed out before authentication. The archive preserves the individual outcomes, bounds and original hashes. [Collection records](archive/c1-hdmi-collection-2026-11-15-to-17.md)
