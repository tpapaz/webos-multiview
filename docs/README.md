# Documentation index

**[Current status and next task](../STATUS.md) is the starting point.**
This index separates current instructions, observed results and research history.
Read only the records needed for the selected task; there is no need to reread
the whole research trail before continuing.

## Current instructions and specification

| Document | Purpose |
|---|---|
| [Status](../STATUS.md) | What works, what does not, and the single next task. |
| [Handoff](handoff/hdmi-next-chat.md) | Concise continuation instructions and workspace pointers. |
| [Roadmap](../ROADMAP.md) | Product phases and acceptance gates. |
| [Current plan](device-tests/current-plan.md) | UTP acquisition/window candidate, remaining readiness limits and future single/dual HDMI acceptance gates. No TV execution authorized. |
| [Remaining IWC gates](research/c1-iwc-gates-after-lifecycle.md) | Retained recovery analysis for the paused stock-window route. |
| [Contributor rules](../AGENTS.md) / [safety](safety.md) | Workflow, scope and device restrictions. |
| [Build guide](build.md) | Existing local SDK and build/package procedures; commands are not authorization to run a device test. |

## Device tests: two active files

- [Compact C1 journal](device-tests/c1-journal.md): actual Phase 0/1, admission,
  root-read and native normal/EOF outcomes, cleanup/owner context and report hashes.
- [Current test plan](device-tests/current-plan.md): the single proposed next
  experiment and its readiness, limits and pass criteria. No TV run is authorized.

The journal links to all eight detailed originals under `device-tests/archive/`.
Those retain old commands, diagnosis and every embedded report/artifact hash;
they are historical references, not extra current plans. Raw reports are unchanged.

## Implemented research tools

| Tool contract/source | Scope and execution status |
|---|---|
| [Admission runner](../native/phase2-admission/README.md) | Built/packaged/ABI-checked; app 0.1.2 TV-tested and denied. No app relaunch is queued. |
| [Single-HDMI window candidate](../native/phase2-hdmi-window/README.md) | Own exported window bound at UTP open; one fixed HDMI-4 picture attempt. ARM-built, focused host tests and direct executable ABI check; not packaged or TV-tested. |
| [IWC diagnostic collector](research/c1-iwc-diagnostic-collector.md) | Fixed root listing; TV-tested in reads 001/002. Exports counts only. |
| [Local recovery model](research/c1-iwc-local-recovery-model.md) | Deterministic simulated arming/failure rules; no device adapter. |
| [Local process harness](research/c1-iwc-local-process-harness.md) | Thirteen Linux fake-process scenarios; host-only evidence. |
| [Native helper](../native/phase2-lifecycle/README.md) / [controller](research/c1-native-lifecycle-controller.md) | Built/ABI-checked; normal/EOF C1 cases passed; 47 controller simulations. Real IWC workers are not implemented. |

## Research and decision history

These retain provenance, static addresses, hashes and earlier hypotheses. They
are supporting records, not parallel task lists. Earlier “not built/tested”
statements describe that stage; follow later device evidence and current Status.

| Topic | Records |
|---|---|
| Physical HDMI path and prior art | [Interface map](research/c1-hdmi-interface-map.md), [prior art](research/prior-art.md), [pinned sources](research/source-lock.json) |
| IWC caller and recovery contract | [Ownership trace](research/c1-iwc-ownership-recovery.md), [admission/reset plan](research/c1-iwc-admission-reset-plan.md), [permitted caller](research/c1-iwc-permitted-caller.md) |
| Baseline and lifetime reasoning | [Target/baseline review](research/c1-hdmi-target-baseline-recovery-review.md), [supervisor design](research/c1-iwc-supervisor-design-review.md) |
| Local-video resource routing | [SMP/NDL main/sub analysis](research/c1-smp-ndl-resource-path.md) |
| Closed idle research | [Native screensaver interface](research/c1-native-screensaver-interface.md), [app idle path](research/c1-app-idle-path.md) |
| Decisions | [Probe first](decisions/0001-probe-first.md), [main/sub validation](decisions/0002-main-sub-validation.md), [close idle/resume HDMI](decisions/0003-close-idle-work-resume-hdmi.md) |
| Chronological consolidation archive | [Original long handoff through 2026-11-12](handoff/hdmi-history-2026-11-12.md) |

## Local evidence storage

`build/` and `dist/` are retained local artifacts, not a second current-status
source. Original machine reports are immutable; owner observations are separate.
Research records name their exact files and hashes. Proprietary saved firmware,
credentials, profile/network identifiers and raw target IDs must not be published.
Do not retrieve TV files again merely to reread evidence already saved locally.

Maintain one task in Status, append concise TV results to the C1 journal and
update the current plan when the next test changes. Do not create a new Markdown
file for every run or repeat protocol/background in each result. Keep exact
machine reports immutable, with separate owner observations. Archive exceptional
investigation detail only when needed. Keep chronology out of the roadmap/handoff.

## Consolidation check — 2026-11-12

Status/roadmap/handoff were separated from history. Eight device-test documents
were then archived and replaced by one compact journal and one current plan;
incoming and archived relative links were updated. Original Markdown backups
and a report/artifact hash baseline are retained locally in
`build/docs-test-journal-merge-20261112/`. Archive hash text and original report/
artifact bytes were verified unchanged; Markdown links and `git diff --check`
passed. Documentation only: no code tests/builds or TV operations, no commit/push.
Active test prose fell from 1,969 to 188 lines (about 90% less); all 166 original
report/artifact hashes and every embedded hash in the archived detail were retained.
