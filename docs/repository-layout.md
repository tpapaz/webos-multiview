# Repository layout and retention

[Status](../STATUS.md) · [Prototype](../native/phase2-hdmi-candidate-0.1.12/README.md) · [Build guide](build.md)

## Current production and acceptance code

| Location | Role |
|---|---|
| native/phase2-hdmi-candidate-0.1.12 | Working app entry/manifest, lifecycle/picture contract and compact schema2 trace. |
| native/phase2-hdmi-dispatch | Production SDL/LS2 adapter, callback mailbox, parent-death witness and report writer; CMake owns host acceptance. |
| native/phase2-context-dispatch/dispatcher.h | Production bounded GLib context worker. |
| native/phase2-hdmi-picture | Shared session/strict clock core imported by the working app; older app entry/patch/build wrappers retired. |
| native/phase2-hdmi-window/policy | Exact own-app/four-method policy payloads. |
| scripts/physical-candidate-* and run-physical-candidate.cjs | Current report/witness, evidence gate, local pins, preflight and runner. |
| Shared hdmi-picture*, tv-launch-authority, entry-exit-evidence and UTP modules | Real controller/IO, authority and sanitized evidence rules. Some names/constants retain the as-built ancestry; current action uses the exclusive0.1.12 bindings. |
| tests/host/physical* and current native adapter/core tests | Business/acceptance rules for bounded current behavior, not historical diagnostic coverage. |
| native/phase1*, native/probe, apps | Optional local-media/passive controls and shared icon. They are not alternate HDMI implementations. |

Older-looking shared paths are real current imports. Do not remove/rename them
without updating and validating the current artifact contract. The deployed
native source closure and51 build/package-pinned files remain byte-for-byte
unchanged by milestone consolidation; current package/build receipts stay exact.
A few as-built one-shot recipes and pre-package CLI fixtures remain pinned
provenance. They are excluded from the normal current acceptance command.

Standalone0.1.4–0.1.11 app entries, setup/entry/admission diagnostics, old launchers,
mode-repair commands and synthetic IWC/lifecycle harnesses were removed. Shared
session files, narrow policy and the current controller remain. Retired source
is not maintained as fallback runtime code. Private before-cleanup snapshots
allow local rollback without carrying those implementations in the repository.

## Documentation ownership

Status is a short handoff; ROADMAP owns gates. docs/research/c1-hdmi-interface-map.md
owns current technical conclusions and second-path gaps. The journal owns actual
TV results; current-plan owns authorization/disposition and bounds. Contracts own
software interfaces. Detailed dated development lives in the two first-picture
archives, not repeated across the active documents.

## Private evidence and cleanup

Keep the working0.1.12 IPK, final ELF, immutable package/build/ABI records, original
reports/private authority, firmware/providers and frozen as-used source/helper
snapshots under ignored build/dist. No credentials, raw vendor logs or identifiers
belong in Git. The owner removed11 older IPKs; do not recreate them. They are not
required for current work; exact old-package reinstall is unavailable.

Retire unused source only after checking imports and meaningful acceptance tests.
Never purge build/dist wholesale: current tooling and unreproducible evidence
live there. Rebuildable object/cache files differ from reports and private input
providers. Keep the extracted SDK/Node/npm dependencies; do not redownload them.
Only remove task-owned temporary profiles/servers, never normal user resources.

Milestone cleanup inventory, before snapshots and deletion manifest:
build/milestone-consolidation-20261115-001/. Its checks are offline; no TV action,
IPK build, commit or push. [Git exclusions](../.gitignore) keep those local outputs
and all private data out of the pending change set.
