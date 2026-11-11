# LG C1 Phase 1 — Local video playback

Reference device: LG OLED C1, firmware 03.53.45, webOS SDK 6.5.3.
The [build guide](../build.md#phase-1-local-clip-packages) lists the IPKs
and SSH commands. Tests use two synthetic H.264 clips at 640×360 and 30 fps
with visible clocks. A originally ran 12 s and was extended to 30 s for
staging. B runs 15 s. The packaged tests are video-only. Audio focus and
simultaneous physical HDMI remain **unknown**.

## Current conclusion and next gate

**Verified on this device:** staged SMP A `main_video` + B `sub_video`
showed both clocks advancing together, independent B movement/scaling and
A continuity after B release. B-only and Load-only controls passed first.
The owner saw only A during Load-only, as expected with no B packets.

Earlier default-main SMP and mixed SMP/NDL paths failed visible overlap.
Retained logs established that B's presentation registration took A's
MAIN_SCALER, even though B's media registration already held SUB_SCALER.
Explicit Load-time sink selection resolved that measured short-run failure.
[Exact firmware path and ownership evidence](../research/c1-smp-ndl-resource-path.md)

The current task is repeatability and endurance, using a separate package.
Endurance 0.1.0 is **built, packaged and C1 ABI-checked, not yet TV-tested**.
Run one smoke cycle, then 20 fresh-process cycles, then gated five-minute
and 30-minute overlap tests. [Install/run instructions](../build.md#repeatability-and-endurance)
and [decision](../decisions/0002-main-sub-validation.md).

The history below consolidates the owner observations and recorded traces;
its initial unknowns are resolved only where later evidence explicitly says so.
Phase 1 is still active: long stability, repeated cleanup, wider independent
geometry and audio focus remain unverified. Physical HDMI concurrency is unknown.

## Native SMP — historical default-main comparison

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

**Unknown for these historical runs:** actual decoder selection, resource
decision and visible overlap. Later mixed-run logs establish a presentation
handover for that separate comparison. Load and Feed can start native
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

**Built and TV-tested on C1, 2026-11-11; no visible overlap observed.** Separate
app ID `io.github.tpapaz.multiview.mixed`. The owner-confirmed NDL solo result
above satisfies the prerequisite for this comparison. No open repository
issues were returned by the connected GitHub issue search on this date.

The mixed package starts A, separately stages NDL Init, foreground, Load,
SetArea and feeding, then releases B and measures A recovery. The same
video-only fixtures and bounded app-scoped controller are used. Foreground
`-1` is recorded but Load continues, as in the solo control. Build and
protocol details live in the [build guide](../build.md#mixed-smp--ndl-build-and-test).

### C1 staged run, 2026-11-11

The owner installed 0.1.0 and opened its menu, then authorized the SSH run.
`node scripts/run-phase1-mixed-ssh.cjs` verified the running ELF hash and
completed with exit code 0. Report:
`build/reports/c1-phase1-mixed-0.1.0.json` (schema version 1).

| B stage | New A callbacks | A PTS advance | New accepted B packets |
|---|---:|---:|---:|
| Init | 12 | 2400 ms | 0 |
| Foreground | 12 | 2400 ms | 0 |
| Load | 1 | 133 ms | 0 |
| SetArea | 0 | 0 ms | 0 |
| Feeding | 0 | 0 ms | 66 |
| Released | 11 | 13267 ms | 0 |

Each measurement spans the stage acknowledgement to the first sample at
least two seconds later. **Verified telemetry:** A callbacks and timestamps
advanced before B; the sustained stall began at NDL Load. A's PTS held at
6.866 s through SetArea and feeding, then advanced after B was released.
The recovery PTS jump includes the stalled interval; it is not a measurement
of smooth playback or frame rate. This reproduces the stage-level stall
seen in the earlier two-SMP tests through the different NDL setup path.

NDL returned Init `0`, foreground `-1`, Load `0`, SetArea `0`, Unload `0`,
and Quit `0`. It accepted 192 packets before the deliberately early release,
reported one Load-complete event and one Playing event, and reported zero
frame callbacks. SMP cleanup succeeded, run status was `0`, and the SSH
controller confirmed process exit.

**Verified owner observation:** first A, then a black screen, then B, then
A again. The two clocks were never visible together on the same screen.
This run did not satisfy the concurrent-visible-playback acceptance gate.
The JSON records `visibleOverlap.observed: false`; capability status remains
`unknown` because one failed combination does not prove universal lack of
support. The return of A is visually confirmed; no additional clock timing
claim is inferred from that observation.

No simulator test was performed. Resource-policy cause, audio focus and
simultaneous HDMI remain **unknown**. The [shared-path review](../research/c1-smp-ndl-resource-path.md) recommends
a bounded resource/presentation observation during B Load, followed by
policy-callback instrumentation only if current logs are insufficient.

### Load-only resource experiment — C1 run, 2026-11-11

Plan: reuse installed mixed 0.1.0 and its app-scoped SSH signals; hold NDL B
at stage 3 (Load) for at least 6.5 s, with no SetArea/feed; release B, capture
A recovery, and correlate bounded resource/display log projections with the
native trace. No new native build or IPK. The acceptance checks require zero
B packets, no SetArea/feed events, cleanup and process exit; the research
gate additionally needs an attributable resource/display decision.

Host preparation on 2026-11-11: `npm test`, `npm run lint`,
`node --check scripts/run-phase1-mixed-ssh.cjs`,
`node --check scripts/phase1-resource-log.cjs`, and `git diff --check` passed.
Privacy tests cover identifier removal, resource-token boundaries and honest
attribution of unrelated system events. A 2.2 s read-only collector preflight
on the C1 examined eight new lines, projected two entries, and closed without
collector error. Journal JSON queries yielded no entries; the readable syslog
is the capture source. BusyBox requires `timeout -t 50`; that syntax was
verified in the successful preflight. The owner subsequently opened the menu and authorized the run below. [Procedure](../build.md#load-only-resource-experiment-with-installed-mixed-010).

The SSH command `node scripts/run-phase1-mixed-ssh.cjs --load-only` completed
with exit code 0 against the installed mixed 0.1.0 ELF hash
`a719fd64e879ef093bcde95b4e1639badbb2a83936287ff24e367b8aeb432a32`.
Report: `build/reports/c1-phase1-mixed-load-only-0.1.0.json` (schema 1).

| Stage | New A callbacks | A PTS advance | Accepted B packets |
|---|---:|---:|---:|
| Init | 11 | 2200 ms | 0 |
| Foreground | 11 | 2200 ms | 0 |
| Load | 1 | 33 ms | 0 |
| Released | 11 | 8967 ms | 0 |

The two-second stage measurements again place sustained starvation at B
Load. A held at 6.766 s until release; the final recovery sample reached
16.766 s. B remained at stage 3, with about 7.1 s from Load return to
release. No SetArea or feeding events occurred, and every packet count was
zero. NDL nevertheless reported one Load-complete and one Playing event,
with zero frame callbacks: Playing alone is not a rendered-frame verdict.
Unload, Quit and A cleanup returned success, run status was 0, and the
controller confirmed process exit.

**Verified owner observation:** A disappeared, then returned with its clock
advancing after B release. This experiment establishes the takeover without
B packet submission or the app's explicit SetArea call. NDL's own output
and visibility setup still occur inside Load.

The collector examined 2603 lines and retained 82 redacted projections,
with no truncation or collector error and confirmed collector closure.
Near B Load it captured SUB_SCALER and VDEC/G1_H264 acquisition categories,
then MAIN_SCALER acquisition, policy/disconnect categories and a MAIN_SCALER
release/acquire sequence (host receipt about 8.1 s from collector start).
Near B release it captured another MAIN_SCALER release/acquire sequence
(about 16.1 s). These are token/category matches in system logs; they do not
by themselves establish successful grants or identify which player held a
resource. Syslog delivery is buffered, so timing is approximate.

At collection time these were unattributed resource categories. The later
retained-log correlation below resolved A/B ownership without another run.
No logging configuration or TV service was changed.

### Retained-log ownership attribution, 2026-11-11

Read-only correlation of the original run in `/var/log/messages.0.gz`
resolved the prior attribution gap. **Verified/logs:** B Load's policy update
lists A's scaler registration releasing MAIN_SCALER and B's acquiring it.
Successful grant/resource-list updates confirm MAIN_SCALER index 0 moved
to B; after B release, A's original registration reacquired index 0.
Media UID registration messages link each scaler registration to its A/B
media pipeline. Both exact app ID matches and the native stage spacing
support the mapping; raw IDs were used only in memory.

A held VDEC index 3 / G1_H264 index 7. B obtained VDEC index 2 / G1_H264
index 6 and SUB_SCALER index 2, but B's separate presentation registration
still took MAIN_SCALER. No A decoder release was observed at B Load;
continued decode execution remains unknown. This narrows the measured
failure to contention in the main presentation scaler path.

Evidence, hashes and decompressed source line references:
[retained-log attribution](../research/c1-smp-ndl-resource-path.md#retained-log-attribution--main_scaler-handover-verified).
The redacted 33-record evidence report is
`build/reports/c1-phase1-load-only-attribution-0.1.0.json` (schema 1).
No playback repeat, IPK build or TV configuration change was performed.
The [sink-selection review](../research/c1-smp-ndl-resource-path.md#why-main_scaler-was-selected-and-the-independent-sink-candidate)
then identified the SMP Load-time selector tested below.

## Two-SMP main/sub 0.1.0 — TV-tested control

Separate app `io.github.tpapaz.multiview.sinks`, explicit A main_video and
B sub_video, hardware-default decoding and unchanged fixtures. Built with
local WSL CMake/Ninja and the 2026.08 ARM SDK. Package verification passed
exact payload/bytes, metadata, mode 0755 and absence of extra scripts/links.
The fresh firmware ABI check matched 81 imports and six DT_NEEDED libraries.
Host acceptance tests, lint and shared-session regression compilation passed.
No simulator test was performed. [Reproduction](../build.md#two-smp-mainsub-package)

IPK SHA-256:
`c96c41242715c4ea8b1c3786de0d9ff36074c966e6ef1d7dd75ec81158cce0ad`.
TV-tested ELF SHA-256:
`e15189df254827e2569a8cb17d64dfaedeab18f913ded0845bf33ca685b6251b`.
ABI evidence: `build/phase-1/abi-sinks-0.1.0.json`.
Existing SMP, NDL and mixed control artifacts were preserved.

### Main/sub 0.1.0 B-only control — TV-tested, 2026-11-11

The owner installed/opened **MultiView Main + Sub Test** and authorized
`node scripts/run-phase1-sinks-ssh.cjs --solo-b`. The controller verified ELF
`e15189df254827e2569a8cb17d64dfaedeab18f913ded0845bf33ca685b6251b`.
The eight-second run completed with exit code 0: 33 B frame callbacks,
final B PTS 6.533 s, advancing callback/PTS samples, successful B Unload,
run status 0, and confirmed process exit. A was not started. The owner
confirmed the right-hand clip was visible and its clock advanced.

Report: `build/reports/c1-phase1-sinks-solo-b-0.1.0.json`, schema 1,
with owner observation and resource follow-up attached. The passive collector
examined 951 lines, with no truncation/error and confirmed closure.

Read-only retained-log correlation linked B's media UID to its separate
presentation registration. **Verified/logs:** SubVideo enum 4, output SUB0,
a successful SUB_SCALER presentation grant for indices **2, 1 and 0**,
quantity 1 each; no MAIN_SCALER was observed for that registration in the
control window. The grant was logged at 08:48:17.786997 UTC in
`/var/log/messages`, decompressed/read line 1581; SubVideo at line 1584;
SUB0 connection payload at line 1571. Evidence, source hash, redacted
registration/snapshot/cleanup chain:
`build/reports/c1-phase1-sinks-solo-b-resource-0.1.0.json` (schema 1).
These three granted sub-scaler indices must not be interpreted as three
independently usable sub-video outputs.

This passed the solo visibility, sub-route and teardown gate. It authorized
the subsequent Load-only test, not an inference of concurrent playback.

### Main/sub 0.1.0 Load-only A-main/B-sub — passed, 2026-11-11

After the passing solo control, the owner reopened the menu and authorized
`node scripts/run-phase1-sinks-ssh.cjs --staged --load-only --confirm-solo-b-visible`.
The controller verified the same `e15189df...b6251b` ELF and exited 0.
Report: `build/reports/c1-phase1-sinks-load-only-0.1.0.json` (schema 1).

| B stage | New A callbacks | A PTS advance | B callbacks / packets |
|---|---:|---:|---:|
| Window | 12 | 2400 ms | 0 / 0 |
| Constructor | 12 | 2400 ms | 0 / 0 |
| Foreground | 12 | 2400 ms | 0 / 0 |
| sub_video Load | 17 | 3400 ms | 0 / 0 |
| Released | 11 | 2200 ms | 0 / 0 |

A finished with 79 callbacks and PTS 15.733 s. B received zero packets;
no Feed, Play or geometry-test stage was requested. Both Unloads succeeded,
run status was 0 and process exit was confirmed. The resource collector
examined 1802 lines with no truncation/error and closed cleanly.

**Verified owner observation:** A remained visible with its clock advancing
throughout the hold and after B release. The owner saw only A; that is the
expected Load-only behavior because B was not fed or played. There is no
claim of visible dual playback in this run.

Read-only retained-log correlation linked each media UID to its distinct
presentation registration. **Verified/logs:** A received MAIN_SCALER index 0;
B's presentation registration received SUB_SCALER indices 2, 1, 0. No B
MAIN_SCALER grant or A empty presentation-resource list was observed during
the Load hold; A's allocation became empty only at final A cleanup.
Resource evidence and exact log hashes/line references:
`build/reports/c1-phase1-sinks-load-only-resource-0.1.0.json` (schema 1,
29 redacted records). The grants were logged at 08:57:34.741245 UTC for A
(`/var/log/messages`, line 1080), and 08:57:44.443947 UTC for B (line 2196).
B logged initial MainVideo enum 2 before the requested SubVideo enum 4 was
applied (line 2201); this initial state did not result in an observed
MAIN_SCALER grant to B and must not be confused with resource reclamation.

This passed Load-only continuity and separate grants. Feed/Play and visible
overlap were tested afterward, as recorded below.

### Main/sub 0.1.0 full staged Feed/Play — visible overlap verified

Device/date: LG OLED C1, firmware 03.53.45, SDK 6.5.3, 2026-11-11.
After passing solo and Load-only gates, the owner opened the menu and
explicitly authorized
`node scripts/run-phase1-sinks-ssh.cjs --staged --confirm-solo-b-visible`.
The controller verified ELF
`e15189df254827e2569a8cb17d64dfaedeab18f913ded0845bf33ca685b6251b`.
Exit code 0; report `build/reports/c1-phase1-sinks-stages-0.1.0.json`,
schema version 1.

| B stage | New A callbacks | A PTS advance | New B callbacks | B PTS advance |
|---|---:|---:|---:|---:|
| Window | 12 | 2400 ms | 0 | 0 ms |
| Constructor | 11 | 2200 ms | 0 | 0 ms |
| Foreground | 11 | 2200 ms | 0 | 0 ms |
| sub_video Load | 16 | 3200 ms | 0 | 0 ms |
| Feed without explicit Play | 11 | 2200 ms | 0 | 0 ms |
| Play | 11 | 2200 ms | 9 | 1633 ms |
| Smaller/lower B geometry | 10 | 2000 ms | 10 | 2033 ms |
| Released | 12 | 2400 ms | 0 | 0 ms |

Each stage measurement spans acknowledgement to a sample at least two
seconds later (three seconds for Load). Both players' callback counts and
PTS advanced during Play and the geometry step. B Play to release spanned
about 4.8 s; the full diagnostic lasted 23.916 s. Final totals: A 116
callbacks, PTS 23.166 s and 713 accepted packets; B 22 callbacks, PTS 4.266 s
and 219 accepted packets before intentional early release. Callback counts
are not decoded/rendered frame-rate measurements.

**Verified owner observation:** both on-screen clocks advanced together;
B moved/shrank at the geometry step; A kept advancing after B disappeared.
This verifies short simultaneous **local video-only** playback of these two
640x360 H.264 clips using explicit main_video/sub_video on this C1 firmware.
It resolves the previously measured MAIN_SCALER takeover for this tested
presentation combination. It is not an HDMI or arbitrary-source result.

**Verified/logs:** read-only media/presentation identifier correlation shows
A holding MAIN_SCALER index 0, B receiving SUB_SCALER indices 2, 1, 0, with
no B MAIN_SCALER allocation or A empty presentation-resource list observed
before B release. Distinct VDEC/G1_H264 allocations were granted to A and B.
Evidence: `build/reports/c1-phase1-sinks-stages-resource-0.1.0.json`, schema 1,
29 projected records, with source hashes, UTC timestamps and source line
references. Grants were logged at 09:10:26.377574 UTC for A and
09:10:36.360071 UTC for B. No raw identifiers were persisted.

Both Unloads returned success, run status was 0, and process exit was
confirmed. The resource collector examined 2554 lines, with no truncation
or collector error, and closed cleanly. Report assertions and
`git diff --check` passed; no code/build change was needed for this run.

Phase 1 is **not complete**: audio focus is untested, independent movement
of A and wider layout bounds remain untested, and there is no extended
stability or repeated-cycle evidence. Simultaneous physical HDMI remains
unknown. The next gates and prepared artifact are recorded below.

## Endurance 0.1.0 — prepared, awaiting first TV playback

Date: 2026-11-11. Separate app `io.github.tpapaz.multiview.endurance`, title
**MultiView Main + Sub Endurance**. Existing staged and solo packages remain
controls. Same video-only clips, explicit main/sub selection and left/right
geometry; opt-in looping avoids reloading players. Visual fixture clocks
restart every 30/15 seconds; native feed/callback PTS must remain monotonic.

Implementation plan: establish A progress, then B progress; measure fixed
8/300/1800-second overlap, release B and measure three seconds of A recovery;
check progress, accepted packets, fixture wraps, cleanup and process exit.
Twenty-cycle mode closes/reopens this exact app and checks distinct process
identities. Longer profiles require the preceding same-ELF passing report
and owner observations. Cancellation, bounded waits and hard alarms remain.

**Built and packaged locally in WSL; C1 ABI-checked; not TV-playback-tested
or simulator-tested.** No endurance app launch or playback has occurred.
The read-only ABI check matched 82 imports, six DT_NEEDED libraries, exact
versioned providers, ARM32 soft-float and `/lib/ld-linux.so.3`.
Evidence: `build/phase-1/abi-endurance-0.1.0.json`.

- IPK: `dist/io.github.tpapaz.multiview.endurance_0.1.0_arm.ipk`.
- IPK SHA-256: `943a4477567b9368641152761f03cabb9a0b78f7a282f51dc95cc4291844129d`.
- ELF SHA-256: `5712ec33ccb7155d9fdf9cc27337f6f1ee134419df86bb70e08bb2c9dd3d8a4d`.

Validation: local CMake/Ninja ARM build and shared-session regression compile;
exact package payload/metadata/executable checks; host JS acceptance tests,
lint, and C++ progress-watch tests. FFmpeg decoded two concatenated copies
of each fixture without errors; FFprobe counted 1800 A and 900 B frames.
That proves host bitstream wrap validity, not TV loop playback.
[Exact build, host checks and gated SSH commands](../build.md#repeatability-and-endurance)

Reports use `schemaVersion: 1` with per-cycle traces, progress/loop/duration
assessment, cleanup and process-exit confirmation, separately unknown visual
observations, audio focus and HDMI. Short cycles collect resource categories
throughout; long runs collect startup/final windows only. Continuous resource
ownership across long playback is not established by those windows.

Next owner action: install the separate IPK, open its menu, then authorize
the one-cycle smoke test while watching both clocks. No further build is
needed before that test. Keep the control apps/IPKs available.

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
| Main/sub 0.1.0 | 81 | `c96c41242715c4ea8b1c3786de0d9ff36074c966e6ef1d7dd75ec81158cce0ad` |
| Endurance 0.1.0 (not playback-tested) | 82 | `943a4477567b9368641152761f03cabb9a0b78f7a282f51dc95cc4291844129d` |

TV-playback-tested ELF SHA-256 values:

- SMP 0.1.3 `6ea50ba36069a911ea167eb0a07df75980834243ecafade1f32273e4907e1c2b`
- SMP 0.1.4 `b997c8042ae9731ffadf99e75b3f4cbab8c4d06392bf01174e14f2f641475cec`
- NDL 0.1.0 `8b5dc9a7e5c17a08244f1abae15c4f7bdea8ec250fd2e3fe01eca5bcbc564f7b`
- NDL 0.1.1 `d25f62c3fdd1311718e1eaf9d635ea64f97ef065a636dd32da107cb46fdc9d29`

Mixed 0.1.0 ELF (ABI-checked and TV-tested; no visible overlap observed):
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
