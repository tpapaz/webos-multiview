# LG C1 Phase 1 — Local video playback

> **Archived detail; no test is authorized here.** [Compact C1 journal](../c1-journal.md) · [Current test plan](../current-plan.md). Original stage-by-stage findings, commands and hashes are retained below; old next steps are historical.

Reference device: LG OLED C1, firmware 03.53.45, webOS SDK 6.5.3.
The [build guide](../../build.md#phase-1-local-clip-packages) lists the IPKs
and SSH commands. Tests use two synthetic H.264 clips at 640×360 and 30 fps
with visible clocks. A originally ran 12 s and was extended to 30 s for
staging. B runs 15 s. The packaged tests are video-only. Audio focus and
simultaneous physical HDMI remain **unknown**.

## Current conclusion and handoff

**Verified on this C1:** explicit SMP A `main_video` + B `sub_video`
showed both local clocks advancing, independent B geometry and A continuity.
Earlier default-main SMP/NDL failed because B's presentation registration
reclaimed MAIN_SCALER. These are local playback results, not HDMI evidence.

The final 0.1.3 smoke passed subscription, 8.056 s overlap, 3.049 s A recovery,
cleanup/exit and owner clocks. Its request probe ended in 60.022 s without a
request; cleanup passed, no NACK was sent, and the result is inconclusive.
The owner saw the menu during that wait and a screensaver after exit.

**Screensaver work is closed for the current scope; inhibition is not
verified fixed.** Glasshouse/Home routing remains separate owner context.
No further idle or endurance run is scheduled. Phase 1 audio, wider geometry,
final-build repeatability and the interrupted long recovery remain deferred.

Next is Phase 2 read-only HDMI discovery, with only one connected source.
Use the [handoff](../../handoff/hdmi-next-chat.md) and
[scope decision](../../decisions/0003-close-idle-work-resume-hdmi.md).
The journal below preserves actual runs, builds, hashes and human observations.
Earlier “next test” statements are historical, not renewed instructions.

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
protocol details live in the [build guide](../../build.md#mixed-smp--ndl-build-and-test).

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
simultaneous HDMI remain **unknown**. The [shared-path review](../../research/c1-smp-ndl-resource-path.md) recommends
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
verified in the successful preflight. The owner subsequently opened the menu and authorized the run below. [Procedure](../../build.md#load-only-resource-experiment-with-installed-mixed-010).

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
[retained-log attribution](../../research/c1-smp-ndl-resource-path.md#retained-log-attribution--main_scaler-handover-verified).
The redacted 33-record evidence report is
`build/reports/c1-phase1-load-only-attribution-0.1.0.json` (schema 1).
No playback repeat, IPK build or TV configuration change was performed.
The [sink-selection review](../../research/c1-smp-ndl-resource-path.md#why-main_scaler-was-selected-and-the-independent-sink-candidate)
then identified the SMP Load-time selector tested below.

## Two-SMP main/sub 0.1.0 — TV-tested control

Separate app `io.github.tpapaz.multiview.sinks`, explicit A main_video and
B sub_video, hardware-default decoding and unchanged fixtures. Built with
local WSL CMake/Ninja and the 2026.08 ARM SDK. Package verification passed
exact payload/bytes, metadata, mode 0755 and absence of extra scripts/links.
The fresh firmware ABI check matched 81 imports and six DT_NEEDED libraries.
Host acceptance tests, lint and shared-session regression compilation passed.
No simulator test was performed. [Reproduction](../../build.md#two-smp-mainsub-package)

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

## Endurance 0.1.0 — build and first smoke run

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

Initially built and packaged locally in WSL and C1 ABI-checked before any
endurance playback. The first authorized device smoke run is recorded below.
No simulator test was performed.
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
[Exact build, host checks and gated SSH commands](../../build.md#retained-short-veto-control)

Reports use `schemaVersion: 1` with per-cycle traces, progress/loop/duration
assessment, cleanup and process-exit confirmation, separately unknown visual
observations, audio focus and HDMI. Short cycles collect resource categories
throughout; long runs collect startup/final windows only. Continuous resource
ownership across long playback is not established by those windows.

### One-cycle C1 smoke — native telemetry and visible playback passed

On 2026-11-11 the owner installed/opened the endurance menu and authorized
`node scripts/run-phase1-endurance-ssh.cjs --repeat --cycles 1` while watching.
The controller verified the manifest and running ELF
`5712ec33ccb7155d9fdf9cc27337f6f1ee134419df86bb70e08bb2c9dd3d8a4d`.
Report: `build/reports/c1-phase1-endurance-repeat-1-0.1.0.json`, schema 1.

**Verified/native trace:** 8.031 seconds of overlap, eight dual samples,
zero bad sample intervals and no progress-watchdog error. Both callback
counts and PTS increased in every measured dual interval. A finished with
63 callbacks, PTS 12.566 s and 394 accepted packets; B with 42 callbacks,
PTS 8.333 s and 271 packets. A continued after B release: recovery samples
advanced from 52 callbacks/10.366 s to 62/12.366 s. Both Unloads and run_end
reported status 0; SSH confirmed the app exited. Total diagnostic: 13.935 s.
Neither fixture reached a wrap, so loop playback remains untested.

**Verified owner observation:** asked whether both clocks visibly advanced
together and A kept advancing after B disappeared, the owner answered
“Yes to both”. This confirms visible overlap and A continuity for this
same smoke run. The observation is attached separately in the JSON report;
it does not remove the controller limitation below.

**Controller limitation and correction:** after app exit, `finally` referenced
`finalStarted` outside its block scope, so the command exited 1 and did not
save its live resource collector result. Saved native rows and the confirmed
process exit survived. The scope was corrected in the host runner without
changing the IPK or replaying playback. `npm test`, `npm run lint` and
`node --check scripts/run-phase1-endurance-ssh.cjs` passed. The original
controller error remains in the JSON with a separate post-run review;
this was not a fully successful controller invocation.

Read-only recovery examined retained `/var/log/messages`, privately matching
the test window after measuring the TV clock about 58.5 seconds behind the
host (no clock settings changed). It retained 76 redacted category entries
from 3240 window lines: acquire, policy, display/connect/disconnect, release,
Load and generic error categories, including MAIN_SCALER, SUB_SCALER, VDEC
and G1_H264 tokens. These are categories, **not A/B ownership or a grant
verdict**; generic error entries do not identify an app pipeline failure.
The returned snapshot SHA-256 is
`35e922ae4a3631748c9ba9b7af15997a1772e5ece096df890474d75e6e72cc39`.
Source lines, UTC timestamps, clock correlation and read bounds are saved
in the report. Original live-collector closure was not recorded; its fixed
50-second remote timeout applied. No raw log text/identifiers were persisted.

**Unknown:** resource ownership for this run, fixture wraps, repeatability,
longer stability, audio focus and physical HDMI. The smoke gate is complete.
The subsequent 20-cycle result is below. No IPK reinstall was required.
Keep the controls available.

### Twenty-cycle C1 repetition — passed, 2026-11-11

The owner reopened the same endurance 0.1.0 menu and authorized
`node scripts/run-phase1-endurance-ssh.cjs --repeat`. The controller verified
the installed manifest and ELF
`5712ec33ccb7155d9fdf9cc27337f6f1ee134419df86bb70e08bb2c9dd3d8a4d`.
It closed each app process and launched only this verified app for subsequent
cycles. Distinct process identities were checked in memory, not persisted.

**Verified/native and controller:** all 20 cycles passed, with overlap
8.028–8.056 seconds per cycle, 152 dual samples in total and zero bad sample
intervals. Both callback counts and PTS advanced during measured overlap;
A's post-B-release recovery checks passed in every cycle. All 40 Unloads
and 20 run_end statuses were successful, and all 20 process exits were
confirmed. The command exited 0, without a controller error. Total elapsed
time from first signal preparation to final cycle completion was 358.786 s;
that includes startup/teardown/relaunch gaps, not continuous dual playback.

**Verified owner observation:** asked about both clocks advancing together
across the cycles watched, A continuing after B disappeared, and normal
TV viewing returning after final exit, the owner answered “Yes to all three”.
This separately attributed observation is saved in `ownerObservation`, with
`spotChecksPassed`, `bothClocksAdvancedTogether`, `aContinuedAfterBRelease`
and `normalViewingReturnedAfterFinalExit` true.

Resource collectors examined 36173 lines and retained 1217 redacted category
entries. All 20 collector closures were confirmed; none reported truncation.
Cycles **2, 6, 13 and 17** flagged `collector stderr present`. The raw stderr
was intentionally not retained, so its cause and impact on log completeness
are unknown. This limits the resource evidence; it does not negate the
independent native trace, cleanup, exits and owner observations. No A/B
resource ownership or continuous grant conclusion is claimed for this run.

Report: `build/reports/c1-phase1-endurance-repeat-20-0.1.0.json`, schema 1.
Post-run assertions checked exact ELF identity, cycle count, all progress/
recovery assessments, distinct-process checks and all exits. No source or
IPK change, rebuild, service/configuration change or additional playback
experiment was needed. `git diff --check` passed for the record update.

The repeatability gate is complete for this video-only main/sub build on
C1 03.53.45. Both loop counters stayed zero in every cycle: fixture wraps
and sustained playback are still untested. Next: reopen **MultiView Main +
Sub Endurance** to the menu for a separately authorized five-minute continuous
test (`node scripts/run-phase1-endurance-ssh.cjs --minutes 5`). The same-ELF
20-cycle report and owner observations now satisfy its prerequisites.
Audio focus, wider geometry and simultaneous physical HDMI remain unknown.

### Five-minute C1 attempt — interrupted, not a duration pass

On 2026-11-11 the owner opened the endurance 0.1.0 menu and authorized
`node scripts/run-phase1-endurance-ssh.cjs --minutes 5`, asking for CPU and
then temperature checks. Host-only numeric sampling was added; the IPK/ELF
remained unchanged. The passing same-ELF 20-cycle report satisfied the start
prerequisite. CPU/temperature reads are passive, bounded and do not change
TV settings.

**Verified/native:** the run ended after 21.343 s, with run_end status **1**
(cancellation/focus/visibility paths share this code). There were 18 dual
samples, zero bad sample intervals and no progress_error. A finished with
103 callbacks, PTS 20.566 s and 633 accepted packets; B with 97 callbacks,
PTS 19.366 s and 601 packets. B's feed loop counter reached one and callback
PTS advanced beyond the 15-second fixture boundary. A had not wrapped.
This is evidence of one successful B feed/PTS wrap, not a five-minute or
owner-visible wrap pass. Both Unloads returned success; SSH confirmed exit.
The controller correctly rejected the duration/recovery gate and exited 1.

The owner reported **“It disappeared by itself”**, with no intentional
Home/Back/input/app change. At the last samples both players still advanced;
no playback-progress stall was observed. The five-minute report remains
`telemetryPassed: false`, with `processExitConfirmed: true` based on the
per-cycle exit evidence. The runner was corrected to preserve that aggregate
exit confirmation even when duration acceptance fails.

**CPU observations, limited sample:** two valid approximately 6.25-second
overlap intervals measured total CPU busy 9.60% and 8.96%, and app CPU 5.76%
of one core in both. Three online CPU counters were observed for those
intervals; this is not a physical core-count claim. App RSS was 36880–36896
KiB with 33 threads. One earlier sample/interval was unavailable, so there
is no valid menu baseline. App CPU excludes media-service processes and
hardware engines. These two intervals do not establish sustained CPU load,
thermal headroom or absence of throttling.

**Temperature:** a read after exit found no readable temperature values
through the fixed thermal-zone/hwmon paths. Status is unknown, not zero
degrees or absence of a sensor. No in-playback temperature sample exists
for this attempt; subsequent continuous runs can sample those same read-only
paths alongside CPU counters.

The startup resource collector closed cleanly, without truncation or error:
4311 examined lines and 125 projected entries. A later read-only lifecycle
review recovered 465 redacted records from 4993 window lines in
`/var/log/messages.0.gz`, decompressed snapshot SHA-256
`353696b7d27744b7a4a479909162ae190df2bf9e18eb9519044af2ba36f49cfb`.
Screensaver launching appears at source lines 6694/6718/6732 around
12:14:36.915–.925 UTC; screensaver visible=true at line 6787, 12:14:37.245 UTC;
app-matched visibility/foreground terms occur at lines 6789 and 6815 onward.
The report includes source lines, hashes and measured host/TV clock offset;
raw identifiers/text were discarded. **Candidate:** screensaver-driven
focus/visibility loss triggered the app's safety cancellation. **Unknown:**
the precise SDL event and why idle inhibition was ineffective; token/timing
correlation does not itself prove which native return branch executed.

Archived attempt report:
`build/reports/c1-phase1-endurance-minutes-5-attempt-1-0.1.0.json`, schema 1;
the normal minutes-5 path also retains this failed result until a later run.
Host CPU normalization/redaction and thermal-path/unit acceptance tests,
syntax checks, `npm test`, `npm run lint` and `git diff --check` passed.
No new IPK, service restart or configuration write occurred. Next: inspect
app-scoped screensaver/lifecycle handling and add distinct native exit-event
telemetry before retrying; do not bypass focus-loss cleanup or change TV
screen protection settings. The 30-minute prerequisite remains unsatisfied.

## Firmware and build evidence

### Endurance 0.1.1 — screensaver/lifecycle retry build and smoke result

Prepared on 2026-11-11 after owner authorization to investigate screensaver
handling, add exit logging and build locally. Same app ID, clips, players,
main/sub sinks and geometry as 0.1.0; the new package upgrades only Endurance.
Old IPKs and the 0.1.0 ELF were retained as controls.

Implementation plan and result: request LG's app-specific Type 2 idle policy
in appinfo.json; allow SDL saver state at the menu, request inhibition only
during a bounded run, restore the prior state after player cleanup; log each
exit cause separately; retain CPU/temperature sampling, identity checks,
watchdogs, cancellation and normal teardown. Do not change global TV policy.
[API investigation and caveats](../../research/c1-smp-ndl-resource-path.md#app-scoped-screensaver-review-and-011-retry)

New CSV events are `screensaver_policy`, `screensaver_inhibit`,
`screensaver_restore`, `exit_event` and `app_exit`. Closed exit codes identify
Back, Exit key, Escape, SDL quit, window close, focus lost, hidden, minimized,
SIGTERM, SIGINT and deadline. Successful reports require ordered local
inhibit/restore records and reject any run exit event. These SDL flag checks
do not prove the C1 compositor/power service honored the request. Type 2
extends app idle time to 30 minutes with OSD dimming; it is not an indefinite
disable. The precise 0.1.0 SDL cancellation branch remains unknown.

The installed manifest must match ID/version/main and Type 2 metadata;
the running ELF hash must match this build before control. The focused
five-minute retry now requires a passing **same-ELF smoke** and owner visual
check. Thirty minutes still requires a same-ELF five-minute pass. This
explicit diagnostic gate change does not transfer the 0.1.0 20-cycle pass;
repeat 20 cycles on the final candidate before claiming its repeatability.

Initially built, packaged and C1 ABI-checked before TV playback; no simulator
test was performed. No playback/launch occurred during build preparation.
The later owner-authorized smoke result is recorded below.

- IPK: `dist/io.github.tpapaz.multiview.endurance_0.1.1_arm.ipk`.
- IPK SHA-256: `5649a3f2cd85dd99a9edfe32f32073a77236a7c42c280781fec4d5b91be50ee0`.
- ELF SHA-256: `08ae821489b6f69b1ada468cc69557bd996d9d91c8eab9cc2d284f4117118122`.
- ABI evidence: `build/phase-1/abi-endurance-0.1.1.json`; 86 imports and six
  DT_NEEDED libraries, ARM32 soft-float, `/lib/ld-linux.so.3`, exact versioned
  providers and the same C1 SDL library hash as 0.1.0.

Validation passed:

- `wsl -d Ubuntu --exec cmake --build /mnt/d/Development/webos-multiview/build/phase-1/endurance`
  with the existing 2026.08 SDK and warning-as-error flags.
- `./scripts/package-phase1.ps1 -Target endurance -LinuxNode /home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node`.
- `wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/scripts/verify-ipk.py --endurance /mnt/d/Development/webos-multiview/dist/io.github.tpapaz.multiview.endurance_0.1.1_arm.ipk`
  for exact payload/bytes, metadata, executable mode 0755 and no extra scripts/links.
- `node scripts/verify-mixed-abi.cjs --endurance`, using fresh read-only C1 exports.
- `npm test`, `npm run lint`, native-runner/helper syntax checks, the existing
  C++ progress watchdog acceptance binary and `git diff --check`.
  New host cases reject missing/incorrect installed idle policy, missing or
  incorrectly ordered inhibit restoration, and every distinct run exit cause.

The owner then installed/opened 0.1.1 and authorized its smoke test. Spot
checks are sufficient to record observed visibility; unobserved intervals
remain unknown. The subsequent result follows.
No GitHub Actions, commit or push was used.

### Endurance 0.1.1 smoke — passed, 2026-11-11

Both attempts used `node scripts/run-phase1-endurance-ssh.cjs --repeat --cycles 1`
with verified ELF
`08ae821489b6f69b1ada468cc69557bd996d9d91c8eab9cc2d284f4117118122`
and installed Type 2 metadata. The first attempt passed telemetry and exit,
but the owner did not watch and requested a repeat. It is preserved at
`build/reports/c1-phase1-endurance-repeat-1-attempt-1-0.1.1.json`, with visual
status unknown. The fixed app-scoped launcher reopened only this verified
app for the explicitly requested repeat.

**Verified repeat telemetry:** 8.036 s overlap, eight dual samples and zero
bad intervals. A finished with 63 callbacks, PTS 12.533 s and 394 packets;
B with 42 callbacks, PTS 8.333 s and 271 packets. A continued after B release.
Both Unloads and run_end returned success; process exit was confirmed and
the command exited 0. Total diagnostic: 13.293 s. No fixture wrap occurred.

`screensaver_inhibit` reported local SDL disabled state 0 before run_start;
`screensaver_restore` reported state 1 after both players closed and before
run_end. No run exit event or progress error was recorded. The collector
closed cleanly, with 1902 examined lines, 61 projected entries and no
truncation/error. These categories do not establish A/B resource ownership.

**Verified owner observation:** for the repeated run, both clocks advanced
together and A continued after B disappeared; the owner answered “Yes to
both”. This is separately attached to
`build/reports/c1-phase1-endurance-repeat-1-0.1.1.json` (schema 1), which also
references the first unwatched attempt. Post-run assertions verified ELF,
progress/SDL-state assessment and confirmed exit. No rebuild was needed.

This passes the same-build smoke prerequisite for the five-minute lifecycle
retry; it does not establish suppression across long idle or certify
repeatability of 0.1.1. Following the owner's authorization to retry after
the smoke, the fixed launcher reopened this app for `--minutes 5`. That
continuous run completed as recorded below, with CPU/temperature sampling
and separately saved in-run owner observations.

### Endurance 0.1.1 five-minute retry — telemetry pass with owner spot checks

Device/date: LG OLED C1, firmware 03.53.45, SDK 6.5.3, 2026-11-11.
Following the owner-authorized smoke and retry sequence, the fixed launcher
reopened the same verified app for
`node scripts/run-phase1-endurance-ssh.cjs --minutes 5`. The host recorded
the same-ELF smoke as its prerequisite; it did not reuse 0.1.0 repeatability
as evidence for this binary. ELF remains
`08ae821489b6f69b1ada468cc69557bd996d9d91c8eab9cc2d284f4117118122`.

**Verified/native and controller:** 300.044 seconds of concurrent overlap,
300 dual samples and zero bad sample intervals. Both callback counts and
PTS increased across every measured dual interval. Feed loops reached
**10 A / 20 B**, with no PTS reset or progress_error. A finished with
1520 callbacks, PTS 304.600 s and 9155 accepted packets; B with 1499
callbacks, PTS 300.400 s and 9031 packets. Callback counts are not a decoded
frame-rate measurement. A's post-B-release continuation passed in samples.
Both Unloads and run_end returned status 0; process exit was confirmed and
the command exited 0. Full diagnostic: 305.289 s, including startup/recovery.

**Verified SDL state / bounded lifecycle result:** local inhibition state 0
was recorded before playback and restoration state 1 after player cleanup.
No run exit_event was recorded. The combined Type 2 metadata and SDL request
completed this five-minute run without the earlier observed cancellation.
This does not isolate either mechanism's effectiveness or guarantee behavior
for longer idle, other models/firmware or changed media/layouts.

**Owner observation, scoped to spot checks:** during the active run the
owner reported “they are still running fine” and later “still running
prefcectly”. After completion the owner said they did not check the ending,
though they thought everything was fine. The JSON records positive in-run
spot checks separately, with continuous five-minute picture coverage,
visible A continuation at the ending and normal viewing afterward explicitly
unknown. Native continuation/exit evidence does not substitute for those
missing visual observations. The smoke's visible ending is a separate run.

**CPU:** 35 valid overlap-tagged intervals covered 221.794 seconds of sampled
host time. Interval-weighted total CPU busy averaged **7.73%** (range
4.75–13.63%); app CPU averaged **5.70% of one core** (range 4.52–7.41%).
App RSS ranged 36908–36948 KiB. There were 36 valid intervals overall
(including the menu) and seven unavailable/invalid CPU attempts. Summaries
exclude invalid intervals; they do not cover the entire run continuously.
App CPU excludes media daemons and hardware engines, and these measurements
do not establish thermal headroom or absence of throttling.

**Temperature:** all 50 read attempts returned no readable values from the
fixed thermal/hwmon paths, with no collection error. Temperature remains
unknown; no Celsius value or sensor absence is inferred.

The startup and final resource windows closed cleanly, without truncation
or collector error: 1537/559 examined lines and 31/30 projected entries.
The middle interval was not collected. These categories do not establish
continuous resource ownership or A/B grant attribution for this run.

Report: `build/reports/c1-phase1-endurance-minutes-5-0.1.1.json` (schema 1),
also archived as `c1-phase1-endurance-minutes-5-attempt-1-0.1.1.json`.
The separate owner-observation file preserves in-run quotes and recording
times; the completed report incorporates them. Post-run assertions checked
exact ELF, full duration, loops, continuity, inhibition/restoration, cleanup,
exit and the same-build prerequisite. `git diff --check` and runner syntax
checks passed. No source/IPK change, rebuild or configuration write was needed.

This satisfies the targeted five-minute diagnostic gate with the stated
visual limits. Its same-ELF pass and owner spot checks satisfy the host's
30-minute prerequisite. The separately authorized 30-minute result follows;
20-cycle validation still belongs on the final candidate.
Audio focus, wider geometry and simultaneous HDMI remain unknown.

### Endurance 0.1.1 30-minute run — overlap reached, recovery interrupted

Device/date: LG OLED C1, firmware 03.53.45, SDK 6.5.3, 2026-11-11.
The owner opened Endurance 0.1.1 and authorized
`node scripts/run-phase1-endurance-ssh.cjs --minutes 30` with CPU/temperature
sampling. The host verified installed Type 2 metadata and ELF
`08ae821489b6f69b1ada468cc69557bd996d9d91c8eab9cc2d284f4117118122`.
Its prerequisite was the same-build five-minute pass with scoped owner spot
checks, not an inference from 0.1.0 repeatability.

**Verified overlap, failed full diagnostic:** overlap_start to released
spanned **1800.033 seconds**. There were 1797 dual samples, zero bad sample
intervals and no progress_error. A/B feed loop counts reached **60 / 120**.
Both callback counts and PTS advanced across every measured dual interval;
there is no observed progress stall in those samples.

B Unload succeeded at the planned endpoint. **731 ms later**, native
`exit_event` code 6 identified **focus_lost**, interrupting the required
three-second A-only recovery. A briefly continued: four additional callbacks
and +800 ms PTS between B Unload and the focus-loss event. That does not pass
the complete recovery gate. Final counts were A 8992 callbacks, PTS
1802.366 s and 54086 accepted packets; B 8982 callbacks, PTS 1800.366 s and
54031 packets. Full native diagnostic elapsed time was 1803.036 s.

Both Unloads returned success; local SDL inhibition state 0 was restored
to state 1 after cleanup, and SSH confirmed app exit. Native run_end status
was **1**, the controller exited **1** with `Native exit: focus_lost`, and
`telemetryPassed` remains **false** while `processExitConfirmed` is **true**.
The report separately records `fullRequestedOverlapReached: true` and
`aRecoveryWindowComplete: false`. Duration attainment must not be reported
as a pass for the whole experiment.

**CPU, limited to valid sampled intervals:** 179 overlap-tagged intervals
covered 1138.371 seconds of host time. Interval-weighted total CPU busy
averaged **9.97%** (range 5.70–16.46%); app CPU averaged **5.56% of one core**
(range 4.39–6.28%). App RSS ranged 36824–36884 KiB. There were 53 unavailable
or invalid CPU attempts; their cause was not separately classified. No valid
menu interval was obtained. These summaries exclude missing intervals and
media-daemon/hardware-engine utilization from the app value. They do not
establish thermal headroom, whole-TV memory stability or absence of throttling.

**Temperature:** all 285 fixed-path reads returned no sensor values, without
collection errors. Temperature remains unknown; this does not prove the TV
has no sensor.

Startup/final resource collectors closed cleanly, with no truncation/error:
1680/1643 examined lines and 32/51 projected entries. The middle interval
was not collected, and categories alone do not attribute A/B ownership.

Read-only final-window lifecycle correlation retained 427 projected records
from 2115 window lines in `/var/log/messages`, snapshot SHA-256
`2ed9462b2a13cc81e607b9fdb48cd8bb67e23a6d89fd3e6cd0a50243a23a3461`.
Screensaver status=launching occurs at source lines 4969/4981,
13:15:06.913862/.920897 UTC; visible=true at line 5038,
13:15:07.231609 UTC; foreground at lines 5060/5063,
13:15:07.238650/.238784 UTC. App-matched visibility records include line
5041 at 13:15:07.235505 UTC. Source hashes, line references, clock correlation
and read caps are in the JSON; raw messages/identifiers were discarded.
These logs verify screensaver launch/foreground at the focus-loss boundary.
**Candidate causal explanation:** screensaver-driven focus loss following B
release. **Unknown:** idle-expiry versus changing video-eligibility policy,
and which effective backend handled or ignored SDL's inhibitor. Its local
flag did not guarantee an uninterrupted recovery in this run.

**Verified owner observation:** during the 30-minute run both clocks advanced
together at the times checked (“Yes, at my spot checks”). At the ending,
the app disappeared by itself (“It disappeared by itself”), without an
intentional Home/Back/input/app change. These are separately attributed
owner observations for this same run, not inferred from telemetry or earlier
tests. Continuous visual coverage, visible A-only recovery and normal
viewing after exit remain unknown. The failed recovery result is unchanged.
Report:
`build/reports/c1-phase1-endurance-minutes-30-0.1.1.json`, schema 1, also
archived as `c1-phase1-endurance-minutes-30-attempt-1-0.1.1.json`. Post-run
assertions distinguish reached overlap from failed recovery, preserve native
focus-loss status and confirm both Unloads/exit. No source/IPK change,
rebuild, TV configuration write or replay occurred. Next: inspect app-scoped
idle inhibition and the B-release transition before another build/retry.

### Read-only idle-path follow-up — request preceded B release

On 2026-11-11 the owner authorized existing-log/firmware investigation before
another IPK. After the owner restored TV reachability, read-only retrieval
reconstructed the original snapshot from a rotated archive with its exact
`2ed9462b...a23a3461` hash. The request timestamp was matched privately and
replaced with `request_1`; raw tokens and process IDs were not retained.

**Verified/log ordering:** EPL manager logged the active request at original
line 4579, 13:15:04.408802 UTC; screen manager received the same request at
4614, 13:15:04.411096 UTC. AirPlay's `_aw_adapter_responseScreenSaver` logged
`ack: true` at 4636, 13:15:04.415198 UTC, with the same request timestamp.
The registration callback at 4640 also matched it. This sequence is already
underway roughly two seconds before the native B-unload region, rather than
being initiated by that release. The AirPlay ACK is not an Endurance response.
The subsequent launch/visibility/foreground sequence remains as recorded
above. The archive later aged out of the observed retained messages files;
the review preserves the redacted observations recovered before that happened.

**Verified/static, candidate runtime implication:** the C1 SDL library's
generic disable body (`0x72a10`) updates local state and optionally calls
device callback `+0xec`. Its inspected Wayland factory (`0x830e8`) and init
(`0x83b14`) do not install that hook. The local flag therefore cannot certify
TV inhibition. Runtime patching was not exhaustively excluded. Inspected
`libhelpers` app-state callbacks are local joystick-state dispatch, not an
evidenced native idle inhibitor. REA export inventories and existing SDK
binutils disassembly supplied static evidence; no native deep provider was
available and no live attach/function call was made.

The supported explanation is a pending timer-based screensaver request with
no proven native inhibitor behind the app's SDL flag. Whether B teardown
unblocks the pending transition or coincides with its launch delay remains
**unknown**. A correct app-owned native hook, permission boundary and cleanup
lifetime are not yet established. No new IPK or playback was performed,
and the full 30-minute diagnostic remains failed. CPU/temp sampling and
controls were not changed.

[Complete idle-path review, hashes, addresses and limits](../../research/c1-app-idle-path.md).
Evidence: `build/reports/c1-phase1-idle-path-review-0.1.1.json`,
`c1-phase1-idle-attribution-0.1.1.json` and
`c1-phase1-sdl-idle-static-0.1.1.json`. Assertions checked request matching,
ordering and ACK component; `git diff --check` and documentation-link checks
validate this research-only change. No runtime tests/builds were run.

### Native screensaver contract follow-up — static trace, no new run

On 2026-11-11, fixed-path read-only copies of C1 `tvpowerd` and LS2 established
the public `/power/registerScreenSaverRequest` / `responseScreenSaverRequest`
contract: subscribe with a client name, answer the exact string timestamp,
and use `ack:false` for the NACK decision. Actual C1 subscription cancellation
and disconnect paths notify tvpower, which removes the original registration's
screensaver entry. Explicit `subscribe:false` can be busy-rejected, so token
cancellation and owned-handle teardown remain required. Pending-state cleanup
timing is not runtime-verified.

The public connection needs explicit legacy `LSRegisterPubPriv` selection;
the current SDK's application-registration wrapper defaults private and its
headers omit the legacy declaration. Exact C1 wrapper/caller analysis confirms
the argument order. This is an isolated firmware interface, not a portable
SDK guarantee. SDL's vendor idle timer was also traced to joystick activity;
it is not a playback inhibitor.

**Verified/static**, not an Endurance API test: app caller permission,
accepted NACKs, focus retention and normal idle behavior after release remain
**unknown**. No app launch, active IPC, playback, TV write, new IPK or build
occurred. The failed 30-minute recovery gate is unchanged. Next is a bounded
app-owned permission/veto/cleanup probe, keeping the registration through
B release and A recovery and separating expiry from teardown.
[Contract, exact hashes/addresses and next experiment](../../research/c1-native-screensaver-interface.md).
Evidence: `build/reports/c1-native-screensaver-interface.json`, including
references to copied firmware, native-client and cleanup ledgers.

### Native veto probe 0.1.2 — built, not TV-tested

Prepared locally on 2026-11-11 after the native contract trace. Owner direction
limits idle work to one short probe, then returns to HDMI research. The app
ID remains `io.github.tpapaz.multiview.endurance`; its menu title is now
**MultiView Native Veto Probe**. Old packages remain available as controls.

The native app uses public LS2 with its own app ID and validates registration,
active request state and the exact private timestamp before NACKing. Normal
app idle behavior replaces Type 2 metadata; the local SDL flag is no longer
treated as a TV inhibitor. A request probe waits up to 60 seconds on the
idle menu, then runs eight seconds of A/B overlap and three seconds of A
recovery. The entire native run has a 90-second hard cap. Smoke skips the
request wait and still checks registration/playback/cleanup. No long mode,
automatic relaunch or repeated endurance sequence is included.

The registration survives B release, A recovery and both Unloads, followed
by separate unsubscribe, token cancellation and handle-close logging. Back,
focus loss, signals, API errors and deadlines retain cleanup. The controller
keeps CPU/RSS/thread and thermal/hwmon sampling, projected resource/display
and idle categories, exact manifest/ELF identity checks, and versioned JSON.
No raw request timestamps, bus IDs, vendor payloads or credentials are saved.

- IPK: `dist/io.github.tpapaz.multiview.endurance_0.1.2_arm.ipk`, 711228 bytes.
- IPK SHA-256: `fb4cd5dd88e043494431aeb49cf6374372ad432971eeddee5c7c4e4c9bd403a0`.
- ELF SHA-256: `35f1efda831a8ef10d29a39b3b9ccdce92a39871f4fd433e204f0677df4abbc0`.
- Local WSL CMake/Ninja Release build passed with warnings treated as errors.
- IPK archive/manifest/exact payload and executable mode checks passed.
- C1 ABI: 116 required imports, 9 DT_NEEDED libraries, ARM32 soft-float,
  `/lib/ld-linux.so.3`, exact versioned providers matched, no RPATH/RUNPATH.
- `npm test`, `npm run lint` and syntax checks for changed controller scripts
  passed. Acceptance checks reject premature veto release, missing cleanup,
  stale build identity, invalid/denied replies, progress stalls and long modes;
  no-request timeout is explicitly inconclusive.

Build evidence: `build/reports/c1-phase1-veto-build-0.1.2.json` and
`build/phase-1/abi-endurance-0.1.2.json` (ignored local evidence).
At packaging time, **not TV-tested:** app permission, accepted NACKs, applied service decision,
visible clocks, focus retention and restored idle eligibility remain unknown.
No playback or active policy request was made during this build task.
Next: install/open to the menu for one short smoke, then at most one request
probe. After that, resume read-only HDMI research. The old 30-minute failure
and unproven HDMI concurrency remain unchanged.

### Native veto probe 0.1.2 — smoke aborted before playback

Owner-authorized SSH smoke on 2026-11-11, C1 03.53.45, installed menu open.
Manifest and ELF identity matched the built 0.1.2 candidate. Native trace
ran from 25845 to 25855 ms after process trace opening: **10 ms** total.

| Stage | Native result |
|---|---|
| Public bus registration | `veto_bus:0` |
| GLib context attach | `veto_attach:0` |
| Disconnect callback setup | `veto_disconnect_watch:0` |
| `LSCallFromApplication` registration submission | `veto_register:1` — false return; no service acknowledgement |
| Handle unregister | `veto_handle_close:0` |
| Native run end | `run_end:6` — interface failure |
| SSH controller exit | Confirmed after normal app-scoped TERM |

No `run_start`, overlap, request, reply or recovery was observed; all frame,
packet and PTS counters remained zero. Neither player started. Unload events
are no-op cleanup for unstarted sessions. No subscription cancellation was
logged because this path produced no live token. The full-smoke assessment's
`cleanup:false` and `bounded:false` require later-stage markers absent from
this early abort; they do not contradict the observed handle unregister and
confirmed process exit. The full diagnostic correctly remains **failed**.

The owner reported that the app closed and went to LG Home. This matches
the controller's deliberate closure after registration failure, not an observed
playback crash. Permission denial, application identity/argument rejection
and other transport causes remain **unknown**: the native trace records only
the false submission return, and the bounded syslog collector observed zero
lines. A later retained-log read examined 981 lines in the submission window,
including 21 Luna/app-related lines, without a correlated cause. The saved C1
LS2 body then exposed a pre-send privilege check for non-null application IDs
(`0xda5a–0xda6a`). The app's anonymous public connection did not establish
that privilege; this is the leading **candidate** cause, not a runtime-proven
branch. The omitted `LSError` detail prevents certainty.
[Caller restriction evidence](../../research/c1-native-screensaver-interface.md#short-implementation-follow-up-012).
Do not claim a service-level rejection or an applied veto.

CPU evidence is menu-only: one 2.109-second interval, system busy 11.37%,
app CPU 0.47% of one core, RSS 31840 KiB, nine threads. No playback CPU sample
exists. Three temperature reads (two menu, one post-exit) yielded no values.
The log collector closed without error or truncation; zero lines/entries
provide no service-side cause attribution.

Evidence: `build/reports/c1-phase1-veto-smoke-0.1.2.json`, including the
owner observation and early-abort interpretation; the original unmodified
report is archived as `c1-phase1-veto-smoke-attempt-1-0.1.2.json` with its
hash retained in the canonical report. The ELF remains
`35f1efda831a8ef10d29a39b3b9ccdce92a39871f4fd433e204f0677df4abbc0`.
No rebuild, request-mode retry, system policy change, commit or push occurred.
**Next: skip `--veto`, defer further idle work and resume read-only HDMI
path research.** The previous local-clip and HDMI capability conclusions
are unchanged.

### Native veto caller correction 0.1.3 — built, not TV-tested

Owner-authorized final short attempt, prepared locally on 2026-11-11.
Replace `LSCallFromApplication` / its one-reply variant with ordinary public
`LSCall` / `LSCallOneReply` on the same app-owned connection. The real
connection sender remains authoritative; payload clientName is not a
privilege assertion. Request schema, NACK correlation, lifecycle safeguards,
60-second idle wait, eight-second overlap, three-second A recovery and
90-second hard cap remain. Veto stays through A recovery and both Unloads.
No privileged fallback, role change, global timer modification or long retry.

LSError and service error replies now emit numeric codes and fixed reason
classes only; raw messages/identifiers are not saved. CPU/temp and projected
resource/display/idle sampling remain enabled. The controller reports a
redacted reason/code when one is available. The 0.1.2 failure remains archived.

- IPK: `dist/io.github.tpapaz.multiview.endurance_0.1.3_arm.ipk`, 712780 bytes.
- IPK SHA-256: `82916a4f25ab3e904bcad508f310e54cad122220b227c4c10290bd2261820e5b`.
- ELF SHA-256: `e693f742284c1d3b4ad7c57a4a6dd3c788657343e1977c2102765b6e1fbb0cc6`.
- WSL CMake/Ninja Release build and exact IPK content/mode checks passed.
- C1 ABI: 120 imports, nine DT_NEEDED libraries, exact providers, ARM32
  soft-float and `/lib/ld-linux.so.3`; no RPATH/RUNPATH.
- `npm test`, `npm run lint`, changed-script syntax and the WSL host C++
  error-classification/code-capping acceptance test passed.

Build record: `build/reports/c1-phase1-veto-build-0.1.3.json`; ABI record:
`build/phase-1/abi-endurance-0.1.3.json`. **Not TV-tested**: normal-call
authorization, subscription, effective veto, visible clocks, recovery and
normal idle restoration remain unknown. Install/open to the menu for one
short smoke. Only its own passing smoke and owner clock confirmation can
enable the short request mode. After this final short attempt, return to HDMI
research. No playback occurred during this build task; no commit/push/Actions.

### Native veto 0.1.3 — short smoke passed

Owner-authorized SSH smoke on 2026-11-11, C1 firmware 03.53.45, installed
manifest and ELF identity matched. Native total 13.330 s; overlap 8.056 s,
seven dual samples and zero bad sampled intervals. A continued for 3.049 s
after B release, adding 15 callbacks and 3000 ms PTS. Final accepted packets:
A 395, B 271. Both Unloads succeeded. No API/service errors or exit events.

Public bus/context, disconnect watch, registration submission and service
acknowledgement succeeded. The registration stayed active through A recovery
and both Unloads; explicit unsubscribe, original token cancellation and
handle unregister each succeeded. Native run_end was 0, and the controller
confirmed normal process exit. No screensaver requests or NACK replies
occurred, so **effective inhibition is still unknown**.

The owner answered **Yes to both**: both clocks advanced together, and A
kept advancing after B disappeared. This is this build's own short visual
confirmation and smoke prerequisite, not an endurance or HDMI result.

CPU sampling returned three valid intervals: menu 2.124 s (system 5.35%,
app 0.47% of one core), host-labeled overlap 5.569 s (14.17% / 5.61%),
host-labeled recovery 5.591 s (7.51% / 5.37%). Labels describe the ending
phase; intervals span transitions and do not isolate steady playback load.
RSS was 31836–37020 KiB; threads 9–33; three cores observed. Five temperature
reads yielded no values. The log collector examined 2365 lines, retained
108 projected entries and closed without error/truncation. These projected
resource entries alone do not establish A/B ownership.

Evidence: `build/reports/c1-phase1-veto-smoke-0.1.3.json`, including the
owner confirmation; the pre-observation original is archived as
`c1-phase1-veto-smoke-attempt-1-0.1.3.json` with its hash in the canonical
report. ELF remains
`e693f742284c1d3b4ad7c57a4a6dd3c788657343e1977c2102765b6e1fbb0cc6`.
No rebuild or automatic retry occurred. Next: reopen the same app menu for
the separate request probe (60-second wait / 90-second total maximum), then
return to HDMI research. No long test is scheduled.

### Native veto 0.1.3 — request probe inconclusive, within cap

Owner-authorized request test on 2026-11-11, C1 03.53.45. Same installed
manifest/ELF and owner-confirmed same-build smoke prerequisite. Native total
**60.022 s**, idle wait 60.001 s, controlled host interval 61.023 s including
exit confirmation: within the requested 90-second limit.

Bus/context and service subscription succeeded. No request, decision or
reply was observed during the wait; the mode therefore did not start either
player. All frame/packet/PTS counters stayed zero. Timeout ended with
`veto_wait_end:7` and `run_end:7`, explicitly **inconclusive_no_request**.
No API/service error or lifecycle exit was recorded. Explicit unsubscribe,
original token cancellation and handle unregister all returned success;
the controller confirmed process exit. No actual NACK or effective veto
has been verified. Unloads were no-op cleanup for unstarted players.

The owner confirmed the menu stayed visible with no screensaver during the
wait, then later reported **NOW the screensaver activated**, after the probe
had closed. Exact later activation time was not instrumented; this is an
owner observation, not proof of an app-scoped timer restoration or veto.
The owner is unsure whether idle activation takes several minutes, so the
earlier under-one-minute expectation is not established on this app.

Additional owner context: Glasshouse was updated and Home now reaches LG
Home instead of expected Glasshouse Home. Its version, trigger and causal
relation to these tests remain unknown. The SSH runner closed only the
identity-checked probe with TERM; it sent no Home key and changed no launcher
setting. Glasshouse was not inspected or modified during this test.

CPU: eight valid host-labeled idle-wait intervals covering 44.774 s, weighted
system busy 10.95%, app 0.48% of one core; one unavailable/invalid sample.
These are idle-menu measurements, not playback load. RSS remained 31732 KiB,
nine threads, three cores in valid samples. Thirteen thermal/hwmon reads
returned no values. The collector examined 824 lines, retained 21 projected
entries and closed without error/truncation; no screensaver categories were
retained. No raw vendor identifiers were exported.

Evidence: `build/reports/c1-phase1-veto-request-0.1.3.json`, owner observations
and post-exit context included. The original pre-observation report is
archived as `c1-phase1-veto-request-attempt-1-0.1.3.json` with its hash retained
in the canonical report. No rerun, rebuild, policy write, long wait, commit
or push followed. **This completes the final short idle attempt. Next:
read-only HDMI input/presentation path research; inhibition stays unknown.**

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
| Endurance 0.1.0 (smoke TV-tested) | 82 | `943a4477567b9368641152761f03cabb9a0b78f7a282f51dc95cc4291844129d` |
| Endurance 0.1.1 (five-minute telemetry + visual spot checks) | 86 | `5649a3f2cd85dd99a9edfe32f32073a77236a7c42c280781fec4d5b91be50ee0` |
| Veto probe 0.1.2 (smoke failed before playback) | 116 | `fb4cd5dd88e043494431aeb49cf6374372ad432971eeddee5c7c4e4c9bd403a0` |
| Veto probe 0.1.3 (smoke TV-passed, owner clocks) | 120 | `82916a4f25ab3e904bcad508f310e54cad122220b227c4c10290bd2261820e5b` |

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
