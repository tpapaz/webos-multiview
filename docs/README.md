# Documentation index

Start with [Status](../STATUS.md). Current behavior has one owner; archived
outcomes do not authorize a new TV operation.

| Document | Purpose |
|---|---|
| [Status](../STATUS.md) | Verified first-picture result, limits, current artifact and one next task. |
| [Roadmap](../ROADMAP.md) | Product phases and acceptance gates. |
| [Prototype contract](../native/phase2-hdmi-candidate-0.1.12/README.md) | Current actions, native/report/witness/runner contract and exact artifacts. |
| [Research map](research/c1-hdmi-interface-map.md) | First picture; TVRM/LINK/VSC routing, VAL-to-VSC port/sink mapping, corrected kernel routing and remaining receiver/release ownership gaps. |
| [Evidence ledger](research/c1-hdmi-evidence-ledger.md) | Saved collection/trace index, corrected interpretations and remaining hardware gates. |
| [Device journal](device-tests/c1-journal.md) | Actual lifecycle/physical outcomes and evidence hashes; concise earlier summary. |
| [Device disposition](device-tests/current-plan.md) | One current capability-file procedure, standing permission, fixed bounds and active-trial stop rules. |
| [Build guide](build.md) | Offline checks, toolchain and current prototype build. |
| [Layout/retention](repository-layout.md) | Shared production code, optional controls and private evidence. |
| [Policy contract](../native/phase2-hdmi-window/policy/README.md) | Exact own-app/four-method grant, checker and saved-map semantics. |
| [Contributor rules](../AGENTS.md) / [safety](safety.md) | Standing owner permission for bounded read-only research, operational safety and privacy. |
| [Handoff](handoff/hdmi-next-chat.md) | Reading order and continuation conventions. |

## Technical references

- [Prior art/licensing](research/prior-art.md) and [pinned source lock](research/source-lock.json).
- [Browser architectures](research/webos-browser-architecture.md); Glasshouse's
  [HDMI source](research/c1-hdmi-interface-map.md#glasshouse-preview-source-and-owner-observation)
  is complementary, not a replacement native prototype or concurrency proof.
- [SMP/NDL presentation](research/c1-smp-ndl-resource-path.md).
- [Paused IWC route](research/c1-iwc-research.md): technical ownership/caller/reset
  limits, with obsolete collectors and synthetic harnesses retired.
- [Closed idle work](research/c1-native-screensaver-interface.md), [idle path](research/c1-app-idle-path.md).
- [Scope decisions](decisions/0003-close-idle-work-resume-hdmi.md),
  [main/sub decision](decisions/0002-main-sub-validation.md), [probe-first decision](decisions/0001-probe-first.md).

## Evidence archives

- [First-picture development](research/archive/c1-first-picture-development-2026-11-15.md):
  exact saved LS2/SDL/helper analysis, rejected hypotheses and development provenance.
- [First-picture campaign](device-tests/archive/c1-first-picture-campaign-2026-11-15.md):
  detailed dated outcomes and original hashes for retired diagnostics.
- [Acquisition/backend traces](research/archive/c1-hdmi-investigation-2026-11-12.md)
  and [admission/cleanup traces](research/archive/c1-hdmi-admission-2026-11-14.md).
- [Earlier device records](device-tests/archive) preserve Phase0/1 and specific
  preparation/lifecycle observations. They are references, not an execution queue.

Raw firmware/assembly, reports, private authority, frozen as-used snapshots and
ABI/build receipts remain local under ignored build. Current IPK is under dist.
Do not publish credentials, raw identifiers or vendor logs; do not refetch saved
inputs. Superseded source is absent from the active tree; local cleanup snapshots
provide rollback without maintaining historical runtime implementations.
