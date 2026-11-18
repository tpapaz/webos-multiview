# Paused C1 IWC route

[Current HDMI path](c1-hdmi-interface-map.md) · [Scope decision](../decisions/0003-close-idle-work-resume-hdmi.md)

IWC controls stock window publications/geometry; it has not established a second
physical HDMI receiver. Direct UTP produced our first picture and remains the
selected path. No IWC setter/reset/supervisor experiment is queued.

## Ownership, permission and recovery

The service relays geometry requests to registered publishers. An acknowledgment establishes receipt. Applied geometry, resource release and restoration after controller exit each need independent evidence.

The stock utility's permission is bound to its executable. The tested app caller received a policy denial. The proposed reset and automatic recovery remain unverified on the TV. A policy prediction or synthetic recovery model cannot establish either outcome. [Original device observation](../device-tests/archive/c1-iwc-root-read-002.md)

The earlier read-only collector, synthetic recovery model, fake-process harness
and lifecycle helper were retired after the first-picture milestone. Their exact
local snapshots/results remain with ignored build evidence. Their boilerplate
plans are no longer separate current research documents. The detailed original
TV outcomes remain in the [campaign archive](../device-tests/archive/c1-first-picture-campaign-2026-11-15.md).

No critical service restart, permission change, IWC setter or power recovery is
made safe or authorized by those historical controls. Reopen this route only
for a specific evidence-backed need, not as generic preflight for UTP research.
