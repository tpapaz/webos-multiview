# Setup-only diagnostic 0.1.8

[Status](../../STATUS.md) · [Current plan](../../docs/device-tests/current-plan.md)

Built, host-tested, packaged and direct-ABI checked locally; installed bindings
machine-verified and actually TV-tested once on C1/03.53.45. No simulator run.
[Actual result](../../docs/device-tests/c1-journal.md#018-setup-only-diagnostic--named-ls2-registration-failed):
LSRegisterPubPriv returned false after dimensions/export/focus passed; cleanup
calls returned and exit intent 1 was recorded. Actual exit/rejection reason unknown.
This diagnostic can create/export a fullscreen window and register its own LS2
identity; a later run can affect visible focus. It has no UTP request interface
and exits after setup/cleanup. It is not a physical-picture candidate.

Both initial and second strict three-second guards reuse the unchanged production
parser/predicate and clock reads. The same TV-derived producer is required.
The requested 1920x1080 geometry and original export/focus checks are preserved.
An extra SDL_GetCurrentDisplayMode observation records the working controls’
display dimensions without adapting or relaxing the fixed geometry. Environment
and SDL hint return failures are observations, preserving the original ignored
return semantics. Alarm remains 22 seconds from entry, armed before clock reads.

Exclusive report: /tmp/io.github.tpapaz.multiview.hdmiwindow/setup-0.1.8.jsonl
and the exact /var/palm/jail/io.github.tpapaz.multiview.hdmiwindow alias. Same
owned 0700 parent, exclusive 0600 file, no link/overwrite, 2 KiB total limit.
Before each operation an entered row is fsynced; an outcome row follows its return.
A stopped/crashed/hung call can leave a partial trace with its pending stage;
that is not proof of the process exit cause. Initial parser/guard rejection or
reservation failure may still produce no file (exit intent 64/73 respectively).

Header binds schemaVersion=1/appId/appVersion/mode=setup_only. Numeric rows use
[stage,0 entered /1 returned_success /2 failed /3 observation_failed]. The closed
stage dictionary is in scripts/setup-diagnostic-report.cjs and enum setup.h.
Stage 90 records display/window dimensions, initial/final focus and a fixed
cancellation code (quit/key/focus_lost/hidden/minimized/close/signal/disconnect/
lease). -1 means unobserved. Requested dimensions are always 1920x1080.
Stage 99 records setup-ready/local-cleanup booleans; 100 is exit intent 0/1.
Void calls are marked returned_success only because they returned; that cannot
prove a hardware effect. No raw window/session IDs, argv, clock values or vendor
error strings are written. Actual exit and hardware release remain unknown.

Stages distinguish lease recheck, each environment/hint/init/window/renderer/
render operation, observed dimensions and match check, export creation/ID bound/
binding, focus wait/cancellation, context creation, registration/name/attachment/
disconnect setup, window-ID validation, and individual local cleanup calls.
No UTP open/select/stop/close or permission query is possible from this binary.

Package: dist/io.github.tpapaz.multiview.hdmiwindow_0.1.8_arm.ipk (20104 bytes). SHA-256:
4f86109067e360e8afdc7896cce68a7a9aa33d2f5370a0e26389bcdeea924618
ELF SHA-256: e76b10fb9a8c864750d8b2bf0fe18471ca7584d437bd4e35be32d63a03b10a4b

Local commands: scripts/prepare-setup-diagnostic.py via existing WSL SDK; CTest
1/1 with injected failure at each setup/cleanup stage; ARM/direct ABI (79 imports,
nine original DSOs); archive allowlist/content/modes; npm test/lint. Eight actual
C++ trace-writer fixtures passed JS decoding. The first archive verifier path
was corrected; final cleanup audit excluded empty export handles. Provisional
artifact/source and failed verification context are preserved in
build/phase-2/entry-diagnostic-0.1.8/pre-final-audit/. Final records are in
build/phase-2/entry-diagnostic-0.1.8/. The temporary Linux stage was unavailable
when final provenance was recorded; archive contents/modes were independently
verified against workspace sources/binary. No existing IPK/evidence was deleted.

The old 0.1.7 physical runner must not launch or collect this diagnostic. A later
explicitly authorized setup-only run needs exact 0.1.8 bindings and this JSONL
validator, fresh authority and bounded post-cap collection. No TV operation now.

Dedicated entry point scripts/run-setup-diagnostic.cjs is locally validated;
--plan is local-only. [Exact future scope](../../docs/device-tests/current-plan.md#completed-bounded-procedure-and-reusable-limits).
It uses this trace contract and omits UTP map queries. The single authorized TV
run is complete; slots are occupied evidence. No repeat is authorized.
