# Physical HDMI picture candidate 0.1.7

[Status](../../STATUS.md) · [Current plan](../../docs/device-tests/current-plan.md)

Built, host-tested, packaged and direct-ABI checked locally; **installed and actually TV-tested once, with setup failure before acquisition; no HDMI picture verified**. No simulator test. This package contains the physical UTP adapter. Do not manually open it.

Derived from preserved 0.1.4 with native version/report identifiers changed only.
Both strict three-second boot/realtime windows, recheck before SDL/LS2, fixed
HDMI 4, transparent/type-2 own window, NormalWindow, rectangle (480,270,960,540),
returned-own-ID cleanup and +17/+22/+25-second bounds are unchanged.
[Original contract and limitations](../phase2-hdmi-window/README.md).

The preserved 0.1.7 sources below are unchanged. An offline-only
[startup-order patch](registration-before-graphics.patch) registers our named
public handle before SDL can claim the same name through LG's helper. It was
validated only in an isolated source copy/ELF, with no new IPK or TV run.
[Mechanism, validation and uncertainty](../../docs/research/c1-hdmi-interface-map.md#registration-identity-and-smallest-correction).

Host producer: scripts/tv-launch-authority.cjs (TV-derived epoch sample, separate
monotonic freshness, one-shot dispatch). The inert 0.1.6 run verified its admission
on this C1; it did not verify physical acquisition, graphics or current permission
coverage. No host epoch fallback or native guard relaxation.

Exclusive report: /tmp/io.github.tpapaz.multiview.hdmiwindow/picture-0.1.7.json
and its /var/palm/jail/io.github.tpapaz.multiview.hdmiwindow alias. Existing reports
are untouched; report cap 2 KiB, owned directory 0700/file 0600, no overwrite.
Validator: scripts/hdmi-picture-report.cjs. Valid reports do not establish actual
exit or hardware release. Original packages, native sources and launch authority
remain preserved.

Package: dist/io.github.tpapaz.multiview.hdmiwindow_0.1.7_arm.ipk (21,226 bytes),
SHA-256 0316f3cd3e4300683b019a7b3ccba610a002c2e4edd96c5167ad201d14f38bb7.
ELF: 44,724 bytes, SHA-256
9deffd0239b8c0820175f7d0b258e99005f94f750ddf1fe0bdcb7116bdc597b9.

Local commands completed:

```powershell
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/scripts/prepare-hdmi-picture.py
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/scripts/check-hdmi-picture-deadlines.py
npm test
npm run lint
git diff --check
```

Host acquisition/cancellation/cleanup CTest 1/1; ARM build; exact provider/version
ABI (96 imports/nine DSOs); IPK allowlist/contents/Linux modes; current report
privacy/cleanup acceptance and nine actual producer-to-native deadline cases pass.
The bridge initially lacked a linker alias and then passed using CMake’s exact
json-c path; its original failed output is retained.
Build/validation records: build/phase-2/hdmi-window-0.1.7/.
No library, policy, installer, service or autostart is packaged.

Read-only current admission/binding verification passed; actual live-caller UTP
admission remains unknown. The physical host controller now has a locally validated
[current implementation/scope](../../docs/device-tests/current-plan.md#completed-bounded-procedure-and-reusable-limits)
before any picture trial. No app launch occurred during verification.

The single owner-authorized 0.1.7 physical attempt was actually TV-tested and
returned setup_failed after 527 ms before acquisition, with a valid report and
self-reported local cleanup. No picture success, exact setup substage or actual
exit was established. [Actual result](../../docs/device-tests/c1-journal.md#017-physical-picture-trial--setup-failed-before-acquisition).
The report slots are now occupied evidence; never clear/relaunch to retry.
