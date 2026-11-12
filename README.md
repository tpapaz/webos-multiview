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

The current deliverable is a set of research/diagnostic tools. Local-video
main/sub playback, root IWC listing and two fake-worker lifecycle cases have TV
evidence. HDMI geometry control, automatic picture recovery and independently
live HDMI 1 + 2 have not been demonstrated. Status links to the exact results.

Build locally in the existing WSL SDK. Preserve original reports and control
packages. No GitHub Actions, automatic commits or pushes. Dated research notes
retain earlier reasoning; their old next steps are not current instructions.
