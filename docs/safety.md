# Scope, privacy and device safety

[Status](../STATUS.md) · [Current procedure](device-tests/current-plan.md) · [Contributor rules](../AGENTS.md)

## Authorization and scope

Status owns the latest dated TV state. A document, saved script, roadmap gate or
completed authorization does not authorize a new device operation. This document
authorizes no TV operation. Picture-mode launch requires explicit owner scope
and the conditions in the current plan.

Permission coverage is not actual UTP admission. Installed-file verification is
not app execution. The retained one-app/four-method grant must be reported as
loaded pending separate cleanup, never as revoked. Do not repeat activation,
removal, mode repair or a boot because an archived instruction says to do so.

Acquisition is active: explicit picture mode opens a hardware session/selects
HDMI 4 and can affect existing viewing. Admission-only modes make permission
predictions without SDL/UTP target calls; even a foreground app can affect
viewing/lifecycle. Never label acquisition passive or infer unchanged viewing
merely from denied admission.

## Device boundaries

No flash/device-node writes, kernel modules, firmware patches, protection bypass,
hooks/injection, critical service restarts, factory resets, arbitrary-command
endpoints or unvalidated privileged Luna APIs. No automatic input switching during
passive discovery. Root-only operations must stay isolated and reviewed.

The reviewed grant adds only four exact methods to the own app/group. No broad
all/private entitlement, borrowed identity, replacement generated role or new
backend/pause grant. Existing generated-policy context is read, not appropriated.
No new persistent system modification or permission/file deployment is authorized
by source availability or by a local plan.

## Bounds, failure and restoration

Active probes require opt-in, fixed allowlists, payload/time bounds, cancellation,
local cleanup, sanitized capture and accepted restoration access. Use only IDs
returned by the current attempt. Preserve partial/failed outcomes; never infer
ownership from an old ID or retry on uncertainty. Do not bypass expiring normal
launch with a root ELF invocation, edited lease or old unbounded payload.

Stop/close acknowledgments, unregister, process absence and alarms do not prove
hardware release. Backend resource release is unbounded in saved evidence; no
software reset is proven. Owner timing/UI recovery and contingency live only in
the current plan. Collection never extends the owner timer or delays recovery.

No routine cold boot, live-remove retry or service restart is part of the trial.
Any emergency power recovery requires separate scope, safe physical access and
no interruption of updates/panel maintenance. If the accepted contingency is
unavailable, acquisition remains unsafe_to_test; do not improvise a reset.

## Privacy and evidence

Export fixed allowlisted outcomes/counts and known categories. Never publish or
print credentials, tokens, SSH material, serial/device/network identifiers, raw
window/pipeline/boot IDs, private launch authority or unrestricted vendor logs.
Raw stdout/stderr is not a sanitized report; schema validation does not redact it.

Machine reports remain immutable; owner observations remain separate. Preserve
private firmware, original hashes and old IPKs in ignored build/dist. Do not ship
vendor libraries or refetch saved evidence unnecessarily. Local tests/builds
and static exports do not establish physical HDMI behavior.

Phase 1 controls and their unresolved limits remain available as references.
Screensaver and Glasshouse/Home are closed/separate; neither is a dependency of
the single-picture milestone unless the owner explicitly reopens it.
