# C1 fixed IWC root diagnostic — run 001

> **Archived detail; no test is authorized here.** [Compact C1 journal](../c1-journal.md) · [Current test plan](../current-plan.md). Original stage-by-stage findings, commands and hashes are retained below; old next steps are historical.

2026-11-12. Reference LG OLED C1, firmware 03.53.45 / SDK 6.5.3.
Owner explicitly authorized one execution of the fixed collector, leaving the
app closed and prohibiting permission, geometry and crop changes.

## Result

**Verified/device: root diagnostic IWC read admission passed.** The collector
verified all eight saved binary/policy pins and the executable mode, submitted
one fixed listing command, parsed a valid successful listing reply, and received
both exit and channel-close evidence. Utility exit code was 0, with no signal;
cleanup was confirmed. Total reported connection/preflight/execution time was
401 ms. No retry or second collector invocation occurred.

The list contained **zero publications** and **zero HDMI-app candidates**.
Selected input and visible TV state were not independently recorded. Do not
interpret the empty list as absence of HDMI receivers or lack of IWC support.
No normal-view target or baseline was established.

Report: ignored `build/phase-2/iwc-root-read-001/report.json`, SHA-256
`b402a29bf3f25d815e0f96d8399cd0b2202fdd2e2e71ff08f523131da44c86bf`.
The report retains fixed status, execution context, exact verified hashes,
counts and exit/cleanup evidence. It contains no raw IWC response or live IDs.
Earlier app run 002 evidence remains unchanged.

## Exact authorized operation

Repository PowerShell:

```powershell
node scripts/collect-iwc-diagnostic.cjs --run-readonly build/phase-2/iwc-root-read-001/report.json
```

Exit 0; console category `read_admission_passed`. Its one fixed remote command
uses the actual stock `/usr/bin/luna-send`, default utility identity, `-n 1`,
`-w 2000`, the IWC `listPublishedWindows` URI and `{"subscribe":false}`.
See the [collector contract](../../research/c1-iwc-diagnostic-collector.md) for
pins, bounds and failure criteria. IWC dynamic activation was possible, but
provider process start was not separately measured.

No app launch, installation, permission edit, publication mutation, input
switching, geometry or crop request occurred. The report was written on the
host only. Utility exit evidence does not claim that a dynamically activated
IWC provider exited; the collector owns only its utility invocation.

## Limits and next gate

This verifies the existing privileged diagnostic route only. The normal app's
run 002 policy denial is unchanged. Setter admission/application, full-view
restoration, separate helper permissions and simultaneous HDMI remain unknown.
No app build or package changed, so host unit tests/builds were not repeated;
the report and existing source were reviewed and `git diff --check` passed.

Next establish the owner's visible input state and plan any separately
authorized repeat read while the owner has deliberately selected a live HDMI
input. No automatic input selection or further read is authorized by this
record. Even a nonempty list would require target/baseline review before any
geometry experiment.
