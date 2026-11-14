# Single-HDMI owned-window candidate

[Status](../../STATUS.md) · [Procedure](../../docs/device-tests/current-plan.md) ·
[Evidence](../../docs/research/c1-hdmi-interface-map.md) · [Build](../../docs/build.md)

**0.1.4 is locally built, host acceptance-tested, packaged and direct-ABI checked;
installed files/modes/generated policies are read-only verified on C1.** It has
not executed or been simulator-tested. Permission coverage and current grant
retention are recorded in [Status](../../STATUS.md); exact device outcomes are in
the [journal](../../docs/device-tests/c1-journal.md). Physical HDMI, graphics,
actual UTP admission, hardware release and simultaneous ports remain unknown.

## Fixed client contract

Identity: `io.github.tpapaz.multiview.hdmiwindow`. One SDL coordinate space
1920×1080, own transparent export type 2, destination `(480,270,960,540)`, black
surround. This is original client code; no vendor implementation is bundled.

| Operation | Fixed request |
|---|---|
| `utp.extinputs/open` | Own appId, freshly assigned own windowId, `windowType:NormalWindow`, `inputSourceType:HDMI`. |
| `switchExternalInput` | Only the pipeline returned by this attempt; `portId:4`. |
| `stop`, then `close` | Only that returned ID, including cancellation/selection failure. No guessed ID, retry or pause fallback. |

Observe at most eight seconds after selection. Back/Exit, focus/visibility loss,
signals, disconnect, invalid replies and deadlines stop progression. Replies are
bounded to two seconds/4 KiB; drain in-flight open to retain its ID for cleanup.
Failed cancellation can leave close unsent. No IWC/capture/audio/policy API exists
in the app. Cleanup acknowledgment and local teardown do not prove hardware release.

## Launch and timing contract

Default/malformed launch is inert. Picture mode requires exactly the current
fields: `acquireHdmi4:true`, `launchBootId`, `launchStartByBoottimeMs` and
`launchStartByRealtimeMs` (plus narrowly validated launcher metadata).
Old 0.1.3 picture payloads are rejected; there is no compatibility fallback.

The read-only producer `scripts/capture-hdmi-window.cjs --prepare picture` stamps
host epoch milliseconds before boot ID → uptime → boot ID reads, exclusively
saving private host `launch.json`. IDs must agree. Uptime sample +3,000 ms and
host issue time +3,000 ms are both fixed deadlines. Slow preparation consumes the
absolute window; host clock backstep/expiry stops preparation. The producer
never launches, refreshes, retries, prints IDs or writes on TV.

Native code checks matching UUID and both
`0 < deadline - currentClock <= 3000`, using CLOCK_BOOTTIME and CLOCK_REALTIME,
before report reservation and again before graphics/LS2. UUID alone is not a
unique restart boundary: the observed C1 returned the same value after the
owner-reported cold boot. Matching uptime/UUID after restart does not revive an
already expired absolute deadline while real time advances. Host/TV clock skew,
missing clocks or expiry reject before acquisition; no clock adjustment/window
widening is authorized. Simultaneous clock reset into the old issue window is
not excluded by these clocks. Fresh one-shot delivery and no replay remain required.

Progress/cleanup dispatch ends at sampled uptime +17/+22 seconds, including
suspend. Operation-specific checks occur immediately at dispatch; open/select
cannot borrow cleanup time. Alarm is armed before validation for 22 seconds from
entry; admitted start is by uptime sample +3 s, so cap ends by sample +25 s.
Owner's independent submit +27 s handoff is unchanged. `_exit(124)` writes nothing
to a possibly blocked launcher pipe. These are client bounds, not guarantees
against stopped tasks/kernel faults/backend hangs. Device clock/graphics
integration is untested; normal app-manager admission delivery is saved evidence.

## Admission and reports

`{"checkUtpAdmission":"baseline"}` registers only the app's own identity and
queries bus `isCallAllowed` for the four fixed UTP methods. Other fixed phases:
`overlay`, `removed`, `picture-ready`, `after-picture`. No graphics or target UTP
call. At most four queries, 10 s progression/12 s cap. Native predictions are
supplemental and do not certify permission readiness; no new baseline campaign
is scheduled. Forward acceptance uses exact loaded group/method maps.

Explicit modes exclusively reserve a report under
`/tmp/io.github.tpapaz.multiview.hdmiwindow/` (jail alias supported): owned 0700
directory/0600 file, no symlink/overwrite, ≤2 KiB, fsynced/closed. Slots are
`picture-0.1.4.json` and `admission-<phase>-0.1.4.json`. Unavailable slot exits 73;
failed write exits 74. Partial/missing/conflicting report leaves cleanup unknown.

Reports contain fixed outcomes/counts, no IDs/raw service errors. Completed
status requires selected input, outer stop/close acknowledgments and local cleanup.
`acquisitionUncertain` remains true after open may reach UTP; `hardwareRelease`,
`livePicture`, `restoration`, `dualHdmi` stay unknown. Visible motion/restoration
require independent owner observation. Process absence cannot prove exit timing.

Collector is read-only, ≤30 s/1,024 processes. It checks exact package bytes,
ELF0755/appinfo0644, generated roles/client and versioned manifest linkage, own
report aliases/schema and app absence. It never launches/signals/deletes.
Historical reports/packages remain immutable evidence; this checkout's validator
accepts the current version, not relabelled historical captures.

## Local build and acceptance checks

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `dist/io.github.tpapaz.multiview.hdmiwindow_0.1.4_arm.ipk` | 21,226 | `b9002c252d67f7cc878fc47cebf825498b2989353008b26aae456f0a52034662` |
| `build/phase-2/hdmi-window-arm-0.1.4/multiview-hdmi-window` | 44,724 | `fcbef915cad619444dc0ad3867a56c2c83cdb928924a075a2b7cbce59383849f` |
| `native/phase2-hdmi-window/appinfo.json` | 263 | `11700d7aacf85c5b0447f668a76a1fd48bc87ff3b42ebed4c1e93119d7171e4c` |
| Retained 0.1.3 IPK | 20,806 | `375f77d753eebbc1d6f1ca292689853c90352644d21a2ec45c7078bcd061bb9b` |

`build/phase-2/hdmi-window-0.1.4/package-validation.json` pins native sources,
manifest, policy and retained Linux stage; `direct-abi.json` passes 96 required
imports/nine direct DSOs, exact versioned providers, ARM32 soft-float,
`/lib/ld-linux.so.3`, no RPATH/RUNPATH. Saved C1 librt supplies clock_gettime.
Full SDL closure/dlopen/graphics runtime are unverified. No vendor libraries,
policy, service, installer or autostart is packaged. All earlier artifacts remain.

Host tests cover stale reused-ID/matching-uptime rejection through absolute expiry,
missing/invalid deadlines, clock skew/failure, fixed acquisition/cleanup/report
rules and exact policy scope. Installed 0.1.4 modes pass, so correction is unnecessary. Optional two-file mode correction is separately
host-tested/prepared; it has not run. See the [build guide](../../docs/build.md)
and [current procedure](../../docs/device-tests/current-plan.md); no local result
is a physical HDMI or restoration claim.
