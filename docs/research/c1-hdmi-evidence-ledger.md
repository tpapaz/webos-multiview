# C1 HDMI evidence ledger

The detailed collection receipts and firmware traces are retained locally.
These results apply to the LG OLED C1 on firmware 03.53.45.

## Collected inputs and actual outcomes

| Evidence | Finding |
|---|---|
| Version 0.1.12 physical trial | HDMI 4 showed moving video and audible sound in the app's fixed window. The app exited and normal operation returned. |
| Earlier local-media playback | Both clips advanced together on separate main and secondary views. The main clip continued after closing the secondary clip. |
| Saved configuration and static review | Two presentation routes are a candidate. Independent physical receiver allocation, first scaler ordering and isolated release remain unknown. |
| Bounded ResourceManager mapping lookup | Timed out during connection. SSH closed and the attempt is spent. |

[C1 HDMI findings](c1-hdmi-interface-map.md) · [Device journal](../device-tests/c1-journal.md)
