# 0003 — Close idle investigation and resume HDMI discovery

Status: accepted by owner. Date: 2026-11-11.

## Decision

Close the screensaver work item for the current research scope. This is a
priority decision, **not a claim that inhibition is fixed**. Do not schedule
another idle retry, long endurance test, launcher investigation or new veto
IPK unless the owner explicitly reopens that scope.

Resume Phase 2 **read-only HDMI discovery**. Phase 1 remains partially
validated: audio focus, wider geometry, final-build repeatability and the
interrupted long-run recovery gate have not passed. Those gaps do not block
this owner-approved return to physical-input research; they remain visible
before any release claim. The defining objective is independently live
HDMI 1 + HDMI 2 on the TV's hardware, not a local/network playback product.

## Evidence retained

| Finding | Status and scope |
|---|---|
| SMP main/sub local clips | **Verified on C1 03.53.45:** both clocks, B geometry and A continuity in staged tests. This is presentation evidence, not HDMI ingress. |
| 0.1.3 ordinary public LS2 registration/cleanup | **Verified on this C1:** subscription acknowledged; unsubscribe, cancel, unregister and controlled exit passed. Smoke measured 8.056 s overlap and 3.049 s A recovery; owner confirmed both clocks and A continuation. |
| Applied screensaver NACK | **Unknown:** the final request probe ended in 60.022 s without a request. No NACK was exercised. Cleanup/exit passed; result inconclusive. |
| Subsequent idle behavior | Owner saw the menu during the wait and reported a screensaver after exit. Exact delay and app-specific causal restoration remain unknown. |
| Glasshouse/Home routing | Separate owner report after updating Glasshouse: LG Home instead of expected Glasshouse Home. Version, trigger and cause unknown; no launcher change was made by this work. |
| Dual HDMI | **Unknown.** Only one HDMI source is currently connected. |

Detailed measurements and provenance remain in the
[Phase 1 device journal](../device-tests/lg-c1-phase-1.md),
[native idle contract](../research/c1-native-screensaver-interface.md) and
[resource-path analysis](../research/c1-smp-ndl-resource-path.md).
Original reports, firmware copies and all control IPKs remain local under
ignored `build/` and `dist/`. Do not delete them during housekeeping or
publish firmware binaries, credentials, raw vendor logs or device identifiers.

## Next acceptance gate

First produce a C1-specific interface map from existing pinned sources,
SDK declarations, retained firmware and policy/configuration. For each
candidate, distinguish input selection, receiver activation, output capture,
presentation ownership and independent per-port sessions. Cite exact source
or firmware hash/address and mark gaps unknown. An exported symbol, scaler
grant or output-tap handle does not establish a second HDMI receiver.

Only then propose a bounded selected-HDMI presentation/viewport experiment
with identity checks, cancellation, restoration and owner observations. Do
not switch inputs or invoke capture/open/load/set methods during discovery.
Active dual-HDMI testing additionally needs a second independent source and
an evidenced per-port path. Retain the existing safety rules: no `/dev/mem`,
forced capture, modules, firmware writes, persistent policy edits, critical
service restarts or protection bypass.

The [next-chat handoff](../handoff/hdmi-next-chat.md) is the entry point.
