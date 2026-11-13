# Build, inspect and install

> [Current status](../../STATUS.md) · [Documentation index](../README.md). This is a procedure/reference guide; device commands below are not authorization to repeat an experiment.

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

## Phase 2 single-HDMI candidate

The [owned-window candidate](../../native/phase2-hdmi-window/README.md) has its own
local WSL build/package/host acceptance commands and saved-runtime direct ABI record.
Version 0.1.3 is locally packaged and archive-checked; 96 required imports/nine
direct libraries passed the saved C1 ABI check. Full SDL closure/loader execution
is unverified. It is not installed, simulator-tested or TV-tested. Scoped
admission, installed boot/jail/normal-launch context and owner restoration
conditions keep it not device-ready. Default launch performs no file/graphics/IPC.
`scripts/prepare-hdmi-window.py` preserves existing versioned outputs; do not
rerun over the retained IPK. Use the prototype's existing-artifact check commands.
The three-call IWC preflight is paused. Follow the [current acquisition plan](../device-tests/current-plan.md);
no TV launch, install, permission change or input switch is authorized here.

## Phase 1 local clip packages

Phase 1 packages are **retained controls**, not the current work queue.
Screensaver work is [closed for this scope](../decisions/0003-close-idle-work-resume-hdmi.md);
continue with the [HDMI discovery handoff](../handoff/hdmi-next-chat.md).

The final Native Veto Probe 0.1.3 is locally built, packaged, C1 ABI-checked
and smoke-TV-tested. Its service registration, short dual playback, A recovery
and cleanup passed with owner clocks. The separate 60.022-second request test
received no request and was inconclusive. Effective veto is still unknown.
No reinstall, rerun or longer idle experiment is needed for HDMI discovery.

The [archived detailed journal](../device-tests/archive/lg-c1-phase-1.md) holds exact build hashes,
run results and the older Endurance/mixed/SMP history. Keep every control
IPK and local evidence. All Endurance versions share one application ID,
so installing one replaces that installed control; SMP, NDL, mixed and staged
main/sub controls have separate IDs. The retained commands below are for a
future explicitly requested control rerun, not automatic next steps.

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
| Retained native veto control | `io.github.tpapaz.multiview.endurance_0.1.3_arm.ipk` | `node scripts/run-phase1-endurance-ssh.cjs --smoke` |
| SMP main/sub sinks | `io.github.tpapaz.multiview.sinks_0.1.0_arm.ipk` | `node scripts/run-phase1-sinks-ssh.cjs --solo-b` |
| Mixed SMP A + NDL B | `io.github.tpapaz.multiview.mixed_0.1.0_arm.ipk` | `node scripts/run-phase1-mixed-ssh.cjs` |
| Native NDL v2 solo | `io.github.tpapaz.multiview.ndl_0.1.1_arm.ipk` | `node scripts/run-phase1-ndl-ssh.cjs` |

Use an authorized local SSH profile. Pass its alias to the runner if
several root profiles are configured. [C1 playback record](../device-tests/c1-journal.md#phase-1)

### Retained short veto control

**Historical procedure; work closed by owner.** Do not rerun without a fresh
request. [Current HDMI scope](../decisions/0003-close-idle-work-resume-hdmi.md).

Retained control: **Native Veto Probe 0.1.3**. Only short modes are available;
the earlier endurance campaigns remain historical evidence. The owner has
deferred additional long tests in favor of returning to HDMI research.

**Previous 0.1.2 result:** smoke aborted at registration submission before
playback. Its request mode was skipped. The owner authorized 0.1.3 as one
final short correction using ordinary LS2 calls. Its fresh smoke now passed
with owner confirmation. Registration/cleanup is TV-verified; effective veto
still needs a real request. Do not transfer evidence from the older build.

The separate 0.1.3 request attempt is now complete: no request arrived in the
60-second wait, so no clips started and no NACK was sent. Cleanup/exit passed;
the owner saw the menu, then reported a screensaver after exit. This does not
establish the app-specific idle delay or an applied veto. Do not extend or
repeat this run automatically. Glasshouse/Home routing was reported separately
after a Glasshouse update; no launcher setting was inspected or changed.

Install `dist/io.github.tpapaz.multiview.endurance_0.1.3_arm.ipk` through
Dev Manager. It upgrades the Endurance app and appears as **MultiView Native
Veto Probe**. Keep all old IPKs as controls. Open its menu and start with:

```powershell
node scripts/run-phase1-endurance-ssh.cjs --smoke
```

The app registers its native veto, plays A left and B right together for
eight seconds, releases B, and checks A for three seconds. The veto stays
registered through A recovery and both Unloads. The controller closes only
this identity/hash-verified app. Confirm both clocks and A continuation.

After adding that actual observation to the smoke report's
`ownerObservation.bothClocksAdvancedTogether: true` (or confirmed
`spotChecksPassed: true`), reopen the menu for one short request probe:

```powershell
node scripts/run-phase1-endurance-ssh.cjs --veto
```

This waits **at most 60 seconds on the idle menu** for a real screensaver
request and successful NACK reply. Then the same eight-second A/B playback
and three-second A recovery run. The entire native probe has a **90-second
hard cap**. If no request arrives, it cleans up and records
`inconclusive_no_request`; it does not extend the wait or run a long test.
Denied registration, invalid replies, focus loss, Back or cancellation stop
the diagnostic and perform cleanup. No automatic relaunch or repeated cycles.

The Type 2 thirty-minute app metadata is removed for this probe, allowing
normal app idle behavior. SDL's local disabled flag is no longer used as
inhibition evidence. The public LS2 subscription is owned by the native app,
uses the real app ID and only NACKs validated active requests during this
bounded opt-in. After both Unloads: explicit unsubscribe, original token
cancellation, outstanding call cancellation and handle unregister are logged
separately. Busy unsubscribe does not replace token cancellation.
[Exact C1 contract and limitations](../research/c1-native-screensaver-interface.md)

Ordinary `LSCall`/`LSCallOneReply` use the public connection's real sender,
without asserting an app ID via the privileged proxy API. Error events
`veto_api_error` / `veto_service_error` contain reason classes 0 no detail,
1 permission/privilege, 2 unavailable, 3 invalid argument, 4 disconnected,
5 timeout, 6 other. `veto_api_negative/positive` and service equivalents
encode signed numeric error codes; magnitudes above one million are capped
and decoded as unknown. No raw error text is exported.

The numeric trace records `veto_bus`, `veto_attach`,
`veto_disconnect_watch`, `veto_register`, `veto_registered`,
`veto_request`, `veto_decision`, `veto_reply_send`, `veto_reply`,
`veto_wait_start/end`, `veto_end`, `veto_unsubscribe_send`,
`veto_unsubscribe`, token cancellations and `veto_handle_close`.
Status 0 normally means success; `veto_request:1` means validated active
request and `veto_decision:0` means NACK. Service reply 1 means rejected,
2 invalid payload, 3 response deadline; unsubscribe 4 means its one-second
wait expired. Native result 6 is interface failure; 7 means no request.
Request timestamps, bus IDs and raw service payloads are never exported.
A service success reply alone may be a no-op for an unknown client:
require attributable tvpower `set NACK` and actual visual evidence before
claiming effective inhibition.

Focus/exit vocabulary remains Back/Exit/Escape 1/2/3, SDL quit/window close
4/5, focus lost/hidden/minimized 6/7/8, TERM/INT/deadline 9/10/11.
The local frame/PTS/feed watchdogs remain active. An alarm or abrupt process
exit is not clean cleanup evidence.

CPU/RSS/thread sampling and read-only thermal/hwmon sampling run in both
short modes, approximately every six seconds, including a menu baseline and
a separately labeled post-exit temperature read. System CPU excludes idle
and iowait; app CPU uses one core = 100% and excludes media daemons/hardware.
The C1 previously exposed no readable values at
`/sys/class/thermal/thermal_zone*/temp` or
`/sys/class/hwmon/hwmon*/temp*_input`; unavailable remains unknown.
Resource/display and screensaver logs are projected into known categories
and actor/attribution labels for the bounded run; no raw identifiers persist.
An AirPlay ACK is not an Endurance NACK.

Reports use `schemaVersion: 1`:
`build/reports/c1-phase1-veto-smoke-0.1.3.json` and
`c1-phase1-veto-request-0.1.3.json`. Copy reports before repeating a mode.
Native telemetry success, service NACK evidence and owner visual confirmation
are separate fields. Neither short mode proves HDMI concurrency or endurance.

Build locally in PowerShell with the existing Linux SDK and unchanged clips.
This C1-specific build uses the read-only firmware copies retained during
the interface trace for legacy LS2 and JSON-C 4. They are link inputs only;
no proprietary shared library is bundled into the IPK. The CMake shared-library
link allowance accommodates retail `fcntl@GLIBC_2.28` references absent from
the newer SDK; the executable's imports and providers must pass the C1 ABI
check below.

```powershell
# $repo is the WSL path; $sdk is the existing 2026.08 SDK path.
wsl -d Ubuntu --exec cmake -S "$repo/native/phase1-endurance" -B "$repo/build/phase-1/endurance" -G Ninja "-DCMAKE_BUILD_TYPE=Release" "-DCMAKE_TOOLCHAIN_FILE=$sdk/share/buildroot/toolchainfile.cmake" "-DLUNA_LIBRARY=$repo/build/phase-1/firmware-inspection/native-idle/libluna-service2.so.3" "-DJSON_C_LIBRARY=$repo/build/phase-1/firmware-inspection/native-idle/libjson-c.so.4"
wsl -d Ubuntu --exec cmake --build "$repo/build/phase-1/endurance"
./scripts/package-phase1.ps1 -Target endurance -LinuxNode /home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node
wsl -d Ubuntu --exec python3 "$repo/scripts/verify-ipk.py" --endurance "$repo/dist/io.github.tpapaz.multiview.endurance_0.1.3_arm.ipk"
node scripts/verify-mixed-abi.cjs --endurance
npm test
npm run lint
wsl -d Ubuntu --exec g++ -std=c++14 -Wall -Wextra -Wpedantic -Werror "$repo/tests/host/veto_error_test.cpp" -o "$repo/build/phase-1/veto-error-test"
wsl -d Ubuntu --exec "$repo/build/phase-1/veto-error-test"
```

The ABI check reads fixed firmware files and never starts playback. See
[build identity and completed request result](../device-tests/archive/lg-c1-phase-1.md#native-veto-013--request-probe-inconclusive-within-cap).
This experiment is complete. Continue with the [HDMI handoff](../handoff/hdmi-next-chat.md);
additional idle and local-clip endurance work is deferred.

### Mixed SMP + NDL build and test

Historical comparison/control: its default route did not show visible overlap.
Retain it for an explicitly requested control; no comparison rerun is scheduled.

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
in place of `c1`. [Passive test procedure](../device-tests/archive/lg-c1-phase-0.md#repeat-the-test)

```sh
npx --no-install ares-install -d c1 dist/io.github.tpapaz.multiview.probe_0.1.0_all.ipk
npx --no-install ares-launch -d c1 io.github.tpapaz.multiview.probe
npx --no-install ares-launch -d c1 --close io.github.tpapaz.multiview.probe
npx --no-install ares-install -d c1 --remove io.github.tpapaz.multiview.probe
```

## Retained HDMI candidate build record

The following preserves the 0.1.3 build detail and earlier artifact hashes as recorded before consolidation. Current commands are in the current build guide.

## Local build and acceptance checks

Run from repository PowerShell using the existing WSL Linux SDK and Linux Node:

```powershell
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/scripts/prepare-hdmi-window.py
npm run test:hdmi-window-report
npm run test:hdmi-window-launch
npm run lint
git diff --check
```

The local sequence completed on 2026-11-12. It builds/runs only the
Linux-host acceptance executable, compiles the ARM ELF, checks saved direct ABI
providers, stages on Linux with 0755/0644 modes, packages with the pinned local
webOS CLI and inspects the IPK. It refuses existing versioned outputs; do not
rerun it over the retained artifact. For current checks use the existing host
build and archive verifier:

```powershell
wsl -d Ubuntu --exec ctest --test-dir /mnt/d/Development/webos-multiview/build/phase-2/hdmi-window-host-0.1.3 --output-on-failure
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/tests/host/native_abi_versions_test.py
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/scripts/verify-ipk.py --hdmi-window /mnt/d/Development/webos-multiview/dist/io.github.tpapaz.multiview.hdmiwindow_0.1.3_arm.ipk
```

| Current local artifact | Bytes | SHA-256 |
|---|---:|---|
| `dist/io.github.tpapaz.multiview.hdmiwindow_0.1.3_arm.ipk` | 20,806 | `375f77d753eebbc1d6f1ca292689853c90352644d21a2ec45c7078bcd061bb9b` |
| `build/phase-2/hdmi-window-arm-0.1.3/multiview-hdmi-window` | 44,656 | `24d3b5115fe4b56ad70f48fd06329d3df27533129a261908699f88b53932d797` |

`build/phase-2/hdmi-window-0.1.3/package-validation.json` pins sources, package,
ELF, manifest and the four separate policy payloads. `direct-abi.json` covers
96 required imports, nine direct DT_NEEDED libraries, exact symbol versions,
ELF32 ARM soft-float, `/lib/ld-linux.so.3` and no RPATH/RUNPATH. Full SDL graphics
closure, optional imports and dynamic `dlopen` paths remain unchecked; no loader
or TV execution is claimed. The IPK contains only the app manifest, icon,
executable and generated package metadata: no policy, install script, service,
autostart or proprietary runtime library.

The boot-clock import uses the saved C1 `librt.so.1` as a link-only input.
The ABI checker now binds each versioned import using its ELF version **index**
and DSO, because both libc and librt declare `GLIBC_2.4`. A negative acceptance
case rejects a symbol available only in the wrong provider. The initial build
caught a 32-bit comparison warning; after correction, the clock-provider check
exposed that former version-name collision. Final packaging ran the current
recipe's remaining sequence through retained
`build/phase-2/hdmi-window-0.1.3/finish-clock-provider.py`. Its earlier scripts,
failed-provider ELF and original reports remain preserved. Clean future builds
use the updated `prepare-hdmi-window.py`; no compiler/ABI checks were bypassed.

Host acceptance covers fixed own-window/NormalWindow/HDMI-4 requests, failed or
uncertain open, cancellation, negative/unsent stop/close, nested backend failure
and conservative cleanup reporting. Admission checks cover same-app queries,
four-method bounds, valid negative predictions, malformed replies and cancelled
or failed cleanup. The JS report acceptance checks cover privacy, phase-specific
expectations and uncertainty. They do not simulate a physical picture.

Launch acceptance covers legacy/stale/different-boot/malformed/overlong input,
strict deadline equality, clock failure, conservative centisecond conversion,
and progress/cleanup dispatch cutoffs after simulated suspension. No boot ID or
raw launch authority enters the sanitized reports.

The interim 0.1.1 IPK remains preserved (`ba95e0f2020b46340e43063f04fe7867af2b01cb604098c0b83ea635f49d2d37`); 0.1.2 removes output from the hard-alarm handler so stderr cannot delay that exit. Its earlier report/source pins remain immutable.

The earlier 29,908-byte ELF under `hdmi-window-arm-contract-20261112/` retains
SHA-256 `91cbfe5710978793cab0e613d70227508d707af09422d10f2e14de4afa54e1bb`;
`hdmi-window-arm/` retains
`ef19a74f59ad0cb95997f254f92e4bf0ad2c72377db988a121605f6f33997d3f`.
Their reports and all earlier controls remain preserved. The old 75-import ABI
record describes the previous ELF, not 0.1.3.
The complete 0.1.2 IPK/ELF and its 93-import/eight-provider reports are also
preserved (`f80f16b09d5d6262d0262a5df1b725a8a8a8c4acbbd68d4d2590d36dc4f9010f`).

The [current procedure](../device-tests/current-plan.md#bounded-capture-and-first-picture-procedure)
uses `scripts/capture-hdmi-window.cjs` for separately authorized read-only capture.
Offline `--check-report <mode> <file>` never loads device credentials. The live
`--prepare` / `--collect` modes require `--allow-tv-read`, never launch, signal,
delete or write on TV, and stop at 30 seconds. That collector deadline does not
extend the owner's 27-second acquisition handoff. Its process scan establishes
absence at capture time only; exit code and timely exit remain unknown unless
separately observed. No live collector mode was run for this preparation.

## Retained scoped-admission preparation record

The earlier schema/administrative payload contract is retained at
`build/phase-2/hdmi-admission-plan-20261112-001/admission-findings.json`, SHA-256
`1d954e2cc0657038686a923984bc9719097b2cdd4ad8e5354c836f0f4e5bf449`.
It resolves the exact prefix/path schema and removal-acknowledgment limitation;
the later stock-caller finding supersedes its missing-caller task. The current
procedure remains the authority for any future runtime validation.
