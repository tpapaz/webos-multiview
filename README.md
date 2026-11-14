# webOS MultiView

Research toward independently live **HDMI 1 + HDMI 2** in movable PiP or split
screen using a rooted LG TV's internal hardware. Reference: LG OLED C1,
firmware 03.53.45 / SDK 6.5.3. **Simultaneous HDMI remains unproven.**

Start with [Status](STATUS.md) for the current finding and single next task.

- [Documentation index](docs/README.md): technical contracts and evidence.
- [Roadmap](ROADMAP.md): phases and acceptance gates.
- [Current test plan](docs/device-tests/current-plan.md): scope and stop rules.
- [Build guide](docs/build.md): local checks and existing toolchain.
- [Repository layout](docs/repository-layout.md): active code, retained controls and disposable files.
- [Contributor rules](AGENTS.md) / [safety](docs/safety.md): device and privacy restrictions.

The setup-only 0.1.8 diagnostic identified a returned named LS2 registration
failure after window/export/focus checks passed. An offline startup-order
correction is locally validated as a candidate; its device behavior remains
unknown. No physical HDMI picture is verified in our app. Direct UTP remains the
research path; Glasshouse's HDMI media source is a complementary reference.

`npm test`, `npm run lint` and `npm run test:controls` run local checks. Native
builds use the existing WSL SDK. Private evidence and original IPKs remain under
ignored build/dist. No TV run, GitHub Actions, automatic commit or push is queued.
