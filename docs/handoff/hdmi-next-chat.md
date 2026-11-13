# Continue webOS MultiView

Updated 2026-11-13. Workspace: `D:\Development\webos-multiview`.

1. Read [Status](../../STATUS.md) for the single next task and execution boundary.
2. Read [contributor rules](../../AGENTS.md) and [safety](../safety.md).
3. For the next experiment, use the [current plan](../device-tests/current-plan.md),
   [candidate contract](../../native/phase2-hdmi-window/README.md) and
   [build guide](../build.md). Actual results belong in the [C1 journal](../device-tests/c1-journal.md).
4. Use the [HDMI evidence map](../research/c1-hdmi-interface-map.md) for a focused
   finding. Open the linked archived trace only when its exact proof is needed.

## Continuation boundary

The current package is the locally checked 0.1.3 candidate, not a TV-tested HDMI
implementation. Next is separately scoped installation/readback and admission-only
validation. Do not acquire HDMI or deploy permissions without the relevant owner
scope. The current plan owns admission, capture, timing and restoration details;
do not create another competing procedure here.

Do not resume IWC, generic supervision, screensaver/Glasshouse or Phase 1 repeat
campaigns. Preserve their source, tests, controls and original evidence. All
currently needed firmware is already saved; no retrieval is queued.

## Working conventions

Use PowerShell on Windows and the existing Ubuntu WSL SDK for Linux builds.
Exact SDK/Node paths and check commands are in the build guide. Work in the
existing uncommitted tree; never reset it, commit, push or invoke GitHub Actions.
No dev server is needed. Close only servers you start.

Keep `build/` and `dist/` private and preserve originals. Do not print credentials,
device/network identifiers, raw window/session IDs or unrestricted vendor logs.
Keep owner observations separate from immutable machine reports. Source/artifact
hashes and saved analysis live under `build/phase-2/`; public findings cite them.

Update Status when readiness or the next task changes; update the current plan
when the procedure changes. Append only actual authorized TV outcomes to the
journal. Keep chronology out of this handoff and the roadmap. End work with
relevant validation, remaining limits and a suggested commit message.

[Historical handoff](hdmi-history-2026-11-12.md) is retained for provenance, not
as a list of current tasks.
