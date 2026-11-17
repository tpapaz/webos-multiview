# webOS MultiView

> **Experimental prototype for research and controlled testing only.**
> [Device safety and disclaimer](#device-safety-and-disclaimer)

webOS MultiView is a root-assisted homebrew research project for LG TVs. The
long-term goal is to show **several independently live sources at once** in
movable windows, including layouts with more than two sources. A layout could
combine HDMI inputs, live TV, another webOS app and a network stream in
picture-in-picture, split-screen or a grid. The available combinations will
depend on the TV model and firmware.

## What works today

- **Verified on an LG OLED C1 running firmware 03.53.45.** Prototype 0.1.12
  displayed continuously moving video from physical HDMI 4 in a fixed, centered
  app window with audible sound during one eight-second trial. The app exited
  and normal picture, sound and remote control returned. [Device test and evidence](docs/device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound)
- **Unknown.** Simultaneous HDMI 1 and HDMI 2, sustained stability, independent
  audio control, hardware resource release and compatibility with other
  models or firmware remain unverified. [Current status](STATUS.md)

The tested `0.1.12` IPK is a local research artifact under ignored `dist/`.
A fresh checkout contains the source and host checks. Native builds use an
existing webOS SDK and retained device libraries. [Build and package details](docs/build.md)

## Concept layouts

These mockups illustrate planned layouts. The source combinations shown are
still unverified on the TV.

| Four-source grid | Three-source split | Picture-in-picture |
| --- | --- | --- |
| ![Concept grid with HDMI 1, a stream, HDMI 2 and live TV](docs/images/concepts/four-source-grid.jpg) | ![Concept split with HDMI 1 on the left and a stream above HDMI 2 on the right](docs/images/concepts/three-source-split.jpg) | ![Concept with a stream in a corner over HDMI 1](docs/images/concepts/picture-in-picture.png) |

## Run the host checks

Run these commands from the repository root in PowerShell. The quick start
was verified with Node.js 24 and npm 11.

```powershell
npm ci
npm test
node scripts/check-js.cjs
```

These checks run without a TV connection. The tests exercise the prototype's
launch rules, cleanup and evidence reporting with simulated transports. The
last command checks JavaScript and JSON syntax.

Run `npm run lint` in the research workspace with the retained transport helper
under `build/`. Full lint checks Markdown links, source references and policy
consistency. For native C++ checks and ARM toolchain setup, see the [build guide](docs/build.md).

## Follow or contribute to the research

The next milestone is independent motion from HDMI 1 and HDMI 2 in two fixed
windows. The proposed test also checks that closing HDMI 2 leaves HDMI 1
playing. The experiment is at the design review stage and any active TV trial
requires explicit owner authorization. [Dual-source test design](docs/device-tests/current-plan.md#review-only-dual-source-experiment)

- Read the [current status](STATUS.md) for the next task and the [roadmap](ROADMAP.md)
  for the planned milestones.
- Find the app entry point and report format in the [prototype contract](native/phase2-hdmi-candidate-0.1.12/README.md).
  The [repository layout](docs/repository-layout.md) maps the shared native code
  and host runner.
- Trace the HDMI path in the [C1 research map](docs/research/c1-hdmi-interface-map.md)
  and find prior results in the [documentation index](docs/README.md).
- Review the [contributor rules](AGENTS.md) and [device safety](docs/safety.md)
  before proposing changes or experiments.

## Device safety and disclaimer

**Use the [host checks](#run-the-host-checks) if you just want to try the project.**
Root-assisted experiments can interrupt normal viewing or leave a TV unusable.
Keep experimental builds off any TV you rely on. Before a device trial, confirm
the exact model and firmware, get the owner's explicit permission, and make sure
you have a way to restore normal operation. Stop if the TV behaves unexpectedly.
Follow the [device safety rules](docs/safety.md) and [current test procedure](docs/device-tests/current-plan.md).

webOS MultiView is an independent homebrew project unaffiliated with LG
Electronics. webOS is a trademark of LG Electronics. See the
[publication rules](docs/safety.md#public-repository) for research material
and third-party files. The software is provided as is, without express or implied
warranties. Use it at your own risk. To the extent permitted by applicable law,
the maintainers disclaim liability for device damage, data loss, or other
losses arising from use of the project.
