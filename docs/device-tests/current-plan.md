# Current C1 setup diagnostic review

[Status](../../STATUS.md) · [Journal](c1-journal.md) · [Diagnostic contract](../../native/phase2-setup-diagnostic/README.md)

## Objective and authorization

One physical HDMI picture in our own window, then independently live HDMI 1 +
HDMI 2. Direct UTP remains the acquisition/window research path. Glasshouse's
HTML HDMI source remains a complementary reference; no browser replacement.

The owner-authorized one-shot 0.1.8 setup-only run and collection are complete.
Installed 0.1.8 was machine-verified before submission and remained hash-bound
afterward. There is no authority for another connection, retrieval, launch,
HDMI operation, permission/mode/clock change, boot, service restart or retry.
Preserve all packages, reports, native sources and private launch authority.

## Current result and single next task

Both exact setup aliases contain identical valid traces: LSRegisterPubPriv
returned false. Display/request/window all 1920x1080; renderer, geometry, export
creation/ID/binding and focus passed. Context creation passed; later LS2 name,
attachment/disconnect and final window-ID checks were not reached. Cleanup calls
returned; exit intent 1. The rejection reason and actual exit code/signal remain
unknown. The bounded log gate was size_cap; do not broaden retrieval.
[Actual outcome and evidence pins](c1-journal.md#018-setup-only-diagnostic--named-ls2-registration-failed).

Offline identity review is complete. Saved SDL/helper startup attempts the same
app-name registration before our explicit call, providing a candidate collision
mechanism. The smallest reviewed patch moves our own named registration/name/
attachment/disconnect checks before graphics. It passed controlled host replay,
ARM build and direct ABI in an isolated copy; original sources/IPKs are unchanged.
[Evidence and limits](../research/c1-hdmi-interface-map.md#registration-identity-and-smallest-correction).

Single next task: prepare a fresh setup-only diagnostic with this startup order
and closed sanitized registration-error categories, then validate it locally.
The actual 0.1.8 rejection code was not recorded; no confirmed cause or new TV
authorization follows from the offline review. A successful generated-file check
does not prove live bus registration. No permission-map change is proposed.

Do not alter geometry based on the superseded mismatch hypothesis: this trace
matched 1920x1080. Do not weaken either strict three-second guard. A returned
registration failure with cleanup/exit intent is not proof of a crash; earlier
0.1.7 substage and original 0.1.4 cause remain unknown. No HDMI result/release proof.

## Completed bounded procedure and reusable limits

The dedicated scripts/run-setup-diagnostic.cjs was locally validated before use;
--plan remains a local artifact check. Its live flags are not a repeat grant.
The consumed run used one fresh TV-derived authority and one normal SAM attempt.

- Connection A: maximum 30 seconds; exact executable/appinfo hashes, modes and
  owners, generated pub/prv roles/public client/versioned manifest, saved stock
  utility hash, own-process absence and both fresh setup slots. No UTP permission
  query or acquisition. One submission, then close; no refresh/retry on uncertainty.
- With transport closed, wait until dispatch +27 seconds. Connection B: maximum
  30 seconds; exact two setup aliases and parent metadata, 2 KiB/report, own-app
  process state, executable/appinfo hashes/metadata and existing bounded own-app
  log projection (at most 64 KiB delta). No prior/rotated/recursive log search.
- Preserve sanitized outcomes including failure. Distinguish absent, empty,
  invalid, partial, valid, unreadable and conflicting traces. Mode mismatches
  cannot hide report findings or trigger repair. A report/process absence/reopened
  log path cannot establish actual wait status or hardware release.

Observed connections closed after 4.593 and 3.486 seconds; B opened dispatch
+27.014 seconds. Both strict native guards accepted; no UTP path. The owner saw
LG Home while watching channels, then confirmed picture/sound/remote usable.
No further TV test is queued. Existing inert/physical runners have different
version/report/timing contracts and must not substitute for this setup runner.

## Restoration and stop rules

Any future active test requires its own explicit owner scope, remote/restoration
access and independent timer. Native cleanup may affect only resources owned by
that attempt; no guessed session IDs or automatic input switching. Cancellation,
transport uncertainty and missing termination evidence stop progression without
retry. No routine power/restart/permission/mode repair. The owner may return to
normal channels through normal TV controls; this is not another experiment.
