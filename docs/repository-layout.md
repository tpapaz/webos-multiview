# Repository layout and retention

[Status](../STATUS.md) · [Prototype](../native/phase2-hdmi-candidate-0.1.12/README.md) · [Build guide](build.md)

## Where to work

| Area | Entry points |
|---|---|
| Working pair | [Browser HDMI 4 + HDMI 1 probe](../apps/phase2-hdmi-pair/pair.js), [one-input preview](../apps/phase2-hdmi-preview/preview.js), [registration helper](../native/phase2-media-registration/main.cpp) and [pair plan](device-tests/current-plan.md#hdmi-4-and-hdmi-1). The helper currently reports only whether an ID exists. |
| Native HDMI 4 control | [0.1.12 contract](../native/phase2-hdmi-candidate-0.1.12/README.md), shared session in `native/phase2-hdmi-picture`, SDL/LS2 adapter in `native/phase2-hdmi-dispatch`, bounded context worker in `native/phase2-context-dispatch` and the [four-method UTP policy](../native/phase2-hdmi-window/policy/README.md). |
| Host tools | `scripts/physical-candidate-*` and `scripts/run-physical-candidate.cjs` own the report, evidence gates and runner. Shared picture, authority and UTP modules remain in `scripts/`. Business-rule checks are in `tests/host/`. [Build and validation](build.md#offline-host-checks) |
| Capture and replay | [Bounded monitor](../scripts/monitor-stock-hdmi1.cjs), [receiver decoder](../scripts/hdmi-receiver-decoder.cjs) and [input/output reference](research/c1-receiver-decoder.md#offline-receiver-decoder). The fixed HDMI element, host-key, resource-client, video-output and VAL tools also support saved evidence verification. [Collection records](device-tests/archive/c1-hdmi-collection-2026-11-15-to-17.md) |
| Other controls | `native/phase1*`, `native/probe`, `apps/phase1-browser` and `apps/probe-ui` contain local-media or passive controls and shared assets. [Local playback evidence](research/c1-smp-ndl-resource-path.md) |

Older-looking shared paths are real current imports. Do not remove/rename them
without updating and validating the current artifact contract. The deployed
native source closure and 51 build/package-pinned files remain byte-for-byte
unchanged by milestone consolidation; current package/build receipts stay exact.
A few as-built one-shot recipes and pre-package CLI fixtures remain pinned
provenance. They are excluded from the normal current acceptance command.

Standalone 0.1.4–0.1.11 app entries, setup/entry/admission diagnostics, old launchers,
mode-repair commands and synthetic IWC/lifecycle harnesses were removed. Shared
session files, narrow policy and the current controller remain. Retired source
is not maintained as fallback runtime code. Private before-cleanup snapshots
allow local rollback without carrying those implementations in the repository.

## Documentation ownership

The [documentation index](README.md) assigns each record its purpose and explains what to update after a task.

## Private evidence and cleanup

Keep the working 0.1.12 IPK, final ELF, immutable package/build/ABI records, original
reports/private authority, firmware/providers and frozen as-used source/helper
snapshots under ignored build/dist. No credentials, raw vendor logs or identifiers
belong in Git. The owner removed 11 older IPKs; do not recreate them. They are not
required for current work; exact old-package reinstall is unavailable.

Retire unused source only after checking imports and meaningful acceptance tests.
Never purge build/dist wholesale: current tooling and unreproducible evidence
live there. Rebuildable object/cache files differ from reports and private input
providers. Keep the extracted SDK/Node/npm dependencies; do not redownload them.
Only remove task-owned temporary profiles/servers, never normal user resources.

The archived 0.1.7 deadline bridge used a fixed version-specific CMake cache and output directory. Its source and prior validation remain in the private milestone snapshot and 0.1.7 build record. The current deadline checks run with the [host suite and native acceptance](build.md#offline-host-checks).

The earlier cleanup manifests are under ignored `build/milestone-consolidation-20261115-001/` and `build/repo-consolidation-20261117-001/`. Saved offline verifiers still refer to the collector sources at their original paths. [Git exclusions](../.gitignore)
