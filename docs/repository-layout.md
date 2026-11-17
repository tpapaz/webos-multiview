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
| scripts/collect-hdmi-elements.cjs and hdmi-element-* | Fixed three-path read-only collector, private capture and lazy pinned transport; completed once, original scope preserved. Further passive research uses standing permission. |
| scripts/check-hdmi-host-key.cjs and hdmi-host-key-check.cjs | Separate bounded pre-auth TOFU observation; reuses private capture and lazy profile selection, no private-key read or TV grant. |
| scripts/collect-resource-client.cjs and resource-client-* | Fixed resource-client reader, private capture and saved-TOFU binding; validated and collected once. Standing permission applies to further useful passive research; fixed scope remains unchanged. |
| scripts/collect-videooutput.cjs and videooutput-* | Fixed descriptor-before-executable reader and private sequential capture; reuses the unchanged saved-TOFU transport. Offline-validated and collected once; preserve its completed scope. |
| scripts/collect-val-capability.cjs | Fixed capability-JSON reader/capture/CLI with strict offline interpretation and unchanged metadata/private-output/saved-pin helpers; one completed read with frozen provenance, not queued for replay. |
| scripts/collect-val-library.cjs | Fixed VAL-library reader/capture/CLI, reusing unchanged metadata, ELF-header, private-directory and saved-TOFU helpers. Offline-validated and collected once; preserve its completed scope. |
| Shared hdmi-picture*, tv-launch-authority, entry-exit-evidence and UTP modules | Real controller/IO, authority and sanitized evidence rules. Some names/constants retain the as-built ancestry; current action uses the exclusive0.1.12 bindings. |
| tests/host/physical* and current native adapter/core tests | Business/acceptance rules for bounded current behavior, not historical diagnostic coverage. |
| tests/host/hdmi-element-collector.test.cjs | Synthetic acceptance for read scope, bounds, failure/closure and offline/refusal paths; task-local private capture validation. |
| tests/host/hdmi-host-key-check.test.cjs | Synthetic host-key bounds/closure and local loopback SSH rejection before authentication; no TV/profile/key access. |
| tests/host/resource-client-collector.test.cjs | Single-file scope, bytes/links/metadata/deadlines/closure, offline/refusal paths, fake endpoint/pin binding and native private-output ACL acceptance. |
| tests/host/videooutput-collector.test.cjs | Two fixed zero-link paths, Name/Exec binding before executable open, aggregate bytes/reads, metadata/EOF/header, deadline/cancellation/closure and offline/private-output acceptance. |
| tests/host/val-capability-reader.test.cjs | Synthetic fixed-path/zero-link/byte/read/metadata/JSON/plane/deadline/cleanup acceptance, offline refusal and private Windows outputs. |
| tests/host/val-library-reader.test.cjs | Fixed single-candidate/two-link scope, mutation and byte/read/time bounds, EOF/header, cancellation/late callback/closure and offline/private-output acceptance. |
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
software interfaces. The [evidence ledger](research/c1-hdmi-evidence-ledger.md) indexes saved scopes,
trace receipts and corrected interpretations. Detailed earlier development lives
in the linked archives; completed procedures are not duplicated in Status or the
current plan.

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

Current consolidation audit and before-document snapshots:
build/repo-consolidation-20261117-001/. Runtime/prototype/collector code and all
original TV/firmware evidence remain unchanged. Only reviewed generated artifacts
and unused synthetic output may be removed; the private deletion manifest records
exact paths, hashes and reversible backups. Native source with old names remains
when current code, tests or immutable artifact bindings require it.
