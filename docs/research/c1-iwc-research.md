# Paused C1 IWC route

[Current HDMI path](c1-hdmi-interface-map.md) · [Scope decision](../decisions/0003-close-idle-work-resume-hdmi.md)

IWC controls stock window publications/geometry; it has not established a second
physical HDMI receiver. Direct UTP produced our first picture and remains the
selected path. No IWC setter/reset/supervisor experiment is queued.

Useful retained technical analysis:

- [Ownership and recovery](c1-iwc-ownership-recovery.md): publication/relay
  lifetime and controller death do not establish hardware restoration.
- [Permitted caller](c1-iwc-permitted-caller.md): stock executable-bound utility
  permissions are not a general grant to our app.
- [Admission and reset limits](c1-iwc-admission-reset-plan.md): a policy prediction
  and a local fallback model do not establish applied restoration on the TV.

The earlier read-only collector, synthetic recovery model, fake-process harness
and lifecycle helper were retired after the first-picture milestone. Their exact
local snapshots/results remain with ignored build evidence. Their boilerplate
plans are no longer separate current research documents. The detailed original
TV outcomes remain in the [campaign archive](../device-tests/archive/c1-first-picture-campaign-2026-11-15.md).

No critical service restart, permission change, IWC setter or power recovery is
made safe or authorized by those historical controls. Reopen this route only
for a specific evidence-backed need, not as generic preflight for UTP research.
