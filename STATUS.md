# Current status

LG OLED55C14LB · firmware 03.53.45 · updated 2026-11-23.
[Research history](docs/research/c1-hdmi-evidence-ledger.md#research-history) · [Roadmap](ROADMAP.md) · [Device procedure](docs/device-tests/current-plan.md)

MultiView is the foreground app. It opens the selected sources and owns the
panes where they advance independently. The Phase 2 hardware milestone is
independent HDMI 1 + HDMI 2 playback. [Roadmap](ROADMAP.md#objective-and-position)

## C1 trial readiness

**All pair trials are parked or deferred.** Each row names the missing
evidence that would justify reopening that route.

| Route | Result and reopening condition |
|---|---|
| HDMI 1 + HDMI 2 | Native pair design paused before a two-input launch. Verify HDMI 2 can acquire its own receiver and select the secondary scaler before its first scaler request. [Parked design](docs/device-tests/archive/c1-dual-hdmi-design.md) |
| HDMI 4 + HDMI 1 | Browser sources took turns. The offline ownership core preserves the registered parent, but the C1 port-1 reply cannot distinguish a fresh session from adoption. Identify an app-owned physical open that proves freshness and gives the app control of the video child. [Ownership finding](docs/research/c1-hdmi-interface-map.md#does-the-port-1-open-reply-establish-a-fresh-session) |
| HDMI 4 + built-in tuner | The tuner replaced HDMI 4 in browser probe 0.1.5. Verify an app-owned secondary scaler at startup, or show that moving the first source to `SUB0` frees `MAIN` before the second starts. [Device result](docs/device-tests/c1-journal.md#hdmi-4-and-live-tuner-playback) · [Secondary allocation](docs/research/c1-hdmi-interface-map.md#tuner-secondary-allocation) |
| Two built-in TV channels | The paired offline checks preserved the first allocation and yielded no second decoder grant. Identify an app-owned path that attaches the second service's demux to the tuned front end and acquires its own decoder and output. [DVB attachment checks](docs/research/c1-hdmi-interface-map.md#dvb-attachment-candidates) |
| HDMI 4 + silent local clip | Native 0.1.13 passed its idle lifecycle check. The playback preflight found zero coverage for the four HDMI methods. This local-media control is deferred. [Device result](docs/device-tests/c1-journal.md#hdmi-4-and-silent-clip-playback-preflight) |

## Verified controls and artifacts

- Native **0.1.12** is the retained single-input control. It showed moving
  physical HDMI 4 with sound and restored normal viewing on exit. The same
  app ID now has **0.1.13** installed, tested for idle lifecycle.
  [First picture](docs/device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound) · [Installed native probe](docs/device-tests/c1-journal.md#hdmi-4-and-silent-clip-0113-lifecycle)
- Browser preview **0.1.0** also showed HDMI 4 with sound. The separately
  installed browser pair probe **0.1.5** was tested with the tuner.
  [Browser builds and results](docs/build.md#browser-hdmi-preview)
- The stock HDMI 1 receiver capture ended with an unknown receiver index.
  [Receiver receipt](docs/device-tests/c1-journal.md#stock-hdmi-1-receiver-grant-window)
