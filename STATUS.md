# Current status

Updated 2026-11-13. Start here; historical next steps do not override this page.
[Documentation index](docs/README.md) · [Roadmap](ROADMAP.md)

## Goal and result

Build two independently live **HDMI 1 + HDMI 2** pictures on the TV's own
hardware, then add movable PiP/split layouts and controls. Reference device:
rooted LG OLED C1, firmware 03.53.45 / SDK 6.5.3. The owner last identified the
connected source as HDMI 4.

**No physical HDMI picture has been demonstrated in our app. Simultaneous HDMI,
HDMI resizing and hardware restoration remain unknown.**

| Evidence | Result |
|---|---|
| Phase 1 local clips | Two main/sub surfaces advanced independently on TV, with B geometry and A continuity. Audio/repeatability/recovery remain partial; this does not prove HDMI. |
| Earlier admission app 0.1.2 | Own registration and a query predicting denied target permission (`allowed:false`) verified on TV. No IWC setter ran. |
| Stock utility and lifecycle controls | Root IWC listing and normal/EOF fake-worker cleanup passed on TV. These are supporting controls, not HDMI recovery tests. |
| HDMI window candidate 0.1.3 | Locally ARM-built, host acceptance-tested, packaged, archive-inspected and direct-ABI checked. **Not installed, simulator-tested or TV-tested.** |

[Actual TV journal](docs/device-tests/c1-journal.md) ·
[Current artifact, hashes and contract](native/phase2-hdmi-window/README.md) ·
[Saved HDMI findings](docs/research/c1-hdmi-interface-map.md)

## One next task

**Separately scope installation/readback and admission-only validation.**
No TV operation or permission deployment is authorized by the current cleanup
request. Follow the single [current procedure](docs/device-tests/current-plan.md).

The two local control gaps are closed: saved rules support stock `luna-send`
under its own default identity for both manifest operations, and the candidate
rejects stale/different-boot acquisition payloads. The package includes neither
policy nor an installer. The four-method policy is prepared locally only.

The remaining device gates are:

- Verify installed ELF/manifest, generated roles/client policy and normal
  launcher, boot-clock and report visibility in the actual app context.
- Verify both administrative permission predictions, then app baseline → scoped
  overlay → removed predictions, preserving generated policy and proving rollback.
- Before a separate picture trial, obtain owner acceptance/access and a safe
  procedure for the [restoration contingency](docs/device-tests/current-plan.md#restoration-route--proposal-for-one-owner-attended-trial).

A permission prediction is not actual UTP execution. A close acknowledgment or
process exit is not hardware release; the candidate reports that outcome as
unknown. No additional firmware retrieval or generic recovery work is queued.

## Scope boundaries

The first picture proposal is one fixed application-owned HDMI-4 window, then
two distinct moving sources on HDMI 1 and HDMI 2. Product controls follow
concurrency proof. The IWC preflight is paused; screensaver work is closed and
Glasshouse/Home is separate. Retain Phase 1 controls and their unresolved limits.

This documentation/repository cleanup made no TV run, power action or permission
change. Past completed authorizations do not authorize repeats. Preserve saved
firmware, original reports/hashes and earlier packages. Never commit or push
automatically.
