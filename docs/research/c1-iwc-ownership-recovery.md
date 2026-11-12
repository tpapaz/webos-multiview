# C1 IWC ownership and recovery trace

> Research/tool record. [Current status](../../STATUS.md) · [Documentation index](../README.md). Earlier next steps and untested labels describe that stage; use Status and later device records for current results.

Date: 2026-11-11. Reference device: LG OLED C1, firmware 03.53.45,
webOS SDK 6.5.3. **Static firmware research only; no behavioral TV test.**
The owner authorized read-only tracing. No Luna method, app launch, input
switch, capture, setting change, service restart, build or IPK was performed.
Phase 1 remains partial and simultaneous HDMI remains **unknown**.

Plan/gate: start with the [saved HDMI frontend evidence](c1-hdmi-interface-map.md),
locate the IWC provider/policy, trace routing and arbitration through its
handlers, distinguish publication cleanup from controller-death recovery,
and record the remaining conditions for a future bounded viewport test.

## Result

**Verified/static:** C1 IWC is a native publication registry and command relay.
Its geometry controllers issue one-shot setters against published windows.
The inspected method table has **no controller acquire/release or lease API**.
No controller-disconnect restoration hook was identified in its startup,
handlers or imports. Closing a controller therefore has no evidenced automatic
inverse operation in this service. Actual viewport recovery remains untested.

| Question | Status and evidence | Consequence |
|---|---|---|
| Provider and policy | **Verified/static:** legacy public/private service files name `/usr/sbin/com.webos.service.iwc`, type dynamic. Both legacy role files declare the service name and wildcard inbound/outbound access [I1–I3]. The installed repository diagnostic has its own declared caller identity and outbound policy [C1–C3 below]. | The earlier newer-style filename misses did not establish service absence. Actual Homebrew caller admission is still **unknown**; installed declarations are not a successful authorization check. |
| Controller ownership | **Verified/static:** setters match a registered publish ID and window ID; payload app ID is forwarded as metadata [I3: `0x6008`, `0x6d80`]. No caller identity or controller-lifetime association was identified in the inspected path. | A publish ID routes to a frontend. It is not an evidenced exclusive controller lease. Do not impersonate the stock publisher or take over its publication. |
| Arbitration | **Verified/static:** geometry setters normalize priority to 0 or 99. For the same current publish ID, a lower priority is rejected; equal priority can replace geometry [I3: `0xad2c`, `0xaf18`, `0x6dda`]. | Priority is not ownership. No per-controller stack or automatic restoration to a previous request was found. |
| Applied geometry | **Verified/static:** accepted setters broadcast a command to publisher subscribers. The setter response contains the manager's Boolean result, without an application acknowledgment [I3: `0x6e18`, `0x68b6`, `0x8896`, `0xaf8c–0xafca`]. | `returnValue: true` cannot prove that the HDMI viewport moved or that restoration completed. |
| Publication cleanup | **Verified/static:** `stopPublishWindow` removes registry entries and updates the published list [I3: `0x6468`, `0x6510`]. | It is not controller release and does not itself emit a restoring geometry command. Never use it to clean up a controller's changes to the stock HDMI window. |
| Recovery | **Verified/static:** frontend recovery reaches a C1 compositor handler that clears original-input/crop-source state and applies the destination [P1, R1–R2 below]. **Unknown/device:** controller crash, denied restore, cancellation and actual normal-view restoration. | A full-view-baseline reset has a concrete code path. It still needs independent explicit restoration; no IWC lease or automatic controller-death recovery was found. |

## Publication, controller requests and delivery

The root method table at ELF virtual address `0x2102c` has these six entries;
`getMethods` at `0x87d4` returns it. Function addresses below have the Thumb
bit cleared. Names/fields are a reverse-engineered contract, not public LG
API guarantees and not instructions to call these methods during discovery.

| Method / handler | Inspected request boundary |
|---|---|
| `publishWindow`, `0x8bd4` | Publisher app/window identity, width/height and subscription; optional `multiplePublish`. Default/false first removes that app's previous publications (`0x915a`); true skips that replacement (`0x952e–0x953c`). It then publishes and adds a shared `publishWindow` subscription (`0x91be`, `0x91e6`). This mutates registry state. |
| `stopPublishWindow`, `0x98a4` | Accepts a numeric publish ID or a string app ID, dispatched to the corresponding removal overload (`0x9b56`, `0x9cc6`). This removes publisher state, not controller state. |
| `listPublishedWindows`, `0xa0d4` | Builds a list; subscribes only if the message is a subscription (`0xa18c`, `0xa4a8`). Returned fields include publish ID, app/window identity and published width/height. No current destination/crop/priority snapshot appears in this listing. It was not invoked. |
| `setExportedWindow`, `0xa68c` | Publish ID, app/window strings and destination rectangle with numeric x/y/width/height converted to integers; optional numeric priority. |
| `setCropRegion`, `0xb3dc` | Same target identity, destination, original-input and source rectangles, plus optional priority; reaches the API wrapper at `0xc46c`. |
| `setProperty`, `0xc960` | Separate named-property command. It is unnecessary for destination-only research; no property mutation was attempted. |

`IWCManager::findPublishedWindow(int,string)` at `0x6008–0x6050` looks up the
publish ID and compares the stored window string. `setExportedWindow` calls
that lookup at `0x6dc6`; its app ID argument is subsequently stored for the
outgoing message, not checked there against the registry's app ID. The inspected
binary's LS2 imports include payload access, message reference/reply, service
registration and subscription add/reply. They contain no sender-identity accessor,
server-status watcher, outgoing `LSCall`, or subscription-cancellation callback
registration. This bounds the observed implementation; it is not a Homebrew
permission test or authorization to bypass the bus's caller policy.

Priority is not a general numeric ordering supplied unchanged by a caller:
omitted priority becomes 99 (`0xad2c`); numeric zero becomes 0 and any nonzero
value becomes 99 (`0xaf18–0xaf22`). The manager compares current/requested
priority only when the requested publish ID equals its current one
(`0x6dda–0x6de8`). A different registered publish ID bypasses that comparison.
Accepted requests replace the manager's current target/rectangle/priority fields
and call `updateDisplayWindow` (`0x6dea–0x6e18`); crop uses the analogous path
at `0x6f72–0x6fc8`. No controller token, saved previous rectangle or release
operation is created by these paths.

`updateDisplayWindow` constructs target metadata, command and parameter fields,
then invokes the publisher callback (`0x67ac–0x68b6`). The callback broadcasts
through the shared `publishWindow` subscription key (`0x8894–0x8896`). Its
failure path prints/frees the LS2 error and returns (`0x8930–0x8944`), without
restoring geometry. The setter returns the manager result at `0xafaa–0xafca`;
there is no publisher/applied-rectangle acknowledgment in that chain.

## Recovery boundary

The saved stock frontend [P1] implements the following narrower lifecycle:

- Lines 57 and 95–104 publish while activated and outside live-menu PiP;
  otherwise they cancel the subscription and separately request stop-publish.
- Lines 1150–1204 apply matching-publish geometry/crop commands unless
  live-menu PiP suppresses them. The handler assigns `response.publishId`
  afterward, including after its mismatch branch. Treat this as frontend
  routing logic, not a robust controller-ownership token.
- Lines 1207–1227 set the destination to `(0,0,originalWindowWidth,
  originalWindowHeight)` on a stop-publish **response**, unless live-menu PiP
  is active. This handler does not first require `response.returnValue` to
  be true. Lines 263–270 also call recovery on app activation if a window ID
  exists. These are explicit frontend actions, not IWC controller-death hooks.
- This recovery calls the ordinary exported-window path. The follow-up below
  resolves its C1 compositor behavior: it clears original-input/crop-source
  rectangles before applying the destination. The frontend's saved crop
  variables are not themselves a snapshot of arbitrary prior display state.

IWC's removal functions erase the relevant map entries and notify the list;
neither calls `updateDisplayWindow`. No callback connecting controller message
cancellation or bus disconnect to geometry restoration was identified. Ordinary
LS2 subscription removal must not be equated with resetting the separate
application's viewport. An inactive/dead publisher receiving no command also
does not undo an already applied rectangle.

Thus there is **no evidenced bounded controller lease** to acquire/release in
this service. Full-window recovery by the stock app is a **candidate** manual
recovery route, subject to actual lifecycle and picture/sound observations.
Automatic crash restoration and preservation of an arbitrary pre-existing
crop/viewport remain **unknown**. The shipped QML/Enyo EPG example entry files [E1] supplied
no IWC controller or explicit IWC restore convention in this bounded check.

## Caller identity follow-up

The existing `io.github.tpapaz.multiview.endurance` installation was inspected
as a **passive policy specimen only**; it was not opened, modified or used to
call IWC. This does not reopen the closed idle investigation.

Its devmode manifest [C1] references both legacy roles in
`/var/palm/ls2-dev/roles/{pub,prv}/` and an app client-permission file.
Both roles [C2] bind the actual packaged executable, include the real app ID
in `allowedNames`, and declare wildcard outbound for that ID. The client file
[C3] grants the `public` group. IWC's provider manifest [C4] references the
previously retrieved legacy wildcard-inbound roles and dynamic service files.
Thus **verified/static:** the examined role/service-name declarations contain
no IWC exclusion for the repository app's own identity. **Candidate:** use a
real installed repository app identity, never a stock app identity. A future
HDMI package must have its own generated policy reviewed; it cannot inherit
another package's declarations by copying an app-ID string.

There are still distinct policy layers. IWC calls ordinary `LSRegister` at
`0x7fce`; the retained LS2 wrapper at `0xc3c4–0xc3d2` supplies false for its
public-registration flag. The retained diagnostic instead explicitly registers
a public handle. This difference must be preserved, but does **not** prove
that a public caller is denied IWC: the inspected init job names a hub with
one common configuration that references legacy and devmode manifests [C5]. Do not
infer two disjoint physical buses or assume either handle form is sufficient.

The hub config declares security enabled and `AllowNullOutboundByDefault=true`;
neither disables method-group checks. C1 hub code separately checks outbound
and inbound service-name permission (`LSHubIsClientAllowedToQueryName`, calls
at `0x31bda`, `0x31be8`) and method/category groups (`LSHubIsCallAllowed`, entry
`0x32724`, group lookups `0x3276a`, `0x328c6`) [C6]. The live loaded masks,
registration, jail/container identity and actual admission were not queried.
**Unknown:** which legitimate handle/app-registration form admits the future
caller to IWC's specific methods. No role edit, security disablement, borrowed
media/system name or anonymous-identity workaround is justified by these files.
Personal devmode certificate contents were not read.

## Explicit destination/crop reset after controller failure

The exact C1 client-to-compositor chain now establishes the reset operation:

1. Saved `InputCommon::setExportedWindow`, `0xce3a–0xce70`, constructs a
   logical source region `(0,0,1920,1080)` and forwards the supplied destination
   [P1's executable; hash in the HDMI map]. This is a logical coordinate
   convention, not a measured HDMI input resolution.
2. The platform library [R1] stores source/destination at `0x1a646–0x1a660`
   and sends ordinary Wayland `set_exported_window` at `0x1a8b2–0x1a8b8`.
   Crop instead sends three regions at `0x1acd8–0x1ace0`. Coordinates are
   scaled by the window's device-pixel ratio before marshaling.
3. The **C1 server** [R2] ordinary handler, `0x6533c`, ignores that incoming
   source argument. Stores at `0x653e8/0x653f2` and `0x653ee/0x653f6` clear
   the original-input and crop-source rectangles (internal empty QRect
   endpoints `0,0,-1,-1`), then call `setDestinationRegion` at `0x653fa`.
   The crop handler populates those same fields at `0x656e2–0x656f0` and
   `0x6568a–0x65698`, confirming what the ordinary path clears. Do not substitute
   newer OSE source-region handling for these retail C1 instructions.
4. The destination setter calls `setVideoDisplayWindow` at `0x65270` and
   `updateExportedItemSize` at `0x65276`. This is **verified/static dispatch**,
   not observed hardware application.

The version-1 exported-window protocol descriptor at `0xa8aa8` has four
requests and one event; its sole event at `0x8a588` is `window_id_assigned`.
A geometry-applied acknowledgment and current-geometry query are
**unsupported by this inspected interface**. No IWC current-crop query was
found either. Destroying the stock exported window is not a restore recipe:
the destroy entry `0x65ca8` reaches `wl_resource_destroy` at `0x65d54`, not
the normal full-window reset path.

Consequently the justified future failure plan is **full-view-baseline reset**,
not arbitrary prior-state rollback. Start only from an owner-confirmed normal,
uncropped selected HDMI view with known logical full-window dimensions. Keep
the existing publisher and source selection. A healthy independent restorer
would send the ordinary full-window destination operation, clearing crop state
through the chain above, if the actor fails or reaches its deadline. It must
survive the actor, hold its own permitted identity, and have its own bounded
restore deadline; a cleanup handler inside the failed actor is insufficient.
Do not use `stopPublishWindow`, input switching, window destruction or service
restarts as that inverse operation.

This is a **candidate design requirement, not implemented or TV-tested**.
It covers actor failure only while the restorer and transport remain healthy;
it cannot promise recovery if the restorer itself crashes or loses access.
Stale target identity, competing stock geometry, denied restore, transport loss
or unconfirmed picture/sound must stop the test and require normal remote
recovery. Retain live IDs privately, not in reports. Actual applied restoration
requires separate owner observation; IWC success and process exit cannot pass
it. A cropped/PiP starting state remains out of scope without an authoritative
snapshot and explicit restore contract. No active experiment is authorized here.

## Evidence and validation

New local evidence is ignored under `build/phase-2/iwc-trace-20261111/`.
Preserve these files; do not redistribute firmware, QML or disassembly.

| Ref | Fixed TV path / local copy | SHA-256 |
|---|---|---|
| I1 | `/usr/share/dbus-1/services/com.webos.service.iwc.service` and matching `system-services/` file → `iwc-0.bin`, `iwc-1.bin`; lines 2–4 | `49631281dc1d1ae161236a159136cae0c6d529d2d641f82165e3fbc82c9b56db` (both) |
| I2 | `/usr/share/ls2/roles/pub/com.webos.service.iwc.json` and matching `prv/` file → `iwc-2.bin`, `iwc-3.bin`; lines 3–5,10–12 | `20470286c79090f9e48bd50cac0e234fb9be8fe9f01f695dbda32d7ea8409d41` (both) |
| I3 | `/usr/sbin/com.webos.service.iwc` → `iwc-4.bin`, 71,280 bytes; ELF32 ARM EABI5 soft-float | `fab68a885b14f2b4fe1de8f14c988cda716d22b3c7012ee15a66a706e40b0906` |
| P1 | Saved `DisplayVideoModel.qml` → `../hdmi-discovery-20261111/route-5.qml`; publisher wrapper is `route-2.qml` | `d61ee398fef6a9ff4e60155041965684657f4b4cfa0c87006f7cc90fc665437f`; wrapper hash in the [HDMI map](c1-hdmi-interface-map.md#provenance-and-local-evidence) |
| E1 | `/usr/palm/applications/com.webos.exampleapp.qmlapp.epg/main.qml` and `com.webos.exampleapp.enyoapp.epg/index.html` → `example-main-0.txt`, `example-main-1.txt` | `340506855aa43e9b11110df48227b7f17111fed8c1bc26ec7a35991c27a98548`; `c97c7e95ec2a755ac7b1cc8433643227cf7db397f711ce19dffd3a54e11ae19a` |

Saved source was inspected first. An initial sandboxed connection failed
before file retrieval. After the owner confirmed reachability, bounded SFTP
reads outside that sandbox located the legacy paths using the layout in saved
firmware manifests. No Luna API was used to locate/start the dynamic service.
Directory filters, fixed paths, sizes and hashes are in `directory-inventory.json`,
`fixed-path-inventory.json` and the example inventories. Reads had 30-second
caps and file-size bounds; credentials, live IDs, network identifiers and
unrestricted logs were never exported. Public source searches supplied no IWC
implementation; no claim of complete code-search coverage follows.

Local static commands used the existing Linux ARM SDK's `objdump -TC`,
`objdump -dC --section=.text -M force-thumb`, `strings -tx` and `readelf -hSWr`.
Outputs are `iwc.symbols`, `iwc.thumb.asm`, `iwc.strings`, `iwc.elf` and an
annotated assembly view. No target executable was run or decompiler result
claimed. Portable REA export Evidence
`ev_12326f5c3043ffd08952963b804a456764fcfc392665abc1c63d5b2af03898a7`
corroborates identity/export inventory only; saved in `rea-evidence.json`.
`static-review.json` records the six method-table entries, LS2 imports and
finding boundaries. No native REA session was opened.

Validation: `npm test` passed the existing host acceptance checks;
`npm run lint` passed ES5/JSON checks; `git diff --check` passed. Read-only Node
checks verified nine new firmware/example file hashes, method-table termination,
31 local documentation links and Markdown whitespace. Cited frontend lines were
reviewed against the retained files. No tests were added. Native CMake/CTest,
IPK packaging, simulator work and active TV experiments were not run for this
documentation-only change.

Caller/restoration follow-up evidence is saved separately under ignored
`build/phase-2/iwc-caller-restore-20261111/`:

| Ref | Fixed TV path / local copy | SHA-256 |
|---|---|---|
| C1 | `/var/luna-service2-dev/manifests.d/io.github.tpapaz.multiview.endurance.json` → `app-policy-0.json` | `457b7ce3a324a57cb580932311340555222d5a212bb3ee93b3026021546cce33` |
| C2 | `/var/palm/ls2-dev/roles/pub/io.github.tpapaz.multiview.endurance.json` → `core-role-1.bin`; matching `prv/` → `core-role-2.bin` | `28b2d244da8af4eba11d177587b3fa01525773764c9fb56fed834e4b6357f492`; `d3d7e06c4830fc064ed2dbb2e949894dc71ac78cf374d7feb357d7a412128a4a` |
| C3 | `/var/luna-service2-dev/client-permissions.d/io.github.tpapaz.multiview.endurance.app.json` → `app-policy-1.json` | `92edb75c85b9c51268a15213c497d796c35f2a1e23307fdd3d8c1f891890c5be` |
| C4 | `/usr/share/luna-service2/manifests.d/input-window-control-service.manifest.json` → `provider-manifest-0.json` | `6a51bf77e9d5721fbf2a4bb2727f8024eb48b48a5228024ef57d969d86eec79e` |
| C5 | `/etc/init/ls-hubd.conf` → `caller-4.bin`; `/etc/luna-service2/ls-hubd.conf` → `hub-0.bin` | `83d1c16a4d98a8654d7cf7748bfec8eff78b9e6a83cd7343e6a4ec480ebe1163`; `37699fb79f0d31de2266f9cfd4232cc7c2045c0977e706381a2c9c1454dfc14b` |
| C6 | `/usr/sbin/ls-hubd` → `hub-5.bin` | `fe05e830674fd80b99d24d9707926b130d978f62cde0690502c898a614c18299` |
| R1 | `/usr/lib/libwebos-platform-interface.so.1` → `caller-0.bin` | `d5a2fa7400012c8df6429e4460587263fe962bddf0563e0ea6c4c29569d5b41c` |
| R2 | `/usr/lib/libWebOSCoreCompositor.so.0` → `core-role-0.bin`; located through `/usr/bin/surface-manager`'s dependency | `32ccefca06c82b7431aced8208063db0bdcbb72eecb827a623fb2264c08e72e6` |

All new TV operations were bounded SFTP reads. Manifests were searched only
in the three fixed directories named by the hub config, capped at 500 JSON
files per directory, 256 KiB per file, 4 MiB total and 30 seconds. Only the IWC
match was retained; 275 main-directory and three compatibility-directory files
were examined. No Luna service was queried/activated. Saved registration-library
SHA-256: `e731f7ab993de5a29bf5e33b83c51eb86f87e45499701bcfe30ba6cb295e1e5b`.
Derived assembly, `caller-static-findings.json`, `geometry-static-findings.json`
and path/hash inventories retain the evidence. REA export Evidence
`ev_49ebfd872241a5bf76c9e34754ad235f1ca0cdbc08edd0a7d82a750b139ea146`
corroborates the compositor export inventory only. No target was executed,
native analysis session opened, proprietary implementation copied into source,
or new upstream revision used as a substitute for C1 proof.

Follow-up validation: `npm test`, `npm run lint` and `git diff --check` passed.
Read-only checks verified all 11 new retrieved files against their inventory
hashes, both real-app role declarations, 31 local documentation links and
Markdown whitespace. No native build, package, simulator or active device test
was run; no tests were added.

## Next gate

Do not implement the previously hypothesized IWC acquire/release lease: it is
not in this inspected contract. The static reset path and declared own-app
identity are now established. The [admission/reset plan](c1-iwc-admission-reset-plan.md)
traces the saved hub's non-mutating permission-query handler and specifies
an admission-only gate plus bounded full-view reset requirements. Its follow-up
resolves the client-to-hub route and selects a dedicated named-public identity.
Next implement only that fixed read-only runner; keep geometry disabled and
verify generated policy and actual registration separately on the device.
Actual method admission, healthy-restorer
behavior, competing stock geometry and owner-observed normal picture/sound
remain untested. No viewport/crop experiment is ready or authorized by this
read-only work. A setter success or process exit cannot pass restoration.

The limited HUD-only proposal remains separate and unbuilt. No active test is
authorized by this trace. IWC rearranges a published frontend window; it does
not supply independent HDMI receiver activation or change the second-source
requirement for the defining HDMI 1 + HDMI 2 objective.
