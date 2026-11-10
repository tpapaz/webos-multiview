# webOS MultiView

Research toward two independently live physical HDMI inputs in PiP or split
screen using the TV's hardware. The reference device is a rooted LG OLED C1
running firmware 03.53.45 (webOS SDK 6.5.3). Simultaneous HDMI remains
**unknown**. The reference setup currently has one connected HDMI source.

| Experiment | C1 status |
|---|---|
| Phase 0 passive probe | **Verified** metadata query, redacted report retrieval over Web Inspector, remote navigation, Close and uninstall. HDMI picture and sound were normal after exit. On-TV JSON download remains **unknown**. |
| Native SMP | **Verified** single-clip playback and window movement. In the staged dual test, A's callbacks stalled after B's Load and resumed after B's release. The software decoder request for B produced zero B frame callbacks in its solo timeout. Actual decoder selection remains **unknown**. |
| Browser HTML5 | **Verified** both clocks advanced in solo runs. In the dual run, A paused after B was requested and B advanced. Visible presentation remains **unknown** for the automated run. |
| NDL DirectMedia v2 | **Candidate** native path into the same media engine. The one-clip ARM IPK is built, packaged and checked against the C1 firmware ABI. Playback on the TV remains **unknown**. |

## Build and test

From PowerShell with the host dependencies installed:

```powershell
npm ci --no-audit --no-fund
npm run lint
npm test
npm run package
```

See the [build guide](docs/build.md) for the browser IPK and the ARM SDK
build, packaging, and verification commands. Device evidence is recorded in
the [Phase 0 report](docs/device-tests/2026-11-10-csp-startup.md) and the
[Phase 1 test record](docs/device-tests/lg-c1-phase-1.md).

The next test is one video-only clip through NDL DirectMedia v2. Install the
NDL IPK in Dev Manager, open **MultiView NDL Clip Test**, then run
`node scripts/run-phase1-ndl-ssh.cjs` from the development PC. Watch for the
clip's visible clock to advance and check normal viewing after the app exits.

The [roadmap](ROADMAP.md) defines the playback and physical-input gates.
See [prior art](docs/research/prior-art.md) for pinned references and
[safety boundaries](docs/safety.md) for device work.
