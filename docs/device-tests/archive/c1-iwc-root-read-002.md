# C1 fixed IWC root diagnostic — run 002

> **Archived detail; no test is authorized here.** [Compact C1 journal](../c1-journal.md) · [Current test plan](../current-plan.md). Original stage-by-stage findings, commands and hashes are retained below; old next steps are historical.

2026-11-12. Reference LG OLED C1, firmware 03.53.45 / SDK 6.5.3.
The owner manually selected a live HDMI input, confirmed a stable picture and
explicitly authorized one further fixed collector execution. The app was to
remain closed; permission edits and geometry/crop experiments were prohibited.

**Verified/device: privileged diagnostic listing passed with one publication
and one HDMI-app candidate.** All eight binary/policy pins and executable mode
matched. The collector validated the successful reply, including publication
field types, ID uniqueness and positive integral dimensions. Utility exit was
0 without a signal; both exit and channel-close events confirmed cleanup.
Connection/preflight/execution time reported by the collector was 449 ms.

Exact host command, run once from repository PowerShell:

```powershell
node scripts/collect-iwc-diagnostic.cjs --run-readonly build/phase-2/iwc-root-read-002/report.json
```

It exited 0 with `read_admission_passed`. No retry, app launch, permission edit,
input switching, publication mutation, geometry or crop request occurred.
TV-visible HDMI context is owner-confirmed before the read; continuity after
the read was not independently observed. Specific HDMI port, uncropped normal
full view, active crop/priority and current destination remain unknown.

Ignored local evidence:

- `build/phase-2/iwc-root-read-002/report.json`, SHA-256
  `3e46d5953b2aa0928581e3f1ebb6261c5d6ffd93c43dbe930309389d44e2e695`.
- `owner-context.json` alongside it retains the owner's pre-read observation
  and execution restrictions, separately from machine-observed report fields.

No raw reply, live publication/window ID or exact dimensions were exported.
The report contains only counts and validated status/exit/hash evidence. An ID
would have to be freshly resolved in memory by any later authorized controller;
this report is not a saved target handle or geometry snapshot.

Compared with root read 001's empty list (visible input state unrecorded), this
run establishes a single eligible HDMI-app publication while the owner had
selected live HDMI. It does not prove why the earlier list was empty, ordinary
app admission, setter permission/application, full-view restoration, independent
receivers or simultaneous HDMI 1 + 2.

Next review the candidate target and normal-view/recovery preconditions using
the [admission/reset contract](../../research/c1-iwc-admission-reset-plan.md).
No active experiment is ready or authorized by this result. Preserve both
root-read reports and the separate normal-app run 002 policy denial.

Verification: successful collector status, full saved report and SHA-256 were
reviewed; `git diff --check` passed. No code/build/package changed, so local
unit tests and builds were not repeated for this documentation-only record.

Later owner clarification: selected port was HDMI 4; the owner reported normal
view, motion and sound after the read in response to the baseline question.
This observation is saved separately as `baseline-owner-confirmation.json`.
It supplements the earlier unknown context without changing the original report.
Publisher/port agreement and numerical logical dimensions remain unverified by
the exported machine report. See the
[read-only gate review](../../research/c1-hdmi-target-baseline-recovery-review.md).
