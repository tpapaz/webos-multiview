# Current status

Updated 2026-11-14. [Roadmap](ROADMAP.md) · [Documentation index](docs/README.md)

## Goal and result

Show one live HDMI picture in our own window, then independently live
**HDMI 1 + HDMI 2** using the TV's internal hardware. Reference: rooted LG OLED
C1, firmware 03.53.45 / SDK 6.5.3. Last owner-confirmed source: HDMI 4.

**No physical HDMI picture has been demonstrated in our app.** Version 0.1.4
has not executed on the TV; installed-file verification is not an app run.

## Latest verified state

| Gate | Evidence and limit |
|---|---|
| Local candidate | 0.1.4 built, host-tested, packaged and direct-ABI checked. [Artifact/contract](native/phase2-hdmi-window/README.md). |
| Installation | Exact app/generated files, owners and modes pass; ELF `0755`, appinfo `0644`. No correction needed. [Readback](docs/device-tests/c1-journal.md#014-installed-files-and-modes-verified). |
| Narrow permission coverage | At 20:05 Athens on 2026-11-14, one acknowledged held-manifest activation changed fresh maps from `[0,0,0,0]` to exactly `[1,1,1,1]`, only our app/four methods. Core/file bindings pass, app absent during checks, connection closed. [Result](docs/device-tests/c1-journal.md#014-narrow-permission-activation-and-coverage-verified). |
| Grant disposition | Left loaded pending the picture trial and separately scoped cleanup. Manifest remains outside scan roots. Retained access is not revocation. |
| Live input / hardware release | Actual UTP admission, graphics/clock integration, HDMI motion, restoration and simultaneous ports remain **unknown**. |
| Earlier controls | Main/sub local clips and normal/EOF fake-worker controls have TV evidence. Phase 1 remains partial; none proves physical HDMI. [Journal](docs/device-tests/c1-journal.md). |

These are dated observations, not continuous monitoring. No repeat activation,
mode repair, diagnostic boot or generic recovery campaign is next.

## One next task

**One owner-attended HDMI-4 picture trial, when separately authorized.**
Permission/configuration gates pass. Confirm moving HDMI-4 content, owner presence,
remote/restoration access and acceptance of the contingency, then use the
[current procedure](docs/device-tests/current-plan.md). It defines one expiring
normal app-manager launch, the independent 27-second owner timer, visible motion
inside the fixed rectangle, exit and restoration observations. This page
and completed authorization scopes do not authorize a new TV operation.

The principal risks remain unproven backend release and the missing independent
second-port path. A close acknowledgment or process exit never proves hardware
release. Product controls follow concurrency proof.

## Closed and historical work

The old native allowed predictions remain `phaseAccepted:false`; a removal
dispatch lost transport with receipt/execution/cause unknown. Later denied maps
verified rollback independently. The unchanged-UUID verifier stays failed; it is
not a reason for another boot. The old `0777` drift is superseded by correct
0.1.4 modes. [Dated device history](docs/device-tests/archive/c1-hdmi-preparation-2026-11-14.md) ·
[Technical investigation](docs/research/archive/c1-hdmi-admission-2026-11-14.md).

No extra firmware retrieval, IWC preflight, screensaver/Glasshouse work or Phase 1
repeat campaign is queued. Preserve all original reports, binaries and packages;
never commit or push automatically.
