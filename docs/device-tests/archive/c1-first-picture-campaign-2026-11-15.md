# First-picture campaign archive

Updated 2026-11-14. LG OLED C1, firmware 03.53.45 / SDK 6.5.3.
[Current status](../../../STATUS.md) · [Current test plan](../current-plan.md) · [Documentation index](../../README.md)

This is the compact record of **actual TV results**. Original machine reports,
hashes and owner observations are unchanged; full commands/diagnosis are archived
below. Past runs authorize no repeats. Local simulations are not TV evidence.

## Phase 0

2026-11-10: passive probe 0.1.0 passed after a local-asset CSP fix. Metadata,
remote navigation, Close to Home and uninstall worked; owner confirmed normal
HDMI picture/sound afterward. On-TV file export and in-flight cancellation
remain unknown. Report: `build/reports/c1-web.report.json`. [Detail](lg-c1-phase-0.md).

## Phase 1

Local synthetic video files only; these results establish no physical HDMI path.

| Test, 2026-11-10–11 | Result and limitation |
|---|---|
| Default-main SMP, browser/NDL and mixed comparisons | Did not establish the desired independently live combination. Native resource traces attributed MAIN_SCALER contention to B startup. |
| NDL 0.1.1 solo | Owner confirmed visibly advancing playback; packet acceptance alone was not treated as visual proof. Cleanup/exit confirmed. |
| Explicit SMP `main_video` + `sub_video` | **Verified:** both clocks advanced, B geometry changed independently, A continued after B release. |
| Endurance 0.1.0 | Smoke and 20-cycle repetition passed; first five-minute attempt was interrupted. This does not validate later builds' repeatability. |
| Endurance 0.1.1 | Five-minute retry passed telemetry with owner spot checks; 30-minute overlap was reached, but recovery was interrupted/failed at a focus/screensaver transition. |
| Veto 0.1.2 | Smoke aborted before playback; not a playback/recovery pass. |
| Veto 0.1.3 | Short smoke passed (8.056 s overlap, 3.049 s A recovery, cleanup/exit). Request probe ended after 60.022 s without a request: **inconclusive**, no effective inhibition proved. |

Phase 1 remains partial: audio focus, wider geometry, final-build repeatability
and full recovery are open/deferred. Screensaver work is closed for this scope.
[Full journal, reports and build hashes](lg-c1-phase-1.md).

## Admission app

2026-11-11–12: 0.1.0 had a normal-launch stdout capture gap; 0.1.1 returned Home
at its launcher-argument guard without producing a report. Version 0.1.2 accepted
launcher metadata and registered its dedicated identity, then the first hub
permission query returned **allowed: false** (13 ms). No IWC list/setter ran.
Report recovered; self-reported cleanup and observed process absence. Retained
exit records show normal failure exits, not crash signals. Zero candidate counts
were defaults, not HDMI observations. No relaunch is queued. [Detail](c1-admission-preflight.md).

## Root read 001

2026-11-12: actual stock `luna-send` listing **passed**, zero publications/HDMI
candidates, exit 0 and cleanup confirmed, 401 ms. Visible input unknown; this
does not prove absent HDMI receivers. App stayed closed. [Detail](c1-iwc-root-read-001.md).

## Root read 002

2026-11-12: after owner-selected stable live HDMI, listing **passed**, one total
publication/HDMI-app candidate, exit 0 and cleanup confirmed, 449 ms. Owner later
confirmed HDMI 4, normal view/motion/sound. Exported counts contain no reusable
target or logical dimensions. No input/geometry change. [Detail](c1-iwc-root-read-002.md).

## Native normal

2026-11-12: fake-worker normal control **passed**. Helper 284 ms; reply validated,
actor/worker reaped, launcher exit 0, no survivors, stage removed without host
rescue. App absent before/after; zero IWC calls. Owner confirmed normal viewing
afterward; before/during unknown. [Detail](c1-lifecycle-normal-001.md).

## Native control EOF

2026-11-12: fake-worker control loss **passed**. Host sent stdin EOF at 128 ms;
native helper observed loss, cancelled/reaped both children and finished in
108 ms (different clock origin), exit 0. No survivors; stage removed without
host rescue. Both SSH connections remained up. App absent; zero IWC calls;
owner confirmed normal picture/motion/sound before and after. This proves no
whole-transport/app survival or HDMI recovery. [Detail](c1-lifecycle-control-loss-001.md).

## Report identities

Paths below are local/ignored. Owner observations remain separate beside their
reports. Earlier Phase 0/1 report paths and all package/ELF hashes remain in the
linked archive; no original hash has been replaced or regenerated.

| Evidence | Original path / SHA-256 |
|---|---|
| App run 002 | `build/phase-2/admission-run-002/capture.json`; captured report hash `77d505bea2da1ca42b1a672a33aca7b24951365a9f73736e070865c65907896c` |
| Root read 001 | `build/phase-2/iwc-root-read-001/report.json`; `b402a29bf3f25d815e0f96d8399cd0b2202fdd2e2e71ff08f523131da44c86bf` |
| Root read 002 | `build/phase-2/iwc-root-read-002/report.json`; `3e46d5953b2aa0928581e3f1ebb6261c5d6ffd93c43dbe930309389d44e2e695` |
| Normal control | `build/phase-2/lifecycle-c1-normal-001.json`; `1bcae74a7dee81bf8af005c3189f765c64e75ef21d073ff5f58c6806c249e053` |
| Control EOF | `build/phase-2/lifecycle-c1-control-loss-001.json`; `718d53e62b4aea4b80fce5370c57e37f052281f1e8c671173902ff284cb000fe` |
| Native helper | `build/phase-2/lifecycle-arm/multiview-lifecycle`; `375e17c98229221392a98fc11ffacadfb713dd50a09b1d425002af0dcb07bec0` |

## HDMI preparation through 2026-11-14

These are actual dated outcomes. Full original text, commands, report identities
and hashes are retained together in the [detailed campaign record](c1-hdmi-preparation-2026-11-14.md).
No physical HDMI acquisition occurred in these steps.

| Scope | Actual outcome | Detail |
|---|---|---|
| UTP/provider and backend evidence, 2026-11-12 | Read-only firmware/configuration/library retrievals completed; original failed attempts preserved. One separately owner-authorized Home Assistant power-on preceded backend retrieval; no input switch or acquisition. Static release findings are not hardware outcomes. | [Retrievals](c1-hdmi-preparation-2026-11-14.md#utp-provider-retrieval), [backend scope](c1-hdmi-preparation-2026-11-14.md#hdmi-backend-registration-and-implementation), [release dependencies](c1-hdmi-preparation-2026-11-14.md#hdmi-release-client-implementation-retrieval). |
| 0.1.3 install/baseline, 2026-11-14 | Installed contents verified. Normal app launch made four permission queries in 22 ms, unexpectedly predicted all allowed; `phaseAccepted:false`, zero UTP calls. Local cleanup/process absence observed. | [Baseline](c1-hdmi-preparation-2026-11-14.md#hdmi-window-013-installed-verification-and-baseline). |
| Policy bodies and two hub queries | Four exact configuration files retrieved; nonempty returned maps calculate denied coverage `[0,0,0,0]`. Historical prediction branch/cause remains unknown. | [Readback](c1-hdmi-preparation-2026-11-14.md#utp-policymanifest-readback), [queries](c1-hdmi-preparation-2026-11-14.md#loaded-utp-permission-state-queries). |
| First narrow transaction | Baseline/activation/exact overlay passed. One removal dispatch at 10:08:45 UTC lost transport without preserved valid acknowledgment. Follow-up failed before completed pin validation/query submission; receipt/execution/cause unknown. | [Interrupted rollback](c1-hdmi-preparation-2026-11-14.md#narrow-utp-activation-and-interrupted-rollback). |
| Reconciliation and installed metadata | Content hashes matched but ELF/appinfo were `0777`, stopping launch preflight. Mount/metadata and later state-only inspection found the original grant still present at that time. Cause/actor unknown; no repair ran. | [Mode gate](c1-hdmi-preparation-2026-11-14.md#read-only-reconciliation-stopped-on-installed-file-modes), [state inspection](c1-hdmi-preparation-2026-11-14.md#read-only-policy-inspection--grant-still-present). |
| Manifest preservation, 17:08 Athens | One acknowledged ordinary rename preserved exact original bytes outside scan roots; scanned path absent. No mode changes or live-unload claim. | [Preservation](c1-hdmi-preparation-2026-11-14.md#manifest-preservation-completed--owner-cold-boot-pending). |
| Owner boot and read-only follow-up, 17:41–17:47 Athens | Owner reported normal picture/remote. Frozen verifier failed unchanged-UUID gate. Independent read-only maps restored exact denied semantics, owned rules absent, held bytes intact; uptime supports restart. **Map-level rollback verified; failed gate stays failed.** | [Independent rollback evidence](c1-hdmi-preparation-2026-11-14.md#post-boot-read-only-verification--permission-rollback-verified). |

## 0.1.4 installed files and modes verified

2026-11-14, 19:55 Athens / 17:55 UTC: owner-reported installation followed by one
read-only SFTP audit (4.24 s, 30 s cap). Seven app/generated files match expected
contents, owners and stable metadata: executable `0755`, appinfo/icon `0644`, app
files `1000:1000`; generated roles/client/versioned manifest root-owned `0644`.
App absent before/after; connection closed. **No mode correction needed.**
No app/UTP operation, permission query/change, TV write/delete or power action.
[Full result](c1-hdmi-preparation-2026-11-14.md#014-installed-files-and-modes-verified).

Audit: `build/phase-2/hdmi-installed-0.1.4-20261114-001/audit.json`;
SHA-256 `8e55923bae83c2f3ee89a6a20efad06016c73a63af526499afa7c2bc25e77192`.
This is installation evidence, not 0.1.4 execution or HDMI proof.

## 0.1.4 narrow permission activation and coverage verified

2026-11-14, 20:05 Athens / 18:05 UTC: one owner-authorized activation/coverage
connection completed in 7.36 s within 30 s. Fresh denied maps preceded one
acknowledged `addOneManifest` using the original manifest held outside scan roots.
Two post-add queries proved exactly `[1,1,1,1]`, only own-app group membership and
four UTP methods, no unrelated scope change. Seven core pins and installed/
generated/payload/held-manifest bindings and modes pass; app absence checked
in three binding passes; connection closed. [Exact request and evidence](c1-hdmi-preparation-2026-11-14.md#014-narrow-permission-activation-and-coverage-verified).

The narrow grant is **retained loaded pending trial/separate cleanup**; scanned
manifest remains absent. No app launch, HDMI/UTP acquisition, TV file/mode change,
removal, service restart or power action. Permission/configuration gates pass for
a separately authorized single-picture trial; actual UTP admission remains unknown.

Record: `build/phase-2/utp-activation-0.1.4-20261114-001/record.json`;
SHA-256 `0e424484a40c0cd1a6c83f6d0ec8a46083f233b103fed117189b72c66b8d793b`.

## 0.1.4 first picture attempt — no native capture

2026-11-14, 21:35 Athens / 19:35 UTC: owner confirmed presence, moving HDMI 4,
remote/recovery access and authorized one bounded picture test. Glasshouse Home
was visible before submission. Fresh file/core/payload bindings, strict modes,
app/report absence and exact [1,1,1,1] coverage passed. No repeat activation or
file-mode change. One normal SAM submission at 19:35:26.603 UTC was acknowledged
79 ms later (host monotonic log rounded to 80 ms); stock utility exit0/no stderr,
connection closed. The owner received the independent 27-second timer cue before
the GO trigger. This is not independent machine proof of native exit by deadline.

Owner initially said “it crashed,” then clarified a brief launch notification/
flash with nothing appearing. No intended moving rectangle was observed. In the
post-timer reply the owner reported app gone, normal HDMI-4 motion/sound/remote.
A crash signal and actual native entry/exit are **unknown**, not confirmed.

One authorized bounded read-only collector attempt subsequently exited 1 with
`HDMI capture gate failed; no launch or TV writes performed.` No capture file or
precise failed stage was preserved. This does **not** establish remote report
absence, postlaunch file modes or process absence. Actual UTP execution, stop/
close acknowledgments and hardware release remain unknown. No relaunch, host
file/policy mutation, service restart or power action followed. Owner was told
normal TV channel selection was allowed; current selected source is not presumed.

Private evidence: `build/reports/hdmi-0.1.4-picture-20261114-001/` and the fixed
one-shot runner under `build/phase-2/hdmi-picture-0.1.4-20261114-001/`.
Launch observation SHA-256:
`0bc39671b18225a56c0897f59d63606569a947252f45976cd7603cbbf0422588`.
Preflight SHA-256:
`ad5be336933ceb2206562131849314dacee8ec0dc1cef12129a73b26a98c756c`.
Private launch payload remains unprinted and immutable. The later offline review
finds valid requested arguments/fresh host timing and an unlocalized collector
gate; it does not relabel the failed trial or claim a root cause.

## 0.1.4 read-only postmortem — reports and parents absent

2026-11-14, 22:07:42 Athens / 20:07:42 UTC: after saved-evidence checks and local
synthetic collector acceptance tests, one owner-authorized read-only SFTP
connection completed in **2.051 s** (30 s cap), then transport closed. No retry,
app launch, HDMI/policy/mode operation, TV write/delete, boot or service restart.

| Exact installed file | Stable metadata and SHA-256 |
|---|---|
| `multiview-hdmi-window` | `0755`, `1000:1000`, 44,724 bytes; `fcbef915cad619444dc0ad3867a56c2c83cdb928924a075a2b7cbce59383849f` |
| `appinfo.json` | `0644`, `1000:1000`, 263 bytes; `11700d7aacf85c5b0447f668a76a1fd48bc87ff3b42ebed4c1e93119d7171e4c` |

Both match the preserved package bindings; no mode correction needed. Own app
executable was not found in the bounded proc-exe scan (no PIDs/other process data
exported). These exact paths and their immediate parent directories each returned
SFTP absent; no report content was available to read:

- `/tmp/io.github.tpapaz.multiview.hdmiwindow/picture-0.1.4.json`
- `/var/palm/jail/io.github.tpapaz.multiview.hdmiwindow/tmp/io.github.tpapaz.multiview.hdmiwindow/picture-0.1.4.json`

This establishes **current absence**, not absence at the original collection or
proof that native main never ran. No tmp/boot history or exit code/signal was
collected. Loader/actual argv/clock rejection, reservation/setup outcome, past
UTP execution, crash and hardware release remain **unknown**. The first collector's
failed stage remains unknown; do not retrospectively assign it the missing-report
gate. Grant disposition remains the last captured retained-loaded state; this
postmortem did not query or change it.

Private capture: `build/reports/hdmi-0.1.4-postmortem-20261114-001/capture.json`,
SHA-256 `7cb0cf848b09b4f9a35387da20b7ba1c36a9c768143f0d3d5d133fa30bbc22fe`.
Incrementally fsynced `stages.jsonl` matches final stage events; SHA-256
`10a4396ed9dd104d79e74228440137ec5cd9b930fcfd4dee7c339fb25175d483`.
Collector used: SHA-256
`757bd7606afc46334d75b4ecb4e2da2bfad6bc9aa89b6c559b752d094c42df58`.
Frozen source/test snapshots and local verification are in
`build/phase-2/hdmi-postmortem-review-20261114-001/`. Original native/package,
failed collector, reports and private launch authority pins remain unchanged.

Local checks passed: `npm test`, `npm run lint`, `npm run test:controls`, and
`git diff --check`. The review bundle's `check-docs.cjs` passed 46 Markdown files,
460 local links, 131 unchanged runtime pins (excluding the two intentional test/
lint wiring changes), retained hash references and privacy/tracking checks.
`verification.json` binds the original pins, as-used collector and capture/stages.
No native source change, ARM rebuild or new IPK; no active native/HDMI test.

The single next task is the plan's offline inert native-entry/guard diagnostic
review. No second collection, new package or TV diagnostic launch is authorized.

## Glasshouse HDMI preview — owner observation

After the attempt, owner reported a dashboard PiP showing HDMI 4 with sound in
Glasshouse Home when that input is selected. No screenshot, installed source
trace, app version or ownership evidence was collected. This is a useful single-
input presentation lead; independent receiver allocation/dual HDMI remain unknown.
No Glasshouse operation or Home-routing modification was performed for this finding.
Subsequent upstream source analysis is recorded in the [HDMI evidence map](../../research/c1-hdmi-interface-map.md#glasshouse-preview-source-and-owner-observation),
separately from this owner observation; it does not identify the installed revision.

## 0.1.5 inert diagnostic — realtime guard rejected

2026-11-14, 22:33:53 Athens / 20:33:53 UTC: after owner-confirmed installation
without opening, one explicitly authorized normal SAM diagnostic launch and
collection completed on one connection in **10.225 s**, below the 30 s cap.
Installed ELF/appinfo hashes matched the local 0.1.5 record: executable 23,708 bytes
`0755`, appinfo 265 bytes `0644`, both `1000:1000`. Package/source pins are in the
[build record](../../build.md#offline-host-checks); original 0.1.4 pins
and original/new private launch authority are preserved.

Both diagnostic report paths and parents were absent before launch. One SAM
request at 22:33:55.592 Athens was acknowledged; issue→dispatch 118 ms,
issue→ack 220 ms, utility exit 0/no stderr. This utility status is not app exit.
After the six-second native-cap wait, both exact aliases contained the same valid
343-byte trace, parent `0700`/report `0600`, owned `5480:5000`:

- `/tmp/io.github.tpapaz.multiview.hdmiwindow/entry-0.1.5.jsonl`
- `/var/palm/jail/io.github.tpapaz.multiview.hdmiwindow/tmp/io.github.tpapaz.multiview.hdmiwindow/entry-0.1.5.jsonl`

| Native trace event | Actual fixed outcome |
|---|---|
| Entry/reservation | `main_entered`, `reserved` |
| Production parser | `picture_accepted` |
| Boot read/match | `available`, `match` |
| Boottime window | `within` |
| Realtime window | `future` — absolute deadline minus TV realtime **greater than 3,000 ms** |
| Production predicate | `allowed:false` |
| Exit intent | `64`; actual exit code/signal remains **unknown** |

Own app executable was absent in bounded before/after proc scans; transport close
was observed. The existing launcher log was opened before submission, but its
post-cursor size/type bound returned `changed_or_cap`; no log delta/projection was
read or exported. Exact subcondition (change/truncation versus size cap) was not
preserved. No rotated-log search or retry. Process absence/exit intent do not
substitute for the missing independently correlated exit record.

Owner confirmed picture, sound and remote remained usable, then described a gray
LG loading overlay followed by TV channels resuming. The overlay's origin is
unverified; it is not a crash classification or physical-input result. No client
SDL/LS2/UTP call exists in this diagnostic. No HDMI/policy/mode/clock change,
host TV-file write/delete, service restart, boot or repeat launch/collection.
Only the diagnostic's own exclusive report/parent writes occurred on TV.

**Interpretation:** this run verifies native entry, parser acceptance, readable
matching boot authority and the boottime window, then an early realtime guard
rejection. The host-issued epoch deadline and the TV realtime domain were not
aligned for admission. Exact clock offset/cause is unknown. The same rejection
in 0.1.4 would occur before report reservation/graphics/LS2/UTP, explaining absent
output, but original runtime clocks/argv/exit were not captured: it remains a
**candidate explanation**, not a retrospective root-cause proof. New binary,
import set, installation and launch differ; original UTP execution remains unknown.

Private evidence: `build/reports/entry-0.1.5-20261114-001/capture.json`, SHA-256
`9bc115687aaffb7a0745af0b2f007d9e197b68b31456a84d49f05927b282c1f2`;
`stages.jsonl`, SHA-256 `99f3008dcbb1673eb86a428e6bd657f1905a2ecd150f2ed04e462076e236508a`.
Native trace SHA-256 `5bcacc4b133d84c9ed7bdb9083ba0233004870aa204ddee724c599d4a91c9ef0`.
As-used runner SHA-256 `87aed11737087c17ec51699243ecb66ed3280e6f2fe6f663cff36a950b4baa21`.
Frozen runner/projection/tests and verification:
`build/phase-2/entry-diagnostic-run-20261114-001/`.

Executed once, not a repeat instruction:
`node scripts/run-entry-diagnostic.cjs --allow-one-inert-run build/reports/entry-0.1.5-20261114-001`.
Local `--plan`, synthetic runner/trace tests, `npm test`, `npm run lint`, evidence
pin/stage consistency and `git diff --check` passed. No new native build for this
run; the previously packaged 0.1.5 was the tested executable.

## Current conclusion and archive

The first requested 0.1.4 picture attempt failed with no validated native capture.
Its physical HDMI motion, native entry/exit, actual caller admission, graphics/clocks,
hardware release and dual-port operation remain unknown. The 0.1.5 inert run now
verifies its own entry/parser/boot/uptime path and realtime guard rejection, with
actual exit still unknown. Phase 1 is partial; IWC
stays paused. The [current plan](../current-plan.md) blocks another launch pending
localized failure evidence; the completed read-only postmortem found both report
aliases/parents absent and recovered no entry/exit outcome. Current work is the
offline TV-derived realtime lease-authority review. Both three-second windows
remain strict; no clock change, report clearing or repeat trial is authorized.
[Artifact checks](../../build.md#offline-host-checks).
No completed test authorizes a repeat or a new TV operation. Raw reports/private
identifiers and firmware stay under ignored build/dist; archived text preserves
original evidence and earlier failed conclusions without relabelling them.

## 0.1.6 inert diagnostic — both clock guards accepted

2026-11-14 22:48:53 Athens / 20:48:53 UTC: after owner-confirmed installation
without opening, one authorized connection and one normal SAM submission completed
in 10.264 seconds. Installed 0.1.6 hashes, 0755/0644 modes and 1000:1000 owners
matched. Own app absent before/after; fresh report slots absent before launch.
TV read-only date sample succeeded. Sample-start to dispatch 179 ms, to ack 272 ms;
SAM utility exit 0/no stderr. Transport close observed; no retry.

Both host/jail aliases of entry-0.1.6.jsonl contained identical valid 341-byte
traces: main_entered/reserved, picture_accepted, boot available/match, boottime
within, realtime within, allowed true, exit intent 0. Both strict three-second
guards remain unchanged. Parents 0700/reports 0600, owned 5480:5000.

Actual exit code/signal remains unknown: the bounded launcher-log delta stopped
at changed_or_cap without reading/exporting delta bytes. Exact subcondition was
not retained. Owner saw a brief black screen while watching TV stations, then
confirmed picture, sound and remote stayed usable. Visual-transition cause is
unknown. No client graphics/bus/HDMI calls, policy/mode/clock changes, host TV-file
mutation, restart or boot. Only the diagnostic's own report writes occurred.

This verifies TV-derived authority passing both guards on this C1/03.53.45 at
this capture. Original 0.1.4 failure cause and past UTP execution remain unknown;
no physical HDMI or hardware-release claim. All original package/native-source
pins remain unchanged. The current installed app is inert 0.1.6; no retry queued.

Capture: build/reports/entry-0.1.6-20261114-001/capture.json
SHA-256: 02fd99f09176faa857b6770fce4de2251c6fc3ecfd5d7d906009f6ce2ba699b0
Stages SHA-256: b867012f05fea7e6c31e9d3565d020ca94c6384c91dcb0838f8a7e191d706c5e
Native trace SHA-256: 67a0a5e070e78d1f8a6abc41b8966209b46e9a2e72152130878d106b22bdcafc
Frozen runner/producer/validator/projection and verification:
build/phase-2/entry-diagnostic-run-0.1.6-20261114-001/.
Local --plan, producer/runner acceptance tests, trace/schema/hash, stage-log equality
and original 0.1.4/0.1.5/0.1.6 source/package pins passed. No native rebuild.

## 0.1.7 read-only installed binding and admission verification

2026-11-14 23:10:41 Athens / 21:10:41 UTC: after owner-confirmed installation
without opening, one authorized read-only connection completed in 4.275 seconds,
transport close observed. Exact installed ELF/appinfo hashes match 0.1.7; sizes
44,724/263 bytes, modes 0755/0644, owners 1000:1000. Generated pub/prv roles,
public client entry and exact version-0.1.7 manifest linkage matched reviewed
C1 shapes, root-owned 0644. Own app absent before/after; both exact host/jail
picture-0.1.7.json slots absent. Stock luna-send bytes match the saved reference.

Exactly two queryServicePermissions requests, stock utility default identity:
own app and com.webos.service.utp.extinputs. Both succeeded without stderr.
Returned nonempty maps pass exact overlay comparison against the saved denied
baseline: only own-app membership and four exact method additions; coverage
[1,1,1,1]. No native predictions used. This is returned-map coverage, not verified
live-caller inheritance or actual UTP admission. No app launch, UTP call, clock
sample, TV file/policy/mode change, boot, restart or retry.

Evidence: build/reports/picture-admission-0.1.7-20261114-001/verification.json
SHA-256 5af09275aad393acc1ee6a4163e606f4475439e25e4fe8f08c86af06a9a88e7e.
Stages SHA-256 b8b12fd0b1aff794aa645852a2b1a2e64c9fec251a70b2103558d8de28abf640.
Frozen collector and offline replay verification:
build/phase-2/picture-admission-review-0.1.7-20261114-001/. Wire reply hashes
are in the verification; normalized saved-map hashes are separately recorded.
Offline map replay/stage equality pass. An intercepted local connection-failure
replay retained its failed stage without importing a device module or connecting.

Physical-runner review: current inert runner is unsuitable (six-second collection,
inert version/schema/flags). Original physical runner uses host-epoch authority
and old bindings. Neither is a current 0.1.7 launcher. The next task is to implement
and validate the reviewed two-connection physical controller before requesting
a picture trial; no launch occurred or is authorized by this result.

## 0.1.7 physical picture trial — setup failed before acquisition

2026-11-14: owner authorized one trial, reporting moving HDMI 4, remote and
independent timer ready. Host evidence slot created 23:35:38.988 Athens /
21:35:38.988 UTC; dispatch at host monotonic origin +3,786.531 ms. Fresh exact
installed/generated bindings, own-app/report absence and narrow returned-map
coverage [1,1,1,1] passed. One fresh TV-derived authority and one normal SAM
submission were acknowledged. No retry. Both strict native guards unchanged.

Connection A closed after 3.864 s. Connection B opened dispatch +27.010 s and
closed after 2.800 s; report sampling began dispatch +27.150 s. Both connection
caps passed. Two exact host/jail picture-0.1.7.json aliases yielded identical
valid 384-byte reports: elapsedMs 527, status setup_failed, opened/selected false,
stop/close acknowledgments false, acquisitionUncertain false, localCleanup true.
Parent 0700/report 0600, owned 5480:5000. Own process absent after collection;
installed ELF/appinfo contents/modes/owners still match. No host TV-file/policy/
mode/clock change, restart, boot, signal or automatic input action.

This establishes native entry, accepted initial parser/guard and successful report
reservation, then failure within begin/window-ID setup before the UTP open path.
The report/state-machine source supports no UTP exchange being attempted in this
run; it is not an HDMI admission denial or hardware-support result. Exact failing
substage is unknown: the second freshness check, SDL/window/renderer/geometry/
export/focus, LS2 context/registration/name/attachment/disconnect setup, or final
window-ID validation are not distinguished by this report. Local cleanup is
self-reported, not hardware-release proof. Original 0.1.4 cause stays unknown.

Owner reported something loaded and returned them to Home, then clarified they
were watching a TV channel. Selected HDMI-4 viewing at submission was therefore
not established; no advancing HDMI rectangle was confirmed. Do not infer this
viewing context caused setup failure. Owner confirmed remote responsive and
usual picture/sound usable afterward. No recovery/power operation was requested.

Log collection stopped with the specific truncated_or_rotated category. No log
delta/rotated file was read; actual exit status/signal and hardware release remain
unknown. A return to Home is not a crash classification.

Evidence: build/reports/hdmi-0.1.7-picture-20261114-001/capture.json
SHA-256 f60f6b74c2f765a3d7ade537672bae17b2e58dc11535244d28d3183c72f6bd1a.
Stages SHA-256 78f6bbe00bd5836ce67b1103b3c2200a054d5eb526e90ccc2eac2295fe124cfe.
Native report SHA-256 e881649c55963dd26d64c0cf2cfe6b95ed01a8bc029266057b39f75b8d2e93d1.
Frozen controller/IO/producer/validator and verification:
build/phase-2/hdmi-picture-trial-0.1.7-20261114-001/. Original packages/sources,
reports and private launch authority are preserved; this slot is now occupied.

Local --plan passed before the run. Post-run report size/hash/schema, exact stage
log equality, one-attempt/two-cap/+27-second ordering and original package/source
pins passed. No new native build or host implementation change during this run.
Next task: offline setup-stage diagnostic review before another active trial.

## 0.1.8 setup-only diagnostic — named LS2 registration failed

2026-11-15: owner authorized one bounded setup-only diagnostic while watching TV
channels, remote/restoration access and independent timer ready. Host evidence
slot created 00:07:14.393 Athens / 2026-11-14 22:07:14.393 UTC; dispatch at host
monotonic origin +4,515.491 ms. Exact installed 0.1.8 ELF/appinfo hashes, sizes
43,360/258 bytes, modes 0755/0644, owners 1000:1000 and generated registration
bindings passed. Own app and both setup slots absent before launch. Zero UTP
permission queries. One fresh TV-derived authority/normal SAM attempt acknowledged;
both strict three-second guards unchanged. No retry.

Connection A closed after 4.593 seconds. Collection connection B opened dispatch
+27.014 seconds and closed after 3.486 seconds; each below its separate 30-second
cap. Both exact host/jail setup-0.1.8.jsonl aliases contained identical valid
591-byte traces, reports 0600/parents 0700, owned 5480:5000.

Verified trace: lease recheck passed; SDL initialization, display observation,
window/renderer creation and dimensions match passed. Display, requested and
actual window all 1920x1080. Render calls, export creation/ID-length/binding
and focus wait passed (focus 0 → 1, cancel none). Context creation passed.
LSRegisterPubPriv entered and returned failure. Handle-name, context attachment,
disconnect handler and final window-ID validation were not reached. Context,
export, renderer, window and SDL cleanup calls returned success; exit intent 1.
Void-call success means the call returned, not proof of a hardware effect.

Own app absent afterward; executable/appinfo hashes still matched. Log collection
stopped at size_cap without reading/exporting the oversized delta or searching
other logs. Actual exit status/signal and hardware release remain unknown. The
trace does not record the underlying bus rejection reason. This setup-only
binary has no UTP request path; no physical HDMI result. The earlier 0.1.7
substage and original 0.1.4 cause are not retrospectively proven by this run.

Owner saw LG Home while watching channels, then confirmed normal picture, sound
and remote usable after returning through normal TV controls. No automated
recovery/input switch, policy/mode change, power action or additional run.

Evidence: build/reports/setup-0.1.8-20261115-001/capture.json
SHA-256 1559cc78c841710e785478a1f59ee4e67072d0153e97f4209f0520dbc378ae11.
Stages SHA-256 940eb801abec7435b4b9354e12fdb511e28411a886097cb33d4156a3a3422688.
Native trace SHA-256 1a50642b511137e2eaa1c37c8e0683d26eb56339cda32d279563a78647814146.
Frozen as-used host sources and offline verification:
build/phase-2/setup-trial-0.1.8-20261115-001/. Capture preserves decoded trace
outcomes/metrics and observed byte hashes; original report files remain on TV.
Private launch authority is preserved in the original evidence directory.

Local --plan passed before submission. Post-run stage-log equality, report size/
schema/alias agreement, one-attempt/two-cap/+27-second ordering, eight validated
host-source pins, five original package/binary pins and 40 native-source pins
passed. No native rebuild/host implementation change. Single next task: offline
named registration/identity review against saved bindings and working controls.

## 0.1.9 setup-only diagnostic — registration passed, focus cancelled, quit pending

2026-11-15: owner confirmed 0.1.9 installed without opening, currently in the
screensaver, remote/restoration access and independent timer ready, and authorized
one bounded setup-only diagnostic/collection with no retries. Host evidence slot
created 01:08:30.024 Athens / 2026-11-14 23:08:30.024 UTC; dispatch at monotonic
origin +4,686.263 ms. Exact installed ELF/appinfo hashes matched 0.1.9, sizes
43,392/269 bytes, modes 0755/0644, owners 1000:1000. Generated pub/prv roles,
public client and version-0.1.9 manifest passed. Own app and both fresh report
slots absent before launch. Zero UTP permission queries. One fresh TV-derived
authority and one normal SAM attempt acknowledged; utility exit 0 is not app exit.

Connection A closed after 4.779 seconds. Connection B opened dispatch +27.006
seconds, collection work began +27.261 seconds, and B closed after 3.841 seconds.
Both are below their separate 30-second caps. No retry or additional connection.
Both exact host/jail setup-0.1.9.jsonl aliases contained identical **partial**
630-byte traces, reports 0600/parents 0700, owned 5480:5000.

Verified prefix: lease recheck, context creation, named public registration,
exact handle-name match, context attachment and disconnect-handler setup returned
success; registrationError none. Thus reordered own registration is TV-verified
on this run. SDL initialization, display/window/renderer creation, 1920x1080
dimension match, render calls and export creation/ID-length/binding returned
success. Focus failed, before/after 0/0, cancellation category lease; final
window-ID check was not reached. This records dispatchAllowed false during focus
cancellation, not a measured per-stage timeout or an initial guard failure.
Both strict admission guards remain unchanged and passed before setup.

LSUnregister, context unref, exported-window destruction, renderer destruction
and window destruction returned success. SDL_Quit entered with no returned
outcome; summary and exit-intent rows are absent. setupReady/localCleanup remain
unproven. The partial file/process absence cannot prove a crash, SDL_Quit hang,
alarm exit or clean termination. Per-stage durations and boottime-read validity
at cancellation were not recorded. Log collection stopped at size_cap without
reading the oversized delta or searching other files. Actual exit code/signal,
alarm firing and hardware release remain unknown. Installed ELF/appinfo still
matched afterward; own app was absent. No UTP call path or physical-picture result.

Owner reported LG Home, then Glasshouse Home, with flickering; subsequently
confirmed normal picture, sound and remote usable via normal controls. Context
was screensaver, not established channel/HDMI viewing. The transition does not
identify a cause or reopen screensaver/Glasshouse launcher work. Reordered
registration success is consistent with the candidate name collision, but the
missing 0.1.8 LSError remains unknown; original 0.1.4/0.1.7 causes are not upgraded.
No host permission/mode/clock change, automatic input switch, restart, boot,
deletion, recovery or retry occurred. Original TV reports remain untouched.

Capture: build/reports/setup-0.1.9-20261115-001/capture.json
SHA-256 a0d4e25147ac9c569fa5ab36a1ffb2985925e0ce9c6abde98087e690552828a6.
Stages SHA-256 995a94b079ec1d640cdcc9ae71410c0794e162466a1f09999116c8e3f90f52bd.
Native trace SHA-256 5ada905239df2a4c1ce3f9cee60ea6822948a4c569f0b8bb1e9bb0b1f0fe4328.
Frozen as-used host files, verification and owner observations:
build/phase-2/setup-trial-0.1.9-20261115-001/. A canonical reconstruction from the
decoded rows matches the observed native size/hash exactly and is labelled
native-trace-reconstructed.jsonl; it required no additional TV read. Original
private launch authority remains in the capture directory.

Local --plan/as-validated host pins passed before the attempt. Post-run checks:
exact stage-log equality, partial schema/size/hash reconstruction, one-attempt/
two-cap/+27-second ordering, unchanged installed bindings and 181 preserved
artifact/source/report/authority pins passed. No native rebuild or host code
change during this run. Single next task: offline LS2/GLib context-ownership and
SDL helper startup/quit lifecycle review with saved evidence; no new TV run.


## 0.1.10 timing/lifecycle diagnostic — 20-second SDL_Init, quit pending

2026-11-15: owner instructed proceeding, reported 0.1.10 installed without opening
and Glasshouse Home on screen, then confirmed remote/restoration access and an
independent timer ready for the single setup-only trial. Evidence slot created
12:28:21.910 Athens / 10:28:21.910 UTC; one SAM submission at host monotonic origin
+4,282.899 ms acknowledged. Utility exit 0 is not app termination. Exact installed
ELF/appinfo (61,216/270 bytes, 0755/0644, 1000:1000) and generated 0.1.10 bindings
passed, plus own-process/fresh-report absence. No UTP-map query or acquisition.
Both strict three-second admission guards remain unchanged and passed.

Connection A closed after 4.454 seconds. B opened dispatch +27.012 seconds and
closed after 3.716 seconds, both under their separate 30-second caps. One attempt,
no retry. Both exact aliases contain identical **partial 1,463-byte** traces;
report 0600/parent 0700, owned 5480:5000.

Named registration/name/context/disconnect checks returned success. SDL_Init is
the dominant measured delay: **20,027 ms**, entered at trace age 13 ms / issue age
696 ms, returned at 20,040 / 20,723 ms. Window/renderer/dimensions/render/export/
binding/focus/final window-ID outcomes all returned success (1920x1080). Focus was
already 1 before/after, cancel none, call 0 ms: the focus wait loop never sampled
cancellation, so cancellationClock is not_sampled. This does not renew expired
issue+17-second progression authority or admit physical acquisition. It does not
resolve the old 0.1.9 cancellation-time clock uncertainty.

Supported lifecycle snapshots keep our handle associated with our context before/
after SDL_Init and before unregister; connected true. Cumulative measured sink
cost is 0 ms at those snapshots and before quit, at integer-ms resolution; this
is not exact zero I/O cost. Shared helper transport/context remain unknown.
Unregister, context unref, export/renderer/window destruction returned. Last marker
is SDL_Quit entered at trace age **20,312 ms / issue age 20,995 ms**; its return,
after-quit observation, summary and exit intent are absent. setupReady/localCleanup
remain unproven. Log gate stopped at size_cap. Own app absent and installed hashes
still match. Actual exit status/signal, alarm firing, complete SDL_Quit and hardware
release remain unknown; no crash classification or automatic recovery.

Owner saw a loading indicator that appeared frozen, then returned to Glasshouse;
normal picture, sound and remote usability were confirmed afterward. No permission/
mode/clock change, input switching, restart, power action, retry or extra retrieval.
Original reports/private authority remain preserved; this grant/slot is consumed.

Owner later clarified that the HDMI stream was closed during 0.1.10. This is an
owner observation, not a measured physical-source connection/power state. The
setup-only diagnostic made no HDMI acquisition request; no causal effect on the
20.027-second startup or pending quit is established.

Capture: build/reports/setup-0.1.10-20261115-001/capture.json
SHA-256 41ef250867e5525e61dbaa34c1bbc6a1ea3d3231328d28e7353e383d3a065ae0.
Stages SHA-256 f8664d2a255fc6afb2406a16465ab32d5b67ec8eb3cf02140249dc29c4b453d6.
Native trace SHA-256 d17fe5759b328a3c0cd627778e49ba933cb8ed104d5eaabc25f325d40d53b78f.
Frozen host sources, hash-matched canonical reconstruction (not another TV read),
verification and owner observation:
build/phase-2/setup-trial-0.1.10-20261115-001/.

Offline checks passed exact stage equality, reconstruction/size/hash/schema,
one-attempt/two-cap/+27-second ordering, 26 current package/source/tool pins,
181 earlier preservation pins and nine as-used host snapshots. No implementation
change/rebuild. Single next task: offline controlled ownership/pumping review of
the specific SDL startup/quit callback-wait candidate before any new package/trial.

## 0.1.11 owner installation report — controlled trial not started

2026-11-15: owner reports 0.1.11 installed, the TV on at Glasshouse Home and the
diagnostic unopened. The earlier wording "it's open" referred to the TV being on,
not an app launch. Exact installed bindings/report-slot absence remain unverified;
no controlled 0.1.11 trial, capture or TV connection occurred during this offline
review. Build-time artifact records stay unchanged. No fresh device grant yet.

## 0.1.11 setup-only trial — complete local cleanup, late collection

2026-11-15: owner explicitly approved one bounded setup-only trial, remote/timer
ready, starting at Glasshouse Home. Exact installed ELF/appinfo and generated
0.1.11 bindings/fresh report/process gates passed. One SAM submission acknowledged;
submission connection closed in **3.879 s**. No UTP-map query or HDMI acquisition.
Both strict three-second guards passed; all native/host bounds unchanged.

Both aliases later held identical **valid 1,476-byte schema 4** traces. Named
registration/identity/context/disconnect and dispatcher start passed. **SDL_Init
68 ms** (0.1.10: 20,027 ms); 1920x1080 window/renderer/render/export/binding/final
ID succeeded. Focus 0 to 1 in 202 ms. Post-Init/focus samples in_window at issue
ages 485/792 ms, cancel none. Cleanup returned through export/renderer/window
destruction, **SDL_Quit 13 ms**, dispatcher stop/join 1 ms, own unregister and
context unref. Final stage at trace age **551 ms / issue age 952 ms**;
setupReady/localCleanup true, ownerRetained false, exit intent0. Sink totals 0 ms
at integer-ms resolution; helper transport/context remain unknown.

**Host deviation:** background controller disappeared after submission and before
scheduled dispatch+27-second collection. Local output-file sharing errors delayed
the user-facing launch cue; owner timer start is unverified. Exact host exit
status/cause unknown. Original capture retains collection not_started. No relaunch.
Owner saw brief app loader, LG Home, then Glasshouse Home and confirmed normal
picture, sound and remote usability.

Owner separately explicitly approved one **late read-only collection**, begun
14:12:26.489 Athens / 12:12:26.489 UTC. It closed in **2.310 s** using only the
existing report/process/log/binding scope/caps. Own app absent at late observation;
installed ELF/appinfo still matched. Log gate size_cap; no extra search/read. This
does not establish process state at dispatch+27 s, actual exit/signal/alarm or
hardware release. Both connections closed; both grants consumed. No retry,
permission/mode change, restart, input switching, power action, rebuild or package.

Original capture/stages/private authority: build/reports/setup-0.1.11-20261115-001/.
Capture SHA-256 c490f04e03aead8779ddee07e1feccc9f3c7776adc0f91324ab82b7e03b76cc4.
Stages SHA-256 3dc56df2be39558d6bb8ff257177f37c5e5c406195ea6e0e7ec732a3e34f45f8.
Separate late collection SHA-256 345aa613ab16d3ebd4384a67e1d42a70f6e31b0b5baa0a7a747e392b7289dd7d.
Native trace SHA-256 09a8a6121fb6f035e9bd0252ea84b4038700988b170f7354754999d10522ea15.
Frozen host inputs, both grants, late collection, owner observations and canonical
hash-matched trace reconstruction: build/phase-2/setup-trial-0.1.11-20261115-001/.
Saved-only checks passed schema/stage/size/hash/bindings, 215 preservation pins and
30 as-used snapshots. No further TV read. Original build/native/ABI/sanitizer
evidence reused unchanged. Actual termination/release gate remains open; next
task is offline physical-adapter callback/lifecycle integration and exit evidence.

## 0.1.12 lifecycle host starts — no SAM attempt

2026-11-15: owner reported 0.1.12 installed, Glasshouse Home with HDMI preview
closed, remote/timer ready, and authorized installed-binding checks plus one
lifecycle-only trial and scheduled collection, no acquisition. The first host
invocation ended at connection setup in 79 ms, attempts0/preflight absent/collection
not_started; the persistent tool runtime lacked APPDATA. No launch cue. Owner
then explicitly authorized a retry. With APPDATA/USERPROFILE supplied, the second
host invocation ended at connection setup in 71 ms, again attempts0, no installed
checks, cue or collection. Both host children exited1. Both captures say connection
closed false; they establish neither a ready SSH session nor its explicit closure.
The second underlying error is unknown; no further device connection was made.

No SAM command or UTP acquisition was submitted, no native report collected and
no 0.1.12 TV execution established. Installation remains owner-reported/unverified;
prior 0.1.11 TV evidence is unchanged. No mode/policy change, input switch, restart,
power action, rebuild or package. Owner's later request to reassess led to offline
host execution/diagnostic review, not another TV attempt.

Original captures/stages: build/reports/lifecycle-0.1.12-20261115-{001,002}/.
Frozen host inputs/session results:
build/phase-2/lifecycle-trial-0.1.12-20261115-{001,002}/.
Offline missing-environment reproduction, blocked-socket startup and full-runner
network-denial checks are retained with those inputs and
build/phase-2/physical-host-launch-review-20261115-001/.
The original IPK/receipt/source pins remain exact; acquisition gate closed.

## 0.1.12 lifecycle trial — cleanup and independent termination observed

2026-11-15: owner explicitly authorized one normal PowerShell lifecycle attempt,
installed checks and scheduled collection, remote/timer still ready, acquisition
closed. Baseline remained Glasshouse Home, HDMI preview closed. Installed
ELF/appinfo, generated versioned registration and utility bindings passed; app
and four lifecycle aliases absent. One SAM attempt acknowledged accepted, no
UTP acquisition or permission-map query. Submission cue delivered promptly while
the foreground controller stayed attached through collection. Actual owner timer
start was not separately confirmed.

Matching valid app aliases: **358 bytes**, setup/window-ID returned success in
**635 ms**, local cleanup success in **170 ms**; final issue age **1,245 ms**,
setupReady/localCleanup true, ownerRetained false, exit intent0. Only witness,
setup and cleanup stages; no pending stage or physical acquisition.
Matching valid **204-byte** launch-bound witness aliases independently observed
parent termination via death notification/reparenting/proc absence. App absent
at scheduled collection. This establishes termination, not numeric exit status,
signal/alarm cause or hardware release, which remain unknown.

Connections closed in **4.053 s** and **3.270 s**. Collection connection opened
dispatch+**27.012 s**, within unchanged two <=30-second caps. Post-run ELF/appinfo
still matched. Log size_cap; no further read. Host exited0. Owner explicitly
confirmed normal picture, sound and remote, **no recovery action needed**; separate
owner receipt bound to exact capture. All strict native/host/report bounds stayed
unchanged. No input switch, mode/policy change, restart, power, rebuild or package.
This grant is consumed; no further device action was made or authorized.

Capture/stages/private authority/raw aliases/owner receipt:
build/reports/lifecycle-0.1.12-20261115-003/.
Capture SHA-256 ecf2196c8cdbf0730f3b120810f8ae6ff9e6725d0919eb943f14c1353e51c805.
Trace SHA-256 001238d808c3d156d1a3277f0b23b274f49e6e24f498b5de0bea82e004ee5ab3.
Witness SHA-256 1d3e4d45831a9f833453c8ae150012f9271268ac1c27c47a0c2dc06b6ca5e419.
Frozen as-used inputs, exact offline lifecycle evidence replay and public result:
build/phase-2/lifecycle-trial-0.1.12-20261115-003/.
Replay passed installed/build/package/launch/metadata/raw alias/stage/bounds/owner
bindings, 271 preservation pins, 43 source pins and 21 original IPKs. Existing
native/ABI/sanitizer/archive acceptance reused unchanged. Lifecycle evidence
accepted; **physical acquisition stays closed without fresh separate owner scope**
and the existing same-boot check. No more setup package is needed for this result.

## 0.1.12 physical HDMI-4 — moving picture and sound

2026-11-15, LG OLED C1 / firmware 03.53.45: owner authorized one bounded physical
HDMI-4 trial, installed/admission checks and scheduled collection, no retries.
Owner reported moving video on HDMI 4, Glasshouse preview closed, remote/timer
ready. Normal PowerShell foreground runner passed same-artifact lifecycle evidence,
fresh same-boot authority, installed/generated/utility/app-absence/four-fresh-slot
checks and two exact read-only permission maps. One SAM attempt acknowledged.
Submission cue delivered promptly; actual owner timer start not separately confirmed.

**First physical picture verified:** owner reported HDMI-4 picture and audible
sound, then explicitly confirmed **continuously moving video in the centered box**.
After collection, owner confirmed normal picture/sound/remote, **no recovery needed**.
This is one short single-port result, not dual HDMI, long-term stability, independent
audio routing or hardware-release proof.

Both app aliases identical/valid **588 bytes**; witness aliases identical/valid
**204 bytes**, exact physical action/gate/launch binding. Timings: setup416 ms,
open23 ms, select242 ms, observation8,003 ms, stop12 ms, close215 ms, local cleanup
172 ms. Status candidate_interval_completed; open/select/stop/close/localCleanup
true, ownerRetained false, exit intent0, final issue age9,453 ms. Independent
termination observed; app absent at collection. Numeric exit status, signal/alarm
cause and hardware release remain unknown. acquisitionUncertain remains true by
design after any dispatched open; acknowledgments do not clear backend uncertainty.

Submission/collection connections closed in **4.568/3.370 s**; collection connection
opened dispatch+**27.003 s**. Post-run ELF/appinfo matched. Log size_cap; no extra
retrieval. All native/host/report bounds unchanged; no second attempt, policy/mode
change, restart, power, build or package. Grant consumed; no further TV action.

Original capture/stages/private launch authority/map replies/raw alias pairs and
separate capture-bound owner observations:
build/reports/picture-0.1.12-20261115-001/.
Capture SHA-256 88713048c9bb137c2cb147eda546ee11455b8a1087f5bffa9026e25f2c2965b2.
Trace SHA-256 9c9d000e2d7683699317665215552c5b2e44614b1bbe8a72c7f9ba48e14a4809.
Witness SHA-256 8249d08bacc6ab7d1ea6151523ef2a75b80ed2d779125705f87444913bc085e9.
Frozen as-used inputs and saved-evidence validation:
build/phase-2/picture-trial-0.1.12-20261115-001/.
Exact raw trace/witness/launch/lifecycle/boot/package/stage/closure checks passed;
43 candidate source pins and the 0.1.12 package remained exact. Existing native/
ABI/sanitizer/archive acceptance reused unchanged.

Preservation exception: all 21 original IPKs matched immediately before the run.
Post-run local audit found 11 older hdmiwindow IPKs absent from dist, with 274
other unique preservation pins matching and no changed contents. The owner then
confirmed intentionally removing those packages. The agent issued no deletion/move. Current
0.1.12 IPK and all current/lifecycle evidence remain present and matched. No files
were recreated or package rebuilt. This exception does not invalidate the observed
picture; exact historical package reinstall/replay is unavailable for those versions.
The owner does not need them for current work; leave them absent, retaining hashes.

