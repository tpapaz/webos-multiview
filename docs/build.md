# Build, inspect and install

## Passive probe and host checks

Builds and package artifacts are produced locally. This repository has no
GitHub Actions workflows for pushes or pull requests.

Host prerequisites: C++11 compiler, CMake >=3.16, Ninja, Node >=20,
npm, Python 3 and binutils `ar`. No webOS runtime libraries needed for host
tests. The following host checks use a Linux shell. Dependency versions are
pinned in package-lock.json. CLI build tools stay on the development PC.

```sh
npm ci --no-audit --no-fund
python3 -m venv .venv
.venv/bin/python -m pip install jsonschema==4.23.0
npm run lint
npm test
cmake -S . -B build/host -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/host
ctest --test-dir build/host --output-on-failure
build/host/multiview-probe > build/reports/native.report.json
.venv/bin/python tests/host/schema_test.py
npm run package
python3 scripts/verify-ipk.py dist/io.github.tpapaz.multiview.probe_0.1.0_all.ipk
```

`npm test` generates synthetic reports for the schema checks. The passive
IPK is web-only. `verify-ipk.py` checks archive structure, file allowlist
and payload bytes. Archive timestamps can change the package hash.

## Phase 1 local clip packages

Current direction: native SMP A `main_video` + B `sub_video`. The staged
main/sub 0.1.0 package passed short C1 playback; the separate endurance
0.1.0 package passed smoke and 20 distinct app start/exit cycles on the C1,
with owner-confirmed clocks, A continuation and normal viewing afterward.
The first five-minute attempt cancelled early around a screensaver transition;
it did not pass the duration gate. Endurance **0.1.1** is now locally built,
packaged and C1 ABI-checked, **not TV-tested**, with app-scoped screensaver
requests and distinct exit-event logs. The earlier
host log-save error was fixed without an IPK change. Four repetition
collectors flagged stderr; playback/cleanup passed, resource attribution is unknown.
Keep all control IPKs. Installing 0.1.1 upgrades only the Endurance app;
the staged main/sub, SMP, NDL and mixed apps remain separate. The original
Endurance 0.1.0 IPK is retained for rollback. [Evidence](device-tests/lg-c1-phase-1.md)

On Windows, use PowerShell with FFmpeg and FFprobe on PATH. For the ARM
packages, install Ubuntu in WSL with CMake, Ninja, Python 3, binutils, Node 22
and the [2026.08 Linux webOS SDK](https://github.com/openlgtv/buildroot-nc4/releases/tag/2026.08-webos).
Extract the ARM SDK on the Linux filesystem and run its `relocate-sdk.sh`.
Set `$sdk` to its absolute Linux path.

```powershell
npm ci --no-audit --no-fund
./scripts/make-phase1-clips.ps1
node scripts/package.cjs browser

$repo = wsl -d Ubuntu --exec wslpath -a (Get-Location).Path
$sdk = '/absolute/linux/path/to/arm-webos-linux-gnueabi_sdk-buildroot'
wsl -d Ubuntu --exec cmake -S "$repo/native/phase1-ndl" -B "$repo/build/phase-1/ndl" -G Ninja -DCMAKE_BUILD_TYPE=Release "-DCMAKE_TOOLCHAIN_FILE=$sdk/share/buildroot/toolchainfile.cmake"
wsl -d Ubuntu --exec cmake --build "$repo/build/phase-1/ndl"
./scripts/package-phase1.ps1 -Target ndl
wsl -d Ubuntu --exec python3 "$repo/scripts/verify-ipk.py" --ndl "$repo/dist/io.github.tpapaz.multiview.ndl_0.1.1_arm.ipk"
```

If Node 22 is outside the Linux PATH, pass `-LinuxNode /absolute/linux/path/to/node`
to the packager. It stages the ARM executable on Linux with mode `0755`.
The SMP build uses `native/phase1` with output `build/phase-1/arm` and
`./scripts/package-phase1.ps1` without `-Target ndl`.

| App | Output under `dist/` | Run after installing and opening in Dev Manager |
|---|---|---|
| HTML5 comparison | `io.github.tpapaz.multiview.browser_0.1.0_all.ipk` | `node scripts/run-phase1-browser-ssh.cjs` |
| Native SMP stages | `io.github.tpapaz.multiview.phase1_0.1.4_arm.ipk` | `node scripts/run-phase1-ssh.cjs` |
| Main/sub endurance (next) | `io.github.tpapaz.multiview.endurance_0.1.1_arm.ipk` | `node scripts/run-phase1-endurance-ssh.cjs --repeat --cycles 1` |
| SMP main/sub sinks | `io.github.tpapaz.multiview.sinks_0.1.0_arm.ipk` | `node scripts/run-phase1-sinks-ssh.cjs --solo-b` |
| Mixed SMP A + NDL B | `io.github.tpapaz.multiview.mixed_0.1.0_arm.ipk` | `node scripts/run-phase1-mixed-ssh.cjs` |
| Native NDL v2 solo | `io.github.tpapaz.multiview.ndl_0.1.1_arm.ipk` | `node scripts/run-phase1-ndl-ssh.cjs` |

Use an authorized local SSH profile. Pass its alias to the runner if
several root profiles are configured. [C1 playback record](device-tests/lg-c1-phase-1.md)

### Repeatability and endurance

Install `dist/io.github.tpapaz.multiview.endurance_0.1.1_arm.ipk` through
Dev Manager. Open **MultiView Main + Sub Endurance** to its menu and leave
the remote buttons alone. This is separate from the staged control app.
Start with one smoke cycle:

```powershell
node scripts/run-phase1-endurance-ssh.cjs --repeat --cycles 1
```

Watch A start left, then B right. Both clocks should advance together for
eight seconds; B should disappear and A should continue for three seconds.
The controller closes the app and confirms exit. The targeted 0.1.1
lifecycle retry needs this exact binary's passing smoke and owner visual
confirmation before `--minutes 5`; the old 0.1.0 reports do not satisfy it.
Reopen its menu for that retry. Twenty-cycle mode remains available:

```powershell
node scripts/run-phase1-endurance-ssh.cjs --repeat
```

This runs 20 cycles, closing the app after each and launching a new process
of **only this verified app** for subsequent cycles. Every process is checked
against the installed manifest and local ELF hash. Spot-check both clocks
across the sequence and normal viewing afterward. A failure stops the
sequence. Append an optional local SSH profile alias to any command.

Attach the owner's actual observations to the report's `ownerObservation`
(`spotChecksPassed: true`, plus a factual note) only after confirmation.
The runner never infers visible playback from telemetry. For this targeted
lifecycle retry, the five-minute command requires the same ELF's passing
**one-cycle smoke**, clean exit and owner observation. Repeatability of 0.1.1
remains unverified until its own 20-cycle run; repeat 20 cycles on the final
candidate before claiming that gate. Reopen the menu before each longer run:

```powershell
node scripts/run-phase1-endurance-ssh.cjs --minutes 5
# After a passing five-minute report and owner-confirmed clocks:
node scripts/run-phase1-endurance-ssh.cjs --minutes 30
```

The 30-minute prerequisite is the five-minute report with
`ownerObservation.bothClocksAdvancedTogether: true` (or confirmed spot checks).
Durations measure **concurrent overlap** after both players establish
progress, followed by B release and three seconds of A recovery. The same
30 s A / 15 s B fixtures loop without player reloads. Burned-in clocks reset
at fixture boundaries; native feed/callback PTS must stay monotonic. Watch
for black output or freezes at wraps. This package holds the left/right
layout; wider geometry and audio-focus tests remain separate.

App-scoped screensaver controls in 0.1.1:

- Manifest `screenSaverProperties.preferredType: 2` requests LG's extended
  30-minute app idle policy with OSD dimming; it is not an indefinite disable.
- SDL starts with saver allowed at the menu. During the bounded playback,
  `SDL_DisableScreenSaver` requests inhibition. The prior SDL state is
  restored after both players close, before run_end. Local SDL flag changes
  do not prove the C1 power/compositor service honored the request.
- Focus loss, hidden/minimized state and explicit exit still cancel and
  clean up. No fake remote input or global protection/idle setting is used.

[API investigation and limits](research/c1-smp-ndl-resource-path.md#app-scoped-screensaver-review-and-011-retry)

Trace `screensaver_policy` status 2 records the requested metadata type;
`screensaver_inhibit` status 0 and `screensaver_restore` status 1 record
SDL's local disabled/enabled states. They are not TV acknowledgements.
`exit_event` and `app_exit` have a closed status vocabulary:

| Status | Cause |
|---|---|
| 1 / 2 / 3 | Back / Exit key / Escape |
| 4 / 5 | SDL quit / window close |
| 6 / 7 / 8 | Focus lost / hidden / minimized |
| 9 / 10 / 11 | SIGTERM / SIGINT / deadline |

The host decodes captured run exits into `telemetry.exitEvents`. Host
Ctrl+C/termination is also recorded in `controllerCancellation`. If the
process exits before its final trace can be read, native event evidence
remains incomplete; cleanup and process exit are reported separately.

Continuous runs now collect read-only CPU, memory/thread and temperature
telemetry without an IPK change. A menu baseline is attempted, then samples
are taken approximately every six seconds. CPU/memory reads verify the app
process identity before and after reading. Only numeric counters are exported.
Total CPU busy percent uses `/proc/stat`, excluding idle and iowait; app CPU
uses its user+system ticks, normalized so one observed online core is 100%.
The app value excludes media daemons and hardware engines. These are interval
estimates; CPU hotplug/counter changes invalidate a sample, and brief samples
cannot establish sustained load or the absence of throttling.
[Linux proc counter definitions](https://docs.kernel.org/filesystems/proc.html)

Temperature collection reads only `/sys/class/thermal/thermal_zone*/temp`
and `/sys/class/hwmon/hwmon*/temp*_input`. Values use milli-Celsius, converted
to Celsius; sensor roles and operating limits remain unknown.
[Linux thermal sysfs](https://docs.kernel.org/driver-api/thermal/sysfs-api.html)
No readable temperatures were exposed by those paths in the first C1 check;
that is not proof that the TV has no temperature sensor. A later post-exit
reading is labeled separately from in-playback samples. Nothing writes
thermal controls, cooling settings or idle policy.

The owner need not watch every second. Record which spot checks actually
showed both clocks advancing and any observed wrap/reset. CPU/PTS progress
cannot prove continuous visible output; leave unobserved visual intervals
unknown. Do not promote an interrupted attempt to the 30-minute prerequisite.

Back, loss of focus or Ctrl+C cancels and requests normal teardown. Limits:
eight seconds without first frames, five seconds without callback/PTS
progress, eight seconds without accepted feed packets, native deadline
requested seconds +30, hard process alarm +35. An alarm is **not clean
cleanup evidence**. Host control and SSH reads also have bounded waits.
Manual menu keys: Left eight seconds, Right five minutes, OK 30 minutes;
use SSH for report collection and prerequisite enforcement.

Versioned JSON (`schemaVersion: 1`) is saved under `build/reports/`:

- `c1-phase1-endurance-repeat-1-0.1.1.json` (smoke).
- `c1-phase1-endurance-repeat-20-0.1.1.json`.
- `c1-phase1-endurance-minutes-5-0.1.1.json`.
- `c1-phase1-endurance-minutes-30-0.1.1.json`.

Copy reports before repeating a profile; filenames are reused. Reports
contain per-cycle frame/PTS/packet/loop rows, duration/continuity assessment,
Unload results, process exit, build identity, errors and separate unknown
visual/audio/HDMI fields. Long runs save checkpoints each minute. Short
cycles capture resource categories throughout; long runs capture startup
and final windows only. Each collector is capped at 4 MiB/2000 projected
entries. Separate A/B attribution is required; these windows do not prove
continuous resource ownership during the unsampled middle of a long run.

Build locally in PowerShell using the existing WSL SDK and fixtures. With
`$repo` and `$sdk` set as above:

```powershell
wsl -d Ubuntu --exec cmake -S "$repo/native/phase1-endurance" -B "$repo/build/phase-1/endurance" -G Ninja -DCMAKE_BUILD_TYPE=Release "-DCMAKE_TOOLCHAIN_FILE=$sdk/share/buildroot/toolchainfile.cmake"
wsl -d Ubuntu --exec cmake --build "$repo/build/phase-1/endurance"
./scripts/package-phase1.ps1 -Target endurance -LinuxNode /home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node
wsl -d Ubuntu --exec python3 "$repo/scripts/verify-ipk.py" --endurance "$repo/dist/io.github.tpapaz.multiview.endurance_0.1.1_arm.ipk"
node scripts/verify-mixed-abi.cjs --endurance
```

The ABI check reads fixed firmware libraries without starting playback.
Host checks: `npm test`, `npm run lint` and the standalone watchdog test:

```powershell
wsl -d Ubuntu --exec g++ -std=c++14 -Wall -Wextra -Wpedantic -Werror "$repo/tests/host/progress_watch_test.cpp" -o "$repo/build/phase-1/progress-watch-test"
wsl -d Ubuntu --exec "$repo/build/phase-1/progress-watch-test"
```

### Mixed SMP + NDL build and test

Historical comparison/control: its default route did not show visible overlap.
Use the main/sub endurance sequence for current validation.

Reuse `build/phase-1/media/clip-a.h264` (30 s) and `clip-b.h264` (15 s).
Do not regenerate the fixtures for this comparison. From the repository in
PowerShell, using `$repo` and `$sdk` defined above:

```powershell
wsl -d Ubuntu --exec cmake -S "$repo/native/phase1-mixed" -B "$repo/build/phase-1/mixed" -G Ninja -DCMAKE_BUILD_TYPE=Release "-DCMAKE_TOOLCHAIN_FILE=$sdk/share/buildroot/toolchainfile.cmake"
wsl -d Ubuntu --exec cmake --build "$repo/build/phase-1/mixed"
./scripts/package-phase1.ps1 -Target mixed -LinuxNode /home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node
wsl -d Ubuntu --exec python3 "$repo/scripts/verify-ipk.py" --mixed "$repo/dist/io.github.tpapaz.multiview.mixed_0.1.0_arm.ipk"
node scripts/verify-mixed-abi.cjs
```

The last command reads only fixed runtime-library paths over the existing
root SSH profile and compares ARM imports and symbol versions in WSL. It saves
library hashes and results to `build/phase-1/abi-mixed-0.1.0.json`. Pass a local
profile alias as its first argument if needed. It does not start playback.

1. Install `dist/io.github.tpapaz.multiview.mixed_0.1.0_arm.ipk` in Dev Manager.
   Open **MultiView SMP + NDL Test** and leave it at its menu.
2. Run `node scripts/run-phase1-mixed-ssh.cjs` in a PowerShell terminal
   (append your local profile alias if needed). Do not press OK separately.
3. Watch A's left clock. The runner requires increasing A callbacks **and**
   PTS across at least one second before requesting NDL B.
4. Watch the TV through Init, foreground, Load, SetArea, and feeding. Each
   stage gets at least two seconds of samples. Feeding remains active for
   at least 6.5 seconds in total; B is deliberately released before EOF.
   Note whether A vanishes or freezes, and whether both clocks ever advance
   **at the same time**. A Playing event or accepted packets cannot answer this.
5. After B is released, watch whether A returns and its clock advances.
   The app records three seconds of recovery, cleans up, and returns to its
   menu. The runner reads completion, closes the app, and confirms exit.
6. Answer the terminal's `yes/no/unknown` visible-overlap question. The
   versioned report is saved before the question and updated afterward at
   `build/reports/c1-phase1-mixed-0.1.0.json`. Without a terminal, observation
   stays unknown. Copy the report before repeating a run (the path is reused).

Back cancels and closes the app; Ctrl+C asks the runner to release B and
collect cleanup before closing. Manual controls are OK to start A, Right
five times for B's stages, and Down to release B. Wait for A to advance
before the first Right. The native run has a 45 s deadline, an 8 s first-A-frame
and NDL feed-stall timeout, and a 50 s process alarm if a vendor call hangs.
The alarm is a last-resort process stop, not evidence of successful cleanup.

The report includes `schemaVersion: 1`, app identity and ELF hash, raw rows,
stage deltas, process exit confirmation, and a separately attributed owner
observation. Ordinary rows contain A callback count/PTS in milliseconds and
B accepted packets/frame callbacks. `ndl_events` rows contain cumulative
Load-complete, Playing, error ID, and total event counts; vendor strings are
never recorded. Every NDL startup and cleanup call has begin/end records.
Status 0 is normal completion, 1 cancellation, 2 fixture error, 3 startup
error, 4 pipeline error, 5 feed timeout, 6 deadline, and 7 cleanup failure.
A clean diagnostic completion does not imply concurrent playback succeeded.

The separate SMP 0.1.4 and NDL 0.1.1 packages remain available in `dist/` as
controls, with their original hashes. This test does not establish audio
focus, independent geometry changes, or HDMI concurrency.

### Load-only resource experiment with installed mixed 0.1.0

Open **MultiView SMP + NDL Test** to its menu, then run:

```powershell
node scripts/run-phase1-mixed-ssh.cjs --load-only
```

An optional SSH profile alias may precede the flag. The runner verifies the
installed manifest and running ELF, starts A, and advances B through Init,
foreground and Load only. It holds stage 3 for at least 6.5 s, without
SetArea or feeding, releases B, measures A recovery and checks cleanup/exit.
Back or Ctrl+C cancels. The existing native 45 s deadline/50 s alarm apply.

The passive collector follows new `/var/log/messages` lines using the C1's
BusyBox `timeout -t 50 tail -n 0 -F`, with 4 MiB input, 16 KiB per line and
2000 projected entries as limits. It changes no logging settings. Raw lines
are discarded; only known event categories/resource names, host receipt time
and app-ID-match versus unattributed-system-event are saved. Other media
activity can appear as unattributed events; neither that label nor an app ID
match identifies A versus B. Host receipt timestamps can lag native events.
Missing events at existing log levels cannot disprove resource reclamation.

Report: `build/reports/c1-phase1-mixed-load-only-0.1.0.json`, separate from the
feeding-run report. It includes collector errors/limits, native trace, stage
deltas, build hash, process exit and checks that accepted packets stay zero
and no SetArea/feed event occurred. No IPK rebuild is needed.

### Two-SMP main/sub package

Built locally with the same 30 s A and 15 s B video-only H.264 fixtures.
The separate app ID is `io.github.tpapaz.multiview.sinks`; the title is
**MultiView Main + Sub Test**. Both players use the hardware-default decoder
request, with explicit `main_video` for A and `sub_video` for B in the initial
Load options. No graphic rendering, window-type change or policy override.

Build from PowerShell with `$repo` and `$sdk` set as above:

```powershell
wsl -d Ubuntu --exec cmake -S "$repo/native/phase1-sinks" -B "$repo/build/phase-1/sinks" -G Ninja -DCMAKE_BUILD_TYPE=Release "-DCMAKE_TOOLCHAIN_FILE=$sdk/share/buildroot/toolchainfile.cmake"
wsl -d Ubuntu --exec cmake --build "$repo/build/phase-1/sinks"
./scripts/package-phase1.ps1 -Target sinks -LinuxNode /home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node
wsl -d Ubuntu --exec python3 "$repo/scripts/verify-ipk.py" --sinks "$repo/dist/io.github.tpapaz.multiview.sinks_0.1.0_arm.ipk"
node scripts/verify-mixed-abi.cjs --sinks
```

Install the IPK in Dev Manager, open **MultiView Main + Sub Test** and leave
it at the menu. Run the B-only control first; do not press OK separately:

```powershell
node scripts/run-phase1-sinks-ssh.cjs --solo-b
```

Watch B's right-hand clock for the eight-second control. The runner verifies
callback and PTS progress, collects resource logs, checks Unload and closes
the app. Report: `build/reports/c1-phase1-sinks-solo-b-0.1.0.json`.
Confirm the clock visibly advances and inspect retained resource logs for
SubVideo/SUB0 and B presentation SUB_SCALER with no MAIN_SCALER takeover.
A telemetry pass alone is insufficient. Keep the control report; staged
commands require it to match this exact ELF and have clean process exit.

Once the owner confirms B's visible control and resource selection has been
reviewed, reopen the app to its menu for the Load-only test:

```powershell
node scripts/run-phase1-sinks-ssh.cjs --staged --load-only --confirm-solo-b-visible
```

The confirmation flag is an explicit owner-observation assertion, not an
automatic inference. It must not be used if B was black or its clock froze.
This run establishes A progress, steps B through empty window, construction,
foreground and Load, holds Load for at least three seconds, releases B and
samples three seconds of recovery. No B Feed or Play is requested. Report:
`build/reports/c1-phase1-sinks-load-only-0.1.0.json`.

After verifying A remained visible/advancing and the expected separate
presentation grants, reopen the menu and run the full staged comparison:

```powershell
node scripts/run-phase1-sinks-ssh.cjs --staged --confirm-solo-b-visible
```

This adds Feed without explicit Play, Play, and a smaller/lower B rectangle,
then releases B. Each normal stage gets at least two seconds of telemetry;
Load gets three seconds. A's callback count and PTS must both increase at
each measured stage or the runner stops progression, releases B and closes
the app. After Play, B must increase both too. Aggregate sampled progress
cannot exclude a brief interruption between samples; inspect the trace,
resource attribution and both visible clocks. Never infer a concurrency pass
from `telemetryPassed` alone. The full report is
`build/reports/c1-phase1-sinks-stages-0.1.0.json`.

All three modes capture redacted resource log categories using the existing
bounded collector. Resource ownership and visible results remain unknown in
the generated report until the human observation and A/B attribution are
attached. Reports include schema version 1, ELF hash, device reference,
requested sinks, frame/PTS rows, packet-count rows, stage deltas, cleanup,
controller errors and process exit confirmation. Copy reports before a repeat
because each mode reuses its filename. Append a local SSH profile alias to
any command when needed.

Manual controls: Left starts B-only; OK starts A/staged mode; Right advances
B's stages; Down releases B; Back cancels/closes. SSH uses USR2 at the menu
for solo B, USR1 for staged start/advance, USR2 during a run for B release,
and TERM to close. SIGINT/Ctrl+C requests normal release/cleanup. The native
run deadline is 45 s with a 50 s hard alarm, and the inherited first-frame
limit is eight seconds after Play. Cleanup is recorded before run_end.
Status codes: 0 completed, 1 cancelled/focus lost, 2 startup/stage failure,
3 pipeline failure, 4 deadline, 5 cleanup failure. A hard alarm is not clean
cleanup evidence. Existing SMP, NDL and mixed control IPKs are preserved.

## Optional native ARM inventory

Use the [openlgtv buildroot NDK](https://github.com/openlgtv/buildroot-nc4) path
used by the pinned webosbrew samples, matching the reference TV's userspace:

```sh
cmake -S . -B build/tv -G Ninja -DBUILD_TESTING=OFF \
  -DCMAKE_TOOLCHAIN_FILE=/opt/arm-webos-linux-gnueabi_sdk-buildroot/share/buildroot/toolchainfile.cmake \
  -DCMAKE_BUILD_TYPE=Release
cmake --build build/tv --target multiview-probe
readelf -h build/tv/multiview-probe
readelf -d build/tv/multiview-probe
readelf --version-info build/tv/multiview-probe
```

Review ELF architecture (expected candidate: ARM 32 bit, verify against device),
interpreter, DT_NEEDED and GLIBC/GLIBCXX symbol versions against the **exact C1
firmware** before transfer. The portable inventory is a separate CLI. The
Phase 1 ARM packages use the TV's own shared libraries.

## Human-operated web package installation

Use Dev Manager or the commands below with your authorized local alias
in place of `c1`. [Passive test procedure](device-tests/lg-c1-phase-0.md#repeat-the-test)

```sh
npx --no-install ares-install -d c1 dist/io.github.tpapaz.multiview.probe_0.1.0_all.ipk
npx --no-install ares-launch -d c1 io.github.tpapaz.multiview.probe
npx --no-install ares-launch -d c1 --close io.github.tpapaz.multiview.probe
npx --no-install ares-install -d c1 --remove io.github.tpapaz.multiview.probe
```
