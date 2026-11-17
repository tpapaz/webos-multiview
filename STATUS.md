# Current status

Updated 2026-11-18. [Roadmap](ROADMAP.md) · [Documentation](docs/README.md) · [Current procedure](docs/device-tests/current-plan.md)

## Verified milestone

Version 0.1.12 displayed moving video and audible sound from physical HDMI 4
in a fixed app window during one short trial on an LG OLED C1 running
firmware 03.53.45. The app terminated independently. Normal picture, sound
and remote control returned after exit.
[Device outcome](docs/device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound)

Independent HDMI 1 and HDMI 2, sustained stability, audio ownership and
isolated release remain **unknown**. Direct UTP remains the prototype's
input path. [Prototype contract](native/phase2-hdmi-candidate-0.1.12/README.md)

## Single next task

Use the saved offline evidence to determine whether HDMI 2 can receive its
own secondary presentation route before its first scaler request. The LG G4
03.11.20 comparison identified a conditional secondary-scaler path. Its
ordering on a fresh stock HDMI 2 session remains **unknown**.
[C1 findings](docs/research/c1-hdmi-interface-map.md) · [G4 comparison](docs/research/prior-art.md#retail-g4-comparison)

The bounded ResourceManager mapping lookup timed out and is spent. The
retained app-specific permission grant still awaits separate cleanup. The
dual-source device trial remains at the design review stage.
[Current device disposition](docs/device-tests/current-plan.md)
