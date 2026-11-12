# C1 native lifecycle normal control — run 001

> **Archived detail; no test is authorized here.** [Compact C1 journal](../c1-journal.md) · [Current test plan](../current-plan.md). Original stage-by-stage findings, commands and hashes are retained below; old next steps are historical.

2026-11-12. Reference LG OLED C1, firmware 03.53.45 / SDK 6.5.3.
Owner explicitly authorized staging and **one** normal-control execution,
keeping the app closed and prohibiting permission changes and geometry/crop
experiments. No retry or second case ran.

**Verified/device: root-shell native fake-worker normal control passed.**
The existing ARM helper was staged temporarily, executed and removed by the
[fixed controller](../../research/c1-native-lifecycle-controller.md). No IPK was
installed, app launched, LS2 call made or existing permission changed.

Exact command, run once from repository PowerShell:

```powershell
node scripts/run-native-lifecycle.cjs --stage-run-normal build/phase-2/lifecycle-c1-normal-001.json
```

CLI exit 0; controller status `normal_control_passed`; native status
`lifecycle_control_passed`. Local pinned artifact/ABI checks and the 32 simulated
controller scenarios passed immediately before the device run. Both SSH
connections and the controller's preflight succeeded; runtime hashes matched.

| Evidence | Result |
|---|---|
| Helper | 17,780 bytes; SHA-256 `375e17c98229221392a98fc11ffacadfb713dd50a09b1d425002af0dcb07bec0` |
| Readiness | Confirmed within the controller's 2-second limit |
| Separate supervisor session | Confirmed by helper report |
| Actor/worker started | Both true |
| Fixed fake reply | Validated; observed at 253 ms |
| Worker exit | Observed at 263 ms; worker reaped |
| Actor cleanup | Reaped; one helper TERM request, zero KILL requests |
| Helper elapsed | 284 ms |
| Launcher exit | Exit and channel close confirmed, code 0 |
| Final process verification | No helper processes remaining |
| Emergency host rescue | Not attempted |
| App executable | Absent before and after |
| Report capture | Saved durably on host before remote removal |
| Temporary stage | Removed, including its three known files and empty directory |
| Whole controller elapsed | 5,328 ms |
| IWC calls / hardware restoration | 0 / `not_tested` |

## Owner observations

After the run the owner said they had just reopened the TV and HDMI, then
confirmed **all picture, motion and sound normal now**. Viewing conditions
before/during this run and power/input timing were not established. Do not
retroactively turn this into a continuous-HDMI observation or a restoration
test. The normal-control machine result passes; before/during viewing remains
**unknown**.

## Evidence retained locally

- `build/phase-2/lifecycle-c1-normal-001.json`, SHA-256
  `1bcae74a7dee81bf8af005c3189f765c64e75ef21d073ff5f58c6806c249e053`.
- `build/phase-2/lifecycle-c1-normal-001-observations.json`: separate owner
  observations, restrictions and hashes of helper/controller/CLI/report.
- Controller SHA-256:
  `a851d60f9bcf97654357ab434fb570d750d817e42f3c7ad0ac0a7cf56d36fef2`.
- CLI SHA-256:
  `21b66aeaf88d42d4c565599e74aeb97665828ef020f0a6a7c9f5f1488c79579f`.

No raw process IDs/start times, profile/credentials, network identifiers or
publication IDs were exported. The redacted controller report retains its random
temporary path as evidence; that directory was removed. No `.pending` capture
file remained.

## Meaning and next step

**Verified:** this exact ARM helper loaded and completed normal fake-worker
lifecycle on this C1, with a separate session, child reap, confirmed launcher
exit and process/file cleanup without host rescue.

**Unknown:** actual control-channel-loss behavior, app/jailer/cgroup survival,
supervisor failure recovery, IWC setter admission/ordering, geometry restoration
and simultaneous HDMI. Normal completion does not prove any of those.

Next prepare/select one bounded control-channel-loss case using the same helper
and separate verification connection. The current live controller exposes only
normal control, so that case needs a focused local controller change/test and
owner direction before another device run. No geometry/crop test is ready or
authorized by this result.

Validation: saved full report, report SHA-256, local observation record and
`git diff --check` reviewed. Only evidence/docs changed in this task. Native
builds, ABI analysis and unrelated unit suites were not repeated; the pinned
artifact remained unchanged. No commit/push or dev server was used.

Later preparation: the shared controller now supports fixed control EOF and
passes 47 simulations plus the Linux helper's EOF acceptance case. Source
hashes above remain the original run-001 provenance; its report is unchanged.
No additional TV run occurred during preparation. Next is one explicitly
authorized control-loss TV run, as documented in the linked controller record.
