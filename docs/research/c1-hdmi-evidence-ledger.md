# C1 HDMI evidence ledger

The detailed collection receipts and firmware traces are retained locally.
These results apply to the LG OLED C1 on firmware 03.53.45.

## Collected inputs and actual outcomes

| Evidence | Finding |
|---|---|
| Version 0.1.12 physical trial | HDMI 4 showed moving video and audible sound in the app's fixed window. The app exited and normal operation returned. |
| Earlier local-media playback | Both clips advanced together on separate main and secondary views. The main clip continued after closing the secondary clip. |
| Stock HDMI 2 capture | Port 2 was tied to video output on `MAIN`. The accepted ownership reply was for a different pipeline. Nearby scaler requests remain unlinked to HDMI 2. |
| Saved C1 static evidence | The direct and browser loaders start a fresh connector during port selection. No reviewed app path verifies that `SUB0` takes effect before the same HDMI 2 connector's first request. |
| Saved G4 03.11.20 comparison | A secondary-first path exists, and an early initial status can allow a default scaler request. The first live request remains **unknown**. |
| Bounded ResourceManager mapping lookup | Timed out during connection. SSH closed and the attempt is spent. |

[C1 HDMI findings](c1-hdmi-interface-map.md) · [Device journal](../device-tests/c1-journal.md) · [G4 comparison](prior-art.md#retail-g4-comparison)

## Remaining options

| Option | What would move it forward |
|---|---|
| Keep two app-owned physical HDMI windows on the C1 | Ask whether LG offers an app interface or a partner-supported integration that can assign the secondary sink before the first scaler request. The public Luna API list contains no such interface. [LG API reference](https://webostv.developer.lge.com/develop/references/luna-service-introduction) · [LG Developer contact](https://webostv.developer.lge.com/contact) |
| Reopen passive stock research | Require a new source that can link the HDMI 2 backend to its actual connector and observe requests from registration onward. This would answer the stock ordering question. App-owned configuration would still require its own evidence. |
| Continue with a narrower C1 app feature | If one source is already available as local or network video, evaluate it alongside one physical HDMI input. HDMI plus media coexistence on the C1 is a separate **candidate**, with motion, audio and cleanup still to verify. |
| Get two pictures for normal viewing | An external HDMI multiviewer can combine two sources into one HDMI feed for the C1, with layout controlled externally. Stock Multi View is another option on an LG model whose documentation explicitly supports the desired HDMI pair. Verify source formats and content-protection compatibility for either route. [External multiviewer example](https://support.orei.com/hc/en-us/articles/41705322972183-UHD-201MV-Overview-and-Use-Cases) · [Documented LG model](https://www.lg.com/us/tvs/lg-oled77g4wua-oled-4k-tv) |

The question for LG is whether webOS TV 6 on the OLED C1 offers a supported
third-party API for two independent physical HDMI inputs in app-owned windows
with secondary-sink assignment before playback.

Pause native dual-HDMI implementation while that question is open. Repeat
stock switches and rescans of the same firmware are closed.
A runnable experiment still requires a fresh app-owned connector tied to
physical HDMI 2, confirmed early secondary-sink application, evidence of
independent receiver eligibility and a reviewed isolated cleanup path. Dual
physical HDMI on this C1 remains **unknown**.
[Review-only gates](../device-tests/current-plan.md#review-only-dual-source-experiment)
