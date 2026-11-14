# Documentation index

Start with [Status](../STATUS.md). Each current fact/procedure has one owner.
Dated records preserve earlier evidence; their old blockers/next steps do not
override Status or authorize any TV operation.

## Current documents

| Document | Owns |
|---|---|
| [Status](../STATUS.md) | Latest verified state, limits and the single next task. |
| [Roadmap](../ROADMAP.md) | Product phases and acceptance criteria. |
| [Current test plan](device-tests/current-plan.md) | The one proposed HDMI-4 trial, timing, visual acceptance and stop/restoration rules. |
| [C1 journal](device-tests/c1-journal.md) | Compact actual TV outcomes, with links to original detailed evidence. |
| [HDMI candidate](../native/phase2-hdmi-window/README.md) | Fixed native acquisition/launch/report contract and canonical artifact hashes. |
| [Scoped policy](../native/phase2-hdmi-window/policy/README.md) | Own app/four-method policy, checker semantics and offline replay. |
| [HDMI evidence map](research/c1-hdmi-interface-map.md) | Consolidated technical findings and remaining unknowns. |
| [Build guide](build.md) | Existing local toolchain, reproducible checks and private-evidence prerequisites. |
| [Handoff](handoff/hdmi-next-chat.md) | Reading order and continuation conventions; no duplicate chronology. |
| [Contributor rules](../AGENTS.md) / [safety](safety.md) | Stable scope, privacy and device restrictions. |

## Retained research and controls

These are references, not scheduled work. Their record banners distinguish past
validation stages from current readiness. Preserve source, tests and artifacts.

| Topic | Sources |
|---|---|
| Browser architectures | [Six-project source review](research/webos-browser-architecture.md): own-surface/media techniques, no new physical-input path. Dated proposals only. |
| Prior art / licensing | [Audit](research/prior-art.md), [pinned source lock](research/source-lock.json). |
| Local media | [SMP/NDL routing](research/c1-smp-ndl-resource-path.md); actual main/sub results and limits are in the journal. |
| Earlier admission runner | [Contract](../native/phase2-admission/README.md); registration/query evidence, no IWC setter. |
| Lifecycle controls | [Native helper](../native/phase2-lifecycle/README.md), [controller](research/c1-native-lifecycle-controller.md); fake-worker controls, not HDMI recovery. |
| IWC read-only / recovery studies | [Collector](research/c1-iwc-diagnostic-collector.md), [local model](research/c1-iwc-local-recovery-model.md), [process harness](research/c1-iwc-local-process-harness.md), [supervisor review](research/c1-iwc-supervisor-design-review.md). |
| Paused stock-window route | [Remaining IWC gates](research/c1-iwc-gates-after-lifecycle.md), [ownership](research/c1-iwc-ownership-recovery.md), [admission/reset](research/c1-iwc-admission-reset-plan.md), [caller](research/c1-iwc-permitted-caller.md), [baseline review](research/c1-hdmi-target-baseline-recovery-review.md). These are not extra UTP trial prerequisites. |
| Closed idle work | [Native interface](research/c1-native-screensaver-interface.md), [idle path](research/c1-app-idle-path.md); effective inhibition remains unknown. |
| Decisions | [Probe first](decisions/0001-probe-first.md), [main/sub validation](decisions/0002-main-sub-validation.md), [close idle/resume HDMI](decisions/0003-close-idle-work-resume-hdmi.md). Dated decisions, not current execution queues. |

## Archives and private evidence

- [HDMI investigation through 2026-11-12](research/archive/c1-hdmi-investigation-2026-11-12.md): acquisition/backend traces and original provenance.
- [Admission/cleanup investigation through 2026-11-14](research/archive/c1-hdmi-admission-2026-11-14.md): exact hub branches, mode/boot findings and superseded hypotheses.
- [Detailed HDMI preparation outcomes](device-tests/archive/c1-hdmi-preparation-2026-11-14.md): the full retrieval, baseline, interrupted rollback, preservation and 0.1.4 verification/activation campaign.
- [Earlier device records](device-tests/archive): Phase 0/1, admission, IWC listing and lifecycle originals, linked from the compact journal.
- [Historical build guide](archive/build-reference-2026-11-12.md) and [old handoff](handoff/hdmi-history-2026-11-12.md): retained commands/context, not current instructions.

Ignored build/dist contain private firmware/assembly, raw reports, owner
observations, boot/launch bindings, ABI records and packages. They are not shipped
by a repository push. Public hashes identify local evidence; they do not make
those inputs available to a fresh clone. Do not refetch unnecessarily or publish
credentials, profiles/network identifiers, raw IDs or vendor logs.

The local documentation audit/snapshots are under
`build/docs-consolidation-20261114/`. Source/artifact/report integrity is checked
separately from Markdown links; a documentation cleanup is not a TV test.
