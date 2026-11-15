# Current status

Updated2026-11-15. [Roadmap](ROADMAP.md) · [Docs](docs/README.md) · [Device disposition](docs/device-tests/current-plan.md)

## Verified milestone

**0.1.12 produced one physical HDMI-4 picture in our own centered window on
LG OLED C1 / firmware03.53.45**, with continuous motion and audible sound confirmed
by the owner. Independent HDMI1+HDMI2 remains unproven. Direct UTP stays selected;
Glasshouse's HTML HDMI source is complementary.

One acknowledged physical launch, exact narrow admission and installed/same-boot
lifecycle bindings passed. Matching588-byte traces record open/select,8,003 ms
observation, acknowledged stop/close and returned local cleanup. Matching204-byte
launch-bound witnesses independently observed termination. App absent afterward;
owner confirmed normal picture/sound/remote with no recovery. Connections closed
in4.568/3.370 s; scheduled collection opened dispatch+27.003 s.
[Actual outcome and hashes](docs/device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound).

Numeric exit status, alarm cause and hardware release remain unknown. One short
run does not establish stability, independent audio routing or dual HDMI. The
conservative acquisitionUncertain flag remains true after dispatched open.

## Working control and evidence

- [Current source/contract](native/phase2-hdmi-candidate-0.1.12/README.md).
- IPK: dist/io.github.tpapaz.multiview.hdmiwindow_0.1.12_arm.ipk,
  51,124 bytes; SHA256 cb7ec17381a23526299545300f5437c3d1fbeb12e45f1466adc05a71ec829e4f.
- Physical evidence: build/reports/picture-0.1.12-20261115-001/;
  frozen inputs/replay: build/phase-2/picture-trial-0.1.12-20261115-001/.
- Lifecycle prerequisite: build/reports/lifecycle-0.1.12-20261115-003/.
  Immutable build/package/ABI records: build/phase-2/physical-candidate-0.1.12/.

The device grant is consumed; both connections are closed. No new TV operation
is authorized. No repeat, automatic retrieval, policy change or power action.

## Single next task

**Offline saved-evidence tracing of an independent second HDMI acquisition and
presentation path**, toward independently live HDMI1+HDMI2. A second port switch
on the same path would not prove concurrency. Preserve the working0.1.12 control;
no speculative IPK or replacement browser.

Superseded entry/setup/admission/IWC harness code was retired at this milestone;
current shared dependencies and acceptance tests remain. [Layout](docs/repository-layout.md)
owns source retention; the [research map](docs/research/c1-hdmi-interface-map.md)
owns mechanisms/next gaps. Dated diagnostic history is linked from the journal.
The owner intentionally removed11 older HDMI IPKs; exact reinstall of those old
packages is unavailable and they are not needed for current work.
