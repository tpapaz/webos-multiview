# webOS MultiView

Research toward independently live **HDMI 1 + HDMI 2** in movable PiP or split
screen, using a rooted LG TV's internal hardware. Reference device: LG OLED C1,
firmware 03.53.45 / SDK 6.5.3. **Simultaneous HDMI remains unproven.**

Start with [Status](STATUS.md) for the latest verified state and single next task.

- [Documentation index](docs/README.md): current contracts, evidence and dated research.
- [Roadmap](ROADMAP.md): phases and acceptance criteria.
- [Current test plan](docs/device-tests/current-plan.md): the proposed single-HDMI trial.
- [Build guide](docs/build.md): existing toolchain and local checks.
- [Contributor rules](AGENTS.md) / [safety](docs/safety.md): scope and device restrictions.

The 0.1.4 single-HDMI window candidate is locally built, host-tested, packaged
and direct-ABI checked. Installed files/modes and exact one-app/four-method
permission coverage are verified on C1. **0.1.4 has not executed on the TV and no
physical HDMI picture has been demonstrated.** Permission, decoder and surface
successes are different from two independently advancing physical inputs.

The next milestone is one owner-attended HDMI-4 picture trial, when separately
authorized. The narrow grant is retained pending that trial/separate cleanup;
no repeat activation, mode repair or diagnostic boot is next. See Status rather
than archived next steps. Main/sub local-video and lifecycle controls do not
establish HDMI acquisition or recovery.

`npm test`, `npm run lint` and `npm run test:controls` run local checks. Native
builds use the existing WSL SDK. Private firmware, original reports and IPKs stay
under ignored build/dist and are not shipped by pushing the repository.
No GitHub Actions, automatic commits or pushes.
