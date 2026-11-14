# C1 HDMI admission and cleanup — investigation through 2026-11-14

> Historical investigation snapshot. Earlier blockers, permission states and “next” steps below describe their recorded stage. Use [Status](../../../STATUS.md), the [current evidence map](../c1-hdmi-interface-map.md) and [current test plan](../../device-tests/current-plan.md) for present readiness. No command here authorizes a TV operation. Original technical claims/hashes are retained; links are rebased.

Updated 2026-11-14. LG OLED C1, firmware 03.53.45 / SDK 6.5.3.
[Status](../../../STATUS.md) · [Current procedure](../../device-tests/current-plan.md) ·
[Prototype contract](../../../native/phase2-hdmi-window/README.md)

This is the current finding index. The complete
[saved investigation](c1-hdmi-investigation-2026-11-12.md) retains exact
addresses, source/firmware hashes, earlier hypotheses and licensing references.
Historical next steps in that record describe their original stage.

## Findings and limits

| Question | Current conclusion | Exact evidence |
|---|---|---|
| Can the client bind HDMI to its own surface? | **Verified/static:** stock frontend exports its own window, receives its ID and passes it to UTP open before numbered-port selection. It supports building a candidate, not a working HDMI claim. | [Window acquisition trace](c1-hdmi-investigation-2026-11-12.md#the-missing-client-side-connection) |
| Does a cached session supply another receiver? | **Unsupported inference:** the nonempty cache is boot-to-client adoption, not independent allocation. `NormalWindow` controls the evidenced rebinding branch; the candidate supplies it. | [Cache and close](c1-hdmi-investigation-2026-11-12.md#cached-session-eligibility-and-failed-close--2026-11-12) |
| Can close success prove release? | **No:** UTP and backend bookkeeping can remove IDs after a returned backend failure. Outer acknowledgments do not prove hardware release. | [Backend failure](c1-hdmi-investigation-2026-11-12.md#hdmi-backend-implementation-and-release-failure--2026-11-12) |
| What does stop do? | Saved unmodified UTP routes dispatch `stop`, with no pause alias; the saved HDMI backend registers no stop. **Unsupported by saved dispatch/registration**, with effective live overrides unknown. Close independently requests release; pause retains ownership and is not a fallback. | [Stop and resource wait](c1-hdmi-investigation-2026-11-12.md#stop-routing-resolved-and-downstream-release-boundary--2026-11-12) |
| Is cleanup bounded in hardware? | **Unknown:** the resource client has an untimed wait. Client cancellation/alarms bound local work, not backend release. | [Release boundary](c1-hdmi-investigation-2026-11-12.md#stop-routing-resolved-and-downstream-release-boundary--2026-11-12) |
| Is narrow admission feasible? | **Current coverage verified:** fresh denied baseline then one acknowledged held-manifest add and exactly `[1,1,1,1]`, only own app/four methods. Grant retained loaded, manifest outside scan roots. Actual UTP admission untested. | [0.1.4 activation](../../device-tests/c1-journal.md#014-narrow-permission-activation-and-coverage-verified), [earlier rollback](#prepared-correction-route--startup-cache-and-two-file-modes) |
| Who can administer that manifest? | Stock `/usr/bin/luna-send`, default own identity without `-m`/`-a`: both exact predictions and add acknowledgment verified on C1. Remove lost transport without acknowledgment; later independent denied maps verify rollback, not that dispatch. | [Interrupted transaction](#narrow-policy-activation-and-interrupted-removal), [static caller evidence](c1-hdmi-investigation-2026-11-12.md#administrative-caller-and-expiring-launch--2026-11-12) |
| What correction is prepared? | **Preservation and denied maps verified.** No further boot requirement. New 0.1.4 package is prepared locally with absolute expiry; installed 0.1.4 files/modes pass, so correction is skipped. | [Startup/cache and mode evidence](#prepared-correction-route--startup-cache-and-two-file-modes), [current procedure](c1-hdmi-admission-2026-11-14.md#prepared-correction-route--startup-cache-and-two-file-modes) |
| Does the installed candidate still match? | **0.1.4 installed/read-only verified:** exact ELF/appinfo/icon, generated roles/client/versioned linkage, expected owners and modes. ELF0755/appinfo0644; app absent, connection closed. No repair needed. Earlier 0.1.3 mode drift remains historical/unknown cause. | [0.1.4 installed audit](../../device-tests/c1-journal.md#014-installed-files-and-modes-verified), [historical mode findings](#read-only-reconciliation-and-installed-mode-drift) |
| Can a delayed queued launch acquire later? | **0.1.4 guard locally tested:** absolute expiry plus ≤3-second uptime window; UUID alone is insufficient on observed C1. Old payloads rejected, matching reused-ID/uptime with expired real time rejected. Clock reset/skew limits remain; picture integration untested. | [Expiry proof and ABI check](c1-hdmi-investigation-2026-11-12.md#administrative-caller-and-expiring-launch--2026-11-12), [baseline record](../../device-tests/archive/c1-hdmi-preparation-2026-11-14.md#hdmi-window-013-installed-verification-and-baseline) |
| How is a stuck/lost session restored? | **Owner contingency only:** bounded client cleanup → one UI attempt → one safe true cold cycle. Usable recovery is untested; no bounded software reset is established. | [Restoration evidence](c1-hdmi-investigation-2026-11-12.md#stuck-or-lost-session-restoration-decision--2026-11-12), [current procedure](../../device-tests/current-plan.md#restoration-and-stop-rules) |
| Can HDMI 1 and HDMI 2 advance independently? | **Unknown.** No second independent receiver/presentation path or concurrent physical-input result is established. | [Missing second-picture connection](c1-hdmi-investigation-2026-11-12.md#what-remains-missing-for-a-second-independently-live-picture) |

## Current launch correction

The C1 post-boot read-only record returned the same UUID with uptime 444 seconds
versus 2,379 host seconds since preservation. UUID uniqueness is unsupported by
this observation; no additional boot experiment is needed. The old 0.1.3 guard
could admit an old payload if both UUID and uptime matched again after restart.
Its exclusive tmp report does not exclude replay after tmp is cleared.

0.1.4 adds `launchStartByRealtimeMs`, produced from host time before proc sampling.
Both three-second clock windows must pass before report reservation and graphics:
[producer](../../../scripts/hdmi-window-launch.cjs),
[native parser/predicate](../../../native/phase2-hdmi-window/session.cpp),
[clock reads](../../../native/phase2-hdmi-window/launch-clock.h),
[entry checks](../../../native/phase2-hdmi-window/main.cpp).
Regression tests reject reused UUID plus matching uptime with expired real time.
Clock skew/failure rejects; simultaneous wall-clock reset into the old window
remains a limitation. This is launch freshness, not a guaranteed unique boot
identity or a hardware release check. Uptime dispatch/alarm bounds are unchanged.

Package/host CTest/96-import direct ABI/archive checks pass locally. No new native
provider import is introduced; both clocks use saved C1 librt `clock_gettime`.
0.1.4 installed files/modes are now verified read-only; no 0.1.4 execution or HDMI test. Source/artifact pins are in
`build/phase-2/hdmi-window-0.1.4/package-validation.json`; current scope is local.
The optional exact two-file correction no longer depends on the failed boot-ID
stage; it requires fresh denied maps and current installed bindings instead.

## Narrow policy activation and interrupted removal

### Prepared correction route — startup cache and two-file modes

**Current checkpoint:** preservation and independent denied-map rollback are
verified. Owner reported cold boot/normal picture/remote; the UUID stayed unchanged
but uptime supports restart. The original frozen verifier remains failed. No more
boot diagnostics. See [actual post-boot result](../../device-tests/archive/c1-hdmi-preparation-2026-11-14.md#post-boot-read-only-verification--permission-rollback-verified).

The startup/cache evidence below explained the earlier cleanup route. Its frozen
0.1.3 helpers/reports are retained history, not a new execution queue. Current
0.1.4 launch and optional two-file correction are described in the current plan.
Original removal receipt/cause remain unknown; map rollback does not establish them.
All hub addresses below refer to saved `/usr/sbin/ls-hubd`, SHA-256
`fe05e830674fd80b99d24d9707926b130d978f62cde0690502c898a614c18299`, with original
`hub.asm` SHA-256 `3a6f46bc8ffc1bc7928c25525edca01ce5ee901a9504951c22f2f197ed2905be`.
Existing REA native-export Evidence
`ev_96c23bb2ee347ae4e340da79f61627da0d5eba2bdd8708a8d19e44427fc651a7`
supports artifact/export identity only; the following behavior is derived from
retained ARM disassembly, not new decompilation or runtime observation.

| Saved location | Finding and consequence |
|---|---|
| `main` `0x170e6–0x170e8`; `ConfigUpdateSecurity` `0x19ede–0x19ee4`; parser `0x19274/0x1927a` | Default startup enters the parser and allocates fresh `SecurityData`. Nonvolatile scans are at `0x199f8/0x19a44`, volatile loading at `0x19a80`. |
| `ConfigLoadVolatile` `0x19144/0x1916e` | Enumerates configured volatile directories and calls `AddExternalManifest` from storage, with saving enabled. Saved config explicitly names both `/var/luna-service2/manifests.d` and `/var/luna-service2-dev/manifests.d`. |
| Empty suffix `0x19116–0x1912c`; collector `0x3a288–0x3a2be`; suffix test `0x3a6a4–0x3a6b2` | An extension-only rename inside a scan directory is insufficient. Complete examined `ProcessDirectory` body is nonrecursive; the chosen holding path is outside **all five** configured scan roots anyway. |
| `hub.symbols:647,758`: `.bss` `external_manifests_data` `0x68460`, `external_manifests` `0x68480` | The examined external cache/index are process-local objects. `Save` reads the manifest at `0x3f386–0x3f38e`, caches referenced files via `SaveFile` at `0x3f4b2`, and inserts into maps at `0x3f512/0x3f526`; `SaveFile` reads/inserts at `0x3dd60/0x3dd74`. No output-file operation was found in the complete examined Save/SaveFile/LoadFromMemory/Remove bodies. This is a bounded finding, not exclusion of every external persistence actor. |
| `SecurityData::ApplyNewSecurity` `0x349c8–0x349ee`, call `0x349e6` | Same-process reload traverses the cached index and re-adds manifests from memory. Moving alone, standby or a config reload does not demonstrate revocation. A fresh boot clears these ordinary process-local objects; post-boot maps must still verify the result. |

Holding path:
`/var/luna-service2/multiview-hdmi-window/hdmiwindow-utp.manifest.removed-20261114-001.json`.
It is outside the two volatile roots and three saved nonvolatile roots. Preserve
all three payloads and generated policies; no deletion or hot unload is required
by the earlier candidate. UUID equality did not distinguish the observed restart;
changed UUID is no longer an acceptance requirement. Fresh nonempty maps restored exactly
to original baseline, no owned group/rules and `[0,0,0,0]`, pass that phase.

The two mode targets are supported independently by the saved installed audit
(`0755` ELF, `0644` appinfo) and package staging at
[`prepare-hdmi-window.py:60`](../../../scripts/prepare-hdmi-window.py#L60).
Current content hashes/UID/GID are pinned by state/metadata captures. Restore
appinfo first and ELF last with validated open handles, preserving contents,
`1000:1000` ownership, size/mtime, every directory and generated policy. The actor
need not be identified before preparing this exact restrictive repair; persistence
remains unknown and a later fresh gate must detect recurrence.

Installed `ssh2` SFTP API supports direct `fchmod(handle,mode)` via
`fsetstat({mode})` (`node_modules/@webos-tools/cli/node_modules/ssh2/lib/protocol/SFTP.js:1190,2484`).
There is no SFTPv3 `O_NOFOLLOW` flag or inode identity in these attributes
(`:93,2570`); checks reduce path races under a quiet-install/no-active-writer
assumption, not a race-free guarantee. TV server support is candidate until
tested. No path chmod fallback or native helper installation is proposed.

Prepared local package: `build/phase-2/hdmi-correction-0.1.3/`, frozen
`prepared-plan.json`, fixed three-stage runner, adapter-only mutation modules,
`static-evidence.json` and twelve hash-pinned saved-assembly excerpts. Host checks
cover exact targets/order, no mutation on failed bindings/collision/running app,
partial/unknown stop, descriptor allowlists, preserved partial query replies,
elapsed-deadline dispatch and plan/default mode with network/device loading blocked.
Peer review fixes preserve final records on capture-artifact errors and distinguish
host intent from acknowledgment/readback. No fresh native engine or firmware run.

**Verified later:** preservation and exact denied-map rollback. **Not TV-validated:**
SFTP server fchmod acceptance, correction persistence, 0.1.4 runtime clocks,
actual UTP admission, graphics or hardware release. The current plan advances to
one separately scoped picture trial after narrow activation/coverage; 0.1.4 file readback has passed.
### Fresh state inspection — exact grant remains

2026-11-14, 16:21–16:22 Athens: separately authorized read-only state inspection
completed, without app execution or permission mutation. Seven utility/core
pins, 0.1.3 installed contents, four generated policy hashes and three owned
payload hashes match saved bindings. The app was absent during SFTP inspection.
Installed ELF/appinfo are still `0777`; the launch-mode gate remains failed.

The exact owned manifest is present at
`/var/luna-service2/manifests.d/io.github.tpapaz.multiview.hdmiwindow.utp-policy.json`
(393 bytes, SHA-256 `e0a447e75923c7d30aecc98a561a47b8711d533a624e6725b89f859039e0e498`).
The proposed holding path is absent; preserving move has not occurred.

Two fixed `queryServicePermissions` requests, each using stock `luna-send`'s
own default identity with rechecked core pins, returned success/exit 0/no stderr.
The returned app vector includes our owned group and the UTP map assigns it to
only the four exact intended methods. Comparing with original baseline gives
**overlay acceptance true, removed acceptance false**, calculated `[1,1,1,1]`.
Full transaction acceptance remains false. No unrelated map delta; the current
app reply differs from original overlay only in group order.

**At this inspection, the grant remained present; later post-boot maps verify rollback.** The maps
have no active/configured origin flag. Current presence cannot establish whether
the earlier remove executed, failed or was followed by reload. No crash/reboot
cause, native caller inheritance, UTP admission or hardware outcome is established.
Both connections closed; zero TV writes/deletes, policy mutations, app launches,
UTP calls, input switches, service restarts or power actions.

Private evidence: `build/phase-2/utp-policy-inspection-20261114-001/`, including
`inspection.json`, `permissions/` replies/capture and `findings.json`. Reply
hashes and exact bounded outcomes are in the
[journal](../../device-tests/archive/c1-hdmi-preparation-2026-11-14.md#read-only-policy-inspection--grant-still-present).
Offline reply-binding/time-order/scope/integrity checks passed. No native build
or new IPK needed. The selected correction is now prepared above; no repeated removal,
manifest move, chmod, deployment or app launch is authorized.

### Original transaction and follow-up

The separately authorized 2026-11-14 transaction passed installed/generated/core
pins, app absence, both administrative predictions, fresh baseline coverage and
exact overlay coverage after an acknowledged add. App membership gained only
`io.github.tpapaz.multiview.hdmiwindow.utp`; the same group was added to exactly
`/open`, `/switchExternalInput`, `/stop`, `/close`. All other queried maps were
semantically unchanged. No broad group, role replacement or UTP execution.

The single exact removal dispatch attempt at 10:08:45 UTC lost transport without
a preserved valid acknowledgment. The bounded follow-up failed before any
completed pin validation/query submission; its exact failure boundary is unknown.
Manifest moving
did not execute; it may still be present/loadable in the scanned directory.
**Rollback was unverified at that point; later post-boot maps verify it independently.** The owner subsequently
reports normal picture/remote response; audio/restart history are unspecified.
There is
no evidence establishing a hub crash, TV reboot or transport-loss cause.

Evidence: `build/phase-2/utp-admission-transaction-20261114-001/findings.json` indexes
original reports/reply hashes; [journal](../../device-tests/archive/c1-hdmi-preparation-2026-11-14.md#narrow-utp-activation-and-interrupted-rollback)
records exact outcomes and retained paths. Reconciliation and later denied-map
verification are complete; Status owns the next task. The following baseline explanation remains historical evidence; its
proposed next steps are superseded by this stop and `STATUS.md`.

### Read-only reconciliation and installed-mode drift

The owner confirmed being home and authorized the bounded read-only check.
SSH/SFTP are reachable. Seven utility/core hashes match saved pins; fresh
44,656-byte ELF and 263-byte appinfo contents match packaged 0.1.3. Stable
before/open/after metadata reports both files as `0777`. The earlier audit
records ELF `0755`, appinfo `0644`; the executable's expected-mode gate stopped
before generated-policy readback, own-app absence, owned-file inspection or any
permission query. Owner knows of neither reinstall nor permission change.

**At that stage rollback was unknown; later denied maps verify it. Mode-change cause remains unknown.** There is no evidence
that the changed modes caused the earlier connection loss. Matching contents
support retaining the current IPK; they do not justify changing metadata or
relaxing the launch preflight. No app/HDMI call, TV write/delete, permission
change, restart or power action occurred. Both connections closed.

Preserved evidence: `build/phase-2/utp-reconciliation-20261114-001/` (first local
reader bug, stopped after one file) and corrected `-002/` (`preflight.json`,
`findings.json`). Original audit is
`build/phase-2/hdmi-installed-context-20261114-001/audit.json`. The first helper's
numeric byte-count/Buffer collision was corrected only in a fresh second helper;
original script/report remain unchanged. Findings verify package/native/policy
source pins. The later authorized metadata/mount check completed; no deployment,
removal or first-picture attempt followed.

The latest capture, `build/phase-2/installed-metadata-20261114-001/`, records twelve
fixed metadata paths stable before/after a capped `/proc/mounts` read. Six checked
installation directories and both app files are `0777`. The app directory/ELF/
appinfo have UID/GID `1000:1000`; the five installation parents are `0:0`.
All four generated role/client/manifest files are root-owned `0644`. Their
contents were not read; current content binding remains unverified in this scope.

The projected mount table reports `/media` as ext4 `rw,nosuid,relatime`; `/` as
read-only squashfs, and both read-only-overlay and writable-ext4 `/var` rows.
This does not resolve effective `/var` layer ordering or establish the mount
state during earlier tests. No earlier mount snapshot or mode-change actor/time
was captured. Recorded mtimes cannot establish those missing facts. **The source
of `0777` remains unknown; rollback was unknown at that stage and is now verified separately.**

Only relevant targets/types/allowlisted flags were retained from 18,835 bytes /
198 mount rows; sources, unrelated targets and raw contents were omitted. One
connection closed; no command, query, TV mutation, app/HDMI operation or mode
relaxation. Capture SHA-256:
`571020f11e80fbb170be0d17ed7fa2137f2a2f6ca4b209264be5a3ebfcd43622`.
Local privacy/size acceptance and syntax checks passed; original report and
package/native/policy hashes remain unchanged. No binary rebuild was needed.

The later separately authorized **state-only policy inspection** above has now
completed while retaining the failed launch-mode gate. Reading policy state did
not execute the app or establish launch readiness; acquisition preflight was not
relaxed/relabelled. No further read/query or correction is authorized by those
completed scopes. The current plan owns the bounds and acceptance distinctions.

### Offline removal review and reporting limits

The owner was away during this offline review, which made **no TV connection or operation**. Saved hub
SHA-256 remains `fe05e830674fd80b99d24d9707926b130d978f62cde0690502c898a614c18299`.
Fresh REA native-export Evidence
`ev_96c23bb2ee347ae4e340da79f61627da0d5eba2bdd8708a8d19e44427fc651a7`
confirms artifact/export identity only. Branch findings below come from retained
ARM disassembly, not exports, new decompilation or observed firmware execution.
Deep analysis engines remain unconfigured; no dependency was installed.

| Saved code / host location | Supported conclusion and limit |
|---|---|
| `HubService::RemoveOneManifest`, `0x42106–0x42124` | Checks the connected service's permission. A positive eligibility query cannot establish that later unload code is safe. |
| Handler `0x42538–0x42624` | Reads `prefix`/`path`, normalizes `/` to an empty prefix and constructs the path. With empty prefix, `IsManifestNonVolatile` selects direct removal only for a nonvolatile manifest directory; otherwise it invokes `RemoveExternalManifest(...,true)`. Saved pinned config lists `/var/luna-service2/manifests.d` under volatile directories, so the external route is the static candidate here; actual branch execution is unobserved. |
| Handler `0x42624–0x4263c`, direct call `0x426ee` | Constructs `returnValue:true` after the selected helper returns, without a separate semantic revocation check. Both helpers have a missing-manifest return (`RemoveManifest`: `0x3391a–0x33954`; external: `0x3426a–0x342a8`). An acknowledgment alone therefore cannot prove anything was unloaded. |
| `SecurityData::RemoveManifest`, `0x3392c–0x33978`, `0x33a02–0x33a0a`, `0x33c4a–0x33c52` | Removes from the ID/version priority queue, reparses the manifest data and unloads it when the active version changes/disappears. Another version can be loaded. Our files were left in place pending this operation, consistent with the evidenced need to retain removal inputs. This does not prove the actual path succeeded. |
| `SecurityData::RemoveExternalManifest`, `0x3427c–0x342e2`, `0x344b8–0x344d2` | Uses a manifest queue and stored/in-memory external manifest data, removes its external representation and unloads parsed data; can load a replacement version. This is more than removing our app membership. No runtime failure point is identified. |
| `SecurityData::UnloadManifestData`, `0x31ece–0x31f82` | Removes required membership, provided API rules and group-security entries sequentially (`RemoveRequired` at `0x31eea`, `RemoveProvided` at `0x31f2c`, `RemoveProvidedGroupSecurity` at `0x31f76`). The examined routine exposes no all-or-nothing transaction/rollback. Partial state after interrupted execution is a possibility, not an observed outcome. |
| Transaction helper `control.cjs:61–75` | Records `submittedAt` before exec-channel acceptance and retains reply bytes only after normal promise completion. A transport failure can discard already buffered bytes. The evidence proves a host dispatch attempt, unknown hub receipt and no preserved valid acknowledgment; it does not prove zero bytes arrived. |
| Query helper `query-utp-permissions-20261114.cjs:25–40,70` | `connection_or_read_gate` covers connection, SFTP and read failures. Empty `pins`/`queries` means zero completed pin validations and zero query submissions; exact read boundary is unknown. The original derived `pinsRead:0` is overstated and superseded by this interpretation without editing immutable evidence. |

Static review has **not established a crash, reboot, unsafe pointer path or cause
of transport loss**. Host timeout/SSH closure cannot establish remote cancellation.
No remove retry is justified by these findings. Current loaded state and the two
owned manifest locations must be reconciled before considering a correction.
The [prepared conditional procedure](../../device-tests/archive/c1-hdmi-preparation-2026-11-14.md#post-boot-read-only-verification--permission-rollback-verified)
requires owner presence later; no additional firmware binary is needed now.

The offline coverage CLI now retains capture start/end times and rejects reversed,
reused or overlapping windows for overlay/removed/transaction comparisons.
Acceptance tests cover valid order and invalid phase order/overlap; genuine
baseline/overlay replay passes. The incomplete removed capture still rejects.
This change does not upgrade loaded-map coverage into actual UTP admission.
No native source, policy JSON, IPK or original report was changed by this review.

Private analysis bundle: `build/phase-2/utp-removal-offline-20261114-001/`, with
`extraction.json`, six focused saved-assembly excerpts and exported REA Evidence.
`extraction.json` pins the original assembly, firmware and each excerpt; the
PC-relative literal annotations are bounded analyst derivations. They are not
a fresh disassembler/decompiler result or proof of full callee coverage.
`verification.json` records unchanged original-evidence/package/source/policy
hashes, genuine baseline/overlay acceptance, incomplete-transaction rejection
and 126 relative documentation path checks. `npm test`, `npm run lint` and
`git diff --check` passed locally. No native rebuild was needed.

## Why the all-allowed baseline does not establish a grant

Offline tracing and owner-authorized four-file SFTP readback, 2026-11-14.
**Query mechanics are explained; the particular runtime cause is unresolved.**
No app launch, UTP call, permission deployment, power action or TV file deletion
occurred during this follow-up. Preserve the original
baseline and its `phaseAccepted:false`; do not reinterpret it as a passed grant.

### The retained declarations predict denial

- Own installed client policy is exactly `["public"]`:
  `build/phase-2/hdmi-installed-context-20261114-001/client-policy.json`, SHA-256
  `5c0b3ce35633c877fb2caeedd7411c488b3453e63ab0b5e814f4d5f5914dc3ee`.
- Both saved UTP API files have only `private`. Their four exact entries are at
  `hdmi-discovery-20261111/policy-4.txt:420,446,454–455` and the identical
  `policy-5.txt`; both SHA-256
  `f80033f99cdbddb7ffccd4221b822a4dbed3110a34dcc275932d0ca1ef8bfd07`.
- Saved `compat.api.json` has no matching exact/prefix rule for these four
  targets. Core `iwc-api-1.json:2–4` adds `all: ["*/*"]`; it does not grant `all`
  to this app. The saved core client map `caller-policy-3.json:2–4` adds
  `luna.internal.public` through `*`; `all` belongs to `com.webos.lunasend-*`.
  Thus the retained caller groups `{public,luna.internal.public}` do not
  intersect target groups `{private,all}`. These are declaration calculations,
  not a reconstruction of the live active group vector.

All short paths in this subsection are below `build/phase-2/` and their full
paths/hashes are pinned in `utp-baseline-explanation-20261114-002/input-inventory.json`.

### What the saved hub actually answers

Saved `/usr/sbin/ls-hubd` is `iwc-caller-restore-20261111/hub-5.bin`, SHA-256
`fe05e830674fd80b99d24d9707926b130d978f62cde0690502c898a614c18299`.
Its preserved ARM disassembly establishes:

| Branch | Address / consequence |
|---|---|
| Parse the supplied URI and requester | `HubService::IsCallAllowed` at `0x4319c`; `LSUriParse` at `0x43438`; requester and parsed service/category/method passed to the helper at `0x43698–0x436b8`. No UTP provider execution/registration check occurs in this path. |
| Select groups | `LSHubIsCallAllowed` at `0x32724`; `GetProvided` at `0x3276a`, active-client permission lookup at `0x32770–0x32790`; configured `GetRequired` fallback at `0x328c6` if the active lookup is unavailable. A normally registered app does not by itself prove which branch was used. |
| Entire provided map empty | `0x32794–0x32798` jumps to **allow** at `0x328fe`. This is the whole returned service map, not merely a missing method entry. |
| Required group vector empty | `0x3279c–0x327a2` also jumps to **allow** at `0x328fe`. This does not establish that the app holds `private` or `all`. |
| Both nonempty | Pattern matching at `0x32838–0x32896`, then group-identity intersection at `0x329ea–0x32a28`; matching group returns allow. |
| Serialize the Boolean | `0x436bc`, `0x436ec–0x436f0`, `0x43744–0x43748` use the helper result for `allowed`; success of parsing is separately `returnValue:true`. |

The candidate requests the exact own app name and the four intended URIs
([`main.cpp:44`](../../../native/phase2-hdmi-window/main.cpp#L44),
[`main.cpp:114`](../../../native/phase2-hdmi-window/main.cpp#L114),
[`session.cpp:204`](../../../native/phase2-hdmi-window/session.cpp#L204)). Its parser
requires a Boolean `allowed` and records that field, rather than `returnValue`
([`session.cpp:224`](../../../native/phase2-hdmi-window/session.cpp#L224)). The provider
roles and API declarations use the same dotted `com.webos.service.utp.extinputs`
service; a URI spelling error is not supported by these artifacts.

**Candidate explanations:** other effective matching rules/groups, an empty required
vector, or an entirely empty provided map at query time. The report contains
neither map/vector nor branch telemetry, so it cannot choose among them.
Missing UTP-specific rules alone are insufficient if global `all: ["*/*"]`
still makes the provided map nonempty. Root UID is not an input to this helper;
the evidence does not support “root automatically permits everything.” Generated
media aliases are not the app's registered caller identity or a grant to it.
Saved security configuration says `Enabled=true`, `HacksEnabled=false`; that is
saved configuration evidence, not proof of current loaded policy.

### Missing evidence and smallest proposed follow-up

All four requested files are now saved under
`build/phase-2/utp-policy-readback-20261114-001/`. Every file was regular, below
64 KiB, and passed before/open/after size/mode/mtime checks. Original bytes,
SHA-256 and connection closure are recorded in `inventory.json`.

| Retrieved path | Verified result and SHA-256 |
|---|---|
| `/usr/share/luna-service2/api-permissions.d/webos.public.api.json` | 2,348 bytes; matches the earlier inventory hash `b509efaa6a1b2e291b61d0c8d57f8d61590f75223c919dfa4346b1080b91bb38`. Only `keymanager`, `settings`, `settings.read` groups: 58 rules, no wildcard/UTP entry. The filename is not a `public` grant. |
| `/usr/share/luna-service2/manifests.d/utp-atsc.manifest.json` | 520 bytes; `3bc12b6f07550dad936da3d82ff6d469f7b60ad98a571591739c83fa1a96f175`. Lines 10–14 explicitly reference the matching UTP ATSC API and client-permission files. |
| `/usr/share/luna-service2/manifests.d/utp-dvb.manifest.json` | 515 bytes; `d00e608ff9b85a2b5b53a2d4fce073630330563dc1f33763abf15a2b4dfda7c2`. Lines 10–14 explicitly reference the DVB API and client-permission files. |
| `/var/luna-service2-dev/manifests.d/io.github.tpapaz.multiview.hdmiwindow.json` | Previously inferred path **now verified**. 364 bytes; `06f38a3ff604eb165bf696e19e863f10a3158fbdb3dcfae7bce742bfb1171cc9`. Line 1 names app/version 0.1.3 and only its correct pub/prv roles and client file; no extra API/group/client references. |

This rules out the three specific on-disk explanations: a wrong/missing own
manifest reference, UTP access from `webos.public.api.json`, or unreferenced UTP
API declarations. The expanded retained-body calculation still predicts denial
for all four methods. It does **not** prove successful hub parsing/loading,
which provider is active, or the group vectors used during the baseline.
The referenced UTP API/client bodies were not re-read in this four-file scope;
their comparison remains based on earlier saved evidence. Other API inventories
retain IWC-filtered previews, not every rule body; their negative IWC results
cannot exclude other UTP coverage.

### Current blocker and proposed loaded-policy check

The missing evidence is now **the running hub's permission state**, rather than
these four files. Adding a duplicate grant or repeating four positive predictions
would not resolve the discrepancy. No more binary/file collection is the next
task; do not restart services, broaden identities or execute UTP to debug it.

Saved hub tracing identifies a specific read-only candidate:
`luna://com.webos.service.bus/queryServicePermissions`, payload field `service`.
The constructor registers the literal at `0x4769c`; handler at `0x41c98` reads
`service` at `0x41ed2`, tries `LSHubActivePermissionMapLookup` at `0x41f04`, and
otherwise calls configured `GetProvided`/`GetRequired` at `0x41f42`/`0x41f50`.
The shared serializer at `0x41770` emits an `api` object of pattern→group arrays
and a `client` group array (`0x41886`, `0x418f0`). These are branch/body findings,
not a capability inferred solely from the exported name.

The owner authorized these **two hub queries**, now executed once each:

```json
{"service":"io.github.tpapaz.multiview.hdmiwindow"}
{"service":"com.webos.service.utp.extinputs"}
```

Stock `/usr/bin/luna-send` used its own default identity, no `-m`/`-a`, after
seven fixed executable/core-policy pins matched their saved hashes. The run used
one reply/request, two-second utility wait, 64 KiB/reply and a 15-second total
host cap, with no retry. Both utilities exited 0 without stderr; the connection
closed. No app launch, UTP call, grant mutation or TV file write/delete occurred.

**Limit:** the reply has no active-versus-configured-origin flag. With the app
closed, fallback cannot retrospectively prove its earlier active vector. These
queries would establish more about current loaded policy, not automatically
explain the historical branch or prove real UTP admission. If results conflict,
retain that gap and review a specific next question; no speculative grant.

The readback's `findings.json`, `analysis-inputs.json`, three focused hub traces
and original `proposed-state-queries.json` retain the preparation evidence.

### Two-query result and first-picture consequence

Evidence: `build/phase-2/utp-permission-state-20261114-001/`. Capture and raw
replies are immutable/private; `findings.json` records the derived intersection.

| Subject | Observed reply |
|---|---|
| Own app | 313 bytes, SHA-256 `4c5ce61f2ed0f49799e0b10a05349f4a42e7629de4a629a69f928eeba21c321a`; `client:[public,luna.internal.public,signals.all.subscribe,signals.register]`; four API patterns. Neither `private` nor `all` is in this caller vector. |
| UTP extinputs | 2,104 bytes, SHA-256 `7f5736ba65a566738791e764b8c38a7bc9e982da76036bcdc20fefb8a05bdba5`; 41 API patterns. `/open`, `/switchExternalInput`, `/stop`, `/close` each map to `[private,private]`; `/*` maps to `[all]`. |

For every target, the exact plus wildcard matching group set is `{private,all}`
and its intersection with the returned app vector is empty. Therefore these
**queried maps calculate `[0,0,0,0]`** under the saved helper logic. This is an
offline calculation, not another `isCallAllowed` response or an actual denied
UTP call. Both vectors/maps are nonempty at this snapshot; neither an existing
matching public grant nor the empty-data allow branch is demonstrated here.
The provider's own outbound/client groups are not our app's grants.

The earlier `[1,1,1,1]` remains unexplained by a verified grant. Later query
times, an unlabelled active/configured fallback and no contemporaneous active
vector prevent attribution to a specific earlier branch. A transient empty
active vector is a hypothesis, not a proved race/cache defect. Process absence
was not independently rechecked during these two queries. Duplicate `private`
entries do not establish two running providers or independent HDMI receivers.

**Host correction implemented:** the offline checker now validates fixed capture
subjects/hashes/core pins and loaded app-group/exact-method coverage through
baseline, scoped overlay and removal. The genuine saved snapshot passes its
deny-coverage predicate; overlay/removal are synthetic host tests only. It rejects
empty context, extra scope and incomplete revocation; original
`phaseAccepted:false` is unchanged. Current native tooling calls its supplemental
Boolean `predictionMatchesExpected` and does not certify permission readiness.
See the [checker contract](../../../native/phase2-hdmi-window/policy/README.md#offline-coverage-acceptance)
and [current plan](../../../native/phase2-hdmi-window/policy/README.md#offline-coverage-acceptance).
No native version change or TV operation occurred. The next task is separately
scoped narrow activation/coverage/rollback validation; never copy broad
`private`/`all` groups into the app.

At that earlier stage, first-picture blockers were permission rollback and
installed/context validation, separate bounded trial scope and owner
restoration acceptance. Recovering the exact historical 22 ms state is not a
prerequisite once forward coverage is verified. Actual live-caller inheritance,
UTP admission, graphics, picture and hardware release remain trial outcomes;
no new generic diagnostic or recovery campaign is queued.

At that review, native source/IPK, prepared policy and original TV reports were unchanged. Fresh
REA native-export Evidence `ev_40eefe3eff468c289cfbb99d48dfcce94f9660eaa7671bc978bb852ce4c847d1`
confirms the saved hub identity/export addresses; ARM Thumb symbol values carry
bit 0. Branch conclusions come from preserved disassembly, not export names.
The local `utp-baseline-explanation-20261114-002/` capture contains that exported
REA bundle, focused traces, declaration coverage and five analyst branch-model
cases. Deep REA providers were unconfigured; no fresh decompilation or firmware
execution was claimed. The first local model omitted global-wildcard coverage;
its retained `-001` output is superseded by `-002`, which includes `all: ["*/*"]`.

## Evidence location

The dated investigation names exact local inventories and hashes for both UTP
providers, provider/service configuration, extinput-integration and its release
dependencies. The four policy/manifest bodies above have now been retrieved;
their file-existence/reference gaps are closed. No further binary retrieval is
needed for the proposed running-policy question.
Raw firmware/assembly and original reports remain
private under ignored `build/phase-2/`.

For upstream boundaries and attribution, use [prior art](../prior-art.md),
[pinned sources](../source-lock.json) and the investigation's
[licensing section](c1-hdmi-investigation-2026-11-12.md#pinned-upstream-boundaries-and-licensing).
No exported symbol, compile result, local-clip playback or close acknowledgment
establishes simultaneous physical HDMI support.
