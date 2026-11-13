# Scope, privacy and device safety

[Status](../STATUS.md) · [Current procedure](device-tests/current-plan.md) · [Contributor rules](../AGENTS.md)

## Execution boundary

The active work is Phase 2 HDMI acquisition/window research. Candidate 0.1.3 is
locally packaged, not installed or TV-tested. **No TV operation or permission
deployment is authorized by the current documentation/repository cleanup.**
Past completed runs do not authorize repeats. Current evidence is in Status and
the C1 journal; historical commands are references, not execution instructions.

Acquisition is active: the candidate's explicit picture mode opens a hardware
session and selects HDMI 4. It can affect existing viewing. The default app is
inert; admission-only modes make permission predictions without SDL or UTP target
calls. A foreground app can still affect lifecycle/viewing. Do not describe an
active opt-in as passive discovery or claim that denied admission left viewing
unchanged.

No flash/device-node writes, kernel modules, firmware patches, protection bypass,
hooks/injection, critical service restarts, factory resets, arbitrary-command
endpoints or unvalidated privileged Luna APIs. No automatic input switching during
passive discovery. The separately prepared temporary app-specific policy adds
only four methods to one app; no broad/borrowed grant, generated-role replacement
or persistent system-policy change is authorized. Scope and staging/removal are
owned by the current plan.

## Bounds and restoration

Use explicit opt-in, fixed allowlists, payload/time bounds, cancellation, local
cleanup and sanitized capture for active probes. Preserve evidence; never retry
or infer ownership from an old/guessed ID. The expiring launch contract prevents
late starts for the unmodified fixed producer's payload; actual device integration
is untested. Do not bypass it with a direct root launch or old unbounded payload.

Close acknowledgment, unregister, process absence and an alarm do not prove
hardware release. Reports retain unknown outcomes. Do not restart ACB/compositor/
UTP or add a backend pause grant as recovery. Owner restoration, physical access,
safe shutdown and the single true-cold-cycle contingency are defined only in the
current plan; standby is not proof of reset. Without owner acceptance and safe
power access, acquisition is unsafe_to_test. Never interrupt updates or panel
maintenance to satisfy a timer. Evidence collection must not delay owner recovery.

## Privacy and retained controls

Export fixed allowlisted outcomes, numeric versions/counts and known categories.
Never print/share credentials, tokens, serial/device/network identifiers, raw
window/pipeline IDs, private boot/launch authority, arbitrary errors or unrestricted
vendor logs. Raw stdout/stderr is not a sanitized report. Review reports before
sharing; schema validation alone does not redact imported evidence.

Keep machine reports immutable and human observations separate. Preserve private
firmware, original reports/hashes and old IPKs in ignored `build/`/`dist/`; do not
ship proprietary runtime libraries. Local checks/builds are not TV evidence.

The passive probe still requires its own metadata action and allowlisted export.
Phase 1 uses synthetic clips and bounded lifecycle cleanup; historical protocols
remain in the [build archive](archive/build-reference-2026-11-12.md) and
[device-test originals](device-tests/archive). Screensaver and Glasshouse/Home
work are closed/separate; no settings, fake-key loops, thermal changes or service
restart are implied by those retained controls.
