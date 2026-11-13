# Single-HDMI owned-window candidate

[Status](../../STATUS.md) · [Current procedure](../../docs/device-tests/current-plan.md) ·
[Evidence map](../../docs/research/c1-hdmi-interface-map.md) · [Build commands](../../docs/build.md)

**0.1.3 is locally built, host acceptance-tested, packaged and direct-ABI checked.
It is not installed, simulator-tested or TV-tested.** No physical HDMI result or
hardware release is claimed. This is original client code; no proprietary runtime
implementation or upstream code is bundled.

## Fixed client contract

App/connection identity: `io.github.tpapaz.multiview.hdmiwindow`.
The app requires a 1920×1080 SDL coordinate space and exports its own transparent
window (type 2) at `(480,270,960,540)`, with a black surround. Graphics alone are
not a physical-picture result. It never lists or modifies the stock publication.

| Operation | Fixed request |
|---|---|
| `utp.extinputs/open` | `options.appId`: own identity; `options.windowId`: freshly assigned own export; `options.windowType`: `NormalWindow`; `inputSourceType`: `HDMI`. |
| `switchExternalInput` | Only the pipeline returned by this open; `portId:4`, matching the owner's last confirmed connection. |
| `stop`, then `close` | One sequence for that returned ID, including cancellation or selection failure. No guessed IDs, retry or backend pause fallback. |

After accepted selection, observe for at most eight seconds. Back/Exit, focus or
visibility loss, signals, disconnect, invalid replies and deadlines stop
progression. Replies are bounded to two seconds/4 KiB; an in-flight open is
drained within that bound to retain its returned ID for cleanup. Failed token
cancellation can leave close unsent; local unregister/destruction is not a
hardware-release guarantee. There are no IWC, video-capture, audio or policy APIs.

## Launch and timing contract

Default/malformed launch is inert. Picture mode requires `acquireHdmi4:true`,
`launchBootId` and `launchStartByBoottimeMs`; the old unbounded opt-in is rejected.
The fixed read-only producer in `scripts/capture-hdmi-window.cjs --prepare picture`
reads boot ID → uptime → boot ID at fixed `/proc` paths and saves private host
`launch.json`. IDs must agree; start deadline is the conservative centisecond
uptime sample +3,000 ms. It does not launch, write on TV, refresh or retry.

Native code requires the same boot and `0 < deadline - CLOCK_BOOTTIME <= 3000`
before report reservation and again before graphics/LS2. Missing metadata/clock,
expiry or reboot fails closed. Optional validated `nid`/`@system_native_app`
launcher metadata supplies no routing authority. Boot ID/raw launch authority is
never printed or included in reports.

The alarm is armed before boot validation. An admitted start by sample +3 s has
a process cap of 22 s, ending by sample +25 s. Sampling precedes the one launch
submission, so this is before the owner's submit +27 s handoff. Boot-time
progress/cleanup dispatch cutoffs are sample +17/+22 s, including suspend time;
open/select cannot borrow the cleanup budget. Each cutoff is rechecked at dispatch.
The alarm calls `_exit(124)` without writing to a potentially blocked pipe.
This is a client contract, not unconditional survival through stopped/killed tasks,
kernel faults or a backend hang. Actual launcher/jail integration is untested.

## Admission and reports

`{"checkUtpAdmission":"baseline"}` registers this app's own identity and queries
only bus `isCallAllowed` for open/select/stop/close. Other fixed phases are
`overlay`, `removed`, `picture-ready`, `after-picture`. No SDL/export or UTP target
operation runs. Mixed/unknown arguments are rejected. Four queries maximum,
10-second progression/12-second hard cap; `allowed:false` is a valid prediction.
Phase expectations and rollout/removal order live only in the current procedure.

Each explicit mode exclusively reserves its report before graphics/LS2 under
`/tmp/io.github.tpapaz.multiview.hdmiwindow/`: owned 0700 directory, 0600 file,
no symlink/overwrite. Slots are `picture-0.1.3.json` or
`admission-<phase>-0.1.3.json`. Existing/unavailable slot exits 73. Report is at
most 2 KiB, fsynced/closed before stdout/exit; write failure exits 74. Hard exit
can leave a partial slot. `/tmp` evidence may be lost on cold recovery; do not
delay owner restoration to collect it. Vendor stdout/stderr is not sanitized.

Reports contain fixed outcomes, Booleans/counts and no IDs/raw service errors.
`candidate_interval_completed`/exit 0 requires the client sequence, outer stop/close
acknowledgments and local cleanup; it does not prove visible HDMI or release.
Once open may have reached UTP, `acquisitionUncertain` remains true.
`hardwareRelease`, `livePicture`, `restoration`, `dualHdmi` remain `unknown`.

The collector is read-only, never launches/signals/deletes, and has a separate
30-second cap. It verifies package/generated-policy pins, strict report schema,
matching jail/host aliases and process absence at capture time. That cannot
establish an exit code or exit before the owner's deadline. Its CLI and future
read scope are in the current procedure; no live mode has been run for this app.

## Local build and acceptance checks

Use [the build guide](../../docs/build.md#phase-2-single-hdmi-candidate) for current
commands. These are the retained artifacts, not a device-tested release:

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `dist/io.github.tpapaz.multiview.hdmiwindow_0.1.3_arm.ipk` | 20,806 | `375f77d753eebbc1d6f1ca292689853c90352644d21a2ec45c7078bcd061bb9b` |
| `build/phase-2/hdmi-window-arm-0.1.3/multiview-hdmi-window` | 44,656 | `24d3b5115fe4b56ad70f48fd06329d3df27533129a261908699f88b53932d797` |

`build/phase-2/hdmi-window-0.1.3/package-validation.json` pins native sources,
manifest and the four separate policy files; `direct-abi.json` covers 96 required
imports/nine direct DSOs, exact version-index/provider matching, ELF32 ARM
soft-float, `/lib/ld-linux.so.3`, and no RPATH/RUNPATH. The boot-clock provider is
saved C1 `librt.so.1`, used only for linking. Full SDL graphics closure, optional
imports/dlopen and actual loader execution remain unverified.

The IPK contains only manifest, icon, executable and generated package metadata:
no policy, install script, service, autostart or vendor library. The original
0.1.1/0.1.2 packages, old ELFs and reports remain intact. Detailed build corrections
and original hashes are in the [archived investigation](../../docs/research/archive/c1-hdmi-investigation-2026-11-12.md#administrative-caller-and-expiring-launch--2026-11-12)
and retained `hdmi-window-0.1.3/finish-clock-provider.py`.

Existing acceptance checks cover acquisition/cancellation/cleanup uncertainty,
fixed policy-query scope, launch expiry/boot binding, report privacy and exact
ABI providers. None simulates a physical HDMI picture. Policy scope is documented
in [policy/README.md](policy/README.md); all runtime gates remain in the current plan.
