# Current status

Updated 2026-11-17. [Roadmap](ROADMAP.md) · [Docs](docs/README.md) · [Current procedure](docs/device-tests/current-plan.md)

## Verified milestone

**0.1.12 displayed continuously moving physical HDMI-4 video in its own centered
window, with audible sound**, once on LG OLED C1 / firmware 03.53.45.
Open/select/stop/close and local cleanup returned; independent termination and
normal picture/sound/remote restoration were observed, without recovery.
[Actual outcome and original hashes](docs/device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound).

This is one short single-input result. Independently live HDMI 1 + HDMI 2,
sustained stability, audio ownership and hardware release remain **unknown**.
Direct UTP remains selected; Glasshouse's HTML HDMI source is complementary.

## Working control

- [Source and contract](native/phase2-hdmi-candidate-0.1.12/README.md).
- IPK: dist/io.github.tpapaz.multiview.hdmiwindow_0.1.12_arm.ipk, 51,124 bytes;
  SHA256 cb7ec17381a23526299545300f5437c3d1fbeb12e45f1466adc05a71ec829e4f.
- ELF: build/phase-2/physical-candidate-arm-0.1.12/multiview-hdmi-window, 112,020 bytes;
  SHA256 7df25969c176e6560b4393c3236cd9f974e91f939b6313390e8da265670675e0.
- Immutable build/package/ABI records: build/phase-2/physical-candidate-0.1.12/.
- Physical capture: build/reports/picture-0.1.12-20261115-001/;
  frozen inputs: build/phase-2/picture-trial-0.1.12-20261115-001/.
- Lifecycle capture: build/reports/lifecycle-0.1.12-20261115-003/.

The retained narrow own-app/four-method permission grant is **loaded pending
separate cleanup**, not revoked. Completed acquisition grants are consumed.
All completed collection connections are closed. Useful bounded passive research
has [standing permission](docs/safety.md#standing-read-only-permission); active
acquisition, deployment, policy/service and power actions require separate scope.

## Research conclusion

Saved evidence now traces factory/resource arbitration through HDMI port
selection and videooutput→VAL→VSC presentation. HDMI sourcePort k remains separate
from receiver grants and sink IDs. VAL sink ordinals 0/1 open video30/31; normal
mode0 follows node routes0/1. The actual advertised MAIN/SUB0 ordering is unsaved.
Distinct presentation routes and configured VHDMIRX count2 support a **candidate**,
not proof of independent receivers.

Cached adoption, reuse/rebinding, port switching and independent allocation remain
different explanations. Cached success, setDualVideo's success stub, software
planeIDs44/45 and occupancy/source caches cannot establish concurrency or release.
[Authoritative mechanisms, corrections and four-path assessment](docs/research/c1-hdmi-interface-map.md).
[Saved evidence and interpretation guide](docs/research/c1-hdmi-evidence-ledger.md).
Firmware addresses/IDs are research evidence, never portable app constants.

## Single next task

**Run the one bounded capability-file collection; it has not run.**
The fixed scripts/collect-val-capability.cjs reader is implemented and validated
in **87 offline acceptance cases**. It reads only /etc/palm/val/device-cap.json
using the saved TOFU pin and existing endpoint. Fixed bounds and stop/closure
conditions live in the [current procedure](docs/device-tests/current-plan.md#prepared-capability-file-read--offline-only).
Default/refusal/--plan remain offline. Raw capture is separate from usable JSON
plane interpretation; active-loaded configuration and dual HDMI stay unknown.

Request: build/phase-2/hdmi-val-capability-request-20261117-001/request.json,
SHA256 68f0d2b231bb9a86890488e373f9e7a201f7bbdb996448deaa9924343e115001.
Readiness audit: build/phase-2/hdmi-val-capability-preparation-20261117-001/verification.json.
This cleanup made no TV connection or change to 0.1.12, collectors or guards.
[Retention and cleanup audit](docs/repository-layout.md#private-evidence-and-cleanup).
