# Documentation index

Start with [Status](../STATUS.md) for the C1 results, parked routes and
reopening conditions. The [roadmap](../ROADMAP.md) defines the milestones.
Before preparing an experiment, read the [device plan](device-tests/current-plan.md),
[contributor rules](../AGENTS.md), [safety rules](safety.md),
[scope decision](decisions/0003-close-idle-work-resume-hdmi.md) and
[build guide](build.md).

| Document | Purpose |
|---|---|
| [Research history](research/c1-hdmi-evidence-ledger.md#research-history) | What each route tried and why it progressed or stopped. |
| [Firmware map](research/c1-hdmi-interface-map.md) | Static and offline evidence for receiver allocation, HDMI ownership, secondary routing and built-in tuner playback. |
| [Device journal](device-tests/c1-journal.md) | Observed TV behavior, restoration and receipt hashes. |
| [Build guide](build.md) | Host checks, native builds and local packages. |

## Repository layout

| Area | Entry points |
|---|---|
| Native HDMI 4 control | [0.1.12 contract](../native/phase2-hdmi-candidate-0.1.12/README.md), shared session in `native/phase2-hdmi-picture`, SDL/LS2 adapter in `native/phase2-hdmi-dispatch`, bounded dispatch in `native/phase2-context-dispatch` and the [four-method UTP policy](../native/phase2-hdmi-window/policy/README.md). |
| Browser probes | [Single HDMI preview](../apps/phase2-hdmi-preview/preview.js) and [HDMI pair and tuner probe](../apps/phase2-hdmi-pair/pair.js). [Packaging and tests](build.md#browser-hdmi-preview) |
| Native research probes | [HDMI 1 ownership core](../native/phase2-media-registration/ownership.cpp) and [HDMI 4 plus silent clip probe](../native/phase2-hdmi-clip/main.cpp). [Ownership build](build.md#hdmi-1-ownership-probe-core) · [Clip build](build.md#hdmi-4-and-silent-clip-probe) |
| Host tools | `scripts/physical-candidate-*` and `scripts/run-physical-candidate.cjs` own the report, evidence checks and runner. [Bounded monitor](../scripts/monitor-stock-hdmi1.cjs) · [Receiver decoder](../scripts/hdmi-receiver-decoder.cjs) · [Host checks](build.md#offline-host-checks) |
| Passive and local-media controls | `native/probe`, `native/phase1*`, `apps/probe-ui` and `apps/phase1-browser` contain controls and shared assets. [Local playback evidence](research/c1-smp-ndl-resource-path.md) |

## Keeping the record current

Put TV observations and receipt hashes in the journal and offline findings in
the firmware map. Compare private IDs only within one continuously observed
run. Update the history row when a route starts, pauses, resumes or closes.
Update Status when the current result, installed artifact or reopening
condition changes. Keep procedures in the device plan and milestone changes
in the roadmap.

## Technical references

- [Receiver decoder](research/c1-receiver-decoder.md) covers offline input, redaction, acceptance tests and the completed monitor procedure.
- [Parked HDMI 1 + HDMI 2 design](device-tests/archive/c1-dual-hdmi-design.md) preserves the first-scaler checker and proposed two-input procedure.
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

## Local evidence and retention

Keep tested IPKs under ignored `dist/` and original reports, hashes, firmware,
provider libraries and frozen inputs under ignored `build/`. The saved DVB
runner also lives there with its inputs and receipts. Git carries the
redacted findings, source and host checks. [DVB receipts](research/c1-hdmi-interface-map.md#dvb-attachment-candidates) · [Publication rules](safety.md#public-repository)

Before retiring source, check imports, package inputs and acceptance tests.
Saved collector verifiers still reference their original paths. Preserve
current packages, pinned dependencies and original receipts when removing
superseded scratch outputs. Earlier source snapshots and cleanup manifests
are in `build/milestone-consolidation-20261115-001/` and
`build/repo-consolidation-20261117-001/`.
