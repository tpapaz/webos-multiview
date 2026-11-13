# webOS MultiView

Research toward two independently live HDMI inputs in movable PiP or split
screen, using the TV's own hardware. Reference device: rooted LG OLED C1.
**Simultaneous HDMI remains unproven.**

**Start with [Where we are](STATUS.md).** It explains what passed on the TV,
what remains unknown, and the single next task in plain language.

- [Documentation index](docs/README.md): device results, tool contracts and research history.
- [Roadmap](ROADMAP.md): product phases and acceptance gates.
- [Continuation handoff](docs/handoff/hdmi-next-chat.md): workspace and execution instructions.
- [Build guide](docs/build.md): local SDK and retained diagnostic controls.
- [Contributor instructions](AGENTS.md) and [safety rules](docs/safety.md).

The current deliverable is the locally built/tested/packaged **0.1.3 single-HDMI
window candidate**, with scoped policy and bounded capture tooling. It has not
been installed or TV-tested. Next is separately authorized installation/readback
and admission-only validation; a picture trial follows its own readiness review.
Local-video main/sub playback, root IWC listing and fake-worker lifecycle controls
have TV evidence. They do not establish physical HDMI acquisition or recovery.

`npm test` runs the current portable HDMI launch/report/policy checks;
`npm run test:controls` retains the earlier probe/clip suite. See the build guide
for native host/ABI checks and the legacy build reference.

Build locally in the existing WSL SDK. Preserve original reports and control
packages. No GitHub Actions, automatic commits or pushes. Dated research notes
retain earlier reasoning; their old next steps are not current instructions.
