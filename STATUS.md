# Current status

Updated 2026-11-15. [Roadmap](ROADMAP.md) · [Documentation index](docs/README.md)

## Goal and current result

One live physical HDMI picture in our own window, then independently live
**HDMI 1 + HDMI 2** on the TV's internal hardware. Reference: rooted LG OLED C1,
firmware 03.53.45 / SDK 6.5.3. No physical HDMI picture is verified in our app.
Direct UTP remains the acquisition/window research path; Glasshouse's HTML HDMI
source is a complementary reference. No replacement browser candidate is queued.

**Installed 0.1.8 is machine-verified and was TV-tested once. LSRegisterPubPriv
returned false.** Both report aliases were valid and identical (591 bytes).
Display/request/window were 1920x1080. Window/renderer, export creation/ID/binding,
focus wait and context creation passed. Focus changed 0 → 1, no cancellation.
Later LS2 name/attachment/disconnect/window-ID checks were not reached. Cleanup
calls returned and exit intent 1 was recorded. The bus error/rejection reason and
actual exit code/signal remain unknown. A crash is not established.
[Actual evidence](docs/device-tests/c1-journal.md#018-setup-only-diagnostic--named-ls2-registration-failed).

One acknowledged SAM attempt; two closed connections, 4.593 s and 3.486 s;
collection opened dispatch +27.014 s. Exact installed/generated bindings passed;
ELF/appinfo still matched afterward. Both strict three-second guards unchanged.
No UTP query/acquisition path exists in this diagnostic. Own app absent afterward;
log gate size_cap, hardware release unknown. Owner saw LG Home while watching
channels and confirmed normal picture, sound and remote usable afterward.

## Offline registration review and next task

Saved SDL video startup calls LG's helper, whose bridge attempts named public
registration with the current app ID. Our physical startup registers that name
after graphics. A duplicate-name collision is therefore a supported **candidate**;
0.1.8 did not preserve the LSError needed to prove it was the actual rejection.
The earlier admission control registers without SDL; the working endurance control
uses an anonymous public connection. Neither justifies replacing our named caller.

The smallest reviewed correction is to register/validate/attach our own named
public handle before graphics. A [source patch](native/phase2-hdmi-picture/registration-before-graphics.patch)
was applied only to an isolated local copy: real begin-body host scenarios,
ARM compilation, exact C1 direct ABI and existing native CTests passed. No IPK
was created; installed 0.1.8 and all original sources/packages remain unchanged.
[Mechanism, provenance and limits](docs/research/c1-hdmi-interface-map.md#registration-identity-and-smallest-correction).

**Single next task:** prepare a fresh setup-only diagnostic incorporating this
startup order and fixed sanitized registration-error categories, then validate
it locally. No new TV connection, installation, launch, permission/mode change,
retrieval or retry is authorized. Preserve the existing strict guards and geometry.
[Current procedure](docs/device-tests/current-plan.md).

## Preserved evidence and remaining limits

| Evidence | Established result / limit |
|---|---|
| 0.1.4 physical attempt | Launch flash; no native report recovered. Entry, exit, crash and actual UTP execution unknown. [Attempt](docs/device-tests/c1-journal.md#014-first-picture-attempt--no-native-capture), [postmortem](docs/device-tests/c1-journal.md#014-read-only-postmortem--reports-and-parents-absent). |
| 0.1.5 inert diagnostic | Native entry accepted; host-derived realtime window rejected. Actual exit unknown. [Result](docs/device-tests/c1-journal.md#015-inert-diagnostic--realtime-guard-rejected). |
| 0.1.6 inert diagnostic | TV-derived deadlines passed both strict guards. No graphics/UTP proof. [Result](docs/device-tests/c1-journal.md#016-inert-diagnostic--both-clock-guards-accepted). |
| 0.1.7 physical attempt | setup_failed before acquisition, 527 ms; exact substage/actual exit unknown. [Result](docs/device-tests/c1-journal.md#017-physical-picture-trial--setup-failed-before-acquisition). |
| Narrow grant | Last returned maps for 0.1.7 showed exact [1,1,1,1] coverage. This is not live-caller UTP admission; 0.1.8 made no permission-map query. [Verification](docs/device-tests/c1-journal.md#017-read-only-installed-binding-and-admission-verification). |
| Earlier local clips | Working two-video controls; Phase 1 remains partial. They do not establish HDMI ingress or recovery. |

Original reports, packages, firmware, frozen helpers and private authority remain
local and ignored. Disposable cache cleanup and document ownership are described
in [repository layout](docs/repository-layout.md). Historical failed acceptance
states remain unchanged. IWC, screensaver/Glasshouse Home routing and repeat boot/
mode diagnostics remain paused or closed. No commit or push is automatic.
