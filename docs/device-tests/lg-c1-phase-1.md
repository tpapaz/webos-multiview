# LG C1 Phase 1 dual local video protocol

Target: LG C1, firmware 03.53.45, webOS SDK 6.5.3. The
[Phase 0C record](2026-11-10-csp-startup.md) covers metadata, remote navigation,
Close, normal HDMI viewing after exit, and uninstall. The test below feeds two
synthetic files from TV-local storage. A connected HDMI source is optional.

## Build and compatibility

- **Verified inventory:** read-only SSH on the target reported `uname -m` as
  `aarch64` and `getconf GNU_LIBC_VERSION` as `glibc 2.28`. Reading the first 20
  bytes of `/usr/lib/libplayerAPIs.so.1` and `/usr/lib/libSDL2-2.0.so.0` found
  ELF class `01`, encoding `01`, and machine `28 00`: 32-bit little-endian ARM.
  `readelf`, `objdump`, and `nm` were unavailable in the TV shell. No library
  code ran during this inventory. The userspace ABI target is ARM32.
- **Candidate backend:** modern SMP with one player and one SDL exported window
  per clip. The upstream [window sample](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/media/smp/webos5/exported_window.c#L11-L109)
  demonstrates one window. The [ABI and test notes](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/README.md#L67-L75)
  describe the modern `__cxx11` and four-argument `Load` variant. The
  [hardware table](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/README.md#L147-L180)
  reports single-player runs on the 65UP7560 and OLED77C5. Whether one or two
  sessions work on this C1 remains **unknown**. The sample is a reference under
  the [existing reuse decision](../research/prior-art.md#snapshot-and-reuse-decisions).
- **Built and packaged:** the app in `native/phase1` cross-compiled under Ubuntu
  on WSL with CMake/Ninja and the Linux x86-64-host ARM SDK from the
  [2026.08-webos release](https://github.com/openlgtv/buildroot-nc4/releases/tag/2026.08-webos).
  The SDK archive matched the release SHA-256
  `2230a6351e5cce6fcb9d4fdcb4697335f223995401ef969c81744aaeb14c5344`.
  It supplies the SMP declarations and link stub and the webOS SDL headers.
  The app implements its own playback loop and uses the TV's installed libraries.
- **ABI checked on the exact C1:** Linux `readelf -W -h -l -d -V --dyn-syms`
  identified ARM EABI5 soft float and `/lib/ld-linux.so.3`. Read-only SSH supplied
  the loader and six `DT_NEEDED` files from firmware 03.53.45 for in-memory ELF
  inspection. All 75 required dynamic imports matched. Versioned imports matched
  their required providers, including `GLIBC_2.4`, `GLIBCXX_3.4.21` and
  `CXXABI_1.3.9`. This check covers binary linkage. The installer, playback,
  permissions for the media API, and runtime resource limits still need testing.
- **Package checked:** the `arm` IPK contains the exact staged files, including
  the checked ELF at mode `0755`, and package metadata. It contains no service,
  install scripts, or shared libraries. LG CLI 3.2.6 warned about the absent
  `requiredACG` declaration and completed packaging. Build SHA-256:
  `c4087fc1a636a577d01c111a3029a140a644227e28f69bae1599a0929ea9fc95`.

To reproduce from PowerShell after extracting the SDK onto Ubuntu's Linux
filesystem and running its `relocate-sdk.sh`, use the SDK toolchain file in
`share/buildroot/toolchainfile.cmake`:

```powershell
npm ci --no-audit --no-fund
./scripts/make-phase1-clips.ps1
$repo = '/mnt/d/Development/webos-multiview'
$sdk = '/absolute/linux/path/to/arm-webos-linux-gnueabi_sdk-buildroot'
wsl -d Ubuntu --exec cmake -S "$repo/native/phase1" -B "$repo/build/phase-1/arm" -G Ninja -DCMAKE_BUILD_TYPE=Release "-DCMAKE_TOOLCHAIN_FILE=$sdk/share/buildroot/toolchainfile.cmake"
wsl -d Ubuntu --exec cmake --build "$repo/build/phase-1/arm"
./scripts/package-phase1.ps1
```

The packaging script expects FFprobe on Windows and Node 22 on Ubuntu. Pass
`-LinuxNode /absolute/linux/path/to/node` when the Linux binary is outside PATH.
It stages the executable on Linux to preserve file mode. Output is
`dist/io.github.tpapaz.multiview.phase1_<version>_arm.ipk`.

## Fixtures and first TV run (0.1.0)

Run `./scripts/make-phase1-clips.ps1` from PowerShell with FFmpeg on PATH. It
generates two MP4 previews plus separate Annex B H.264 and ADTS AAC streams in
`build/phase-1/media`. Both clips are 640×360 at 30 fps with visible clocks.
A uses normal colors, runs for 12 seconds, and has a 440 Hz tone. B uses inverted
colors, runs for 15 seconds, and has a 660 Hz tone. The first IPK ships video
only. The audio streams are available for a later audio focus test once the
C1's per-session mute interface can be checked.

Host validation on 2026-11-10: the generator completed on Windows. `ffprobe
-count_frames` measured 360 and 450 H.264 frames, respectively, at the expected
resolution and frame rate, with AAC-LC audio in both MP4s. FFmpeg decoded both
extracted stream pairs to a null sink with `-xerror`. The packager checked that
the H.264 frame indexes cover both streams. `npm run lint`, all seven existing
`npm test` checks, the host CMake build, and its one CTest check passed.

1. Install the ARM IPK through Dev Manager and launch **MultiView Phase 1 Test**.
   The menu is idle until you press a playback key.
2. Press **Left** for A alone, then **Right** for B alone. Watch each clock and
   wait for the menu to return. Stop if either baseline fails. A red footer
   indicates the run failed. Green indicates the app reached end of stream.
3. Press **OK** for dual playback. The app attempts B two seconds after A's
   first frame. Watch for both clocks advancing at once. Press **Up** to move
   and resize B while A stays fixed. Record whether each clip ends independently.
4. Repeat and press **Back** during playback. Verify the app exits and normal
   HDMI picture and sound return. The app cleans up on Back, focus loss, a
   pipeline error, or timeout. It allows eight seconds for each first frame and
   30 seconds for the run. A 35-second process alarm bounds a stalled vendor
   call. If a run fails or normal viewing does not return, stop the experiment.
   Remove the app through Dev Manager after the test.

## C1 results and diagnostic retest

Owner-operated test on firmware 03.53.45 with the 0.1.0 IPK:

| Test | Result |
|---|---|
| Clip A alone / Left | Passed |
| Clip B alone / Right | Passed |
| Dual / OK | A appeared first. Around clock 2.20, B appeared and A vanished. The clips were never visible together. |
| B geometry / Up | B moved and resized while A remained invisible. |

Single-session native playback and B's geometry change are **verified** in
this run. The visible dual-surface gate failed for this build. Whether A's
pipeline stopped or continued while invisible is **unknown**. Read-only SSH
found no retained app diagnostics in the journal or app-tagged system log
sample. The run establishes no HDMI concurrency result. Audio focus remains
untested.

The 0.1.1 diagnostic IPK adds two counters to the menu after a dual run:
**A frame callbacks after B appeared** and **B frame callbacks**. A positive
A count indicates the app still received A's frame callbacks while B was
active. It does not establish that A's pixels were visible. A zero count
indicates the app saw no such callbacks during the measured overlap.

1. Install 0.1.1 and run **OK** once. Let it return to the menu or hit its
   timeout. Record both counters and whether the footer is green or red.
2. Run **OK** again. After B appears, press **Down** promptly while A would
   still have time left. This unloads B and releases its window. Record whether
   A reappears and its clock advances. Up still moves and resizes B while it
   is active.

0.1.1 rebuilt in Ubuntu on WSL with `cmake --build build/phase-1/arm` and
packaged with `./scripts/package-phase1.ps1`. Its loader, six dependencies, and
75 required imports matched the C1 ABI-checked 0.1.0 build. Package inspection
verified the ARM manifest, exact payload, and executable mode `0755`.
`npm run lint`, `npm test` (7 tests), and `git diff --check` passed.
SHA-256 `42279ec3c25bedc0e9ba4e73dd7cef0cfba9cdd2f7367b5c971646a470c2ffce`.

Owner-operated 0.1.1 results on the same C1 firmware:

| Run | A callbacks after B appeared | B callbacks | Visible result |
|---|---:|---:|---|
| OK, let B finish | 0 | 76 | A vanished at about 2.20 on its clock. B stopped at about 14.96 on its clock. |
| OK, release B promptly with Down | 0 | 1 | A reappeared after B was released and A's clock advanced. |

This verifies reversible loss of visible A playback during B's session for
this SMP setup. The counters are SMP callbacks. The two runs leave the decoder
state, resource arbitration, and exported-window ownership **unknown**.
Down unloads B's SMP player and destroys its exported window in one action,
so recovery alone cannot distinguish those operations.

The next control is to keep A running while creating and positioning B's empty
exported window. Observe A's clock and callbacks before constructing or loading
B's player. If A keeps advancing, opt in to starting B and record when A
changes. This isolates window setup from SMP startup. A result after SMP
startup still leaves foreground notification, Load, and playback resource
policy as separate candidates.

## Staged window test (0.1.2)

Install `dist/io.github.tpapaz.multiview.phase1_0.1.2_arm.ipk`. The main menu
still offers **Left** for A alone and **Right** for B alone.

1. Press **OK** at the menu and wait for A's clock to advance. A starts in
   the left half of the screen. B is absent at this point.
2. Press **Right** once. This creates and positions B's empty window without
   constructing B's SMP player. Watch A for one or two seconds. If A stops or
   vanishes at this stage, press **Down** to release the empty window and
   record whether A returns.
3. If A keeps advancing, press **Right** again while it still has time left.
   This starts B in the already-positioned window. Observe both clocks.
   **Down** releases B's player and window. **Back** exits and cleans up.
4. When the app returns to the menu, record **Empty B ready**,
   **A with empty B**, **A after B's first frame**, and **B callbacks**.
   An empty-window value of `1` confirms creation and positioning succeeded.
   The next two A counts measure callbacks during the separate stages. Compare
   them with the actual on-screen clock movement.

0.1.2 cross-compiled in Ubuntu on WSL with `cmake --build build/phase-1/arm`.
Its loader, six dependencies, and 75 required imports match the C1 ABI-checked
build. `./scripts/package-phase1.ps1` produced the ARM IPK. Archive checks
confirmed exact payload bytes, fixture indexes, and executable mode `0755`.
`npm run lint`, `npm test` (7 tests), and `git diff --check` passed.
SHA-256 `54d05db96be3ffaf5ca28e6d23482f796c658acecc835133c2ce416d68599459`.

Owner-operated 0.1.2 result on the same C1 firmware: A kept playing after
the first Right press, which created and positioned B's empty window. A
disappeared after the second Right press started B, and Down restored A.
The menu reported empty B ready `1`, A with empty B `3`, A after B `0`, and
B callbacks `22`. The failure is narrowed to the grouped B player startup.
The individual constructor, foreground, Load, Feed, and Play effects remain
unknown.

## Player stages and SSH control (0.1.3)

The owner explicitly requested automation over the existing SSH connection.
Version 0.1.3 adds app-scoped SIGUSR1 (start test or advance a stage), SIGUSR2
(release B), and SIGTERM (clean exit). The physical remote retains Right,
Down, and Back equivalents. The app must be installed and open first.

After A starts, successive advances perform only these operations on B:

1. Create and position the empty exported window.
2. Construct the SMP player.
3. Call notifyForeground.
4. Call Load, leaving feeding and playback disabled.
5. Enable feeding, leaving explicit playback disabled.
6. Request Play. A later Load-complete callback can reissue this request.

Load and Feed may trigger asynchronous native activity before Play is
requested. The experiment measures the observed timing at each step. It
does not infer internal decoder state from a method's return value.

A is extended to 30 seconds to accommodate the stages. B remains 15 seconds.
The run has a 50-second cooperative deadline and 55-second process alarm.
A first-frame timeout of eight seconds starts when Play is first requested.
Back, termination, focus loss, and pipeline errors take the cleanup path.

The app writes fixed CSV events, stage numbers, frame counts, and reported
frame PTS converted from nanoseconds to milliseconds into a private temporary
file. The file is unlinked immediately and remains available only through the
process's open descriptor. Closing the process automatically removes it.
There is no command listener or Luna endpoint.

From PowerShell, run `node scripts/run-phase1-ssh.cjs` after opening the app.
An optional argument selects an existing CLI device alias. The controller
requires exactly one matching root profile and checks version 0.1.3. Before
each signal it verifies the expected executable path, binary SHA-256, PID,
and process start time. It observes each stage for at least two seconds,
releases B, checks A's callbacks, retrieves the log, and closes the app.
Only fixed app-scoped commands are sent over SSH. Credentials stay in the
existing local profile. Redacted results are saved to
`build/reports/c1-phase1-stages.json`.

Validation completed locally:

- ARM build passed with warnings treated as errors.
- Exact C1 firmware ELF inspection matched all 83 required imports, all six
  dependencies, versioned symbols, and `/lib/ld-linux.so.3`.
- The ARM IPK contains the exact staged payload with the checked binary at
  mode `0755`. Clip indexes cover 900 and 450 H.264 access units.
- `node --check scripts/run-phase1-ssh.cjs`, `npm run lint`, and all seven
  existing `npm test` checks passed. The controller refused the installed
  older build before sending signals, as expected.
- IPK SHA-256 is
  `e816a632fff9446831dbf4375f2ccc9e3b181a6011a4a92a263c6f6c89293c8f`.

The owner installed and opened 0.1.3 on the LG C1 running firmware 03.53.45.
The first controller attempt found no matching executable because webOS exposes
the running executable and telemetry descriptor through the app jail prefix.
The corrected controller checked the jailed paths and the packaged ELF hash
before sending signals. The full run and exit check succeeded.

| B operation | New A callbacks | New B callbacks |
|---|---:|---:|
| Create and position empty window | 14 | 0 |
| Construct player | 14 | 0 |
| Notify foreground | 14 | 0 |
| Load | 1 | 0 |
| Feed | 0 | 0 |
| Play | 0 | 12 |
| Release B | 14 | 0 |

The counts compare each stage acknowledgement with its first sample at least
two seconds later. When Load returned, A had 48 callbacks and its last
reported timestamp was 9.533 s. It received one more callback at 9.666 s and
held there through Feed and Play. After B was released, A's callbacks resumed
and the last sampled timestamp advanced to 21.533 s. The first sustained stop
in A's reported frames occurred during the Load stage. A's visible behavior in
this automated run and the underlying resource decision remain unknown.

The redacted log is `build/reports/c1-phase1-stages.json`. The tested binary
SHA-256 was `6ea50ba36069a911ea167eb0a07df75980834243ecafade1f32273e4907e1c2b`.
`node --check scripts/run-phase1-ssh.cjs` and the automated run passed after
the controller path correction. A separate read-only SSH check confirmed the
test app exited. The next investigation is the SMP resource decision during
B's Load call.

## Software decoder comparison (0.1.4)

On the LG C1 with firmware 03.53.45, A's last reported frame timestamp
stalled after B's `Load` and advanced again after B was released. This makes
media resource contention a candidate explanation. LG's open-source
[uMediaServer acquisition queue](https://github.com/webosose/umediaserver/blob/af89f8ac3355027a90d7b299a78fb6fab9b6ffca/src/resource_manager/AcquireQueue.cpp#L114-L146)
and [resource API](https://www.webosose.org/docs/reference/ls2-api/com-webos-media/#acquire)
describe policy actions that can reclaim resources from another pipeline.
The journal contained no matching policy event for the C1 run. The exact
resource and policy decision therefore remain unknown.

Read-only C1 inspection found the following firmware evidence:

- `libplayerAPIs.so.1` SHA-256
  `0b0f665415e61e24d2a9ace42c25b04c5386fe8756b5cdd9c72380fb1bb24e77`.
  `StarfishMediaAPIs::parseLoadMessage` references
  `option.useSoftwareVideoDecoder` at instruction `0x41c4e`. The resource
  manager has paths referencing the software-decoder acquisition-skip messages
  at `0x77c8a` (`acquireAdaptiveResources`) and `0x78e4c` (`acquireResources`).
  The policy callback contains a resource-release diagnostic at `0x7581c`.
  These are static instruction addresses, independent of runtime load addresses.
- The C1 has `/usr/lib/gstreamer-1.0/libgstlibav.so`. Its player factory library
  `libpf-1.0.so.1.0.0`, SHA-256
  `603bdfef9b52548ebfcba51a6a9d30db080f76355b2c876efa641675b69cc8b6`,
  contains the `avdec_h264` decoder name at file offset `0x11810e`.
  Runtime selection of that decoder and concurrent presentation are unknown.
- `/etc/umediaserver/umediaserver_resource_config.txt` lists multiple resource
  classes and assigns the `media` pipeline to `starfish-media-pipeline` at
  lines 340–343. Declared quantities do not establish what is available to
  two sessions of this app.

Version 0.1.4 requests `option.useSoftwareVideoDecoder: true` only for B.
The JSON payload comparison confirmed this is the sole Load option change.
Install `dist/io.github.tpapaz.multiview.phase1_0.1.4_arm.ipk` through Dev
Manager, open it, and run `node scripts/run-phase1-ssh.cjs` for the same stage
sequence as 0.1.3. Right at the menu can test B's software request by itself.
The controller saves the comparison as `build/reports/c1-phase1-stages-0.1.4.json`,
preserving the 0.1.3 control trace. A positive result requires advancing A
and B callbacks after B's Play plus both clocks visibly advancing together.

The ARM build, package inspection, executable mode check, controller syntax
check, lint, and seven host tests passed. The loader, six dependencies, and
83 required imports exactly match the C1-checked 0.1.3 ABI. The IPK SHA-256 is
`223cf5a9d99e8e8553bb52a1f27e0cd780ab174d4c30af393fc0154c60760480`.

On 2026-11-11 the owner installed and opened 0.1.4 on the same C1. The SSH
controller ran all stages and saved `build/reports/c1-phase1-stages-0.1.4.json`.
The tested binary SHA-256 was
`b997c8042ae9731ffadf99e75b3f4cbab8c4d06392bf01174e14f2f641475cec`.

| B operation | New A callbacks | New B callbacks |
|---|---:|---:|
| Create and position empty window | 14 | 0 |
| Construct player | 14 | 0 |
| Notify foreground | 14 | 0 |
| Load | 1 | 0 |
| Feed | 0 | 0 |
| Play | 0 | 0 |
| Release B | 15 | 0 |

The counts compare each acknowledgement with its first sample at least two
seconds later. A stalled at a reported timestamp of 9.966 s during B's Load
and resumed after B was released. B reported zero frames during the roughly
three seconds between Play and release. The owner did not recall seeing B.
The software request did not preserve A's playback or produce simultaneous
playback in this run. Actual decoder selection remains unknown. The controller
completed and a read-only SSH check confirmed the app exited.

The owner then pressed Right at the 0.1.4 menu for a B-only run. Read-only SSH
verified the running binary hash and recovered the trace as
`build/reports/c1-phase1-solo-b-0.1.4.json`. The run ended with the failed
result after 8.024 seconds. It reported zero B frame callbacks across seven
samples, with A inactive throughout. This timing matches the eight-second
first-frame timeout in `Session::advance`. The trace does not record the exact
error branch or which decoder was selected. The app returned to its menu.

## NDL DirectMedia v2 native control

The next native candidate is NDL DirectMedia v2. The upstream sample reports
single-clip playback on a [65UP7560 with webOS 6.5.2](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/README.md#L147-L157).
Read-only inspection on the C1 running firmware 03.53.45 verified:

- `/usr/lib/libNDL_directmedia.so.1` exports Init, Load, Play, Unload, Quit,
  SetWindowId, and SetArea. SHA-256
  `11344351eb85261685eb60c70df375518d56242946658f9f14975082458564a0`.
  The Init wrapper at `0x12b0` preserves and forwards only the app ID in `r0`.
  This matches the pinned [v2 header](https://github.com/webosbrew/webos-userland/blob/00a5f8721e15d5c10030b99b2f3e73e0c527bcce/include/libndl-media/NDL_directmedia_v2.h#L43-L53).
  The [sample's Init call](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/media/ndl/directmedia/directmedia_v2.c#L64-L76)
  passes a second argument, so it cannot serve as the calling convention for
  this firmware.
- `/usr/lib/libNDL_directmedia_impl.so.1` links `libplayerAPIs.so.1` and imports
  Starfish Load, Feed, Play, and Unload. SHA-256
  `a8977319badb37cb2aa5d2d39f4c0d753e4fa6423046d6e61a8d024a7c25fe75`.
  NDL has a different setup path into the same media engine on this C1.

The 0.1.0 ARM package runs a single NDL session with the same 15-second
video-only clip B. The Linux SDK supplies the v2 data layout and link stub.
The C adapter binds the firmware's one-argument Init, then requests
foreground, Load, full-screen area and paced H.264 access units with
microsecond PTS. The callback and units are referenced in the
[upstream v2 sample](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/media/ndl/directmedia/directmedia_v2.c#L31-L135).
NDL's acceptance of a packet and its Load-complete or Playing callbacks are
separate observations from frame callbacks and visible clock movement.

Install `dist/io.github.tpapaz.multiview.ndl_0.1.0_arm.ipk` in Dev Manager,
open **MultiView NDL Clip Test** and leave it at the menu. With explicit
authorization, run `node scripts/run-phase1-ndl-ssh.cjs` from PowerShell.
An optional argument selects a configured local device alias. The runner
checks the app manifest, running executable hash, jailed paths, PID, and
process start time before signaling. It starts one run with SIGUSR1, reads
app-private CSV telemetry, closes the same process with SIGTERM and checks
that it exited. The report is saved as `build/reports/c1-phase1-ndl-0.1.0.json`. For a manual
run, press OK at the menu and Back to close.

The trace records Init, foreground, Load, area and cleanup return codes
and samples accepted packets, frame callbacks, Load-complete and Playing
counts. Back, focus loss and SIGTERM take the cleanup path. Eight seconds
without packet acceptance ends the run, successful feed drains for two
seconds, and the cooperative deadline is 25 seconds. A 30-second process
alarm bounds blocked vendor calls. The `feed_end` and `run_end` statuses are
0 (all packets accepted and drained), 1 (cancelled), 2 (fixture error),
3 (startup error), 4 (pipeline error), 5 (feed timeout), or 6 (deadline).
Check the clip's visible clock, Unload/Quit and normal viewing after exit.

**Built, packaged and ABI checked on 2026-11-11.** Ubuntu on WSL built the
ARM EABI5 soft-float executable with CMake/Ninja and the 2026.08 webOS SDK.
All 69 required dynamic imports, six shared libraries and the loader
`/lib/ld-linux.so.3` matched the read-only firmware ELF check for the C1
on 03.53.45. The package verifier checked exact payload bytes and mode
`0755` for the ARM ELF. IPK SHA-256
`9a1c47d56cb8efb4f9bf1ef2e9354e1887c6eac13fb3ae772af52185a9922cc2`.
Executable SHA-256
`8b5dc9a7e5c17a08244f1abae15c4f7bdea8ec250fd2e3fe01eca5bcbc564f7b`.
On-TV NDL playback is **unknown** pending installation and the solo test.
If the solo clock advances and cleanup succeeds, compare SMP A with one
NDL B under the same startup and release protocol.

## Browser HTML5 comparison (0.1.0)

The separate browser IPK provides an HTML5 comparison.
Its two HTML5 video elements use byte-identical copies of the native H.264
streams remuxed to MP4 with no audio track. The independent videos follow the
browser playback approach in [lg-iptv](https://github.com/sharktie/lg-iptv/blob/37776484ebc340b7cc0b7a674254b60c2f2bd8c6/js/livetv/multiview.js#L1-L83).
The dual run starts B two seconds after A begins advancing and samples both
clocks and available frame counters. The app releases media at the end of
each run and on Stop, Back, or loss of visibility.

Build the comparison using `node scripts/package.cjs browser` after generating
the Phase 1 clips. Install
`dist/io.github.tpapaz.multiview.browser_0.1.0_all.ipk`, open it in the
foreground, and run `node scripts/run-phase1-browser-ssh.cjs`. An optional
argument selects the existing local CLI device alias. The runner forwards the
[TV Web Inspector](https://webostv.developer.lge.com/develop/tools/cli-dev-guide#ares-inspect)
through a temporary loopback SSH tunnel and verifies the inspector page's URL,
app ID, and version. It runs A alone, B alone, and then both if the baselines
pass. It saves the trace to `build/reports/c1-phase1-browser-0.1.0.json`.
Both clocks advancing during the same intervals is telemetry. Confirm the
visible clocks independently on the TV.

The ARM native test package is separate. For the browser IPK, the manifest,
file allowlist, exact video streams, and file modes were checked. The packaged
page passed A, B, dual playback, and cancellation in desktop Chrome. Lint, all
seven existing host tests, and the controller syntax checks passed. The SSH
runner reached the C1 inspector and stopped when the browser app was absent
in the initial check. Browser IPK SHA-256 is
`5220268353844cca09dcad25b315ae2ce0ccb98c904a62fd82420b02b3464d1c`.

On 2026-11-11, the owner opened browser 0.1.0 on the C1 running 03.53.45
and authorized the SSH run. The report is
`build/reports/c1-phase1-browser-0.1.0.json`.

| Run | Verified browser telemetry |
|---|---|
| A alone | A's clock reached 3.106 s. |
| B alone | B's clock reached 3.117 s. |
| A then B | A was advancing when B was requested. A paused at 2.518 s while B's clock advanced to 3.329 s. Zero sampled intervals had both clocks advancing. |

The dual run reported `clock_stalled`. The browser reported zero decoded-frame
counts in all three runs, including the solos. On-screen presentation during
this run and the resource decision remain **unknown**. The app released its
media and returned to the menu, and the runner closed the Inspector tunnel.

The Phase 1 pass gate remains independent visible playback, geometry, audio
focus, and cleanup. Record the outcome at this backend, clip format, and
firmware scope. Simultaneous physical HDMI remains **unknown**.
