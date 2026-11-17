# C1 current research procedure

[Status](../../STATUS.md) · [Actual outcomes](c1-journal.md) · [Prototype contract](../../native/phase2-hdmi-candidate-0.1.12/README.md)

## Current read-only research procedure

The single next task is the fixed capability-file collection below, **ready but
not run**. Prefer saved evidence. The owner grants [standing bounded read-only
research permission](../safety.md#standing-read-only-permission), superseding old
per-file approval wording. Keep the TV operational and preserve critical files.
This repository cleanup is offline and does not dispatch the collection.

All completed collections are closed and immutable; use the [evidence ledger](../research/c1-hdmi-evidence-ledger.md)
and [journal](c1-journal.md) for earlier scope, actual outcomes and original hashes.
Do not repeat setup, activation, clock/mode repair or completed collection as
preflight. No active HDMI/app trial is currently prepared. The milestone remains
one moving HDMI-4 picture with sound; independent HDMI1+HDMI2 is unproven.

### Prepared capability-file read — offline only

**Implemented and offline-validated; not TV-run:** one exact regular inert file,
/etc/palm/val/device-cap.json. The saved loader builds this path at ELF0x15866–0x15886;
remote presence/type/content and the running process's loaded configuration are
unknown. Purpose: resolve advertised plane names and their ordinal MAIN/SUB0
mapping for the saved C1 provider. A plane listing cannot prove HDMI ingress.

| Item | Fixed request |
|---|---|
| Path/ancestors | Only /etc/palm/val/device-cap.json; lstat /etc, /etc/palm, /etc/palm/val as directories. Reject all links/special files; no directory scan, realpath expansion or alternate path. |
| Transport | Existing configured endpoint and saved immutable TOFU pin/endpoint binding; one SSH connection, one SFTP subsystem, one read-only open, zero retries. TOFU is not independently verified. No remote exec. |
| Bytes/reads | File and retained raw bytes1..65,536;64 KiB buffer; at most two reads including EOF. One extra EOF/growth probe byte may be observed (at most65,537 bytes total), never retained or accepted; any growth stops. Fragmentation requiring a third call stops without widening the bound. |
| Metadata | At most15 metadata calls: three ancestor lstats, leaf lstat; repeat ancestors/leaf before open; fstat+leaf lstat after open; fstat+leaf lstat+three ancestor lstats after reading. Compare mode/type/uid/gid/size/mtime; no SFTP inode or atomic-snapshot claim. |
| Time/closure |30-second outer,27-second work cutoff;3-second connect/operation limits clipped to remaining time. Start timers before lazy profile/key/transport construction. At most3 seconds shared remaining cleanup; close handle once, end SFTP/SSH and confirm closure. Cancellation, late callbacks or uncertainty cannot resume/retry. |
| Private output | Fresh exclusive build/phase-2/hdmi-val-capability-evidence-YYYYMMDD-NNN; owner-only ACLs; device-cap.json plus inventory.json. Preserve partial bytes/receipt and hashes; never overwrite occupied slots or print raw config/private identifiers. |

Validate complete, closed local bytes as strict UTF-8 JSON with object root.
Treat optional planes explicitly: preserve original array order/duplicates, then
model unique byte-sorted names separately only for an unambiguous array of
nonempty ASCII strings without NUL. Unsupported/ambiguous content stops mapping
interpretation and remains private raw evidence; do not silently repair it.
A missing key is consistent with default MAIN, while an empty accepted array
clears the saved provider's default. Neither proves currently loaded state.
Associate only the first at most two derived sink ordinals with software
planeIDs44/45 and nodes0/1; report extra ordinals and actual MAIN/SUB0 presence.
No receiver/scaler grant, active routing, release or dual-HDMI claim follows.

Stop on missing/denied/unexpected path, link/type/size/metadata change, key/endpoint
mismatch, timeout/cancellation, exceeded read/byte/metadata bounds or unconfirmed
closure. Record unavailable/partial outcome and close; no repair operation,
alternate file, retry, device/service access or TV change. JSON failure prevents
usable mapping even if raw capture completed. No vendor parser execution.

Immutable full request/provenance/acceptance matrix:
build/phase-2/hdmi-val-capability-request-20261117-001/request.json.
SHA256 68f0d2b231bb9a86890488e373f9e7a201f7bbdb996448deaa9924343e115001.
The request pins the saved VAL trace, loader literals and existing control/trust
chain. The reader reuses unchanged metadata/private-output/saved-pin helpers;
completed scopes and existing collectors remain unchanged.
Fixed reader/capture/CLI: scripts/collect-val-capability.cjs. Use the explicit
--allow-one-val-capability-evidence-read flag, --device plus the existing alias,
and a fresh build/phase-2/hdmi-val-capability-evidence-YYYYMMDD-NNN output slot.
No path or bound overrides. Default/refusal/--plan never import live transport or
read real profiles/keys. Explicit dispatch reuses the unchanged saved-TOFU endpoint
binding and private-output/metadata helpers; it does not create a new trust pin.

Offline acceptance passed87 cases with synthetic SSH/SFTP and injected clocks:
exact path/link/metadata changes, inclusive64 KiB/two-read/EOF/growth limits,
strict encoding/JSON/duplicate keys, missing/empty/unsupported/extra plane records,
deadlines/cancellation/late callbacks, shared cleanup budget, closure uncertainty,
occupied output and native Windows owner-only raw/receipt ACLs. Tests block real
transport imports and profile/key reads. The reader retains at most64 KiB payload
for local interpretation alongside its64 KiB read buffer; raw bytes remain exact.
A retrieved result establishes raw capture only: inspect interpretation.status
separately. Malformed content keeps its private hash/bytes and no derived mapping.
Active-loaded configuration and dual HDMI always remain unknown.

Lint, offline --plan, syntax/diff and preservation checks passed. No TV connection,
retrieval, native build/package, existing collector/helper/guard or0.1.12 change.
No new journal outcome. Request as-prepared status remains immutable; readiness
is recorded here. Preparation/checks/audit:
build/phase-2/hdmi-val-capability-preparation-20261117-001/verification.json.

## Active experiments and restoration

### Restoration and stop rules

Acquisition, app install/launch, permission/policy changes, service restarts and
power actions are outside passive permission. Any future active proposal must
retain the [0.1.12 contract](../../native/phase2-hdmi-candidate-0.1.12/README.md):
both strict three-second guards, issue+17-second progression, one-second focus,
32-event bound, native22-second immediate-exit alarm,100 ms worker sub-bounds,
issue+25-second witness, two30-second connection caps and dispatch+27-second
collection; app report cap2 KiB, witness256 bytes. These are preserved constraints,
not a queued launch or authorization to replay an old runner.

Keep normal PowerShell attached through any separately authorized launch and
collection; deliver the submission cue promptly. Use fresh exclusive slots,
current artifact/boot/admission checks, only owned returned IDs for cleanup and
explicit post-run restoration. Missing/conflicting/partial evidence or impaired
picture/sound/remote stops progression. No automatic retry, extra/late retrieval,
deadline widening, service restart or power action. Collection must never postpone
normal remote/Home restoration. Acknowledged stop/close, cache clearing and
process absence do not prove hardware release.

## Preservation disposition

Preserve working0.1.12 source/IPK/ELF, installed-policy disposition, original raw
reports, private authority, firmware/kernel/providers, immutable receipts and
frozen as-used sources. The owner deleted11 old IPKs; do not recreate them.
[Retention rules](../repository-layout.md) distinguish rebuildable caches from
unreproducible evidence and current toolchain inputs. No TV connection, native
build/package, commit or push is part of this cleanup.
