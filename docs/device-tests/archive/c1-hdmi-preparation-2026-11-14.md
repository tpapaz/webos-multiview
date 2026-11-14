# C1 HDMI preparation — detailed device history through 2026-11-14

> Historical actual outcomes, preserved together for the acquisition/admission campaign. Statements such as “pending” and “grant still present” apply at their dated observation, not indefinitely. Use [Status](../../../STATUS.md) and the [compact journal](../c1-journal.md) for the latest result. Old next steps are not authorization; no original machine report/hash is rewritten.

## UTP provider retrieval

2026-11-12: owner-authorized **read-only SFTP** of exactly `/usr/sbin/utp-atsc`
and `/usr/sbin/utp-dvb` succeeded (8,792,988 / 8,788,888 bytes). Size/mtime
checks stayed stable; local SHA-256 and provenance are in the
[provider review](../../research/archive/c1-hdmi-investigation-2026-11-12.md#utp-provider-allocation-and-cleanup--2026-11-12)
and `build/phase-2/utp-provider-20261112-001/inventory.json`. Connection closed;
no remote commands, writes/deletes, app launches, HDMI switches or policy
deployment. Subsequent ARM disassembly was offline. Both binaries contain the
session handlers; active variant and hardware acquisition/cleanup remain unknown.
This is a successful file retrieval, **not an HDMI picture or recovery test**.

## UTP routing metadata

2026-11-12: owner-authorized read-only SFTP metadata/immediate-name listings
confirmed all three routing paths are directories (`0755`): 7 provider,
31 service and 2 temporary-provider names. Relevant entries are `extinputs.json`
and `extinputs.bypass.json`; temporary names are only `gibbs.json` / `nabs.json`.
The first collector mishandled directory EOF; its partial report is preserved.
A corrected same-scope pass completed with matching filename sets and stable
before/after directory metadata. Both connections closed. No file contents,
remote commands, writes/deletes, app launches, HDMI switches or policy deployment.
[Exact provenance and limits](../../research/archive/c1-hdmi-investigation-2026-11-12.md#provider-routing-metadata-and-cleanup-boundary--2026-11-12);
reports: `build/phase-2/utp-routing-metadata-20261112-001/` and `-002/`.
This establishes names/types only, not an HDMI backend cleanup result.

## UTP HDMI routing configuration

2026-11-12: owner-authorized read-only SFTP retrieved the two regular files
`/etc/palm/utp/providers/extinputs.json` (366 bytes) and
`/etc/palm/utp/services/extinputs.bypass.json` (1,088 bytes), within 64 KiB/file.
Size/mtime checks passed; original copies/SHA-256 are retained under
`build/phase-2/utp-routing-config-20261112-001/`. Connection closed; no remote
commands, writes/deletes, app launches, HDMI switching or policy deployment.
The config maps HDMI to `com.webos.service.extinputs.hdmi`; offline tracing
identifies dispatch/timeout boundaries, not actual cleanup or hardware release.
[Provenance and remaining gate](../../research/archive/c1-hdmi-investigation-2026-11-12.md#hdmi-backend-mapping-and-cleanup-timeout-boundary--2026-11-12).
No acquisition, picture or restoration test occurred.

## HDMI backend registration and implementation

2026-11-12: the authorized continuation's first SSH connection failed before
any SFTP operation; its report is preserved. Powered on once using the existing
Home Assistant Chrome tab as requested; its UI changed Off → On / PS5 (HDMI4).
That is Home Assistant telemetry, not an owner-confirmed picture observation.
Read-only SFTP then listed 275 manifest / 241 role names and retrieved six
selected regular files: the extinput manifest, role, service record,
`/usr/sbin/extinput-integration`, `libextinput-service.so.1.0.0` and
`libgibb-pipeline.so.1.0.0`. Size/mtime and SHA-256 recorded; connections closed.
Four library soname symlinks were resolved read-only; the last two library
contents remain unsaved. No remote commands, TV file writes/deletes, app launch,
HDMI switch, backend method call or policy deployment. Offline tracing found
backend lookup removal after a returned release failure and a candidate
stop/pause registration mismatch. Neither is an observed hardware leak/denial.
[Exact files, hashes, limits and remaining gates](../../research/archive/c1-hdmi-investigation-2026-11-12.md#hdmi-backend-implementation-and-release-failure--2026-11-12).
No acquisition, picture or restoration test occurred. TV was left on.

## HDMI release-client implementation retrieval

2026-11-12: owner-approved read-only SFTP retrieved exactly
`/usr/lib/libtvrm_client.so.1.0.0` (58,796 bytes) and
`/usr/lib/libelement-base.so.1.0.0` (218,552 bytes). Both regular files passed
size/mtime checks; original copies and SHA-256 are retained under
`build/phase-2/hdmi-release-deps-20261112-001/`. Connection closed; no power
action, remote command, TV write/delete, app launch, input switch, backend call
or permission deployment. Offline review resolves the saved stop mismatch and
finds an untimed resource-release wait plus conditional destructor release
re-entry with ignored result. No runtime denial/hang/leak, acquisition, picture
or restoration result is claimed. [Exact findings and limits](../../research/archive/c1-hdmi-investigation-2026-11-12.md#stop-routing-resolved-and-downstream-release-boundary--2026-11-12).

## HDMI window 0.1.3 installed verification and baseline

2026-11-14: after owner installation, authorized read-only SFTP verified the
44,656-byte ELF (`0755`) and 263-byte manifest against the packaged pins. Both
generated roles match the saved C1 admission-app templates after substituting
only the own identity/executable; the client grant is exactly `["public"]`.
The local collector's single-name/single-permission assumption was corrected to
validate these exact templates, without editing TV policy. Initial preflight
failures are retained. Owned overlay paths and both baseline report aliases were
absent; no app process was found.

The CLI attempt failed local device-profile resolution before TV connection.
One subsequent normal `com.webos.applicationManager/launch` request with only
`{"checkUtpAdmission":"baseline"}` was accepted at 07:59:51 UTC. No direct binary
launch or alternate app caller identity was used. The captured report is
`policy_checked`, `callerReady:true`, four queries, `actualUtpCalls:0`,
`policyAllowed:[1,1,1,1]`, `localCleanup:true`, elapsed 22 ms. **Unexpected allow:**
the planned deny baseline fails (`phaseAccepted:false`); progression stopped.
The collector found identical `0600` reports through jail/host aliases, unchanged
ELF/manifest/generated-policy hashes and no app process. Exit code/deadline and
visible viewing effects remain unobserved; process absence is not proof of them.

Evidence: `build/phase-2/hdmi-installed-context-20261114-001/` (five original
files, audit and saved-template comparison), and
`build/reports/hdmi-0.1.3-baseline-20261114-003/` (preflight, launch observations,
capture). Report SHA-256:
`ac62d40bbbc1ca113c6164db228ba3bf4a482e1e12a9ea2b994305c8d7fbdf12`.
Connections closed. No SDL/export or UTP target call, permission deployment,
input switch, service restart, power action or TV file deletion occurred.
Permission source, actual UTP admission, HDMI picture and restoration remain
unknown. Next review the unexpected prediction from saved evidence; do not add
a duplicate grant or repeat the occupied baseline slot.

## UTP policy/manifest readback

2026-11-14: owner-authorized read-only SFTP retrieved exactly four regular files
(3,747 bytes total): `webos.public.api.json`, the ATSC/DVB UTP manifests and the
own generated `hdmiwindow` manifest at the proposed path. All were below the
64 KiB/file cap and passed before/open/after size/mode/mtime checks; originals
and SHA-256 are in `build/phase-2/utp-policy-readback-20261114-001/inventory.json`.
The public API hash matches its earlier inventory. Connection closed; no remote
commands, app launch, UTP call, permission deployment, power action or TV file
write/delete occurred.

Offline comparison verifies exact own-role/client references and both provider
API references. The public file contains no UTP entry; retained declarations
still predict denial. This closes the four file/reference gaps, not the hub's
loaded-state or historical active-group gap. No additional permission prediction
or acquisition was performed. The [current finding](../../research/archive/c1-hdmi-admission-2026-11-14.md#current-blocker-and-proposed-loaded-policy-check)
proposes two specific read-only hub queries under a future separate scope;
their results cannot retrospectively prove the closed app's active vector.

## Loaded UTP permission-state queries

2026-11-14: owner-authorized two fixed read-only
`com.webos.service.bus/queryServicePermissions` requests, one for our app and one
for UTP extinputs. Before submission, read-only SFTP revalidated seven fixed
utility/core-policy pins, all equal to saved hashes. Stock `/usr/bin/luna-send`
used its default own identity, no `-m`/`-a`. One request/reply per subject,
two-second utility waits, 64 KiB/reply and a 15-second host cap; no retry.
Both utilities exited 0 with no signal/stderr. Replies were 313 / 2,104 bytes;
the connection closed. No app launch, UTP call, permission deployment, power
action, service restart or TV file write/delete occurred.

The returned app client vector is
`[public,luna.internal.public,signals.all.subscribe,signals.register]`.
UTP's 41-pattern map assigns each of the four exact methods `[private,private]`
and wildcard `/*` to `[all]`. Their calculated intersections are empty:
`[0,0,0,0]`, **not fresh Boolean prediction or actual-call results**. Active versus
configured origin is unlabelled; app-process absence was not independently
rechecked. The earlier 22 ms baseline's active vector/branch remains unknown;
no race, existing grant or hardware result is established.

Evidence: `build/phase-2/utp-permission-state-20261114-001/capture.json`, original
`reply-0.json` / `reply-1.json`, `findings.json`. Reply hashes:
`4c5ce61f2ed0f49799e0b10a05349f4a42e7629de4a629a69f928eeba21c321a` /
`7f5736ba65a566738791e764b8c38a7bc9e982da76036bcdc20fefb8a05bdba5`.
Next prepare local coverage-based admission acceptance; the original baseline
and policy/package remain unchanged. This result authorizes no repeat/deployment.

## Narrow UTP activation and interrupted rollback

2026-11-14, LG OLED C1 / firmware 03.53.45 / SDK 6.5.3: owner-authorized narrow
policy transaction, no app launch or HDMI acquisition. Read-only preflight pinned
the installed ELF/appinfo, exact generated pub/prv roles/client/manifest and seven
utility/core files; own app absent and owned paths absent. Stock `luna-send`,
default own PID-derived identity without `-m`/`-a`, returned `allowed:true` for
both exact administrative predictions. Fresh two-query baseline passed coverage
`[0,0,0,0]` with no owned group.

Created one owned directory and the three pinned payloads, then placed the pinned
manifest last without overwriting existing files. One `addOneManifest` returned
`returnValue:true`, exit 0/no stderr. Fresh two-query overlay passed exact scope:
only own-app membership and four exact UTP method additions, coverage `[1,1,1,1]`.
Installed/generated and seven utility/core pins remained unchanged; app absent.
This verifies loaded-map coverage, not active app inheritance or UTP execution.

At **10:08:45 UTC**, one exact `removeOneManifest` host dispatch attempt lost
transport without a preserved valid acknowledgment or known exit status. No retry.
No acknowledged removal, preserving move or
post-removal verification completed. The one bounded read-only follow-up failed
at 10:09:01 UTC before any completed pin validation or permission-query submission.
**Rollback, current TV health and effective revocation are unknown.** Connection
loss does not establish a hub crash/reboot or its cause. Owner picture/remote
observation requested; all further TV operations stopped.

Offline evidence correction: the helper records a host attempt before exec-channel
acceptance and does not retain buffered stdout on transport rejection. Hub receipt
and any discarded reply bytes are unrecorded. The follow-up combines connection,
SFTP and read failures into one category, so its exact failure boundary is unknown.
Original reports and `findings.json` are preserved; their derived `pinsRead:0`
must be read as **zero completed pin validations**, not proof of zero reads.

Last verified owned payload directory: `/var/luna-service2/multiview-hdmi-window/`.
Last verified manifest:
`/var/luna-service2/manifests.d/io.github.tpapaz.multiview.hdmiwindow.utp-policy.json`.
The intended holding path
`/var/luna-service2/multiview-hdmi-window/hdmiwindow-utp.manifest.removed-20261114-001.json`
was not used. Treat the scanned manifest as potentially still present/loadable.
No files deleted, LG/generated policy overwritten, app launched, UTP target called,
input switched, service restarted or power action performed. Hardware viewing
effects were not observed by the host. No actual HDMI picture/restoration claim.

Private immutable evidence: `build/phase-2/utp-admission-transaction-20261114-001/`,
including fixed helpers, preflight/activate/verify-overlay/remove reports and
baseline/overlay/removed captures; `findings.json` indexes exact byte counts/hashes.
Overlay reply hashes (357 / 2,280 bytes):
`3ca853c630c4aeae2ea14adacc3587ee321f1e6767151ee464cfe3178968e7af` /
`5cfff16867790dda73966502f73d1f8fa54e671bfdf902d21c048155142fefdb`.
Removal report SHA-256:
`de95a1fdeb3d7512ecf4d674e14cab02fda1e9c7d3be407d11aea453759dd6ca`.
Failed removed-capture SHA-256:
`def87cd16fc8f45b7050fa25bbb743b010a4c14edd96ac818e2bc19a608c0a30`.
Full transaction acceptance is **false/incomplete**; original native baseline and
package/policy source pins remain unchanged.

Owner follow-up, 2026-11-14: **"Picture and remote work normally."** Recorded as
owner observation only; no new host connection, TV operation or policy query.
Audio, uptime/restart history and current owner availability were not specified.
This resolves the immediate picture/remote question, not manifest presence,
effective revocation or the cause of connection loss. Original reports unchanged;
the next proposed device step remains separately scoped read-only reconciliation.

## Read-only reconciliation stopped on installed-file modes

2026-11-14, about 16:05 Athens / 14:05 UTC: owner confirmed being home and
authorized bounded read-only rollback reconciliation. SSH/SFTP succeeded. The
first helper stopped after one utility-file read because its local return value
overwrote the Buffer with a numeric byte count. The original script/report are
preserved under `build/phase-2/utp-reconciliation-20261114-001/`; the corrected
helper and second capture are under `utp-reconciliation-20261114-002/`.
This was a corrected local error, not an unchanged retry after a TV denial.

The second capture revalidated seven utility/core file hashes. It read the
installed 44,656-byte ELF and 263-byte appinfo with stable before/open/after
metadata; both hashes still match packaged 0.1.3. Both current modes are `0777`.
The earlier `hdmi-installed-context-20261114-001/audit.json` records `0755` for
the ELF and `0644` for appinfo. The executable's expected-`0755` gate stopped
before reading generated roles/client/manifest, checking own-app absence,
inspecting the owned policy files or submitting any permission query.

Owner reports neither reinstall nor file-permission changes, as far as known.
Source of the mode change is **unknown**. The bounded offline source search found
no `0777` setter in current repository scripts/native sources; that does not
identify or exclude external/firmware changes. No new package is established as
necessary by matching installed contents. Do not chmod/reinstall or relax the
preflight to force a pass.

Both connections closed. Zero remote commands, permission queries, app launches,
UTP target calls, TV writes/deletes, input switches, service restarts or power
actions. The earlier removal/loaded grant remain unknown; normal viewing is
owner-reported, not independently observed by the host. No first-picture trial.
`findings.json` records the exact scope and hashes. Preflight report SHA-256:
first `ce7fd7cc5e668dc968b093ba758358b56a5523e6ea7f04363768f36bad234127`;
second `f30115828f8f240a12908abc60d466b5802a313ba961eb9965893bcdb6b536db`.
Package/native/policy source pins and all earlier reports remain unchanged.

## Read-only installed metadata and mount check

2026-11-14, 16:14 Athens / 14:14 UTC: separately authorized read-only metadata
and mount inspection completed on one SSH/SFTP connection, closed afterward.
Captured mode/UID/GID/mtime/size for six exact installation directories and six
installed/generated files; all twelve records matched a second metadata pass.
Only `lstat` metadata was requested for those fixed paths, without following
final-component links. No directory enumeration or app/generated-file content
read was performed.

All six installation directories and both app files report `0777`. The five
installation parents are owned `0:0`; the app directory, ELF and appinfo are
`1000:1000`. Four generated role/client/manifest files report `0644`, owner
`0:0`, with expected saved sizes. This is metadata only, not fresh content-hash
validation or a loaded-policy check.

Read `/proc/mounts` within a 64 KiB cap: 18,835 bytes / 198 entries. Retained
only four relevant target/type/allowlisted-flag rows: `/` squashfs `ro,relatime`;
`/media` ext4 `rw,nosuid,relatime`; and two `/var` rows (overlay `ro,relatime`,
ext4 `rw,nosuid,relatime`). Effective `/var` layer ordering was not resolved.
Mount sources, unrelated targets, unreviewed flag values and raw mount contents
were not retained. The current mount record does not identify the origin of
the mode change; recorded mtimes do not establish when/by whom permissions changed.

Zero remote commands, permission queries/changes, app launches, UTP calls,
TV writes/deletes, input switches, service restarts or power actions. Installed
mode gate remains failed; no mode relaxation. Owned manifest presence and
effective permission rollback remain unknown. Next propose separately scoped
policy-state inspection while preserving the failed launch gate; no automatic
resumption or acquisition.

Private evidence: `build/phase-2/installed-metadata-20261114-001/capture.json`,
`collect.cjs`, local privacy acceptance check and offline `findings.json`.
Capture SHA-256:
`571020f11e80fbb170be0d17ed7fa2137f2a2f6ca4b209264be5a3ebfcd43622`.
Local syntax/privacy checks passed; original transaction report hashes and
package/native/policy pins were verified unchanged. No build was required.

## Read-only policy inspection — grant still present

2026-11-14, 16:21–16:22 Athens / 14:21–14:22 UTC: owner-authorized state-only
manifest/policy inspection and exactly two fixed permission queries completed.
The inspector retained `installedLaunchModeGateAccepted:false`,
`acquisitionPreflightPerformed:false`; it did not reuse or pass launch preflight.

Read-only SFTP verified seven utility/core pins, installed 0.1.3 ELF/appinfo
contents, exact generated pub/prv role templates and client/manifest hashes,
and our three payload hashes against saved bindings. All match. App absence
was checked during this inspection. ELF/appinfo modes remain `0777`; cause
unresolved. The exact 393-byte owned manifest is present in the scanned directory,
SHA-256 `e0a447e75923c7d30aecc98a561a47b8711d533a624e6725b89f859039e0e498`;
the proposed holding manifest is absent. No manifest move occurred.

Fresh stock `luna-send` queries for our app and UTP extinputs, default own
identity/no `-m`/`-a`, completed after seven core pins were rechecked. One reply
per subject, utility wait 2 s / reply cap 64 KiB / total query cap 15 s. Both
utilities exited 0 with no signal/stderr. Replies: 357 / 2,280 bytes, SHA-256
`46f898808663a1a256618a5117d38149327c8301462a262c09802ddfbdeb2d94` /
`5cfff16867790dda73966502f73d1f8fa54e671bfdf902d21c048155142fefdb`.

Offline comparison against the original transaction baseline passes **overlay**
coverage: only our app membership and four exact UTP additions; calculated
`[1,1,1,1]`. **Removed** coverage fails, as does full transaction acceptance.
The current app reply differs from the prior overlay only in group ordering;
its different raw hash is not a scope change. The UTP reply hash is identical.
**The narrow grant is still present now.** This does not establish whether the
earlier removal executed or was followed by reload; active/configured origin
is unlabelled. No actual app inheritance, UTP admission or hardware result.

Both connections closed. No permission changes, app launches, HDMI acquisition,
input switching, TV writes/deletes, service restarts or power actions. Two stock
utility query commands only. No chmod, mode relaxation, removal retry or deployment.
Next review a scoped correction offline; this result authorizes no mutation.

Private evidence: `build/phase-2/utp-policy-inspection-20261114-001/`, fixed
read-only helpers, `inspection.json`, `permissions/` and derived `findings.json`.
Inspection SHA-256 `97444356894810b3ecc6a1bc187f55d7e4c4ecfa735e2188dbc0938fe4a4007a`;
query capture SHA-256 `b07c20f789c6b362ad7e171788545e90b4df4b5f846de1690991342827fa4825`.
Syntax, reply bindings, capture order, semantic overlay/removed checks and
original-report/package/native/policy integrity checks completed locally.
No native source/build/package change; earlier evidence slots preserved.

## Manifest preservation completed — owner cold boot pending

2026-11-14, 17:08 Athens / 15:08 UTC: owner authorized only the manifest-preserving
stage. The frozen plan/helper/input pins matched. One SSH/SFTP connection verified
core/app/generated-policy/payload hashes and app absence, saved a private boot
binding and completed the two fixed pre-move permission queries. Overlay coverage
passed `[1,1,1,1]`; this snapshot precedes the mutation and does not describe
post-move revocation.

One ordinary SFTP rename, acknowledged and verified, preserved the exact manifest
from `/var/luna-service2/manifests.d/io.github.tpapaz.multiview.hdmiwindow.utp-policy.json`
to `/var/luna-service2/multiview-hdmi-window/hdmiwindow-utp.manifest.removed-20261114-001.json`.
Scanned path absent; destination metadata and original bytes/hash verified:
`e0a447e75923c7d30aecc98a561a47b8711d533a624e6725b89f859039e0e498`.
App absence was checked before/after the move; the connection closed.

Stage report is complete, `manifestPreservationAccepted:true`,
`awaitingOwnerColdBoot:true`, `installedLaunchModeGateAccepted:false`.
Zero file-mode requests, deletion, live policy unload, app/UTP operation, input
switch, service restart or power command. ELF/appinfo still `0777` at readback;
no modes were changed. **Live revocation remains unknown.** Owner safe true-cold
boot is next, then separate read-only boot/deny verification; no app launch yet.

Evidence: `build/reports/hdmi-correction-0.1.3/preserve-manifest/`, including
`record.json`, query capture/replies, private boot binding (never printed) and
offline `findings.json`. Original reports, prepared helpers/input pins preserved.
Stage report SHA-256:
`7469b8ee3bcf9560154358a6af00770e6f94b3a96a5f065227905a225dce2e7e`.
Query capture SHA-256:
`7093ca6580fbdf194e29e1e6d787351a8e2367698b8ce0c21b0eb44bab475a04`.
No post-move query, cold boot, mode repair or picture test occurred in this scope.

## Post-boot read-only verification — permission rollback verified

2026-11-14: owner reported completing the cold boot with normal picture and remote.
At 17:41 Athens / 15:41 UTC, the frozen verifier stopped at its unchanged private
boot-ID gate before permission queries. Connection closed, zero changes. Original
failed record remains failed:
`build/reports/hdmi-correction-0.1.3/verify-cold-rollback/record.json`, SHA-256
`1a73b2362d1fc277dc0334f990b90f7fb161cca1ee5fb3480c795b7a51f9f24b`.

The separately bounded read-only completion at 17:47 Athens / 15:47 UTC found a
well-formed UUID identical to the saved value and stable during collection.
Uptime was 444 seconds, versus 2,379 host seconds since preservation; this supports
restart rather than refuting the owner's report. UUID-repeat cause remains unknown.
No raw identifier is printed. Do not request another boot to force an ID change.

Seven core pins and installed 0.1.3/generated/payload hashes match; app absent
before/after. Scanned manifest absent; held original manifest present, 393 bytes,
SHA-256 `e0a447e75923c7d30aecc98a561a47b8711d533a624e6725b89f859039e0e498`.
ELF/appinfo still 0777, no mode change. Two fixed permission queries completed;
offline exact comparison passes **removed coverage**, `[0,0,0,0]`, owned group/
rules absent, and rejects overlay coverage. **Loaded-map rollback is now verified.**
This is independent evidence, not promotion of the failed boot verifier or
launch readiness; both original acceptance flags remain false. Connection closed.
No app launch, UTP/HDMI call, policy mutation, TV write/delete or power command.

Evidence: `build/phase-2/cold-boot-state-20261114-001/`; `record.json` SHA-256
`4543b95b3eecae0185813a3379d8ffe6a322f720f7a4ac6834c8da6b3d4351ba`;
`permissions/capture.json` SHA-256
`215e75bc18fa7db51db9ef54aa35f58f660e03c31788832fe21347d69f21441c`.
Private observed boot file retained; no further TV operation follows from this result.

## 0.1.4 installed files and modes verified

2026-11-14, 19:55 Athens / 17:55 UTC: after owner-reported installation, one
owner-authorized read-only SFTP audit completed in 4.24 seconds within the 30 s
cap. Seven fixed app/generated files passed stable before/open/after metadata
and content checks. App absent before/after (≤1,024 process entries); connection
closure observed. No app launch, UTP/HDMI call, permission query/change, chmod,
TV write/delete, command execution or power action. No automatic retry.

- Executable: 44,724 bytes, `0755`, UID/GID `1000:1000`, SHA-256
  `fcbef915cad619444dc0ad3867a56c2c83cdb928924a075a2b7cbce59383849f`.
- appinfo: 263 bytes, `0644`, UID/GID `1000:1000`, version 0.1.4, SHA-256
  `11700d7aacf85c5b0447f668a76a1fd48bc87ff3b42ebed4c1e93119d7171e4c`.
- Icon: 209 bytes, `0644`, UID/GID `1000:1000`, matches package source icon.
- Generated pub/prv/client contents match the reviewed templates and previous
  hashes. Generated manifest has only the expected own linkage/version 0.1.4;
  364 bytes, SHA-256
  `b1797fdb85e8984566e7d4fdcd064fd00cebbe2c95965af49bdc6e675d6262a1`.
  All four generated files root-owned `0644`.

`installedContentsVerified:true`, `generatedPolicyVerified:true`,
`installedLaunchModeGateAccepted:true`, `fileModeCorrectionNeeded:false`.
**Skip mode correction.** This verifies installation, not app execution or
physical HDMI. No core binaries, overlay/held-manifest state, boot identity or
loaded permission maps were rechecked; last denied-map evidence is the earlier
post-boot snapshot. Exact activation/coverage and owner trial scope remain before
one picture attempt. No further TV operation is queued by this result.

Private evidence: `build/phase-2/hdmi-installed-0.1.4-20261114-001/`, fixed
read-only helper and `audit.json`. Audit SHA-256
`8e55923bae83c2f3ee89a6a20efad06016c73a63af526499afa7c2bc25e77192`.
Native source, IPK and original evidence unchanged; no build was required.

## 0.1.4 narrow permission activation and coverage verified

2026-11-14, 20:05 Athens / 18:05 UTC: owner authorized only narrow activation and
coverage, explicitly excluding app launch/HDMI acquisition. One connection,
30 s total cap, completed in 7.36 s. Seven utility/core hashes match; three binding
passes checked installed 0.1.4/generated hashes, strict modes/owners, app absence,
original held manifest, three payload hashes/root0644 and absent scanned manifest.
All pass. No file-mode repair or additional boot investigation.

Two fixed pre-add permission queries pass exact original denied semantics,
`[0,0,0,0]`, owned rules absent. One stock `luna-send` default-identity request
(no `-m`/`-a`) to `luna://com.webos.service.bus/addOneManifest` used:

```json
{"prefix":"/","path":"/var/luna-service2/multiview-hdmi-window/hdmiwindow-utp.manifest.removed-20261114-001.json"}
```

Acknowledgment `returnValue:true`, utility exit 0, no signal/stderr. Reply 21 bytes,
SHA-256 `9b04f4a334a52e351bb969f4c2804219b2fd919b7293c1908944f1632bcc5060`.
Two post-add queries pass exact overlay comparison against the fresh baseline:
only own group membership/four methods, `[1,1,1,1]`, no unrelated scope changes.
All four query utilities exited 0/no signal/stderr (pair caps 15 s, utility wait
2 s, reply cap 64 KiB). Capture order/core bindings validate offline as well.

`activationCoverageAccepted:true`; final file bindings pass, connection closure
observed. **Permission/setup gates pass for the separately authorized single
HDMI-4 picture trial.** Actual UTP admission, graphics/live picture and hardware
release remain unknown. Owner source/restoration confirmation and one explicit
launch scope remain; no repeat activation or diagnostic campaign is next.

The narrow grant is **left loaded pending trial/separate cleanup**. Original
manifest stays outside scan roots; no move/write/delete/chmod, live removal,
app/UTP call, input switch, service restart or power action. Earlier failed
removal evidence remains unchanged; this result does not reconcile its cause.

Private evidence: `build/phase-2/utp-activation-0.1.4-20261114-001/`, fixed runner,
offline ordering/no-retry checks, activation reply, baseline/overlay captures.
Record SHA-256 `0e424484a40c0cd1a6c83f6d0ec8a46083f233b103fed117189b72c66b8d793b`.
Baseline capture: `7a8e2ffc33c8ae86c542fd17499c75b63d4c3a4aedad592bcae8e58a88d266ab`.
Overlay capture: `5992cbdf2ba2d68e9197d1bac93517d9bdbbbf533823067ed1f2f529bcc4587d`.
Native/IPK/policy files and previous device reports unchanged. No rebuild required.

