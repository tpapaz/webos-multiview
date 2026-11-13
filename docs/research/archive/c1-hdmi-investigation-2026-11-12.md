# C1 HDMI interface and evidence map

> Archived investigation through 2026-11-12. Use the [current evidence map](../c1-hdmi-interface-map.md) and [Status](../../../STATUS.md) for current conclusions/tasks. Earlier next steps are historical.

> Research/tool record. [Current status](../../../STATUS.md) · [Documentation index](../../README.md). Earlier next steps and untested labels describe that stage; use Status and later device records for current results.

Research date: 2026-11-11. Reference: rooted LG OLED C1, firmware 03.53.45,
webOS SDK 6.5.3, with one connected HDMI source. **Simultaneous HDMI 1 + HDMI 2
remains unknown.** This step inspected retained firmware/SDK material and
pinned upstream sources, then retrieved fixed firmware files read-only over
the existing authorized SSH profile. No Luna method, input switch, playback,
capture, settings change, build or packaging operation was performed.

Plan/gate: separate selection, receiver sessions, capture and presentation;
identify the C1 frontend's ownership path; preserve provenance; propose the
smallest bounded observation without assuming a second receiver exists.
Phase 1 remains partial; [decision 0003](../../decisions/0003-close-idle-work-resume-hdmi.md)
continues to close idle and Glasshouse/Home work for this scope.

## Focused acquisition and owned-window review — 2026-11-12

**Saved evidence/local work only: no TV connection, run, retrieval or permission
change.** Owner direction pauses the three-call IWC preflight and makes a live
physical HDMI picture in our own window the next milestone, followed by two
independently live HDMI sources. This section supersedes the selected-HDMI HUD
proposal below; the earlier research/provenance remains historical evidence.

Implementation plan: trace the export's origin and UTP binding, distinguish a
presentation ID from receiver/scaler allocation, implement only an evidenced
single-session client, then run focused host checks and a local ARM/direct-ABI
check. Do not add another IWC preflight or infer a second input path from SMP.

### The missing client-side connection

**Verified/static on the saved C1 03.53.45 client:** `windowId` is assigned to a
Wayland exported object owned by the HDMI frontend, rather than discovered from
IWC or chosen as a MAIN/SUB output index:

1. In F6, `InputCommon::registerWindowId` (`0xcc58–0xcd2c`) obtains
   `WebOSPlatform::webOSForeign` (`0xcc6e`), supplies its own QWindow and exported
   type **2** (`0xcc72–0xcc76`) to `export_element`, and initializes source and
   destination to its 1920×1080 app rectangle (`0xcc9c–0xccba`). Its Qt connection
   at `0xccf2` connects assignment notification to the frontend handler.
2. `InputCommon::onWindowIdAssigned` (`0xcd2c–0xce2c`) forwards the assigned string
   and type into the frontend's signal (`0xcdc2–0xcdd8`). Saved `MainView.qml`
   (F6 provenance's `policy-7.txt`, lines 101–103) forwards the ID to the model.
3. F3 lines 338–345 and 708–711 map the input type, call open with that ID, retain
   the returned `pipelineId` and start initialization. F2 lines 58–64 / 87–93
   pass `options: {appId, windowId}` and `inputSourceType` to `utp.extinputs/open`.
   F3 lines 491–497 / 1293–1329 select port 1/2/3/4 on the retained pipeline.
   There is no separate SMP Load or decoder feeding step in this client chain.
4. F7 independently corroborates explicit rebinding: `UTPConnector::setWindowId`
   (`0x163e4–0x165e4`) puts its retained pipeline string into `pipelineId`
   (`0x16414–0x1643c`) and the supplied window string into `windowId`
   (`0x16450–0x16472`), targeting `utp.extinputs/setPipelineWindowId` (endpoint
   at file offset `0x22788`). This is a client request construction, not a
   measured server import or a receiver/scaler selector. The later
   [cache/close trace](#cached-session-eligibility-and-failed-close--2026-11-12)
   qualifies open-time binding: cached adoption rebinds only for `NormalWindow`.
   Merely supplying `windowId` does not establish that branch's execution.
5. For ordinary frontend exit, F3 lines 440–460 call `stop` then `close`; F2
   lines 125–145 use only the retained pipeline ID. F7 `unregisterId` at
   `0x15c54` also constructs a close. These are evidenced cleanup requests,
   not proof of resource reclamation, disconnect rollback or hardware restoration.

The connector's richer open options were also checked rather than treated as an
unexamined second-sink escape hatch. F7 `0x15968–0x159c0` adds `mediaFrontend`
and `mediaId`; `0x159d4–0x159e6` branches on window-type values 402 and 401.
The corresponding branches write `options.windowType: "InitialWindow"`
(`0x15b2a–0x15b4e`) or `"NoWindow"` (`0x15b64–0x15b88`), then return to the
same open construction. These are **verified/static client values**, not
identified MAIN/SUB or independent receiver selectors. Their server meaning is
unknown. The prototype follows the simpler stock frontend's open options and
does not guess values for these connector-specific fields.

**Verified/declaration, new SDK cross-check:** the existing SDK's
`usr/include/SDL2/SDL_webOS.h:35–38,46–54` declares exported content types,
create, geometry and destroy. SHA-256:
`a6b6dea111c13312d3c01e8ea79faa6090c5aed0316b699fb0bdc0cdc63791e1`.
`usr/include/wayland-webos-foreign-client-protocol.h:123,189,226,310` defines
transparent-object type 2, `export_element`, `window_id_assigned` and `set_exported_window`;
SHA-256 `2f83db1664499d62018a7bb9320f6d0bda58b96eddacb382ffb91777c0468ed3`.
Paths are under the S1 sysroot. The C1 SDL FIRMWARE, already used by Phase 1,
exports `SDL_webOSCreateExportedWindow` (`0x23a00`),
`SDL_webOSSetExportedWindow` (`0x23a10`) and destroy (`0x23a48`). Its exact
saved SHA-256 is
`d3358bab5342c947b5e1f32373b5929b65030628ff8b88e054488dabb3629c58`,
also bound by `build/phase-1/abi-endurance-0.1.3.json` and the new local direct-ABI
record; the SDK declarations alone are not a retail behavior
guarantee. Phase 1 exercised video exports, not this HDMI/transparent-export path.

This resolves the **client-side acquisition-to-owned-window contract** enough
to build an opt-in single-session candidate. It does not establish successful
Homebrew acquisition or simultaneous physical inputs.

### Admission and acquisition cleanup review — 2026-11-12

**Saved evidence only; candidate code and ELF unchanged. No TV operation,
permission edit, installation or new device evidence.** Review plan: intersect
the four candidate methods with retained policy declarations, trace the actual
caller and every acquisition/cleanup branch, then separate first-test blockers
from the outcomes that first test must measure. The verdict is **not ready for
the first picture run**. This is not a C1 single/dual-HDMI impossibility result.

#### Admission: predicted denial, with an explicit evidence limit

The candidate registers `io.github.tpapaz.multiview.hdmiwindow` using
`LSRegisterPubPriv(..., true, ...)` and ordinary `LSCallOneReply`
(`native/phase2-hdmi-window/main.cpp:64–72,91–114`). Its app manifest declares
`requiredACG: []` (`appinfo.json:10`). This establishes the requested identity
and registration form, not an installed grant or successful UTP admission.

| Retained policy | Exact relevant declaration | Consequence |
|---|---|---|
| F4 UTP ATSC and DVB API files, `policy-4.txt` / `policy-5.txt` | Group `private`: `close` line 420, `open` 446, `stop` 454, `switchExternalInput` 455. Both SHA-256 `f80033f99cdbddb7ffccd4221b822a4dbed3110a34dcc275932d0ca1ef8bfd07`. | All four candidate methods, including cleanup, need a matching method-group grant in these declarations. |
| `/usr/share/luna-service2/api-permissions.d/luna-service2.api.json`, saved as `admission-permission-20261112/iwc-api-1.json:2–3` | `all: ["*/*"]`; SHA-256 `6bd211c7a7adc09828d9edbdbfaee800811dfbaa3530f4617f218edd46e8087b`. | The broad alternative is the `all` group, not automatic access for all callers. |
| Same directory's `compat.api.json`, saved as `admission-permission-20261112/compat.api.json` | No exact/wildcard match for any of the four methods in any group; SHA-256 `8d648277fa2ff206e33cdc6e3060e4c4c203db824df5fd58ec52e495421a9f73`. | This retained compatibility map supplies no public alternative for these methods. |
| Installed admission app client grant, `/var/luna-service2-dev/client-permissions.d/io.github.tpapaz.multiview.admission.app.json`, `admission-installed-20261111/installed-5.json:1` | Own app ID → `["public"]`; SHA-256 `e0a6816d82b66c40b6fcc0cb9c51aa5b3fdbe7ec7db198a74b019b1c727ab674`. The Endurance grant independently has the same group shape [C3 in the ownership trace]. | Comparable installed repository apps have no intersection with `private` or `all`. This is comparison evidence, not the uninstalled candidate's policy. |
| `/usr/share/luna-service2/groups.d/all.groups.json`, `iwc-permitted-caller-20261112/caller-policy-4.json` | Both `private` (system inter-service compatibility) and `all` have `public: false`; SHA-256 `a862c30388dddea94d03c87c1ed2e05bbd104a575bc3b3ba1d5fbbe07725f7d9`. | Neither is an evidenced ordinary public-app entitlement to request by copying metadata. |

Paths abbreviated in this table are under ignored `build/phase-2/`; original
TV paths, byte lengths and hashes remain in their inventories. **Inference:**
if installed with the comparable public-only grant, the present candidate is
predicted to be denied by the inspected rules. **Unknown:** its own generated
policy, active loaded grants and actual UTP handler admission. It has not been
packaged/installed by this work. The prior IWC denial is evidence about IWC only.

Coverage is deliberately limited: the retained 146-file API inventory records
hashes and IWC-specific projections; it is not a complete saved UTP-policy body
set. Therefore this review does not prove the absence of every other possible
UTP grant or dynamic policy. It finds **no supported admission route for this
candidate in the inspected saved declarations**. The C1 hub's separate name and
method-group checks are traced at `0x31bda/0x31be8` and `0x32724/0x3276a/0x328c6`
in the [ownership trace](../c1-iwc-ownership-recovery.md#caller-identity-follow-up).
Wildcard outbound roles, a payload `appId`, root UID, or changing the public flag
are not evidence of the missing method grant. No bus/identity retry, role edit,
broad `all` request or stock-utility active-call fallback is proposed.

#### Cleanup: which operation is actually bounded

The saved LS2 library is 218,736 bytes, SHA-256
`e731f7ab993de5a29bf5e33b83c51eb86f87e45499701bcfe30ba6cb295e1e5b`.
`LSCallCancel` at `0x10050` calls `LSTransportCancelMethodCall` at `0x101d2`.
The latter function (`0x1d290–0x1d370`) formats `{"token":%li}` (file offset
`0x30370`), uses `/com/palm/luna/private` (`0x2a8ec`), constructs a transport
cancel message and sends/queues it (`0x1d336/0x1d35c`). **Verified/static:** this
is token cancellation; it is not a constructed UTP stop/close request or an
acknowledgment of hardware rollback. A service could react to cancellation or
disconnect, but no saved UTP handler establishes that it does so for open.
The separately traced tvpower subscription cancellation is not transferable.

| Candidate path | What the source does | Remaining gap |
|---|---|---|
| No opt-in or setup failure | No UTP submission; local resources are released after failed setup. | SDL creates a foreground full-screen app before LS2 registration. No automatic return to the prior HDMI app is implemented; even a later denied open is not proof that ordinary viewing was untouched. |
| Parseable open reply containing a valid ID, including `returnValue:false` | Retains the returned ID and requests stop/close, even after unsuccessful open, cancellation or selection failure (`session.cpp:93–129`; the negative-open-ID host case explicitly expects this). | The saved client contract does not establish that this ID denotes a fresh, exclusive allocation rather than a reused/shared session, or that a failed open conveys ownership of an ID in its reply. Call it the **returned pipeline**, not proven ownership of a receiver. This assumption must be justified before sending cleanup against it. |
| Submitted open with timeout, invalid/oversized reply or no usable ID | Marks acquisition uncertain; no stop/close is sent because the pipeline string is empty (`session.cpp:95,114–122`). Cancels the LS2 token and ends. | No allocation lookup, idempotency key, cancel acknowledgment or disconnect-reclamation contract is evidenced. An allocation may outlive the lost reply; more fake-process tests cannot close this gap. |
| Stop timeout/failure with a known ID | The session layer always requests close after stop. | The native adapter refuses dispatch if disconnected or a token is still pending (`main.cpp:91–93`). Failed `LSCallCancel` sets `connected_ = false` (`143–149`), so the close request can be **NotSent**. The session test fake does not execute this native branch. |
| Close reply says true | Records `closeAcknowledged` and clears the client's `acquisitionUncertain` flag (`session.cpp:101–103`); restoration remains unknown in final JSON. | This is service acknowledgment, not measured receiver release, restored routing or stock HDMI resumption. No UTP applied-release fence is evidenced. |
| Disconnect, blocked vendor call or process death | Local unregister/destroy when reachable; the +22 s alarm exits immediately without cleanup (`main.cpp:20–25,121–136`). | No independent UTP release path exists. The fake-worker helper has no UTP adapter and supplies no receiver cleanup guarantee. |

The stock frontend is not a stronger restoration guarantee: F3 `closeVideo`
lines 440–460 issues stop/close, but its close-response handler clears the stored
ID on any response (`738–747`); it does not check an applied-release state.
The compositor export destroy path reaches `wl_resource_destroy` at `0x65d54`
[R2 in the ownership trace], not an evidenced UTP receiver-release operation.
Thus cancelling a token, exiting the client or destroying its export cannot be
promoted to HDMI cleanup. No UTP provider allocation/close/disconnect handler
implementation was identified in the retained copy set.

#### Exact first-picture gates

1. **Admission route:** evidence a legitimate actual caller/configuration for all
   four methods, including stop/close, without assuming the public-only candidate
   inherits system grants. The inspected policy predicts denial under that grant;
   the actual candidate policy/handler result is absent.
2. **Allocation and recovery contract:** establish new-versus-shared pipeline
   ownership, how an allocation is released when open returns no ID or the
   connection/cleanup fails, and a reviewed bounded fallback to normal viewing.
   This may be a supported server lifetime contract or an explicitly justified
   recovery route; it cannot be inferred from the client deadlines. Until then,
   acquisition is **unsafe_to_test under the current recovery contract**.
3. **Execution preparation after those gates:** package/pin this exact candidate,
   inspect its own generated role/client grants, and specify bounded durable
   sanitized capture, process-exit confirmation and owner-operated restoration/
   stop criteria for one normal-exit HDMI-4 attempt. None exists as an approved
   runnable procedure yet. A future device operation also needs separate owner
   scope; this review grants none.

Actual visibility/motion in the fixed window and restoration after normal close
are **test outcomes**, not requirements for a pre-existing HDMI success before
the first test. Independent HDMI-1/2 receiver/scaler routing is a later gate,
not a prerequisite for the single-source test. The paused IWC target/reset gates,
Phase 1 audio/endurance gaps and another generic fault-injection campaign are
not prerequisites for this route. This review does not demand an unconditional
SIGKILL-survival guarantee; it identifies the missing reviewed fallback for the
failure branches that the first acquisition attempt can already encounter.

The saved set supports this client review but cannot answer the missing server
questions. The next evidence request should target the legitimate UTP caller
grants/provider manifest and open/close/cancel/disconnect allocation contract,
using any additional owner-provided offline material first. Do not build more
generic supervision or reactivate the IWC preflight to substitute for it.
Additional TV retrieval/observation would need a later, explicit scope.

Local review evidence: `build/phase-2/hdmi-window-review-20261112/review.json`,
scoped `ls2-cancel.asm` / `ls2-transport-cancel.asm` and `sdl-dynamic.txt`.
REA's portable export inventory corroborates library identity/exports only
(parent `ev_b3d54b87a35df6f17e108a04f422bdaf7a200bbc33c3070c55ce63b268f1c92e`);
objdump supplies the instruction trace, with no decompiler/runtime claim.
The existing candidate ELF remains SHA-256
`ef19a74f59ad0cb95997f254f92e4bf0ad2c72377db988a121605f6f33997d3f`.

Validation: `wsl -d Ubuntu --exec ctest --test-dir
/mnt/d/Development/webos-multiview/build/phase-2/hdmi-window-host --output-on-failure`
passed 1/1 existing fake-session acceptance test; `npm run lint` and
`git -c core.safecrlf=false diff --check` passed. Local Node checks verified
18 reviewed input bindings, 10 matching original source-inventory pins, all
166 original report/control artifacts unchanged and 50 local documentation links/
anchors. No new tests, ARM rebuild, package, simulator test or TV operation;
candidate runtime source and the C1 device journal are unchanged.

### Narrow root policy and missing provider files — 2026-11-12

Owner direction authorizes narrow root-assisted permission preparation and
allocation/cleanup investigation, using saved evidence first. **No TV connection,
retrieval, rule deployment or run.** Implementation plan: prepare a separate
four-method policy overlay, trace saved hub add/remove behavior and connector
reply handling, check authorization scope locally, and name only the next
evidenced firmware paths needed for server analysis. No installer or generic
recovery infrastructure is added.

[`native/phase2-hdmi-window/policy/`](../../../native/phase2-hdmi-window/policy/README.md)
now contains four original JSON declarations: a separate manifest, a custom
method group, its exact app-name client grant and non-public group metadata.
The generated executable-bound role must be verified before deployment and
is not added or replaced by the overlay. The only additional
methods are `utp.extinputs/open`, `switchExternalInput`, `stop` and `close`.
There are no wildcard, `all`/`private`, borrowed-name, service replacement or
inbound privileged-endpoint grants. The app's generated public grant and LG's
provider rules are preserved. This is **candidate policy, locally scope-checked**;
C1 parser acceptance, live coexistence/trust behavior, activation/removal and
actual UTP admission remain **unknown**, not passed.

**Verified/static C1 policy composition:** saved hub F/C6 SHA-256
`fe05e830674fd80b99d24d9707926b130d978f62cde0690502c898a614c18299`:

- `SecurityData::LoadManifestData` at `0x33638` calls client-group insertion
  (`0x336fe` → `GroupsMap::AddRequired`) and method-group insertion
  (`0x33776` → `GroupsMap::AddProvided`). The client path appends at
  `0x2d98e–0x2d998`; the method path looks up the existing entry and appends at
  `0x2eeae–0x2eec0`. These are additive group entries, not replacement of the
  entire UTP API map.
- `UnloadManifestData` at `0x31e60` calls the corresponding removals at
  `0x31eea` / `0x31f2c`. This identifies removal dispatch; cached live-client
  revocation and complete overlay unload are not TV-tested.
- Role unload separately calls `RoleMap::Remove` at `0x31e7e`; the keyed role
  entry is erased at `0x25b7c–0x25b9c`. A duplicate executable role is therefore
  unnecessary extra merge/removal state. The overlay includes no role file or
  name-permission entry and relies on a verified generated app role instead.
- The saved config (`hub-0.bin`, SHA-256
  `37699fb79f0d31de2266f9cfd4232cc7c2045c0977e706381a2c9c1454dfc14b`,
  lines 37–38) includes `/var/luna-service2/manifests.d` as volatile input.
  `ConfigLoadVolatile` calls `AddExternalManifest` at `0x1916e`.
- `HubService::AddOneManifest` at `0x428c4` checks caller admission at `0x42920`,
  reads `prefix` / `path` at `0x42d54` / `0x42da8`, and reaches manifest-loading
  paths at `0x42e5a` / `0x42fa6`. Explicit administrative add/remove handlers
  exist. The candidate's new group grants neither administrative operation.
  The inspected inotify callback compares a configured filename and signals
  its own process (`0x18204`, `0x1823c–0x18242`); it does not establish hot-load
  on copying our manifest. No hub restart, signal or activation call was made.

The overlay therefore has a concrete declared shape and evidenced additive
insertion/removal paths. Its runtime loading/rollback must still be validated
without replacing generated app policy or broadening LG's existing rules. The
policy README records prospective paths and sequencing, with no deployment
script or claim that simply copying files activates/revokes access. Method
admission cannot constrain payload port/window/pipeline IDs or establish that
a returned session belongs exclusively to this app.

**Additional saved-client cleanup result:** the F7 open request installs a reply
callback whose target resolves to Thumb-cleared `0x165e4` (literal `0x15c24`,
PC-relative addition at `0x15a9e`). That callback checks for `pipelineId`
(`0x16676–0x16684`), converts it to a string (`0x166ba`) and stores it in the
connector (`0x166d4`). It yields no fresh/exclusive allocation claim or
disconnect-release acknowledgment. The earlier stock QML stop/close and LS2
token-cancel traces still cannot supply UTP server lifetime semantics. The
native candidate and ELF are unchanged; cleanup of IDs from negative open
replies remains an assumption requiring the server contract.

**Exact next firmware files:** `/usr/sbin/utp-atsc` and `/usr/sbin/utp-dvb`,
each named at line 2 of the retained F4 provider role (`policy-1.txt` and
`policy-2.txt`, respective hashes `42790a9df4a91e8bc8ff79c9e64ba58accea23166b1ef4911c69205bed5531e0`
and `e10e463c18db3b2609fd71a142645764c8801cdf922e8aedc75bbb29fb125ee0`).
The roles do not prove binary presence or the active variant. First inspect
these original C1 03.53.45 files offline for handlers and exact library/plugin
dependencies, retaining absence/size/hash outcomes. No dependent library name
is justified yet; do not guess one or request all of `/usr/lib`.

If manifest routing remains necessary, request filename-only listings of the
fixed `/usr/share/luna-service2/manifests.d` and
`/usr/share/luna-service2/services` directories before naming provider manifest/
service files. Previous guessed service paths were unavailable, not established
provider filenames. No new QML, InputCommon, LS2, compositor, SDL, roles/API maps,
logs, credentials or device identifiers are needed. The policy README gives
this staged request and a prospective 32 MiB/file read cap; no collector was run.

Local evidence: `build/phase-2/utp-policy-design-20261112/` retains scoped hub/
connector disassembly and literal resolutions, REA export Evidence and scope
validation. REA parent `ev_f6fef5f20cd4d5dcc9f64b971b392d75bf2f933a35b53c865a582dd18253bf3c`
corroborates hub bytes/exports only; objdump supplied instructions, not a
decompiler or runtime observation. `npm run check:utp-policy`, `npm run lint`
and `npm test` passed; 13 intentional authorization-scope broadenings were
rejected by the offline checker. No new unit-test coverage, native rebuild,
package, simulator or TV result is claimed. The first picture run remains
unready pending policy activation/admission and the provider's allocation/
release contract.

### UTP provider allocation and cleanup — 2026-11-12

**Authorized read-only retrieval completed; subsequent analysis was offline.**
Only `/usr/sbin/utp-atsc` and `/usr/sbin/utp-dvb` were read through SFTP:
stat, read-only open, fstat, bounded reads and close. No remote command, file
write/delete, app launch, input switch, permission deployment or service restart
was requested. The connection was closed. Model/firmware reference remains the
previously recorded C1 03.53.45 / SDK 6.5.3; it was not queried again.

Original local copies and collector/inventory are private under ignored
`build/phase-2/utp-provider-20261112-001/`. Both source sizes/mtimes remained stable
across the read; each file was below the 32 MiB cap. These are host SHA-256 hashes
of the retrieved bytes, not independently calculated remote hashes.

| Source | Bytes | SHA-256 |
|---|---:|---|
| `/usr/sbin/utp-atsc` | 8,792,988 | `721394f165f36cfbfaeabeae4b02a8e388c927a77e0b7613d5c4ba521bff3ed3` |
| `/usr/sbin/utp-dvb` | 8,788,888 | `745ff06f5eef3d8d4855b67c21b2fc74035e9ad8281e2d0ed06779aba4b1ff3c` |

Both are ARM32 ELF executables containing the relevant implementation, rather
than wrappers requiring a guessed UTP library. The active variant remains
**unknown**. REA portable export inspection corroborated ATSC symbols; existing
WSL SDK `objdump -TC` / `-dC` supplied the instruction traces. Neither executable
was run. This is **verified/static**, not a runtime cleanup or HDMI result.

| Function entry | ATSC virtual address | DVB virtual address |
|---|---|---|
| `UtpExtinputsService::cb_open` | `0x5622f8` | `0x562248` |
| `UtpExtinputsService::cb_close` | `0x562f04` | `0x562e54` |
| `TVExternalManager::open` | `0x5c3eec` | `0x5c3e98` |
| `TVExternalManager::close` | `0x5c4b6e` | `0x5c4b1a` |
| `TVExternalManager::onClose` | `0x5c77a4` | `0x5c7750` |
| `ServiceMonitor::Service::monitor` | `0x4fec26` | `0x4feb76` |
| `ServiceMonitor::add` | `0x4feffc` | `0x4fef4c` |
| `ServiceMonitor::onServiceDisconnected` | `0x4ff2ac` | `0x4ff1fc` |
| `ServiceMonitor::closeBroadcast` | `0x4ff454` | `0x4ff3a4` |
| `TVResourceManager::getServiceBroadcastIds` | `0x61b890` | `0x61b83c` |

The focused DVB bodies corroborate the corresponding routing/monitor structure;
addresses below refer to ATSC only. Do not apply ATSC interior addresses to DVB.

**Allocation:** `cb_open` reads LS2 application ID and sender at `0x562622` /
`0x562634`; it constructs the sender string and calls manager open at `0x562810`.
The manager generates a resource key (`0x5c4088`), but a false final argument
and nonempty cached manager field permit reuse: `0x5c40ca–0x5c40ee` copies and
clears that cached key and skips `TVResourceManager::add` at `0x5c410e`.
The public handler passes false (`0x5627f0–0x5627f2`). Therefore this API does
**not establish unconditional fresh logical allocation**. `onOpen` populates
the cache when its Boolean argument is true (`0x5c75e4–0x5c75fc`); manager open
binds its final argument into that callback (`0x5c43fc–0x5c4404`). The callers
that can enable that mode and the resulting cache eligibility remain untraced;
reuse is not proof that an active stock session is stolen or shared, either.

The resource is tagged with caller sender at offset +64 (`0x5c4176–0x5c4184`)
and app ID at +88 (`0x5c4144–0x5c4152`). Registry identity is separate from the
backend pipeline. `onOpen` checks a provider result and copies its `pipelineId`
(`0x5c7434–0x5c74ee`), then adds an extinputs resource (`0x5c754a`). Logical
registry entries alone establish neither a separate physical receiver nor a
second independently advancing HDMI port.

**A real disconnect cleanup route exists:** after starting acquisition,
`cb_open` calls `ServiceMonitor::add(sender, appId)` at `0x5629a6`. Monitor
constructs `serviceName` from its stored sender (`0x4fec38–0x4fec58`) and calls
`luna://com.webos.service.bus/signal/registerServerStatus` at `0x4fece8`.
The status callback selects its disconnect signal when `connected` is false
(`0x4fef70–0x4fef88`). `onServiceDisconnected` gets that caller's registered IDs
at `0x4ff30c`; `getServiceBroadcastIds` compares the resource's +64 sender
(`0x61b8fa–0x61b900`). It loops through matching resources and `closeBroadcast`
routes the `external.` prefix to `TVExternalManager::close` (`0x4ff4b8`).
**Inference:** a lost open reply need not prevent reclamation, because this
route uses caller identity rather than the client's knowledge of the ID.
That is a conditional path, not a guaranteed release contract.

**Two concrete holes prevent relying on that path as recovery:**

- `ServiceMonitor::add` can return false if monitor setup fails
  (`0x4ff07a–0x4ff08c`). `cb_open` does not check that return: immediately after
  `0x5629a6` it destroys temporary strings. Acquisition is already started.
  The registration-failure log is `SVCMONITOR_REGISTER_FAIL`; no observed
  candidate registration or disconnect result exists.
- `cb_close` starts asynchronous close (`0x563026`), sets its delayed reply
  condition (`0x56304a`), then calls monitor remove (`0x56313e`) before that
  reply. Remove decrements the reference and stops/erases the monitor when the
  count reaches zero (`0x4ff1d2–0x4ff210`; `decRef` at `0x4febb6`). Thus a
  final close dispatch can remove the disconnect fallback before hardware
  release is established. A later close failure is not covered merely by
  unregistering the client. DVB also has this order (`0x562f76`, `0x56308e`).

Busy resources enter a wait/retry path (`waitWithName` at `0x4ff586`); no bounded
release deadline has been established. `onClose` removes the logical resource
at `0x5c77e8` and constructs success at `0x5c77fa`; the complete provider-error
and call-chain unwind semantics still need tracing. This does not prove a
hardware-release fence or restoration of normal HDMI viewing. `cb_close`
reads sender but calls manager close with only the requested ID; that ID and
the four-method permission grant must not be treated as payload ownership
enforcement.

**What still blocks the first picture test:** validate the scoped policy's
load/unload and actual fresh-caller admission; resolve cached-session eligibility
and asynchronous failure/release behavior sufficiently to justify a bounded,
acquisition-specific fallback; then pin a package, inspect its generated caller
policy and prepare one normal-exit capture/manual-restoration procedure. The
native cancellation branch that can leave close unsent is unchanged. No-ID
open is now partly explained by a conditional server cleanup path, not closed
as a safety gate. Visibility/motion and normal viewing restoration remain test
outcomes; unconditional fault survival and dual-port proof are not prerequisites.

**Extra firmware request:** no additional library is needed to locate these
session handlers. Continue with the saved providers first. To resolve backend
routing if necessary, the next narrow request is metadata for the exact paths
`/etc/palm/utp/providers`, `/etc/palm/utp/services` and `/tmp/utp/providers`:
these strings are initialized by `Settings::Settings` at `0x56be58`,
`0x56be86`, `0x56bede`. Determine each path's type first; request a bounded copy
if it is a regular file, or immediate filename-only listing if it is a directory,
before naming child files. Their presence/type/contents are **unknown**. Do not
invent a `.so` or service filename, retrieve them under the completed two-file
authorization, or request all firmware. Hardware provider implementation files
can be named only after that routing evidence. Active variant remains unknown
without separate evidence; both supplied variants have been inspected.

Retained analysis: `focused-functions-v4.json` maps address-qualified ATSC
disassembly files; `dvb-focused-functions.json` maps DVB files. The earlier
`focused-functions.json` reused filenames for overloads and must not be used as
an address-to-file authority; its files are preserved. Corresponding JSON files
resolve literals/calls, while assembly and original ELF bytes are authoritative.
`rea-atsc-exports.json`, `atsc-elf.txt`, `dvb-elf.txt` and `inventory.json` retain
identity/import evidence. No firmware bytes or unrestricted strings are tracked.

Validation: `npm run lint` (including the narrow policy scope check) and
`git diff --check` passed. Offline verification rehashed both providers and the
unchanged native candidate, confirmed all 166 baseline artifacts unchanged,
checked 111 local links across eight documentation files and corroborated ten
corresponding ATSC/DVB function entries/sizes. Results are retained in
`build/phase-2/utp-provider-20261112-001/validation.json`. No runtime code changed;
no unit tests were added, and no native rebuild, packaging, simulator or HDMI
execution was performed for this retrieval/research update.

### Cached-session eligibility and failed close — 2026-11-12

**Offline continuation only. No TV connection, permission deployment or target
execution.** Analysis uses the two original provider hashes above. New private
instruction traces, resolved pointers and validation live under ignored
`build/phase-2/utp-lifetime-review-20261112-001/`. Earlier unresolved cache/error
questions are narrowed below; no hardware behavior has been measured.

#### Cache eligibility is resolved at the UTP manager boundary

The cache is a **boot-to-client adoption path**, not evidence that all ordinary
opens share an active application session:

1. `UtpBoot::boot` rejects boot while the broadcast-ID list is nonempty
   (`0x4c94ce–0x4c954a`), then routes an external source to `bootExternal`
   (`0x4c95a4`). This is a boot guard, not an ordinary-open exclusivity check.
2. `bootExternal` binds `TVExternalManager::open` through the GOT at
   `0x4c9c48` (slot `0x871de0`, Thumb pointer `0x5c3eed`). It supplies **true**
   for the final Boolean (`0x4c9c6e–0x4c9c86`), an empty sender argument
   (`0x4c9ca8–0x4c9cac`, empty literal `0x6692cc`) and the boot window type.
   The follow-on operation selects the boot port. No boot method was called here.
3. A successful `onOpen` with that Boolean true caches the logical key at
   manager +64 (`0x5c75e4–0x5c75fc`). Ordinary `cb_open` passes **false**.
4. Ordinary manager open selects reuse exactly when that Boolean is false
   and the cache string is nonempty (`0x5c4092–0x5c40c2`). It copies and clears
   the cache, skips adding a fresh logical resource, then gets/locks and retags
   the adopted resource with the new caller/app/window metadata. Subsequent
   get/lock can still fail; branch eligibility is not successful acquisition.
   There is no app/source/window comparison in this cache-selection predicate.
5. Reuse skips the backend `extinputsOpen` path (`0x5c4292–0x5c429e`). It calls
   backend `setPipelineWindowId` only when the requested window type equals
   **`NormalWindow`** (`0x5c4474–0x5c4488`; request at `0x5c45d2–0x5c45da`).
   Other types take the branch at `0x5c4662`, with no such bind request.

Thus cached adoption is explained and no longer an open-ended allocation
research gate. Whether the cache is populated on this TV now, and whether
separate logical opens yield separate physical HDMI receivers, remain **unknown**.
The latter belongs to the dual-source gate. Nothing here proves adoption steals
an already caller-owned logical session or guarantees hardware exclusivity.

**Candidate consequence:** `session.cpp` currently sends only app/window IDs
in `options`, omitting `windowType`. The handler reads that property at
`0x562528–0x56253c`; a string-conversion helper initializes an empty string and
ignores the Boolean conversion result (`0x4871ea–0x487214`). Payload parsing
uses a schema first, so this is a dependency on unsaved defaults, **not proof
that the stock client's omitted field fails**. Explicitly specify the evidenced
`NormalWindow` type, or establish its schema default, before relying on cached
open to bind our export. No fifth permission/rebinding endpoint is required
merely to make that existing branch explicit. Runtime code is unchanged here.

#### Failed close can be masked by a successful UTP reply

The traced path distinguishes **backend reply collection** from **backend
success**. For a valid negative backend close reply reaching the collector:

1. Manager close constructs the backend `close` call (`0x5c4eae`, `0x5c4f28`),
   adds a `TVPlayerCall` collector (`0x5c4fb0`), then appends `onClose`
   (`0x5c4fba–0x5c501c`). The outer finish callback is `onBroadcastDone`
   (pointer at `0x5c4db6`), not an automatic hardware-close retry.
2. `TVPlayer::cbLunaRequest` passes the parsed provider result to its registered
   response signal (`0x5d366e–0x5d368c`). `TVPlayerCall::onResponse` stores it
   under `results[].result` (`0x5730c6–0x573132`) and counts responses. It does
   not test that nested result's `returnValue`.
3. When responses are complete it schedules completion (`0x573164` →
   `0x5740d8` → deferred body `0x572fe8`). That body emits the call-item
   completion signal with **true** (`0x573018–0x57301c`), without inspecting
   the collected backend results. The generic chain therefore proceeds.
4. `TVExternalManager::onClose` does not check nested results either: it
   removes the logical registry entry (`0x5c77e8`) and builds `JReturnTrue`
   (`0x5c77fa`). Registry removal is not conditional on backend close success.
5. `onBroadcastDone` attempts resource unlock/status update (`0x5c8468–0x5c84bc`),
   catches a missing resource and still completes the pending request through
   `onAsyncDone` (`0x5c8502`). That path emits/erases the pending request
   (`0x5c864a`, `0x5c8664`); it does not recreate the session or retry close.

**Verified/static conclusion:** this wrapper can acknowledge close and forget
the logical session even when a collected backend close reply says false.
This is a control-flow finding, **not an observed TV leak or evidence that the
backend actually fails**. It explains why an outer `returnValue: true` is
insufficient even as proof of successful backend cleanup. A blind retry through
the same logical UTP ID is not a demonstrated recovery route after its registry
entry has been removed. Do not target a guessed backend ID or stock session.

The previous monitor gap remains: public close decrements/removes the final
caller monitor before asynchronous completion. A later client disconnect cannot
be relied on to find a registry entry that `onClose` has already removed.
Synchronous exceptions, malformed replies or a missing completion are different
branches: do not infer that they all remove the entry or all unlock it. No
unconditional release/retry deadline is established. The backend one-reply
timeout is read from a service configuration field (`0x5d0b66–0x5d0b8c`), so the
client's two-second timeout and 22-second process cap do not bound hardware work.

**Candidate consequence:** `session.cpp` currently clears `acquisitionUncertain`
when the outer close reply is true. That is too strong as an allocation-release
claim on this provider. `livePicture` and `restoration` already remain unknown;
cleanup reporting/status must also distinguish wrapper acknowledgment from
confirmed backend release. No local code change or rebuilt ELF is claimed here.

#### Exact remaining evidence and first-picture gates

No more generic supervisor, IWC preflight or proof of universal fault survival
is required. The remaining items are concrete:

| Item | Remaining requirement |
|---|---|
| Candidate request/reporting | Make the `NormalWindow` bind branch explicit or verify its default; correct the close-acknowledgment/allocation-uncertainty contract. ARM rebuild and focused acceptance/ABI checks follow any code change. |
| Acquisition-specific fallback | Establish a provider-specific, bounded release/restoration procedure for uncertain open/close, including the case where UTP has forgotten its ID. Current stop/close + unregister is insufficient evidence. Do not patch firmware, restart services or introduce arbitrary privileged calls. |
| Admission | Validate the prepared four-method overlay's load/unload and actual fresh-client admission, including the package's generated executable/name/outbound policy, in a separately authorized step. No policy deployed. |
| Execution preparation | Pin the package and sanitized capture/exit checks, owner-confirmed source/baseline, and one normal-exit/manual-restoration procedure. Then seek explicit scope for the picture attempt. Motion and normal viewing restoration are outcomes, not pre-proved prerequisites. |

For **additional firmware**, the next exact optional schema file is
`/etc/palm/schemas/utp/utp.extinputs.open.schema`: `cb_open` supplies schema name
`utp.extinputs.open` (`0x56243c`); `JUtil::loadSchema` appends `.schema`
(`0x4af83a–0x4af87e`) to the saved Settings schema directory. Its contents and
presence are unknown. It can establish defaults/validation; explicitly supplying
`NormalWindow` avoids depending on that missing default alone.

The substantive cleanup evidence still requires routing metadata for exactly
`/etc/palm/utp/providers`, `/etc/palm/utp/services`, `/tmp/utp/providers` as scoped
above: type first, bounded regular-file copy or immediate filename-only listing,
then only the exact referenced HDMI provider/service configuration and backend
implementation. No backend filename is justified yet. No extra QML, compositor,
SDL, credential or unrestricted log copy is needed. **No additional TV read is
authorized or performed by this offline review.**

DVB corroboration: `bootExternal` `0x4c9b04`, manager `open` `0x5c3e98`,
`onOpen` `0x5c72b4`, `close` `0x5c4b1a`, `onClose` `0x5c7750`,
`onBroadcastDone` `0x5c83d4`, collector `onResponse` `0x572fac`, and deferred
true-completion body `0x572f38`. Thirteen selected DVB functions were retained;
nine critical blocks have matching operations/registers after normalizing code
targets, with named call targets checked against each symbol inventory. This is
focused static corroboration, not whole-binary equivalence or runtime proof.
`functions.json`, `dvb-functions.json`, `critical-block-comparison.json` and
resolved `*.pointers.json` retain the bounded evidence. Raw pointers/calls and
original ELF bytes remain authoritative over heuristic annotations.

Validation for this continuation: `npm run lint` and `git diff --check` passed;
`git diff --exit-code --` for the native runtime source/appinfo paths confirmed
no source change. Offline checks rehashed both providers, the unchanged native
ELF and all 166 original baseline artifacts; verified 101 local links across
seven documentation files; and corroborated nine critical blocks (163
instructions) across the variants. The retained `validation.json` hashes 139
raw disassembly files. No unit tests were added, no native rebuild/package or
simulator run was needed for the documentation-only change, and the device
journal was not changed because no TV operation occurred.

### Explicit normal window and conservative cleanup reporting — 2026-11-12

**Local implementation/build only; no TV connection, execution or permission
deployment.** The two candidate issues identified above are now corrected:

- `session.cpp` explicitly sends `options.windowType: "NormalWindow"` alongside
  its own app/export IDs. Cached adoption no longer depends on an unsaved
  window-type default. No extra Luna method or permission was added.
- Internal stop/close fields are named `stopAcknowledged` / `closeAcknowledged`.
  Once open may have reached UTP, `acquisitionUncertain` remains true through
  close acknowledgment and local cleanup. A false value means this candidate
  never submitted a possible acquisition; it is not a hardware-release result.
- `main.cpp` explicitly reports `hardwareRelease: "unknown"`, alongside the
  existing unknown picture/restoration/concurrency outcomes. There is no hardware
  observation path that could promote this to verified.
- `candidate_interval_completed` / exit 0 mean the bounded client interval,
  acknowledged stop/close and successful local cleanup completed. Missing,
  negative or unsent cleanup replies or failed local cleanup still produce
  `cleanup_failed` after an otherwise completed interval. Allocation uncertainty
  is kept separate from whether the client sequence completed.

Focused acceptance checks cover the exact `NormalWindow` request, ordinary
acknowledged cleanup retaining uncertainty, an outer close success with a nested
backend failure retaining uncertainty, and unsent stop/close. The existing
opt-in, no-ID, cancellation, selection-failure and local-cleanup checks remain.
These are deterministic host fakes, not firmware execution or HDMI evidence.

Both host and ARM builds used the existing Ubuntu WSL SDK with CMake/Ninja and
the existing warnings-as-errors configuration. Commands are in the
[candidate build contract](../../../native/phase2-hdmi-window/README.md#local-build-and-acceptance-checks).
Host build directory: `build/phase-2/hdmi-window-host-contract-20261112`;
`ctest --test-dir` passed `hdmi-window-acceptance` (1/1). ARM build directory:
`build/phase-2/hdmi-window-arm-contract-20261112`. Current ELF:
`multiview-hdmi-window`, 29,908 bytes, SHA-256
`91cbfe5710978793cab0e613d70227508d707af09422d10f2e14de4afa54e1bb`.
The old `hdmi-window-arm/` artifact and its original hash remain unchanged.

`build/phase-2/hdmi-window-contract-20261112/verify-local.py` invokes the existing
offline ABI verifier with rehashed saved C1 libraries. It passed 75 required
imports/eight direct DT_NEEDED providers and exact symbol versions, ARM32
soft-float, `/lib/ld-linux.so.3`, and absence of RPATH/RUNPATH. This is direct
executable ABI validation, not a full SDL dependency-closure or loader test.
`direct-abi.json` / `.txt` retain that outcome. `npm run lint` (including the
narrow UTP policy scope check) and `git diff --check` passed.

The current `validation.json` records source and policy-payload hashes, host
CTest evidence, the rebuilt ELF hash, 104 local documentation links, and
preservation checks for all 166 original baseline artifacts, 139 saved UTP
disassemblies, both provider copies and the old candidate ELF. The device
journal is unchanged. The unrelated JavaScript unit suite was not rerun; this
change's host checks exercise the native session contract. No files were deleted.

**Remaining first-picture blockers:** an acquisition-specific bounded
release/restoration route for uncertain open/close even after UTP forgets its
logical ID; scoped policy activation/removal and actual fresh-caller admission;
then a pinned package/generated policy plus capture, process-exit and owner
baseline/manual-restoration procedure. The local request/reporting corrections
are no longer blockers. The open schema is no longer needed to settle the
explicit window type; the staged provider-routing metadata request above remains
the exact next firmware evidence request. No additional TV read is authorized.
No IPK, simulator run, HDMI picture, hardware release or dual-port proof is claimed.

### Provider-routing metadata and cleanup boundary — 2026-11-12

**Owner-authorized metadata read completed; subsequent investigation was offline.**
Only the three named directories were inspected through SFTP `lstat`, `opendir`,
bounded `readdir(handle)` and `close`. No regular file was opened/read, no child
directory was traversed, and no remote command, write/delete, app launch, HDMI
switch or permission deployment occurred. Both collection connections are closed.
The C1 03.53.45 / SDK 6.5.3 reference is from earlier evidence, not a new query.

| Exact directory | Type / mode | Immediate filenames | Relevant observed entries |
|---|---|---:|---|
| `/etc/palm/utp/providers` | directory / `0755` | 7 | `extinputs.json` |
| `/etc/palm/utp/services` | directory / `0755` | 31 | `extinputs.bypass.json` |
| `/tmp/utp/providers` | directory / `0755` | 2 | `gibbs.json`, `nabs.json` only |

The successful pass reached directory end within the bounds (256 names / 32 KiB
filename text / eight READDIR calls per directory / 50-second host cap). It used
six LSTAT, three OPENDIR, six READDIR and three CLOSE operations. Before/after
directory type, size, mode and mtime matched. This is not an atomic content
snapshot, a child-file type check, or proof of the active backend. In particular,
the absence of a temporary filename `extinputs.json` does not establish effective
configuration precedence or exclude HDMI support through another provider.

Original reports remain private and immutable under ignored `build/phase-2/`:

- `utp-routing-metadata-20261112-001/inventory.json`, SHA-256
  `fe291acc3a40a158d60e70013ec480902934419770bcd91d5011ae85c53f6022`:
  partial first pass. The collector incorrectly classified SFTP's EOF error as
  metadata failure after receiving names. This was a local collector error,
  not evidence of a TV failure; the report was preserved.
- `utp-routing-metadata-20261112-002/inventory.json`, SHA-256
  `92650571e33f063b3a9aef2002d0871afe068ec392cd2fd895d6bf9b2ca8e637`:
  corrected same-scope pass, all three listings complete and stable. First-pass
  filename sets agree with the completed sets. No read scope was widened.

**Backend cleanup investigation:** the saved ATSC executable confirms why these
JSON contents are the missing connection, rather than another generic helper:

- `TVPlayerGenerator::fromFile` (`0x5e3922`) builds a file inventory, parses
  provider configuration and reads `disable` / `id` (`0x5e3bfa`, `0x5e3c32`),
  with a `default` factory lookup (`0x5e3ca0`), not a default JSON-field claim.
  Filenames identify candidate inputs;
  their contents determine provider identity/creation.
- `TVPlayer::initialize` (`0x5cfd9e`) reads `services`, `service`, `timeout`,
  `optional` and category/method overrides. The configured timeout is stored
  at service offset +24 (`0x5cff2a–0x5cff34`), subsequently passed to the
  one-reply call path traced above. No timeout value can be learned from the
  directory metadata, and a reply timeout does not prove hardware release.
- `TVPlayer::fetchAPI` (`0x5d400a`) looks up the configured service and constructs
  a `luna://` route (`0x5d4100–0x5d4114`), applying method/category mappings.
  The HDMI manager's existing `extinputs`/`close` dispatch uses this generic
  route machinery. Metadata does not reveal the concrete service URI, cleanup
  method mapping, cancellation behavior or implementing executable/library.
- The similarly named `TVPlayer::close` (`0x5d1d98`) constructs `broadcastId`
  and dispatches **service `broadcast`, method `close`** (`0x5d1dc2`,
  `0x5d1de8`, `0x5d1e04`, call at `0x5d1e42`). It is not evidence of a separate
  HDMI release/fallback contract. Do not substitute it for the manager's
  `extinputs` close merely because its symbol says close.
- Initialization monitors backend service availability through server-status
  registration (`0x5d0418`); its callback reads `connected` (`0x5d3c42`). This
  is not a demonstrated per-client HDMI lease or a cleanup acknowledgment.

These are **verified/static ATSC routing facts**, not new hardware observations.
Corresponding DVB entry points exist (`fromFile` `0x5e38ce`, `initialize`
`0x5cfd4a`, `fetchAPI` `0x5d3fb6`, `close` `0x5d1d44`); this continuation did
not claim complete DVB-body equivalence. New focused disassembly/literal/pointer
records and their function manifest are retained beside the successful inventory.
The earlier failed-close masking finding and conservative candidate report are
unchanged. No new bounded release route has been established.

**Exact next content request, not yet authorized or performed:**

| Observed entry path | Why read it next |
|---|---|
| `/etc/palm/utp/providers/extinputs.json` | Resolve the external-input provider's service references, supported source routing, timeout/override configuration and relevant backend identity. |
| `/etc/palm/utp/services/extinputs.bypass.json` | Resolve the matching extinputs service/method policy and mappings relevant to dispatch and cleanup. |

Check each entry's type first; propose at most 64 KiB per regular file, retain
original bytes/hash and stop on an unexpected type or size. Child-file types and
contents are **unknown** because only names were requested. These are the two
closest observed configuration entries, not an assertion about their contents.
Inspect them before naming any exact referenced backend implementation; do not
guess a service/binary/library filename or copy all provider/service files.
No temporary provider file, open schema, QML, credentials or unrestricted logs
are requested at this stage.

**First-picture blockers remain:** the provider-specific bounded release and
normal-viewing restoration route; actual scoped admission/load/unload validation;
then the pinned package/generated caller policy and bounded capture/exit/manual
restoration procedure. The directory-discovery prerequisite is now complete;
the two local `NormalWindow`/reporting corrections remain built and checked.
No HDMI acquisition, hardware release or concurrency result is claimed.

Validation: `npm run lint` (including the unchanged four-method policy scope)
and `git diff --check` passed. The successful inventory, corrected collector
operation allowlist, matching filename sets, 117 local links across seven
documents and twelve new offline function traces were checked. Preservation
checks confirmed all 166 original baseline artifacts, 139 prior UTP disassemblies,
both provider copies, the current candidate ELF/source inputs and four policy
payloads unchanged. `utp-routing-metadata-20261112-002/validation.json` retains
these outcomes and hashes. No runtime code changed, so no native rebuild, new
unit tests, packaging, simulator or HDMI experiment was run.

### HDMI backend mapping and cleanup timeout boundary — 2026-11-12

**Owner-authorized two-file read completed; all subsequent work was offline.**
The two entries were regular files, copied with read-only SFTP after LSTAT and
bounded to 64 KiB each. Size/mtime checks passed across each read; host SHA-256
was computed from the retained original bytes. The connection is closed. No
directory listing, other file retrieval, remote command, write/delete, app launch,
HDMI switch or permission deployment occurred in this step. Firmware/model
reference remains the earlier C1 03.53.45 / SDK 6.5.3 observation, not a new query.

Private copies, collector and inventory:
`build/phase-2/utp-routing-config-20261112-001/`.

| Exact source / local copy | Bytes | SHA-256 |
|---|---:|---|
| `/etc/palm/utp/providers/extinputs.json` / `provider-extinputs.json` | 366 | `59ebef35ed884f9b117abbf46d053ba09e259149a8dc8667a5c9623dfbcc7ce0` |
| `/etc/palm/utp/services/extinputs.bypass.json` / `service-extinputs.bypass.json` | 1,088 | `65c7b2ae41c0065fbe8b70af42831923a5fa6428a12faca3272e7e5bb49a53d1` |

**The HDMI service mapping is now verified/static.** Provider lines 2–6 name
provider `extinputs`, source/service ID `HDMI`, and backend service
`com.webos.service.extinputs.hdmi`. Other entries map COMP and AV separately;
there is no timeout, optional flag or category/method override in this file.
Combined with the saved generic `TVPlayer::fetchAPI` route construction and
the HDMI manager's method names, the mapping is:

| UTP operation | Configuration-derived backend target |
|---|---|
| open | `luna://com.webos.service.extinputs.hdmi/open` |
| stop | `luna://com.webos.service.extinputs.hdmi/stop` |
| close | `luna://com.webos.service.extinputs.hdmi/close` |

These are static dispatch targets, **not observed running endpoints, caller
admission or hardware behavior**. One HDMI service name does not establish the
number of physical receivers or simultaneous-port support. No native client
endpoint, payload authority or four-method permission grant was changed.

Bypass lines 2–7 specify `extinputs.bypass`, `serviceHandler: convert.resource`,
public service name `com.webos.service.utp.extinputs`, and alias ID `extinputs`.
Its 30 declared methods include `setPipelineWindowId` (line 38), but do not
include open, stop or close. Those lifecycle operations remain the dedicated
UTP manager path already traced; this list does not establish another release or
restoration contract. Other setters in the list were not invoked or assumed
to be safe recovery methods.

**Cleanup implications traced in the saved ATSC executable:**

1. The public pipeline is a logical UTP key. Manager close converts it through
   `UtpUtils::toTVPlayerId` (`0x6382a0`; registry get at `0x6382b8`, provider
   resource lookup at `0x6382c2`) and sends the mapped backend `pipelineId`.
   Knowing the HDMI service URI alone does not recover that backend ID after
   UTP has removed its logical resource. Do not guess an ID or close another
   session. The earlier masked-backend-failure finding still applies.
2. Backend requests use the caller acquired under
   `com.webos.service.utp.broadcast` (`TVPlayer::call`, string at `0x5d0a24`,
   `LSUtils::acquireCaller` at `0x5d0a32`). **Inference:** destroying our native
   app's LS2 connection is not destruction of the backend's immediate UTP
   caller. A separate backend app-ID/window lifetime mechanism may exist, but
   is unknown until its implementation is inspected. The conditional UTP
   `ServiceMonitor` remains the evidenced app-disconnect route.
3. For this unmodified entry through the inspected generic loader, omitted
   timeout leaves the service timeout at **zero**: initializer helper
   `0x5d5a08` writes zero to +24 (`0x5d5a1a–0x5d5a1c`); initialize overrides it
   only when `timeout` is present (`0x5cff0c–0x5cff34`). The provider parser
   uses `JSchema::AllSchema` / `JDomParser::fromFile` at `0x5e39e8` /
   `0x5e39f6`, not an inspected timeout-default schema.
4. `TVPlayer::call` passes that field to `LSCaller::CallOneReply`
   (`0x5d0b68–0x5d0b8c`). That wrapper skips `LSCallSetTimeout` when the value
   is zero (`0x4b91ae–0x4b91c2`; setter at `0x4b91be`). Thus this saved generic
   path adds **no explicit UTP per-call timeout** for this HDMI entry. This is
   not proof that the bus or backend can never expire a request; it supplies
   no guaranteed hardware-release bound. The app's two-second reply wait and
   22-second process cap still cannot be used as that bound.
5. The separate `TVPlayer::close` helper targets `broadcast/close`; this
   provider file has only HDMI/COMP/AV service entries. That helper is not an
   established alternative HDMI cleanup path. No new retry/reset mechanism
   was established by the configuration read.

DVB corroboration: its initializer call at `0x5cfe26` resolves to helper
`0x5d59b4`, which also initializes timeout to zero. Its `LSCaller::CallOneReply`
entry is `0x4b906c`, with the same zero-skips-setter branch. Two critical
operation/register blocks were compared; this is not whole-binary equivalence
or an on-device timeout observation. Raw traces, `timeout-block-comparison.json`
and `route-summary.json` are retained beside the configuration copies.

**Exact remaining evidence request:** identify the registration/executable
binding for **`com.webos.service.extinputs.hdmi`**, then inspect only the exact
referenced backend implementation and relevant dependencies. A saved API
inventory identifies `com.webos.service.extinputs.api.json`, but supplies no
retained HDMI executable binding. No service implementation filename is yet
justified, and neither of the two JSON files names one.

The next narrow request is **metadata and immediate filenames only** for
`/usr/share/luna-service2/manifests.d` and `/usr/share/luna-service2/roles.d`.
These directories are supported by the saved root listing in
`iwc-caller-restore-20261111/directory-inventory.json`; no fresh listing has been
made. Bound a future listing to 512 names / 64 KiB filename text per directory,
retain truncation/absence outcomes, and select exact registration files before
reading contents or naming a binary. Do not guess an extinputs service/role/
manifest basename, read all 275 historical manifests, restart services or invoke
the newly identified backend URI. **No additional TV read/call is authorized by
the completed two-file retrieval.**

**First-picture blockers are narrower, not passed:** HDMI dispatch mapping is
resolved; the implementing backend's ID ownership, close/failure/disconnect
release and bounded normal-viewing restoration remain unknown. Establish that
acquisition-specific fallback, validate scoped UTP admission/load/unload, and
prepare the pinned package/generated caller policy and capture/exit/manual
restoration procedure. The local `NormalWindow` and conservative reporting
fixes remain complete. Actual picture, release/restoration and dual HDMI remain
test outcomes with no new acquisition evidence here.

Validation: both configuration copies were parsed and rehashed; the fixed-path
collector's read-only operation scope and 64 KiB cap were checked. `npm run lint`
and `git diff --check` passed. Two timeout blocks were corroborated across the
saved variants, eight new raw instruction traces were retained, and 119 local
links were checked across seven documents. Preservation checks confirmed 166
original baseline artifacts, 151 prior disassemblies, both metadata reports,
both UTP binaries, both old/current candidate ELFs, six current build-source
inputs and four policy payloads unchanged. `validation.json` beside the new
configuration copies records these outcomes. No runtime code changed, so no
native rebuild, new unit tests, package, simulator or backend/HDMI test was run.

### HDMI backend implementation and release failure — 2026-11-12

**Verified retrieval; static implementation evidence only.** The owner continued
the narrowly scoped registration/backend investigation and authorized powering
on through the existing Home Assistant Chrome tab if needed. Initial SSH access
failed before any SFTP operation; its report is preserved. Home Assistant showed
Off, then On / PS5 (HDMI4) after one Turn on action. This is UI telemetry, not
an owner observation of picture/motion/sound. All subsequent TV access used
read-only SFTP; no remote commands, writes/deletes, app launches, HDMI switches,
backend calls or policy deployment occurred. Previous C1 firmware 03.53.45 /
SDK 6.5.3 attribution was retained, not re-queried.

The two bounded directory inventories completed: 275 manifest and 241 role
names, stable before/after directory metadata. Names selected the extinput
manifest/role; the manifest named the service record, the role named the binary,
and its `DT_NEEDED` entries justified the two implementation libraries. Library
soname symlinks were read explicitly before reading their regular-file targets.
Each content read checked type, size and mtime; manifest/role cap 64 KiB,
service/executable/library cap 32 MiB, connection deadline 50 s. Connections closed.

| Exact TV file | Bytes | SHA-256 |
|---|---:|---|
| `/usr/share/luna-service2/manifests.d/extinput-integration.manifest.json` | 536 | `77a1e8c3ecc1a9019c04472f5ea90c2a1887613fd7ceaae702089ffd030bc909` |
| `/usr/share/luna-service2/roles.d/com.webos.service.extinputs.role.json` | 4,163 | `c6e7e212b4353235362d0f8f8f760ae189719ed2954cd169650dc573ef821fc5` |
| `/usr/share/luna-service2/services.d/com.webos.service.extinputs.service` | 625 | `e0ff384c1c542503d8bbf7d818d1013830aadd3b4a1a3867eb2292cf83f4fc47` |
| `/usr/sbin/extinput-integration` | 620,128 | `4caec3536b689815a82081a35f9b177221e51a4294368614e05064441de6c48c` |
| `/usr/lib/libextinput-service.so.1.0.0` | 767,484 | `7e497c76c37759bf48e459b157eba2e103b1a572fd24bc1401084661636ebbe7` |
| `/usr/lib/libgibb-pipeline.so.1.0.0` | 218,552 | `98c22261bab5dcbd95b182b215247228b2002030cb453910d391b606ee6f7ee5` |

Original copies/inventories are under ignored `build/phase-2/` directories
`hdmi-backend-registration-20261112-001/` (failed connection), `-002/`
(completed names), `hdmi-backend-registration-files-20261112-001/`,
`hdmi-backend-20261112-001/`, `hdmi-backend-library-20261112-001/` and
`hdmi-gibb-20261112-001/`. Address-qualified observations below refer to the
exact hashes above. Raw ARM `objdump -dC`, symbol/ELF headers, focused assembly,
literal annotations and REA portable export evidence are retained locally;
none of these binaries was executed. REA export coverage establishes symbols,
not control flow or hardware behavior.

1. **Backend ownership is resolved statically.** Manifest `roleFiles` and
   `serviceFiles` name the saved records. Role `exeName` is
   `/usr/sbin/extinput-integration`, with allowed name
   `com.webos.service.extinputs.hdmi`; service record `Name` includes that name,
   `Exec` names the same executable, and `Type=static`. This is installed
   registration evidence, not process/runtime availability verification.
2. **UTP stop has a candidate backend mismatch.** Saved ATSC manager stop
   `0x5c5bd4` binds `TVPlayer::call` via GOT slot `0x8717d8` at `0x5c5ee0`
   and passes the literal `stop` loaded at `0x5c5f56–0x5c5f5c`.
   `stop-route.json` retains that resolution. Backend `HdmiService` constructor
   `0x5b55c` registers `open` (`0x5b6d0`), `pause` (`0x5b736`) and `close`
   (`0x5b79a`), plus 20 other named methods; its inspected registration list
   contains no `stop`. The saved provider entry supplies no override. This
   establishes a **candidate/static compatibility gap**; it does not prove the
   effective live route lacks another registration/override. Do not equate UTP
   stop acknowledgment with a backend pause, change the app to a guessed method,
   or add direct-backend permission grants on this evidence.
3. **Backend close can discard its own lookup after release failure.**
   `HdmiService::close` parses `pipelineId` at `0x5a318–0x5a330`, locks a mutex
   and calls `_close` at `0x5a46a`. `_close` gets the service at `0x59bf0`,
   checks its type/mode and invokes its virtual slot +40 at `0x59f3e`.
   Relocation-aware `vtables-v2.json` binds that slot (table +48, after the two
   ABI header words) to `Watcher::release` at `0x96424` in libextinput-service.
   The returned zero/nonzero is converted to a Boolean at `0x59f40–0x59f48`.
   **Without branching on that Boolean**, `_close` removes the service at
   `0x59f4a`, removes the generated ID at `0x59f82–0x5a022`, then puts the
   saved Boolean into `returnValue` at `0x5a086–0x5a096`. Thus a normally
   returned release error can produce backend false *after lookup removal*.
   Combined with the earlier UTP result-collection gap, both lookup layers can
   forget an uncertain allocation. Exceptions/early type failures have different
   branches; this is not a claim about every failure or an observed leak.
4. **Actual release work precedes those removals, but has no demonstrated
   completion bound.** `Watcher::release` clears callbacks/resource metadata,
   and when resources require unloading calls `PipelineBase::unload` at
   `0x966d6`. Nonzero result is retained in r8, recorded with
   `SequenceFlow::occurError` at `0x96882`, and the error path rejoins at
   `0x96794` before returning r8 at `0x967f0`. It does not establish a retry.
   The HDMI-specific `_release` hook `0x86d98` logs and returns zero; it is
   not a second hardware release attempt. In libgibb-pipeline,
   `PipelineBase::unload` (`0x1895c`) takes a mutex and policy lock, dispatches
   its body at `0x1898c`, and that body calls `PipelineManager::unload` at
   `0x18452`. The resource connector ultimately calls imported
   `tvrmclient_release_resource` at `0x28ab4`, converting its result at
   `0x28abc`. Imported resource-client/element operations and synchronous
   mutex waits are still outside the reviewed completion contract. Client
   deadlines cannot establish that those downstream operations finish.
5. **No new caller-loss guarantee.** The executable includes a
   `ClientDisconnectNotifier`, but the inspected direct call to its `set`
   function is in `LunaSubscription::addSubscription` (`0x6156a`). Finding
   that utility is not proof that open installs a pipeline lease for our app.
   Nor does the power-state close-all path (`msgPowerD` → `_close` at
   `0x5a9a4`) establish bounded recovery; power cycling/restarting was not tested
   or proposed as an automatic fallback.

**Exactly what remains before a first-picture proposal:** resolve effective
stop/pause routing using the saved UTP/backend registration code; establish
bounded acquisition-specific release/manual restoration for no-ID or failed
close even after either lookup disappears; validate scoped policy activation/
removal and actual caller admission; and prepare the pinned package/generated
role, bounded capture/process-exit checks and owner restoration procedure.
Actual visibility/motion and normal-exit restoration remain test outcomes.
Dual HDMI remains unknown and is a later gate.

**Exact next firmware implementation files, if the saved code cannot finish
the downstream trace:** `/usr/lib/libtvrm_client.so.1.0.0` for the imported
resource-release completion/error path, and `/usr/lib/libelement-base.so.1.0.0`
for element unload/release ownership. Their `/usr/lib/*.so.1` symlinks were
read-only resolved to these names; contents are **not retrieved**. Do not pull
unrelated libraries or invoke their methods. Continue offline with current
evidence first; no launch, switch, deployment or deletion is part of this task.

Validation: `npm run lint` (including the exact-app UTP policy scope checker)
and `git diff --check` passed. Local validation rehashed all six retrieved
files, verified the stop literal/member binding and relocation-aware release
slot, checked 129 local documentation links and confirmed 166 original artifacts,
159 prior raw assembly files, six current candidate build inputs, four policy
payloads and both candidate ELFs unchanged. The report and 68 new evidence hashes
are in `hdmi-backend-20261112-001/validation.json`. The initial unrelocated
`vtables.json` contains zero-filled slots and is preserved as an intermediate;
only `vtables-v2.json` resolves dynamic relocations. No runtime source/policy
payload changed in this continuation, so native rebuild/unit checks were not
repeated. No package, simulator, acquisition or hardware-release test was run.

### Stop routing resolved and downstream release boundary — 2026-11-12

**Scope:** owner-approved continuation, saved binaries first, then exactly the
two previously identified implementation files via read-only SFTP. No power
action was needed. No remote command, TV write/delete, app launch, input switch,
backend method call or permission deployment occurred. The connection closed.
C1 03.53.45 / SDK 6.5.3 attribution comes from prior evidence, not a fresh query.

| Exact TV file | Bytes | SHA-256 |
|---|---:|---|
| `/usr/lib/libtvrm_client.so.1.0.0` | 58,796 | `db04ad77bd0bdec15af06fc04a1283c8e8e9afe367e02d64c9d76205448d2e20` |
| `/usr/lib/libelement-base.so.1.0.0` | 218,552 | `951ffed42164945d9b99d86c08d3ee412fcde0023d1a0b120f9b7b886ec6144b` |

Both were regular files within the 32 MiB/file cap; size/mtime checks passed.
Original copies, collector/inventory, REA portable export records and offline
ARM disassembly are in ignored `build/phase-2/hdmi-release-deps-20261112-001/`.
No downloaded firmware was executed. The independent offline stop review is
in `build/phase-2/hdmi-stop-review-20261112-001/stop-resolution.json`.

**Stop/pause: resolved for the saved unmodified path, live routing unknown.**
ATSC manager stop passes the literal `stop` through generic `TVPlayer::call`;
DVB corroborates the same path (`0x5c5b80`, literal `0x5c5f02–0x5c5f08`).
The TVService constructor initializes an empty method-override map at ATSC
`0x5d5a34–0x5d5a44`, and the saved HDMI provider JSON has no overrides.
`fetchAPI` performs an exact lookup at `0x5d41f2`, then appends the original
method on a miss at `0x5d422a–0x5d4242` (DVB `0x5d419e` / `0x5d41ee`).
The backend registration wrapper forwards the name unchanged at `0x5c9bc`;
`registerMethod` uses that name for `LSRegisterCategoryAppend` at
`0x60912–0x60948`. The generic handler uses exact category+method lookup at
`0x5fce0–0x5fd6c`. There is no stop alias in this inspected chain. Its 23 HDMI
registrations include pause/close but no stop. Classification:
**unsupported_by_saved_unmodified_dispatch_and_registration**. Alternate live
overrides/replacement registrations remain unknown; no runtime denial is claimed.
The saved stock frontend itself calls stop then close, so preserve that
discrepancy rather than silently changing the contract.

Pause and close have different purposes: `_pause` invokes virtual slot +44
at `0x4d6f8` and retains the service/ID; close invokes release at slot +40.
**Close is the evidenced release primitive; pause is not a release fallback.**
No direct-backend pause grant, method substitution or firmware modification is
justified. The current prototype still requests UTP stop then close, matching
the saved frontend; its outer stop acknowledgment cannot establish that the
backend paused. Close remains mandatory even after stop error/timeout. A
close-only prototype is a possible later contract revision, not implemented here.

**Resource release now reaches an identified untimed wait.**
`tvrmclient_release_resource` (`0x66d0`) builds `pipelineId`, `input` and
`purpose`, then calls an internal synchronous helper (`0x4fd8`) at `0x67ec`
with URI `luna://com.webos.service.tvrm/releaseResource` and wait flag 1.
The helper calls `LSCallOneReply` at `0x5040` with a null output-token pointer
(`0x502e–0x5032`), and on accepted send waits using **`pthread_cond_wait`** at
`0x50ec`; no timed wait or timeout setup occurs in this path. Its callback
resolves to `0x84a4`, parses/copies the response, then signals at `0x8530`.
The caller reads `tvcoResult` after the helper returns (`0x6808`, conversion
branch `0x68e8`); a result value is a service response, not observed physical
restoration. The library imports no `LSCallSetTimeout` or timed-condition-wait
function. This establishes **no local finite completion bound**, not that the
live service/bus never returns or that a hang has occurred. Our process alarm
cannot cancel a request executing inside the surviving backend process.

**Destructor cleanup qualifies the earlier no-retry finding.**
`Watcher::~Watcher` checks its pipeline pointer and state at `0x96b9a–0x96bb2`.
For a non-null pipeline whose state is not 3, it calls `Watcher::release` again
at `0x96d3a`, ignores the result and drops its pipeline reference. Thus
conditional release re-entry exists on destruction; the earlier UTP completion
callback still does not retry, and neither path supplies a bounded, acknowledged
hardware recovery. Actual destructor timing depends on outstanding shared
references, and re-entry need not repeat the same physical operations.

**Element cleanup is plugin-dependent and can discard context after error.**
The generic element `stop` calls the implementation's virtual slot +28 at
`0x18b7e`, returning an error without a completion bound. For an unshared
element, `Element::Base::close` calls virtual slot +32 at `0x18dc0`, saves its
result, removes matching context records and calls `Share::destroyHandle` at
`0x18f14` **before** checking the saved result at `0x18f18–0x18f1c`. It then
returns that result at `0x18f48`. Shared-element handling follows a different
branch; this is not proof that another owner's hardware is closed. Plugin
manager loading uses `libelement-<pluginName>.so`; concrete hardware-plugin
completion/lease behavior remains outside these generic files. No plugin
filename is guessed or requested merely to continue an unlimited dependency walk.

**Concrete acquisition/exit contract and remaining first-picture gate:**

- Use our own export, explicit NormalWindow, own app ID, one returned UTP ID
  and fixed HDMI 4 placement. No stock-window takeover.
- Bound client progression/observation as already implemented. On cancellation
  or failure, retain any returned ID and attempt close after the current bounded
  reply; stop is compatibility-only and supplies no verified backend release.
- After close acknowledgment or timeout, retain `acquisitionUncertain: true`
  and `hardwareRelease: unknown`; confirm only local cleanup/process exit.
  Do not retry an erased ID, call backend release directly or restart services.
- For a later owner-attended trial, ordinary Back/Exit and owner selection of
  HDMI 4 are a **manual restoration candidate**. They must be explicitly scoped
  and observed; neither is a proved escape from a stuck backend wait. If normal
  viewing does not return, stop the experiment without another acquisition or
  automatic permission/recovery action. No such trial was performed here.

The remaining engineering blocker is therefore **an independently usable,
bounded recovery/restoration route for an uncertain or no-ID acquisition**,
not another unidentified UTP allocation function. The saved path does not
supply that guarantee. Actual narrow-policy activation/removal/admission and
the pinned package/generated role/capture procedure are separate unfinished
gates. The normal-close picture/restoration observations and dual-source
concurrency remain future test outcomes. No additional firmware file is needed
to establish the stop mismatch or untimed client wait; further retrieval should
answer a specific recovery decision rather than repeat this dependency walk.

Validation: `npm run lint` (ES5/JSON plus exact-app UTP scope checks) and
`git diff --check` passed. The local verifier rehashed eight retrieved backend
copies including the two new files, checked 18 stop-review evidence hashes,
the untimed wait/callback and destructor-re-entry instructions, and 134 local
documentation links. It confirmed 166 original artifacts, 159 prior raw assembly
files, 68 prior backend evidence files, six candidate build inputs, four policy
payloads and both candidate ELFs unchanged. Results are retained in
`hdmi-release-deps-20261112-001/validation.json`; the stop-specific report pins
its own evidence. The initial empty callback-range extraction is preserved as
an intermediate; `sync-response-callback-v2.asm` uses the resolved `0x84a4–0x85ec`
range and is the authoritative focused callback trace. Runtime source/policy
payloads were unchanged, so native build/unit checks were not repeated. No
package, simulator, app execution, hardware release or restoration test was run.

### Stuck or lost session restoration decision — 2026-11-12

**Offline design review only; zero TV/network operations or permission changes.**
The concrete proposal is **one bounded app cleanup, one owner UI viewing
attempt, then one owner-operated true cold power cycle for a stuck/lost session**.
The exact ordered procedure, budgets, prerequisites and outcome branches live
only in the [current plan](../../device-tests/current-plan.md#restoration-route--proposal-for-one-owner-attended-trial).
No new recovery executable, service endpoint, permission method or firmware
file is needed for this decision.

The saved C1 03.53.45 / SDK 6.5.3 implementation does **not** establish an
independent software-only bounded reset. This is a bounded-attempt operator
protocol, not a claim of bounded physical restoration or device-validated
recovery. If the owner cannot accept and safely carry out the cold contingency,
the first acquisition remains **unsafe_to_test** under this design. The present
request authorizes writing the plan, not performing any of these actions.

| Candidate | Saved evidence and conclusion |
|---|---|
| Close using our known UTP ID | `TVExternalManager::close` `0x5c4b6e` uses `toTVPlayerId` `0x6382a0`, then backend `_close` `0x59bdc`. Ordinary cleanup only: mapping must remain and the release path must respond. It cannot independently clear a stuck request or an erased lookup. |
| App exit / bus disconnect | `onServiceDisconnected` obtains retained caller IDs at `0x4ff30c`; `closeBroadcast` reaches manager close at `0x4ff4b8`, with busy waiting at `0x4ff586`. It may help after the app loses its reply if monitoring and mapping remain. It reaches the same release path and supplies no independent completion bound. |
| Back / input selection / foreground change | Normal TV controls are useful viewing-restoration candidates, but the inspected backend foreground handler only calls `EdidControl::updateForegroundApp` at `0x4b544`. Ordinary input selection reuses acquisition services; no bypass of a stuck release is shown. A restored picture is not proof that an orphaned session disappeared. |
| Normal standby / software power event | `msgPowerD` distinguishes `prepareSuspend` (comparison `0x5a704`, retained-map `_pause` at `0x5a7f6`) from `preparePowerOff` (comparison `0x5a8ba`, retained-map `_close` at `0x5a9a4`). Both depend on the retained map and ordinary backend calls. They do not enumerate an already-erased orphan or prove old processes restarted. A remote/HA off→on is not accepted as a cold reset. |
| Status by app ID, then hypothetical backend close | `status` parses appId at `0x5529c–0x552c0`, iterates the map at `0x55492`, and compares appId at `0x5553c` / `0x555ca`. It emits backend pipelineId at `0x55624/0x55634`, windowId at `0x558cc/0x558e0`, portIdx at `0x5592e/0x55942`. Output is keyed by appId at `0x55990/0x55998`, so same-app entries may overwrite. It can correlate a retained responsive entry, but cannot reconstruct the UTP logical ID/pending state, find an erased entry or interrupt the release wait. A direct close would still use that wait. No call or grant is added. |
| `recoverBroadcast`, mediaId or a named reset method | `recoverBroadcast` `0x5c6c78` binds `TVPlayer::extinputsOpen` through GOT `0x871f84` at `0x5c6ef2`: another open with retained context, not an independent reset. mediaId metadata is not a demonstrated cancellation token. `resetHDMIErrorHistory` has no established session-release contract. None justifies reopening, guessing an ID or adding methods. |
| Clear a map, kill/restart a provider, change policy | `ServiceManager::clearService` `0x7afa8` calls the C++ map's `clear`, not a public reset contract; destruction can re-enter the same release path. Exported functions do not authorize injection. Service kills/restarts, firmware/policy changes and direct hardware access are outside this restoration design. |

The status/power/foreground/recover evidence and 17 hashes are retained in
ignored `build/phase-2/hdmi-restoration-review-20261112-001/restoration-ledger.json`.
The earlier ATSC/DVB/backend/element/resource-client hashes and release traces
remain unchanged. A negative result here is limited to the inspected paths;
it is not proof that no private interface exists anywhere in the firmware.

**Why a true cold cycle is the independent contingency:** the backend service
registry is a process-memory object, exported as `ServiceManager::mServiceMap`
in `.bss` at `0xcd0c0` in the saved libextinput-service. UTP's boot-cache string
is constructed empty in `TVExternalManager::TVExternalManager` at
`0x5c3eb8–0x5c3ebe`; the earlier allocation/removal traces operate on C++
resource maps. A true loss of TV power ends those running processes and the
untimed condition wait, without depending on either ID, the bus callback or a
responsive input UI. This is an **engineering inference about replacing the
old running session lifetime**. It does not prove that every setting is volatile,
that firmware boot cannot reacquire a normal source, that shutdown/disconnection
is safe in every state, or that HDMI viewing will return within a deadline.
Actual cold recovery on this C1 remains **unknown / not TV-tested**.

The operator must follow an owner-confirmed safe power-disconnection procedure,
with no active update/panel maintenance or other uninterrupted-power operation.
The saved files supply no manufacturer-safe OLED timing, so the plan does not
invent one. If safe disconnection cannot be established, testing ends unresolved;
there is no automatic power cut, scripted standby loop or alternate service reset.
One 60-second disconnected interval and a 120-second boot observation limit are
chosen experiment budgets only, not manufacturer guarantees. After reconnecting,
the owner must witness normal viewing/motion/sound; a missing baseline ends the
procedure without a second cycle or acquisition. All pre-cycle IDs are stale.

**Prevent re-acquisition during restoration.** The future launcher/controller
must be stopped with no queued/replayed opt-in before the cold step. Current
candidate `session.cpp:64–80` requires an explicit launch JSON Boolean;
`session.cpp:94` exits before graphics/IPC without it, and `main.cpp:175–177`
only arms the 22-second deadline on opt-in. appinfo declares an ordinary native
entry point and no autostart option. This is a local candidate property, not
proof about an uninspected future package/launcher or installed boot environment;
the package/relaunch review remains a pre-run check. No recovery step launches
the candidate, installs rules or retries a pipeline.

**Keep reset and normal cleanup outcomes separate.** A lost ID, missing/negative
close, unconfirmed local exit, transport loss or abnormal post-exit viewing is a
failed/inconclusive trial even if UI or cold recovery later succeeds. UI recovery
alone does not reconcile uncertain ownership; cold recovery is required before
considering another experiment in that branch. Conversely, the always-conservative
`acquisitionUncertain` flag is not itself an emergency trigger: with acknowledged
normal cleanup, confirmed process exit and an observed normal baseline, the
first trial can record normal-exit viewing restoration while `hardwareRelease`
remains unknown. A cold reset never rewrites the original report or proves that
its prior close released hardware.

The open-ended restoration research gate is now a concrete **owner acceptance /
physical access / safe-power-procedure condition**, plus eventual recovery
observations. Narrow-policy admission/load/unload and a pinned package/generated
role/bounded capture/exit procedure remain separate preparation gates. No prior
fault-injection campaign, additional reset grant, dual-source path or proof of
every possible failure is required for proposing one normal-exit picture trial.

Validation: `npm run lint` (including the existing exact-app policy scope checker)
and `git diff --check` passed. The offline preservation/link check verified 166
original artifacts, 159 prior raw assembly files, 106 prior backend/release
evidence files, six current candidate build inputs, four policy payloads, both
candidate ELFs and the unchanged device journal/startup contract. It checked
17 restoration-review evidence hashes and 123 local links across seven updated
documents. The final record is
`build/phase-2/hdmi-restoration-plan-20261112-001/validation-final.json`.
Runtime source/policy payloads were unchanged: no native rebuild/new unit test,
package, simulator, firmware retrieval, TV access, power action, recovery test
or permission activation/removal was performed.

### What remains missing for a second independently live picture

- **Unknown:** UTP server open/allocation/arbitration and importer behavior.
  The retained client/connector/policy evidence does not include the corresponding
  UTP server implementation. A separate assigned window string can name a second
  presentation object, but cannot grant a second HDMI receiver or scaler.
- **Unknown:** whether a second port can remain activated while the first keeps
  advancing, and how each UTP session reaches MAIN versus SUB hardware. None of
  the traced open/select/binding requests contains an evidenced sink/resource
  selector. Do not transfer SMP `avSink` options to UTP or use connector port 5.
- **Unknown live; predicted denial under the comparable public-only grant:**
  admission using our app's actual connection; see the focused review above.
  The stock wildcard role and separate IWC denial cannot prove UTP admission. The candidate
  uses its own named public connection and stops on denial, without impersonation,
  another identity/bus retry, permission edits or privileged generic IPC.
- **Unknown:** release after an open whose ID never returns. There is no evidenced
  allocation lookup/cancellation contract here. The candidate records uncertainty
  and ends; destroying its export or killing its process is not proven cleanup.

### Local implementation and validation

[`native/phase2-hdmi-window/`](../../../native/phase2-hdmi-window/README.md) is the
small single-HDMI candidate: default launch is inert; explicit HDMI-4 consent,
one owned type-2 export, fixed (480,270,960,540) rectangle in required 1920×1080
app coordinates, one open/select and at most eight seconds observation, then
returned-pipeline stop/close and local release. No IWC publication is accessed.
The coordinates are the candidate's own app contract, not a guessed stock-window
baseline or a panel/signal resolution. No arbitrary port/identity/endpoint is
accepted. Cleanup reuses established SDL/LS2 cancellation/release patterns, not
an invented UTP-capable version of the fake-worker supervisor.

**ARM-built, focused host acceptance-tested and direct-executable ABI checked;
not packaged, simulator-tested, TV-tested or device-ready.** Own-caller admission,
actual physical video, release/restoration and dual HDMI remain unknown. The
[current plan](../../device-tests/current-plan.md) specifies these readiness limits
and future single/dual-picture acceptance gates; no TV procedure is authorized.

Local evidence lives in `build/phase-2/hdmi-window-local-20261112/`, including
scoped `inputcommon-window-binding.asm`, exact ELF inspection and hash-checked
`direct-abi.json`/`.txt`. The direct ABI check uses existing
`scripts/verify-native-abi.py`: 75 executable imports, eight direct providers,
ELF32 ARM soft-float, `/lib/ld-linux.so.3`, no RPATH/RUNPATH. It does not validate
the complete SDL graphics dependency closure or dynamic runtime paths.
The prototype README records exact local build/check commands.

Validation: focused CMake/CTest acceptance, `npm test`, `npm run lint`, saved-runtime
direct ABI check and documentation/diff checks. No simulator, packaging or TV
tests. REA opened and identified F6, but native `analyze_function` returned
`provider_unavailable` for this ARM ELF on Windows; no decompiled output is
claimed. Existing WSL SDK objdump and saved assembly supplied the trace instead.
The REA target was closed; no provider installation/configuration was changed.

### Administrative caller and expiring launch — 2026-11-12

**Verified/static and locally acceptance-checked; no TV/network operation or
permission deployment.** This closes the two local control gaps from the
first-picture preparation. It does not establish runtime admission or a picture.

**Administrative route.** Use the stock native `/usr/bin/luna-send` with its own
implicit `com.webos.lunasend-<actual process PID>` name. The saved executable
constructs it via `getpid`/format at `0x1b2c–0x1b40`, registers at `0x1a88`, then
requires attachment success before `LSCallFromApplication` at `0x1bcc`.
`-m` changes the connection name (`0x19b0`); `-a` supplies message appId
(`0x1a14–0x1a28`), not registration. Omit both; `luna-send-pub` is not substituted.

The saved stock role (`caller-policy-0.json`) binds this executable as privileged,
permits its generated name and outbound destination. The core client file
(`caller-policy-3.json`) grants `com.webos.lunasend-*` its existing `all` group;
core API (`iwc-api-1.json`) supplies `all: ["*/*"]`. The same saved stock
manifest references these files. This consumes the existing utility grant;
it does not add one to our app. Saved hub wildcard merge at `0x306f0–0x30776`
and group intersection at `0x329ea–0x32a28` corroborate coverage of **both**
`bus/addOneManifest` and `bus/removeOneManifest`; their connected-name guards
are `0x42920` / `0x42124`. Non-devmode active group loading is
`0x2b830–0x2b840`. No root-UID shortcut or borrowed LG identity is needed.

Evidence: `build/phase-2/hdmi-admin-caller-20261112-001/admin-caller-findings.json`,
SHA-256 `fcdba2aa5bb9c8e42526150748db2a3c4150d7ccbd7d4081285dcb78cabc8d60`.
It pins seven original inputs, including stock utility
`b9b25626a9d7295cfcaca45052555952dd9113707a45893b4b35c27497d9c2af`
and hub `fe05e830674fd80b99d24d9707926b130d978f62cde0690502c898a614c18299`.
`admin-self-query-templates.json`
(`a07eace1baca7c4d3de482017944e88f6eec4aa7a345075675585713d9e0c198`)
provides inert, locally validated query templates using top-level shell `$$`
then `exec`, retaining the utility's actual PID. Each query uses a distinct
registered own context with identical executable/core pins, not one shared
handle or an invented disconnected requester. No template was executed.

**Limits.** Live registration/loaded policy are unknown. A positive query can
fall back to configured `GetRequired` groups if active permission lookup is
absent (`0x32780`, `0x328c0–0x328c6`); it does not prove an active-cache branch
or later mutation success. The utility's `-w` GLib timer is not remote
cancellation/rollback. Explicit add/remove acknowledgment plus fresh-app
baseline/overlay/removed checks remain the future device validation. No extra
firmware is needed, no broad grant/restart is proposed, and an uncertain mutation
is never automatically retried. The current plan specifies the exact sequence.

**Expiring acquisition.** Local 0.1.3 replaces the unbounded opt-in. The future
read-only producer samples fixed boot ID → `/proc/uptime` → boot ID, requires
agreement and saves only private host `launch.json`: current boot plus
`launchStartByBoottimeMs = floor(sample centiseconds to ms) + 3000`.
No host clock, arbitrary TTL, device write or producer launch is involved.
The native parser requires typed bounded fields and rejects the old payload.
`launchAllowed` checks same boot and `0 < deadline - CLOCK_BOOTTIME <= 3000`
before capture and again before graphics/registration. Unknown clock/metadata
fails closed; the report never includes boot ID or the raw launch payload.

The 22-second alarm is armed before validation. An accepted start occurs by
sample +3 s, so its cap is by sample +25 s, before owner submission +27 s because
sampling precedes that one submission. Boot-time dispatch guards separately end
progress at sample +17 s and cleanup at +22 s, including suspend time, and
recheck the operation-specific cutoff immediately before dispatch. A delayed
start or old-boot replay is inert; exclusive report reservation prevents a
concurrent same-version second acquisition. Do not refresh/retry an expired
payload. This is a client timing/ownership contract, not a backend release proof
or unconditional survival through stopped/killed tasks or kernel failures.

**Local artifact/checks.** `hdmi-window-0.1.3/package-validation.json` pins the
20,806-byte IPK (`375f77d753eebbc1d6f1ca292689853c90352644d21a2ec45c7078bcd061bb9b`)
and 44,656-byte ELF (`24d3b5115fe4b56ad70f48fd06329d3df27533129a261908699f88b53932d797`).
Host acceptance, boot-bound payload/report checks, policy scope, ARM build and
archive inspection passed. The C1 boot-clock provider is saved `librt.so.1`;
96 required imports/nine direct DSOs passed. The ABI checker now uses the ELF
version index → DSO binding rather than a version-name-only map: libc and librt
both name `GLIBC_2.4`. The core regression rejects a symbol in the wrong DSO.
Earlier packages/ELFs/reports are preserved. Graphics closure, actual loader,
normal launcher/jail/boot metadata, admission, HDMI and restoration remain
untested. No deployment or device run is implied. See the current plan for the
single next admission-only device step, requiring separate owner scope.

## Findings

Here, **verified/static** describes bytes, declarations or source flow,
not successful calls. **Candidate** needs device validation; **unknown** means
the required evidence is absent. **Unsupported** is limited to a demonstrated
interface limitation, not a verdict that the C1 cannot support dual HDMI.
**unsafe_to_test** marks paths excluded by the project safety rules.

| Boundary | Status and evidence | What remains unproved |
|---|---|---|
| Input selection | **Verified/source:** HomeBack inventories EIM inputs and launches their app IDs [U1]. **Verified/static C1:** the HDMI 1 manifest uses the native `inputcommon` executable [F1]. | Which input currently owns the running receiver was not queried. Launching an input app is not allocating a receiver per port. |
| Receiver/session ownership | **Verified/static C1:** `ExternalInputService.qml` opens `utp.extinputs` with app/window identity and input-source type, receives a pipeline ID, and uses that ID for switch, pause, stop and close [F2]. UTP role files declare this service under `utp-atsc` and `utp-dvb` [F4]. | Active server variant, allocation/arbitration, resource reclamation and second-session behavior. Role files do not identify a running owner. |
| Numbered port selection | **Verified/static C1:** `DisplayVideoModel.qml` maps HDMI1/2/3/4 to source type HDMI and port IDs 1/2/3/4; it switches its stored pipeline to the selected port [F3]. | Independent concurrent per-port activation. A numbered selector on a pipeline can still feed a shared mux. |
| Physical-input viewport | **Verified/static C1:** the frontend publishes its exported window to IWC, handles rectangle/crop commands and has a full-window recovery path [F3, F5]. The native executable imports `WebOSExported` geometry APIs [F6]. The [IWC follow-up](../c1-iwc-ownership-recovery.md) identifies one-shot setters and priority arbitration, with no controller lease. **Candidate:** owner-mediated selected-HDMI geometry. | Effective Homebrew caller admission, exact prior-state restoration, controller-death recovery and TV behavior. Do not take over the stock app's publication. |
| Main/sub presentation | **Verified/device for local clips only:** explicit SMP main/sub passed both clocks, B geometry and A continuity [D1]. **Verified/static:** connector sink selection requests MAIN_SCALER versus SUB_SCALER [F7]. | No evidenced bridge from a second physical UTP session to `sub_video`/SUB0. Do not transfer the SMP Load option to UTP by analogy. |
| Output capture | **Verified/source:** Hyperion selects display/scaler taps; its DILE backend uses active capture and `/dev/mem` [U2]. **Unsafe_to_test** here. | Inactive-port frame access. Video-window indices and buffer counts are not demonstrated HDMI selectors [U3]. |
| SDK entry point | **Verified/declaration:** the installed Starfish and NDL headers expose media Load/window/area controls [S1]. A typed HDMI/UTP acquisition API is **unsupported by those inspected declarations**. | A JSON payload API's arbitrary contents are not fully described by its C++ signature. Header absence does not prove firmware absence. |

## C1 session and viewport path

The shipped frontend provides the clearest physical-input entry point:

1. `MainView.qml:101–103` forwards its assigned exported-window ID to
   `DisplayVideoModel.openFirstLaunch`. The model's lines 338–345 select the
   HDMI source type/port mapping before opening the external-input service.
2. `ExternalInputService.qml:58–64,87–93` supplies `options.appId`,
   `options.windowId` and `inputSourceType` to `open`; lines 39–49,69–78
   consume the returned pipeline ID. Lines 142–145 and 163–167 use the owned
   pipeline ID for `close` and `switchExternalInput` respectively [F2].
3. `DisplayVideoModel.qml:707–718` stores that ID. Its startup path at
   391–417 and 491–497 leads to `initVideo`; lines 1293–1304 define port
   numbers and 1313–1329 switch the stored pipeline [F3]. This is an actual
   firmware client contract, not proof that two opens remain independently live.
4. The model's lines 95–104 publish/cancel its window through IWC.
   `InputWindowControlService.qml:39–53` supplies app/window identity and
   dimensions to `publishWindow`, then uses a publish ID for `stopPublishWindow`
   [F5]. Model lines 1146–1204 handle matching-publish commands, validate
   rectangles and forward geometry to the frontend. Lines 1207–1227 restore
   the original full-window rectangle on a stop-publish response, subject to
   the frontend's PiP state [F3]. This does not establish restoration if a
   separate controller dies or the service refuses a release.

The HDMI 1 manifest declares a transparent native app and an owned window
group with anonymous attachment disabled (lines 5–8,26–30) [F1]. Its app role
has wildcard outbound permission [F4]; that is the **stock app's** role, not
permission inherited by a Homebrew app or permission to impersonate it.
UTP's inspected API files list the relevant extinputs methods in `private`
(lines 2,420–455). The videooutput API lists `getStatus` and display setters
under `media`, `public` and `private` [F4]. These are policy declarations;
neither a callable schema nor a successful authorization check follows.
No service call was used to test permission.

The retained AV connector is a second, narrower client lead. Its
`UTPConnector::registerId` at `0x158c0` builds an HDMI open request;
`_connect` at `0x16048` supplies a pipeline ID and a **fixed integer 5** for
`portId` (`0x160bc–0x160dc`). `setWindowId` at `0x163e4` builds pipeline/window
binding; `unregisterId` at `0x15c54` builds close. Endpoint strings are at
file offsets `0x22788–0x22860` [F7]. The meaning of this client's port 5 and
its applicability to physical jacks are **unknown**. It is not an app-selectable
HDMI1/2 recipe. The frontend's explicit 1–4 map must not be conflated with it.
Instruction addresses here are ARM ELF virtual addresses, Thumb bit cleared.

The retained example resource configuration declares `VHDMIRX=3` (92–94),
`AHDMIRX=2` (98–100), `HDMI_INPUT=8` (248–250), `MAIN_SCALER=1` (278–280)
and `SUB_SCALER=3` (284–286) [F8]. These are resource-manager declarations,
**not measured receiver counts or proof of simultaneous physical ports**.
No UTP server allocation trace, live grants or HDMI session log was collected.

## Provenance and local evidence

All new copies remain ignored under
`build/phase-2/hdmi-discovery-20261111/`; do not redistribute firmware/QML.
The `*-fixed-path-inventory.json` files record exact TV paths, local filenames,
sizes and SHA-256 values. Initial failed filename guesses are retained as
`unavailable`, not service absence. Directory reads were limited to fixed
policy/QML directories and selected service/component filenames. Collectors
use the existing profile loader, SFTP reads and 20/30-second connection caps;
file bounds were 512 KiB, or 16 MiB for the executable collection. No profile,
private key, live pipeline ID, network identifier or unrestricted log is exported.

| Ref | Original path / local copy and location | SHA-256 |
|---|---|---|
| F1 | `/usr/palm/applications/com.webos.app.hdmi1/appinfo.json` → `fixed-0.txt` | `c8bcb07519c404a361a9706d83c1cb59376681875717ae8f4375e5bd06d91092` |
| F2 | `inputcommon/qml/Service/ExternalInputService.qml` → `route-1.qml` | `2ecc5608daa23a44d39347654b9b13693d04e64768024bd7a8748cf0749f26b9` |
| F3 | `inputcommon/qml/Model/DisplayVideoModel.qml` → `route-5.qml` | `d61ee398fef6a9ff4e60155041965684657f4b4cfa0c87006f7cc90fc665437f` |
| F4 | `/usr/share/luna-service2/roles.d/`: HDMI1 app, UTP ATSC/DVB, videooutput roles → `policy-0..3.txt`; `api-permissions.d/`: UTP ATSC/DVB → `policy-4..5.txt`, videooutput → `fixed-7.txt` | Full individual hashes in `policy-fixed-path-inventory.json` and `fixed-path-inventory.json`; both UTP API files: `f80033f99cdbddb7ffccd4221b822a4dbed3110a34dcc275932d0ca1ef8bfd07` |
| F5 | `inputcommon/qml/Service/InputWindowControlService.qml` → `route-2.qml` | `5d55de45567e6c320b48ce71fff5e58e48f1a80a838820fe0b75c0d4a606fc50` |
| F6 | `/usr/bin/com.webos.app.inputcommon` → `followup-0.bin`, `inputcommon.symbols`; `InputCommon::setExportedWindow=0xce2c`, `setCropRegion=0xcfb0` | `39c2e04867c7b77150c81e5aec2c06221c960584dd5f4b1805d8f6cbb708f16f` |
| F7 | Retained `/usr/lib/libav-connector.so.1`, symbols/assembly under `build/phase-1/firmware-inspection/` | `c7cffeb1437f3b785782467cced052cefa3ed3f9d0a7689bb49db3b494f5aff3` |
| F8 | Retained `/etc/umediaserver/umediaserver_resource_config.txt`, same directory | `50609323ba9e200de509c793f0e4aee420a935ab94b757877423b7db62e46ea8` |

The abbreviated `inputcommon/` paths above expand to
`/usr/palm/applications/com.webos.app.inputcommon/`. Its `MainView.qml`
is `policy-7.txt`, SHA-256
`bcd9bf3f4773ecebc664c98917d42036408c8db1055f0f314f6ef178a8be704a`.
IWC/videosinkmanager policy filenames guessed in `viewport-fixed-path-inventory.json`
were unavailable. The [IWC follow-up](../c1-iwc-ownership-recovery.md) subsequently
located its legacy service/roles and native provider. Effective Homebrew caller
admission and videosinkmanager's implementation remain unresolved; initial
filename misses are not service-absence evidence.

**S1:** existing Linux SDK `2026.08-webos`, rooted at
`/home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot`.
In its `arm-webos-linux-gnueabi/sysroot/usr/include/`:
`starfish-media-pipeline/StarfishMediaAPIs.h:48–49,64,67` has SHA-256
`cc988911df505cff5acdee5dd175a7fedc0998e50561315cdb7ed049fa97cfcd`;
`libndl-media/NDL_directmedia_common.h:43` has
`fdf4b1ef202d89dccffa2571229a6246e94b72dfcd268e440f8df1d575c0527f`;
`NDL_directmedia_v2.h:75,82` has
`ae6574f061dae3c7d812e69a6aee4c81a0a5ac4c1fccd1ba74fb92657b5e71e7`.
This newer SDK is declaration evidence, not a retail C1 ABI/behavior guarantee.

**D1:** [Phase 1 journal](../../device-tests/c1-journal.md#phase-1), explicit main/sub
stages, and `build/reports/c1-phase1-sinks-stages-0.1.0.json` with its resource
report and owner observations. The [resource-path analysis](../c1-smp-ndl-resource-path.md#exact-firmware-path)
records sink parsing/cleanup addresses. These existing TV-tested local-clip
results are retained unchanged; this HDMI research has no behavioral TV test.

## Pinned upstream boundaries and licensing

- **U1:** HomeBack [input inventory](https://github.com/angelcode1/webos-HomeBack/blob/27e5f4543a39a50484a3f184fe36a92cea565368/packages/app/src/shared/services/launcher/providers/input-manager/input-manager.provider.ts#L10-L50)
  and [launch delegation](https://github.com/angelcode1/webos-HomeBack/blob/27e5f4543a39a50484a3f184fe36a92cea565368/packages/app/src/shared/services/launcher/model/launcher.service.ts#L119-L122)
  establish selection only. Its app-PiP orchestration is separately bounded
  in the [prior audit](../prior-art.md#network-playback-and-app-lifecycle-prior-art).
- **U2:** Hyperion's [DILE backend](https://github.com/webosbrew/hyperion-webos/blob/00c932f092084b234b3f619b060a98fa134c12bd/unicapture/backends/libdile_vt.c#L35-L165)
  and [VT backend](https://github.com/webosbrew/hyperion-webos/blob/00c932f092084b234b3f619b060a98fa134c12bd/unicapture/backends/libvtcapture.cpp#L32-L180)
  tap output paths, not independent HDMI jacks. No capture backend was run.
- **U3:** the older DILE header defines [video-window indices](https://github.com/webosbrew/webos-userland/blob/00a5f8721e15d5c10030b99b2f3e73e0c527bcce/include/dile/dile_vt.h#L72-L80)
  and names Create/CreateEx parameters [videoWindowID and bufferNum](https://github.com/webosbrew/webos-userland/blob/00a5f8721e15d5c10030b99b2f3e73e0c527bcce/include/dile/dile_vt.h#L410-L430).
  Its [provenance](https://github.com/webosbrew/webos-userland/blob/00a5f8721e15d5c10030b99b2f3e73e0c527bcce/include/dile/README.md#L1-L6)
  points to webOS 5 sysroot material; C1 runtime mapping is unknown. Despite
  the repository Unlicense, this [header retains an LG reproduction restriction](https://github.com/webosbrew/webos-userland/blob/00a5f8721e15d5c10030b99b2f3e73e0c527bcce/include/dile/dile_vt.h#L1-L8).
  Do not copy it as cleared Unlicense implementation.
- **U4:** an [overlay manifest](https://github.com/iDaddyCz/ha-lg-webos-pip/blob/c9e22766b7e045810cda7aafe63f4f732d0f5f18/webos-app/app/appinfo.json#L1-L17)
  supplies a presentation candidate, but its [reported target is G4/webOS 24](https://github.com/iDaddyCz/ha-lg-webos-pip/blob/c9e22766b7e045810cda7aafe63f4f732d0f5f18/README.md#L18-L33), not this C1.

All revisions already appear in [source-lock.json](../source-lock.json).
Unlocated cached trees were not assumed present; pinned primary files supplied
the upstream follow-up. No upstream implementation was copied. Existing
license boundaries for samples, HomeBack and Hyperion remain in the prior audit.
The community proposal, network players and unread LG combination table there
add no C1 dual-port evidence.

## Smallest proposed active experiment — selected-HDMI HUD only

**Historical proposal, superseded by the acquisition/owned-window direction
above.** It is not the current plan or a queued intermediate test.

**Candidate, not built/packaged/ABI-checked/simulator-tested/TV-tested.**
After explicit owner opt-in, an original decoder-free transparent overlay
could test whether the already selected HDMI picture survives a diagnostic
surface. It would own only its app window, with no UTP, IWC, videooutput,
capture, audio-focus or input-selection calls. Overlay admission on C1 is
unknown [U4]; rejection ends the test without policy edits or retries.

1. The owner manually selects the sole connected, unprotected HDMI source
   with a visibly advancing clock. Record port number, model/firmware and
   baseline picture/sound as human observations; do not export source labels.
2. Open the future diagnostic explicitly. Show a small HUD with its own
   changing counter for **8 seconds**, with a **12-second whole-run cap**.
   No menu wait or idle campaign. The HDMI clock must remain visible outside
   the HUD; a transparent background alone is not a successful result.
3. Back/Exit, loss of visibility/focus, cancellation or deadline closes the
   app and releases its window/timers. Use an identity-checked app-only host
   close at the cap if normal closure stalls; never signal the HDMI frontend
   or a system service. A forced stop is recorded separately from clean exit.
4. Acceptance: owner sees both counters advance during the same interval,
   followed by HUD removal, confirmed process exit and normal HDMI picture
   and sound. Denied admission, black/frozen HDMI, unexpected input/mode change
   or failed cleanup is a stop/failure, never a reason to acquire another input.
   The remote's normal controls are the manual restoration route if needed;
   unconfirmed restoration leaves the gate failed and ends further tests.

Record only app/build hash, elapsed times, fixed lifecycle/cleanup outcomes
and separate owner yes/no/unknown observations. No screenshots/raw service
payloads, live IDs or vendor logs are needed. This can establish **selected-HDMI
overlay coexistence only**. It cannot pass the viewport or dual-HDMI gates.

The [IWC ownership/recovery follow-up](../c1-iwc-ownership-recovery.md) now traces
the provider, legacy policy, setter fields, priority arbitration and recovery
boundary. It finds **no controller lease or identified disconnect rollback**.
Its caller/restoration follow-up identifies a declared own-app identity and
verifies that ordinary C1 compositor geometry clears crop state. Actual caller
admission and applied restoration remain untested. Next review a full-view-baseline
plan with independent bounded restoration before any geometry request. Do not
invoke publish/open/set methods merely to discover behavior. A direct UTP
experiment additionally needs server allocation/cleanup evidence; dual HDMI
also requires a second independent source.

## Validation

Static inspection used PowerShell, bounded SFTP collectors saved locally,
existing ARM SDK `objdump -TC` for `inputcommon`, retained connector
`objdump -dC`/symbol inventories, hashes and exact QML/policy line references.
REA's portable export inventory corroborates connector identity/exports only:
parent Evidence `ev_2d7eb4ba0a48b558843b8d234d20065fb98e5c06b1cffcb73662e49af85eea14`,
saved in local `rea-evidence.json`. No decompiler or runtime result is claimed;
no native analysis session was opened.

Validation commands/outcomes: `npm test` passed all existing host acceptance
checks; `npm run lint` passed ES5/JSON checks; `git diff --check` passed.
A read-only Node check verified all 17 successfully retrieved inventory
entries against their retained bytes/SHA-256, 32 local documentation links
and absence of trailing whitespace in the four changed Markdown files.
No tests were added. Native CMake/CTest builds, IPK packaging, simulator work
and device experiments were not run for this documentation-only change.
