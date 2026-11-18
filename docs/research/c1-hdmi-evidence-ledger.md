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
| Keep two app-owned physical HDMI windows on the C1 | Wait for a reproducible app-owned path that assigns the secondary sink before the first scaler request, or a new source that links HDMI 2's stock backend to its actual connector from registration onward. The stock join would answer the ordering question. App-owned configuration still needs its own evidence. |
| Continue with a narrower C1 app feature | The offline check found clip-only unload and secondary-window placement feasible in the local control. HDMI motion and sound through the same sequence remain **unknown**. [Mixed-source feasibility](c1-smp-ndl-resource-path.md#hdmi-4-with-a-secondary-local-clip) |
| Get two pictures for normal viewing | An external HDMI multiviewer can combine two sources into one HDMI feed for the C1, with layout controlled externally. Stock Multi View is another option on an LG model whose documentation explicitly supports the desired HDMI pair. Verify source formats and content-protection compatibility for either route. [External multiviewer example](https://support.orei.com/hc/en-us/articles/41705322972183-UHD-201MV-Overview-and-Use-Cases) · [Documented LG model](https://www.lg.com/us/tvs/lg-oled77g4wua-oled-4k-tv) |

Native dual-HDMI implementation is paused pending new evidence. Repeat stock
switches and rescans of the same firmware are closed.
A runnable experiment still requires a fresh app-owned connector tied to
physical HDMI 2, confirmed early secondary-sink application, evidence of
independent receiver eligibility and a reviewed isolated cleanup path. Dual
physical HDMI on this C1 remains **unknown**.
[Review-only gates](../device-tests/current-plan.md#review-only-dual-source-experiment)

## Source combinations

The strongest C1 evidence is for two app-owned local video streams. Mixed
combinations depend on how the app gets each picture and which decoder,
presentation and foreground resources it needs.

| Combination | What the evidence supports |
|---|---|
| Local clip + local clip | **Verified** briefly on this C1 with explicit main and secondary presentation. Audio ownership remains unknown. [Local control](c1-smp-ndl-resource-path.md) |
| HDMI + local clip | **Candidate** with the strongest saved mixed-source evidence. A silent clip can target the native secondary route. Coexistence and cleanup under HDMI load remain unknown. [Timing check](c1-smp-ndl-resource-path.md#timing-against-the-hdmi-deadlines) |
| HDMI + network camera images | **Candidate.** MJPEG or snapshots can be drawn as images and avoid a second native video decoder. A homebrew project reports MJPEG overlay on G4. App-owned HDMI and the image overlay still need to be shown together on C1. [Camera overlay project](https://github.com/iDaddyCz/ha-lg-webos-pip) |
| Network stream + network stream | **Candidate.** Two decoded local clips give us a presentation path to try with streams the app can receive and decode. IPTV multiview implementations give a separate precedent. Bandwidth, startup, codec and decoder limits need measurement on the C1. [IPTV prior art](prior-art.md#network-playback-and-app-lifecycle-prior-art) |
| HDMI + IPTV or other network video | **Candidate.** Establish HDMI plus the controlled local clip first, then try an authorized network source on the same secondary playback route. Live startup, buffering and audio bring separate variables. |
| HDMI + tuner, screen share or a separate TV app | **Unknown on C1.** LG documents specific pairs such as HDMI plus YouTube or screen share on supported models. A separate TV app also needs system support for foreground policy, focus and presentation, with its normal content protections in place. [LG Multi View guide](https://www.lg.com/us/support/help-library/lg-tv-how-to-use-multiview--20153280988637) |
| HDMI + HDMI | **Unknown for app-owned windows on C1.** LG documents two HDMI inputs in stock Multi View on specific models. A stock test there could establish supported formats and controller behavior on that firmware. [G4 specifications](https://www.lg.com/us/tvs/lg-oled77g4wua-oled-4k-tv) · [Saved G4 comparison](prior-art.md#retail-g4-comparison) |

Three simultaneous hardware video pictures remain **unknown**. Image overlays
can add views from compatible feeds while using a different rendering path.
