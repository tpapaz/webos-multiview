# webOS MultiView

A root-assisted LG webOS prototype researching independently live **HDMI1+HDMI2**
in movable PiP or split screen using the TV's hardware.

**First milestone achieved:** version0.1.12 displayed continuously moving physical
HDMI-4 video in our own centered window, with sound, on LG OLED C1/03.53.45.
Cleanup, independent termination and owner restoration were observed. This is
one short single-input result; simultaneous HDMI remains unproven.

Start with [Status](STATUS.md) for the next task and device authorization state.

- [Prototype contract](native/phase2-hdmi-candidate-0.1.12/README.md).
- [Research map](docs/research/c1-hdmi-interface-map.md).
- [Build and checks](docs/build.md).
- [Device journal](docs/device-tests/c1-journal.md) and [current disposition](docs/device-tests/current-plan.md).
- [Docs index](docs/README.md), [roadmap](ROADMAP.md), [source layout](docs/repository-layout.md).
- [Contributor rules](AGENTS.md) / [device safety](docs/safety.md).

Run npm test and npm run lint for the current prototype's offline host checks.
Native tests/builds use the existing WSL SDK. Optional earlier local-media/passive
controls use npm run test:controls. No TV run, automatic commit/push or GitHub
Actions is queued. Private firmware/reports/authority and generated IPKs stay out
of Git. The working IPK remains under ignored dist.
