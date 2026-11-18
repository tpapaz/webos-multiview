# C1 HDMI evidence map

LG OLED C1, firmware 03.53.45. [Current status](../../STATUS.md) · [Device journal](../device-tests/c1-journal.md)

## Verified result and limits

Version 0.1.12 showed continuously moving HDMI 4 with audible sound during
one eight-second trial. The 960 × 540 picture appeared in the center of the
app's window. Open, select, stop and close returned acknowledgments. The
app terminated independently and the owner observed normal picture, sound
and remote control again without recovery. Hardware resource release and
independent audio ownership remain **unknown**.
[Observed trial](../device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound)

The earlier local-media trial showed that the main and secondary views can
display independent local clips. [Local-media findings](c1-smp-ndl-resource-path.md)

## Independent second-path research

The saved C1 configuration lists the `MAIN` and `SUB0` presentation routes.
The offline review distinguishes physical input selection, receiver
allocation and presentation placement. Window creation, a successful
selector response and a cached association do not establish that two
receivers independently own their inputs.

**Unknown.** The evidence has yet to show HDMI 2 getting its own secondary
route before its first scaler request. It also has yet to show two physical
sources moving together or one session releasing its resources while the
other keeps playing.
[Dual-input design under review](../device-tests/current-plan.md#review-only-dual-source-experiment)

## Can the app wait for HDMI 2 to confirm SUB0?

**Unknown on C1 03.53.45.** Fresh port selection creates and starts the
connector in the same request. Once ready, a connector with its default type
requests `MAIN_SCALER`. Deferred window attachment and cached sink replay
give the app no verified way to hold this HDMI 2 connector until its own
`SUB0` update takes effect.

## Does browser load start HDMI scaler preparation?

**Verified in saved C1 code for a fresh, non-autoplay element.** DOM `load()`
opens a logical input session. DOM `play()` drives physical port selection,
which creates and starts the connector in one request. Holding `play()` delays
creation as well as scaler preparation. The browser exposes no verified
interval to apply `SUB0` to the fresh connector before it starts.

## Can HDMI 2 select SUB0 during setup?

| Path reviewed | Result on C1 03.53.45 |
|---|---|
| Direct UTP, browser and alternate frontend | The saved HDMI open and switch paths carry no secondary sink into connector creation. |
| Legacy renderer and AV proxy wrapper | Setup and render-ready are separate, but the reviewed caller neither binds physical HDMI 2 nor applies the stored secondary role to the connector before ready. |
| Native input connector | The reviewed caller selects a fixed different port and provides no initial sink argument. |
| SMP/NDL | Early sink selection is evidenced for media playback. The reviewed HDMI resource reports no caller-selected binding to port 2. |

The connector can request `SUB_SCALER` when the secondary type is applied
early enough. The saved C1 callers provide no verified way for the app to
force that ordering on its own HDMI 2 connector. A later `SUB0` descriptor
shows the later route. The first scaler request remains **unknown**.
[Remaining options](c1-hdmi-evidence-ledger.md#remaining-options)

## Glasshouse preview source and owner observation

Glasshouse provides a separate single-input preview reference. Our verified
HDMI 4 trial used the direct UTP path.
[Glasshouse source report](https://rorygallagher2024.github.io/glasshouse/development/TV-RESEARCH/#lgs-recent-input-preview-g3-webos-922)

## HDMI 4 with a built-in tuner feed

**Candidate.** The saved Glasshouse source plays a single tuner preview
using a broadcast preview media type and a `tv://` channel source. The
maintainer reports that this preview worked on a G3. The saved C1 browser
engine contains the broadcast preview media type and `tv://` strings.
Those observations give us a known caller and a starting point for tracing
the C1 implementation offline.
[Glasshouse call site](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L2299-L2379) · [C1 browser capture](../device-tests/c1-journal.md#c1-browser-engine--read-only-capture)

**Unknown on C1.** The missing chain is preview creation under the app's own
identity, binding an independent tuner session to the secondary window while
HDMI 4 stays live, and closing only that tuner session. The code for a lone
preview gives no evidence of a secondary assignment or of coexistence with
an owned HDMI session. The next offline gate is to trace those three steps
through the saved C1 browser and broadcast evidence.
