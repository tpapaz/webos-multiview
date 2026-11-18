# Documentation index

Read [Status](../STATUS.md) for today's task and the [research history](research/c1-hdmi-evidence-ledger.md#research-history) for the decisions that led to it.

| Document | Purpose |
|---|---|
| [Status](../STATUS.md) | Verified first-picture result, limits, current artifact and one next task. |
| [Roadmap](../ROADMAP.md) | Product phases and acceptance gates. |
| [Prototype contract](../native/phase2-hdmi-candidate-0.1.12/README.md) | Current actions, native/report/witness/runner contract and exact artifacts. |
| [Research map](research/c1-hdmi-interface-map.md) | Verified HDMI 4 result, secondary-route findings and open ownership questions. |
| [Evidence ledger](research/c1-hdmi-evidence-ledger.md) | Chronological path decisions, reasons for switching or pausing, and parked alternatives. |
| [Device journal](device-tests/c1-journal.md) | Actual lifecycle/physical outcomes and evidence hashes; concise earlier summary. |
| [Device disposition](device-tests/current-plan.md) | Spent ResourceManager lookup, completed scopes, review-only dual-source gates and active-trial stop rules. |
| [Build guide](build.md) | Offline checks, toolchain and current prototype build. |
| [Layout/retention](repository-layout.md) | Shared production code, optional controls and private evidence. |
| [Policy contract](../native/phase2-hdmi-window/policy/README.md) | Exact own-app/four-method grant, checker and saved-map semantics. |
| [Contributor rules](../AGENTS.md) / [safety](safety.md) | Standing owner permission for bounded read-only research, operational safety and privacy. |
| [Handoff](handoff/hdmi-next-chat.md) | Reading order and continuation conventions. |

## Keeping the record current

At the end of each task, update the record that owns its result. For a TV run, put observations and receipts in the journal. For an offline finding, put the evidence in the research map. When a route starts, pauses, resumes or closes, revise its history row with the reason and a link. Update Status in the same change whenever the current task, installed artifact or readiness changes. Revise the device procedure when the next test changes. Keep the roadmap for milestone or scope changes.

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
  setup controls, verified first picture and retained development records.
- [First-picture campaign](device-tests/archive/c1-first-picture-campaign-2026-11-15.md):
  detailed dated outcomes and original hashes for retired diagnostics.
- [Early HDMI findings](research/archive/c1-hdmi-investigation-2026-11-12.md)
  and [admission and cleanup findings](research/archive/c1-hdmi-admission-2026-11-14.md).
- [Passive HDMI collection, 15–17 November](device-tests/archive/c1-hdmi-collection-2026-11-15-to-17.md) preserves the full collection entries and hashes.
- [Earlier device records](device-tests/archive) preserve Phase0/1 and specific
  preparation/lifecycle observations. They are references, not an execution queue.

Full research notes, raw firmware and assembly, private reports, and
build receipts remain local under ignored build. Current IPK is under dist.
Do not publish credentials, raw identifiers or vendor logs; do not refetch saved
inputs. Superseded source is absent from the active tree; local cleanup snapshots
provide rollback without maintaining historical runtime implementations.
