# LG C1 Phase 1 — Local video playback

Reference device: LG OLED C1, firmware 03.53.45, webOS SDK 6.5.3.
The [build guide](../build.md#phase-1-local-clip-packages) lists the IPKs
and SSH commands. Tests use two synthetic H.264 clips at 640×360 and 30 fps
with visible clocks. A originally ran 12 s and was extended to 30 s for
staging. B runs 15 s. The packaged tests are video-only. Audio focus and
simultaneous physical HDMI remain **unknown**.

## Native SMP

One SMP player and SDL exported window per clip. The
[upstream sample](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/media/smp/webos5/exported_window.c#L11-L109)
demonstrates single-window placement. The
[ABI notes](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/README.md#L67-L75)
describe the modern C++ ABI and four-argument Load.

### Owner-observed runs

| Version | Controls | Verified outcome |
|---|---|---|
| 0.1.0 | Left or Right for solo, OK for dual, Up for B geometry | Both clips played alone. In dual mode, A vanished around 2.20 s as B appeared. Up moved and resized B. |
| 0.1.1 | OK for dual, Down to release B | A logged 0 callbacks after B appeared. B logged 76 and stopped around 14.96 s. In the early-release run, counts were 0 and 1, and A reappeared with its clock advancing. |
| 0.1.2 | OK starts A. First Right creates B's empty window, second Right starts B. | A continued with the empty window, vanished when B started, and returned after Down. Menu counters were `1` empty window ready, `3` A with empty B, `0` A after B, and `22` B callbacks. |

### SSH-staged runs

In 0.1.3 and 0.1.4, OK starts A, Right steps through B's startup, Down
releases B, and Back exits. The SSH runner uses app-scoped SIGUSR1, SIGUSR2
and SIGTERM. Each table entry shows new A/B callbacks between the stage
acknowledgement and the first sample at least two seconds later.

| B stage | 0.1.3 hardware default | 0.1.4 software request |
|---|---:|---:|
| Create and position empty window | 14 / 0 | 14 / 0 |
| Construct player | 14 / 0 | 14 / 0 |
| Notify foreground | 14 / 0 | 14 / 0 |
| Load | 1 / 0 | 1 / 0 |
| Feed | 0 / 0 | 0 / 0 |
| Play | 0 / 12 | 0 / 0 |
| Release | 14 / 0 | 15 / 0 |

**Verified:** the first sustained stall in A's callbacks occurred during
B's Load stage. A's reported PTS held at 9.666 s in 0.1.3 and 9.966 s in
0.1.4, then advanced after release. B's software request was the only Load
option change in 0.1.4. The separate B-only run (Right) ended after 8.024 s
with zero frame callbacks across seven samples, consistent with the
eight-second first-frame timeout. Both staged runs exited cleanly.

**Unknown:** actual decoder selection, resource or policy decision, and
visible clock overlap during the SSH runs. Load and Feed can start native
work before explicit Play. The
[uMediaServer acquisition queue](https://github.com/webosose/umediaserver/blob/af89f8ac3355027a90d7b299a78fb6fab9b6ffca/src/resource_manager/AcquireQueue.cpp#L114-L146)
documents resource reclamation as a **candidate** explanation. The C1
journal sample had no matching policy event.

Reports under `build/reports/`: `c1-phase1-stages.json` (0.1.3),
`c1-phase1-stages-0.1.4.json`, and `c1-phase1-solo-b-0.1.4.json`.
The staged runs have a 50 s deadline and 55 s process alarm.

## Browser HTML5 comparison

Browser 0.1.0 uses two video elements with the same H.264 streams
remuxed to MP4. The SSH runner verifies the app's
[Web Inspector](https://webostv.developer.lge.com/develop/tools/cli-dev-guide#ares-inspect)
target over a loopback tunnel and runs the two solos before the dual test.
The dual test requests B two seconds after A starts advancing.

| Run | Verified clock telemetry on 2026-11-11 |
|---|---|
| A alone | Reached 3.106 s. |
| B alone | Reached 3.117 s. |
| Dual | A paused at 2.518 s after B was requested. B reached 3.329 s. Zero sampled intervals had both clocks advancing. |

The browser reported zero decoded frames in all runs, including solos.
Visible playback in this run remains **unknown**. The app released both
media elements and returned to its menu. The runner closed the Inspector
tunnel. Report: `build/reports/c1-phase1-browser-0.1.0.json`.

## NDL DirectMedia v2 native control

One session plays clip B. The C adapter uses the SDK's v2 data layout
and the C1's one-argument Init ABI. The
[reference sample](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/media/ndl/directmedia/directmedia_v2.c#L31-L135)
describes callbacks and microsecond PTS. It continues to Load regardless
of the foreground return. Its
[hardware table](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/README.md#L147-L157)
reports single-clip playback on a 65UP7560 running webOS 6.5.2.

**C1 result, 2026-11-11:** the owner installed and opened 0.1.0. SSH
verified the running ELF hash and started the run. Init returned `0`,
SetAppState (foreground) returned `-1`, and Quit returned `0`. The run
stopped after 184 ms with startup result `3`, zero submitted packets, and
zero frame callbacks. The controller confirmed the app exited.
Report: `build/reports/c1-phase1-ndl-0.1.0.json`.

**C1 result, 0.1.1 (2026-11-11):** after the owner installed and opened the
build, the SSH run recorded Init `0`, foreground `-1`, Load `0` and
SetArea `0`. NDL reported one Load-complete event and one Playing event
and accepted all 450 access units. It reported zero frame callbacks. The
owner subsequently confirmed seeing the clip and its clock advance on the TV
during this same SSH run: solo visible playback is **verified** by that
human observation, not inferred from packet acceptance or callbacks. Unload and Quit
both returned `0`, and SSH confirmed process exit. Report:
`build/reports/c1-phase1-ndl-0.1.1.json`.

For a manual run, OK starts the solo clip and Back closes the app. The
SSH runner sends SIGUSR1 to start and SIGTERM to close. It samples
accepted packets, frame callbacks, Load-complete and Playing events.
Eight seconds without packet acceptance ends feeding. The full run has
a 25 s deadline and 30 s process alarm. A completed feed drains for 2 s.
Run statuses: 0 complete, 1 cancelled, 2 fixture error, 3 startup error,
4 pipeline error, 5 feed timeout, 6 deadline. A playback pass requires a
visibly advancing clock and successful cleanup.

## Mixed SMP A + NDL B — 0.1.0

**Candidate experiment, built 2026-11-11; not TV-playback-tested.** Separate
app ID `io.github.tpapaz.multiview.mixed`. The owner-confirmed NDL solo result
above satisfies the prerequisite for this comparison. No open repository
issues were returned by the connected GitHub issue search on this date.

Implementation plan: share the existing SMP session and C1 NDL C adapter;
start SMP A left and establish callback/PTS progress; stage NDL Init,
foreground, Load, SetArea right, and feeding separately; release B and
measure A recovery; preserve app-scoped control, bounded execution, cleanup,
and human observation as separate evidence. The acceptance gate for this
experiment is an attributable stage trace plus owner-observed clock overlap
or its absence, not completion of the full Phase 1 gate.

The package reuses the same video-only local clips. A's frame/PTS baseline
and two-second measurements surround each stage; begin/end records also
identify time spent inside native calls. Foreground `-1` is recorded but
continues to Load, matching the verified solo control. B feeding is held
for at least 6.5 s, then released before EOF so A's 30 s fixture still has
room for the three-second recovery check. All NDL event counts and accepted
packets are telemetry, not a visible-overlap verdict. The runner asks the
owner whether both clocks visibly advanced together after saving the trace.
[Build and SSH procedure](../build.md#mixed-smp--ndl-build-and-test).

Validation on 2026-11-11:

- `wsl -d Ubuntu --exec cmake --build /mnt/d/Development/webos-multiview/build/phase-1/mixed`
  passed with `-Wall -Wextra -Wpedantic -Werror` using the existing 2026.08 ARM SDK.
- `./scripts/package-phase1.ps1 -Target mixed -LinuxNode /home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node`
  built the IPK. The packaging helper now removes CR from its Linux shell body.
- `wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/scripts/verify-ipk.py --mixed /mnt/d/Development/webos-multiview/dist/io.github.tpapaz.multiview.mixed_0.1.0_arm.ipk`
  passed exact file allowlist, payload bytes, metadata and executable mode 0755.
  FFprobe validated both access-unit indexes during packaging.
- `node scripts/verify-mixed-abi.cjs` passed a fresh read-only comparison with
  C1 firmware exports: 88 required imports, seven DT_NEEDED libraries,
  ARM32 soft-float, `/lib/ld-linux.so.3`, no RPATH, exact version providers.
  The NDL and SMP library hashes match the 03.53.45 evidence below. Evidence:
  `build/phase-1/abi-mixed-0.1.0.json`.
- `npm run lint`, `npm test`, and `node --check scripts/run-phase1-mixed-ssh.cjs`
  passed. New acceptance tests cover advancing baseline, stall and recovery
  deltas, missing stages and unexpected telemetry.
- `wsl -d Ubuntu --exec cmake --build /mnt/d/Development/webos-multiview/build/phase-1/smp-check`
  passed the shared-session regression build without replacing the control ELF.
- `wsl -d Ubuntu --exec cmake --build /mnt/d/Development/webos-multiview/build/host`
  and `wsl -d Ubuntu --exec ctest --test-dir /mnt/d/Development/webos-multiview/build/host --output-on-failure`
  passed (1/1). `wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/tests/host/schema_test.py`
  passed. Windows Python lacked `jsonschema`; the existing WSL installation was used.

No simulator or mixed-backend playback run was performed. Native call hangs,
resource contention, visibility, and recovery remain device-test risks.
Next task: owner installs/opens the mixed app, runs the staged controller,
and records the two visible clocks and A's recovery. Audio focus and
simultaneous HDMI remain **unknown**.

## Firmware and build evidence

Read-only inspection found an aarch64 kernel with ARM32 EABI5 soft-float
userspace, glibc 2.28 and loader `/lib/ld-linux.so.3`. ARM binaries used
CMake/Ninja under Ubuntu on WSL with the
[2026.08 webOS SDK](https://github.com/openlgtv/buildroot-nc4/releases/tag/2026.08-webos).
Six libraries and all required dynamic imports were matched against the
C1's firmware ELF exports. Packages were checked for exact payload and
mode `0755` on native executables. FFprobe verified fixture indexes and
FFmpeg decoded the source fixtures. The HTML5 IPK passed playback and
cancellation in desktop Chrome before the TV comparison.

| IPK | Required ARM imports | SHA-256 |
|---|---:|---|
| SMP 0.1.0 | 75 | `c4087fc1a636a577d01c111a3029a140a644227e28f69bae1599a0929ea9fc95` |
| SMP 0.1.1 | 75 | `42279ec3c25bedc0e9ba4e73dd7cef0cfba9cdd2f7367b5c971646a470c2ffce` |
| SMP 0.1.2 | 75 | `54d05db96be3ffaf5ca28e6d23482f796c658acecc835133c2ce416d68599459` |
| SMP 0.1.3 | 83 | `e816a632fff9446831dbf4375f2ccc9e3b181a6011a4a92a263c6f6c89293c8f` |
| SMP 0.1.4 | 83 | `223cf5a9d99e8e8553bb52a1f27e0cd780ab174d4c30af393fc0154c60760480` |
| Browser 0.1.0 | — | `5220268353844cca09dcad25b315ae2ce0ccb98c904a62fd82420b02b3464d1c` |
| NDL 0.1.0 | 69 | `9a1c47d56cb8efb4f9bf1ef2e9354e1887c6eac13fb3ae772af52185a9922cc2` |
| Mixed 0.1.0 | 88 | `62bc00fddd7cec1cc811f39bc03dde06c1837ebef315173af990ac1f1b17b37a` |
| NDL 0.1.1 | 69 | `bb04e2e5bdcbea23ef8b0c6ff7b9db25cf083008a3db877e1ec98bb82611517e` |

TV-playback-tested ELF SHA-256 values:

- SMP 0.1.3 `6ea50ba36069a911ea167eb0a07df75980834243ecafade1f32273e4907e1c2b`
- SMP 0.1.4 `b997c8042ae9731ffadf99e75b3f4cbab8c4d06392bf01174e14f2f641475cec`
- NDL 0.1.0 `8b5dc9a7e5c17a08244f1abae15c4f7bdea8ec250fd2e3fe01eca5bcbc564f7b`
- NDL 0.1.1 `d25f62c3fdd1311718e1eaf9d635ea64f97ef065a636dd32da107cb46fdc9d29`

Mixed 0.1.0 ELF (ABI-checked only):
`a719fd64e879ef093bcde95b4e1639badbb2a83936287ff24e367b8aeb432a32`.

Firmware references from 03.53.45:

- `libplayerAPIs.so.1` SHA-256 `0b0f665415e61e24d2a9ace42c25b04c5386fe8756b5cdd9c72380fb1bb24e77`.
  The software decoder option is referenced at `0x41c4e`, acquisition-skip
  diagnostics at `0x77c8a` and `0x78e4c`, and policy release at `0x7581c`.
  Resource config lines 340–343 map `media` to `starfish-media-pipeline`.
- `libpf-1.0.so.1.0.0` SHA-256 `603bdfef9b52548ebfcba51a6a9d30db080f76355b2c876efa641675b69cc8b6`.
  Contains `avdec_h264` at file offset `0x11810e`. The TV has `libgstlibav.so`.
- `libNDL_directmedia.so.1` SHA-256 `11344351eb85261685eb60c70df375518d56242946658f9f14975082458564a0`.
  Init at `0x12b0` forwards the app ID in `r0`, matching the
  [pinned v2 header](https://github.com/webosbrew/webos-userland/blob/00a5f8721e15d5c10030b99b2f3e73e0c527bcce/include/libndl-media/NDL_directmedia_v2.h#L37-L50).
- `libNDL_directmedia_impl.so.1` SHA-256 `a8977319badb37cb2aa5d2d39f4c0d753e4fa6423046d6e61a8d024a7c25fe75`.
  Imports SMP Load, Feed, Play and Unload through `libplayerAPIs.so.1`.
  The NDL test exercises a different setup path into the same engine.
