# Documentation index

Start with [Status](../STATUS.md). Each current fact/procedure has one home;
dated records retain their original evidence and earlier conclusions.

## Current documents

| Document | Responsibility |
|---|---|
| [Status](../STATUS.md) | Readiness, verified results, remaining gates and the single next task. |
| [Roadmap](../ROADMAP.md) | Product phases and acceptance criteria. |
| [Current test plan](device-tests/current-plan.md) | Admission/rollback, first-picture capture, timing and owner restoration procedure. No device execution authorized. |
| [C1 journal](device-tests/c1-journal.md) | Actual TV outcomes only, with original report and detailed journal links. |
| [HDMI candidate](../native/phase2-hdmi-window/README.md) | Fixed native client/launch/report contract and exact current artifact hashes. |
| [Scoped policy](../native/phase2-hdmi-window/policy/README.md) | Four files, one app, four methods; static support and limits. Not deployed. |
| [HDMI evidence map](research/c1-hdmi-interface-map.md) | Concise current findings linked to exact archived traces. |
| [Build guide](build.md) | Current PowerShell/WSL toolchain and local checks. |
| [Handoff](handoff/hdmi-next-chat.md) | Reading order, workspace and maintenance conventions. |
| [Contributor rules](../AGENTS.md) / [safety](safety.md) | Scope, privacy and device restrictions. |

## Retained controls and research

These remain available for reference, not scheduled work. Preserve source,
tests, packages and original evidence. Phase 1 is partial; IWC is paused and
screensaver work is closed.

| Topic | Sources and status |
|---|---|
| Earlier admission app | [Contract](../native/phase2-admission/README.md); 0.1.2 registration/query TV-verified, target permission predicted false. No relaunch queued. |
| IWC read-only listing | [Collector](research/c1-iwc-diagnostic-collector.md); stock utility reads 001/002 TV-verified, counts only. |
| Lifecycle controls | [Native helper](../native/phase2-lifecycle/README.md), [controller](research/c1-native-lifecycle-controller.md); normal/EOF fake-worker TV cases passed, no real IWC/UTP adapter. |
| Host recovery models | [Arming model](research/c1-iwc-local-recovery-model.md), [process harness](research/c1-iwc-local-process-harness.md), [supervisor reasoning](research/c1-iwc-supervisor-design-review.md). |
| Stock-window limits | [Remaining gates](research/c1-iwc-gates-after-lifecycle.md), [ownership](research/c1-iwc-ownership-recovery.md), [admission/reset](research/c1-iwc-admission-reset-plan.md), [caller](research/c1-iwc-permitted-caller.md), [baseline](research/c1-hdmi-target-baseline-recovery-review.md). |
| Local video | [SMP/NDL routing](research/c1-smp-ndl-resource-path.md); actual playback/restoration limits are in the journal. |
| Closed idle research | [Native interface](research/c1-native-screensaver-interface.md), [app idle path](research/c1-app-idle-path.md); effective inhibition remains unknown. |
| Upstream and licensing | [Prior art](research/prior-art.md), [pinned sources](research/source-lock.json). |
| Decisions | [Probe first](decisions/0001-probe-first.md), [main/sub validation](decisions/0002-main-sub-validation.md), [close idle/resume HDMI](decisions/0003-close-idle-work-resume-hdmi.md). |

## Archives and evidence

- [HDMI investigation through 2026-11-12](research/archive/c1-hdmi-investigation-2026-11-12.md): complete static traces, hashes, provenance and superseded next steps.
- [Build/control reference through 2026-11-12](archive/build-reference-2026-11-12.md): historical build/setup/device commands, not an execution queue.
- [Device-test originals](device-tests/archive): eight detailed records linked from the compact journal.
- [Historical handoff](handoff/hdmi-history-2026-11-12.md): chronological context, not current instructions.

Ignored `build/` and `dist/` contain immutable local reports, saved firmware/assembly,
ABI records, owner observations and retained packages. Do not publish firmware,
credentials, profiles/network identifiers, raw target IDs or unrestricted vendor
logs. Do not retrieve files again merely to reread evidence already saved locally.

The 2026-11-13 consolidation snapshot/link/hash checks are retained locally in
`build/docs-consolidation-20261113/`. Archive link paths may be rebased; original
Markdown snapshots and all embedded hashes are preserved. Runtime source,
policy JSON, tests and packages are unchanged by this cleanup. Only npm test
entry points are reorganized: current portable HDMI checks are the default,
with the former suite under `test:controls`.
