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

The existing app can wait between opening a logical session and selecting
an HDMI port. The saved call sequence gives no verified app-controlled wait
after connector creation or evidence of a confirmation for the same
connector's first scaler choice.

## Glasshouse preview source and owner observation

Glasshouse provides a separate single-input preview reference. Our verified
HDMI 4 trial used the direct UTP path.
[Glasshouse source report](https://rorygallagher2024.github.io/glasshouse/development/TV-RESEARCH/#lgs-recent-input-preview-g3-webos-922)
