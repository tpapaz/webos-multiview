# webOS MultiView

Research toward **two independently live physical HDMI inputs**, displayed in PiP
or split-screen using only the TV's hardware. Reference target: rooted LG C1.
**Simultaneous HDMI on C1 is unproven.** Root, video windows, output capture and
network multiview do not establish independent HDMI receiver pipelines.

This first implementation covers roadmap **Phase 0A and safe portions of 0B**:

- [Pinned source audit and licensing](docs/research/prior-art.md),
  [C1 hypothesis matrix](docs/research/c1-hypotheses.md),
  [probe-first decision](docs/decisions/0001-probe-first.md).
- Installable **web-only passive probe**: explicit one-shot metadata query,
  redacted JSON viewer/export, timeout/cancel and remote navigation. No root
  service, source switching, capture or playback. All functional capabilities
  remain unknown.
- Separate C++11/CMake filesystem inventory CLI. Fixed library-path stat checks
  only; host-built, **not ARM-built or ABI-checked**. Not embedded in the IPK.
- Versioned [capability schema](schemas/capability-v1.schema.json), mocked host
  tests and [CI](.github/workflows/host.yml).

See [build and package instructions](docs/build.md),
[validation results and limits](docs/validation.md),
[safety/privacy boundaries](docs/safety.md), and the
[human-operated C1 protocol](docs/device-tests/lg-c1-phase-0.md).

```sh
npm ci --no-audit --no-fund
npm run lint
npm test
cmake -S . -B build/host -G Ninja
cmake --build build/host
ctest --test-dir build/host --output-on-failure
npm run package
python3 scripts/verify-ipk.py dist/io.github.tpapaz.multiview.probe_0.1.0_all.ipk
```

The web IPK has been packaged/inspected locally. It has **not been installed or
tested on a TV**. There are no genuine C1 logs yet. The next gate is a consented
passive C1 report and cleanup verification; active dual-surface/HDMI tests need
later reviewed plans. SMP exported windows are a candidate presentation route;
a safe second independent HDMI session remains the unanswered ingress question.

[ROADMAP.md](ROADMAP.md) defines all later phases; [AGENTS.md](AGENTS.md) and
[CODEX_KICKOFF.md](CODEX_KICKOFF.md) retain the supplied contributor instructions.
