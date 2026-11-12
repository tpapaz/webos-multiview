# C1 native lifecycle control-channel loss — run 001

> **Archived detail; no test is authorized here.** [Compact C1 journal](../c1-journal.md) · [Current test plan](../current-plan.md). Original stage-by-stage findings, commands and hashes are retained below; old next steps are historical.

2026-11-12. Reference LG OLED C1, firmware 03.53.45 / SDK 6.5.3.
Owner explicitly authorized staging and **one** control-loss execution, keeping
the app closed and prohibiting permission changes and geometry/crop experiments.
No retry, second case or additional device probe ran.

**Verified/device: root-shell fake-worker control-EOF lifecycle passed.**
This followed [normal control 001](c1-lifecycle-normal-001.md), using the same
ARM helper and the locally validated
[fixed controller](../../research/c1-native-lifecycle-controller.md). No IPK was
installed, app launched, LS2 call made or existing permission changed.

Exact command, executed once from repository PowerShell:

```powershell
node scripts/run-native-lifecycle.cjs --stage-run-control-loss build/phase-2/lifecycle-c1-control-loss-001.json
```

CLI exit 0; controller status `control_loss_passed`; native status
`cancelled_cleanly`. All 47 simulated controller cases passed immediately before
execution. Controller/CLI/test/helper/prior-report hashes matched the saved
preparation record; the ARM ABI pin and fresh capture path were checked locally.
Both SSH connections and the on-device runtime/app/staging preflight passed.

| Evidence | Result |
|---|---|
| Helper | 17,780 bytes; SHA-256 `375e17c98229221392a98fc11ffacadfb713dd50a09b1d425002af0dcb07bec0` |
| Readiness and worker gate | Timely readiness, four ownership rows, consistent supervisor/child sessions |
| Injection | Helper stdin EOF once, 128 ms after host exec request |
| Host control lost | Observed by the TV-local supervisor |
| Separate supervisor session | Confirmed by native report |
| Actor and worker | Both started and reaped |
| Fake reply | Not validated; work was cancelled |
| Native cleanup | Confirmed; two child TERM requests, zero KILL requests |
| Helper elapsed | 108 ms from native entry |
| Launcher exit | Exit and channel close confirmed, code 0 |
| Final process scan | No helper processes remaining |
| Emergency host rescue | Not attempted |
| App executable | Absent before and after |
| Report capture | Saved durably on host before remote deletion |
| Temporary stage | Three known files and empty directory removed |
| Whole controller elapsed | 5,025 ms |
| IWC calls / hardware restoration | 0 / `not_tested` |

Host and native timings have different origins; do not subtract the native
108 ms duration from host EOF time. Worker reply/exit observation timestamps
are `-1`; actual worker reap is confirmed independently by the native report.

The injected event was **stdin EOF on the owned helper stream**. Neither SSH
transport was disconnected, the launcher was not killed, and no network/service
fault was injected. The separate verification connection collected the native
report and checked exit/absence. Its polling did not supply supervisor ticks or
rescue signals.

## Owner viewing observations

Before execution the owner replied “its normal” to the picture/motion/sound
question. After completion the owner explicitly confirmed **all normal now**.
These are before/after owner observations; continuous viewing during the short
run was not independently recorded. No input was switched by the controller.

## Evidence retained locally

- `build/phase-2/lifecycle-c1-control-loss-001.json`, SHA-256
  `718d53e62b4aea4b80fce5370c57e37f052281f1e8c671173902ff284cb000fe`.
- `build/phase-2/lifecycle-c1-control-loss-001-observations.json`: separate owner
  observations, scope and hashes of helper/controller/CLI/report.
- Controller SHA-256:
  `2ed127e089f1769e5a26df9d9e8f7bf7a92739c8512853714b9707cb53c0130a`.
- CLI SHA-256:
  `7a79ebbf3e2b5afc55bcc4f0dd74a5e8d4d221d8a87de58e0f3600d0531553a3`.

Original normal and local preparation reports are unchanged. No pending capture
file remained. Private PIDs/start times, SSH profile/credentials, network IDs and
publication IDs were not exported; the random temporary directory retained in
the host report was removed after capture and confirmed exits.

## Meaning and next step

**Verified:** on this C1, the detached root-shell supervisor observes owned
control-pipe EOF, cancels its fake work, reaps its actor/worker, saves its report
and exits normally without host rescue. Both planned normal/EOF controls now
have C1 evidence.

**Unknown:** whole-transport or launcher-loss survival on C1, app/jailer/cgroup
independence, supervisor failure recovery, IWC write admission and downstream
ordering, hardware geometry restoration and simultaneous HDMI. This process
test contains no real IWC worker and proves no picture recovery.

Next use these two passes to resolve the corresponding lifecycle gates in the
IWC arming/recovery record and identify the remaining target/reset-ordering
gate. No additional generic lifecycle implementation is required for the proven
normal/EOF scope. Any different fault or active media test needs its own bounded
scope and owner instruction; no geometry/crop experiment is authorized here.

Validation: saved report schema, SHA-256, exit/cleanup flags, owner record and
`git diff --check` passed. Only evidence/docs changed during this task. Native
builds, ABI analysis and unrelated suites were not repeated; no code/artifact
changed. No commit/push or dev server was used.
