# C1 test journal

Reference: LG OLED C1, firmware 03.53.45 / SDK 6.5.3.
[Status](../../STATUS.md) · [Current disposition](current-plan.md)

Entries below retain their **as-used historical scopes and facts**. Old grant and
preparation wording is not current authorization or a replay queue. Current
permission/bounds live in the [current plan](current-plan.md); interpretation
corrections and saved-input locations live in the [evidence ledger](../research/c1-hdmi-evidence-ledger.md).

## Phase 0

Passive inventory and a clean app lifecycle were verified. [Detailed result](archive/lg-c1-phase-0.md).

## Phase 1

Main/sub local clips advanced together with tested geometry. Audio, extended
geometry, sustained repeatability and full recovery remain partial. This proves
local presentation, not physical input concurrency. [Detailed result](archive/lg-c1-phase-1.md).

## First-picture development summary

| Version/stage | Observed result |
|---|---|
| 0.1.4 | Launch flash; no native report or acquisition proof. |
| 0.1.5 / 0.1.6 | Inert controls isolated TV clock authority; both strict guards accepted in 0.1.6. |
| 0.1.7 | Installed/admission bindings passed; picture attempt failed during setup before acquisition. |
| 0.1.8 / 0.1.9 | Named registration failed after SDL in 0.1.8; registration-first passed in 0.1.9, with focus lease cancellation and quit incomplete. Neither old collision nor crash was proven. |
| 0.1.10 | SDL_Init20.027 s; trace ended at quit entry. Context was not pumped. |
| 0.1.11 | Pumping the app context reduced Init to68 ms; Quit13 ms and local cleanup returned. Scheduled collection was missed; separately approved late read did not prove timed termination. |
| 0.1.12 host starts | Two invocations stopped before SAM; first missing APPDATA, second underlying error unknown. Normal PowerShell subsequently succeeded. |

[Full dated outcomes and original hashes](archive/c1-first-picture-campaign-2026-11-15.md).
[Mechanism/provenance](../research/archive/c1-first-picture-development-2026-11-15.md).
Standalone superseded diagnostics were retired; their old next steps are not a
queue. No historical result authorizes another TV action.

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

## TOFU host-key check — single pre-auth observation

2026-11-15: owner authorized one bounded TOFU host-key check at the existing
configured TV endpoint, explicitly excluding file collection and preserving0.1.12.
The owner directly selected that endpoint; no new on-screen address comparison
or firmware query was claimed. The sole existing root profile was selected only
after the private output ACL succeeded. No private-key file was read or credential
supplied. One connection observed a public host key at **185.955 ms**, deliberately
rejected it before authentication and observed closure at **195.887 ms**.
Status **tofu_recorded**, no stop reason, zero retries, unexpected authentication
false. No login, channel/SFTP, remote command, TV file read, key/profile change,
installation, app launch, policy/service action or power operation followed.

This records an advertised key under owner-approved **TOFU**. Independent identity
verification and completed proof of host-key possession remain **unknown** and
are explicitly false in the receipt; later SSH must match the pin and perform
normal signature verification. It proves no HDMI capability or collection result.
The grant is consumed; connection closed, no further TV action authorized.

Private pin/endpoint-binding/timing inventory:
`build/phase-2/hdmi-host-key-tofu-20261115-001/inventory.json`.
Inventory SHA-256 (not the key fingerprint):
`0aa1cb6b8ee6a0a347ecec48eb35641a7a30db08f0e49172613c03bd720909b1`.
Owner scope, exact one-shot runner, sanitized result and local preservation audit:
`build/phase-2/hdmi-host-key-tofu-run-20261115-001/`.
Post-audit matched all43 working source pins, ELF/IPK, eight prepared sources,
five immutable receipts,201 preservation pins and50 prior analysis files.
Existing known-host files stayed exact; private capture/inventory ACLs verified.
The proposed three-file evidence slot remains absent. No build/package/source
change, further connection or retrieval was needed.

## Three-file element evidence — bounded collection complete

2026-11-15: owner authorized one bounded collection using the saved TOFU pin and
existing TV endpoint, no retries and preserving0.1.12. Private ACL and all local
preparation/control bindings passed before connecting. Endpoint-binding hash and
exact saved SSH pin matched. One authenticated SSH connection, one SFTP subsystem,
three read-only opens: **426,315 bytes in929.400 ms**. Status **retrieved**, no stop
reason. Each plugin followed exactly two disclosed same-directory links:
`libelement-video-{hdmi,sink}.so` → `.so.1` → `.so.1.0.0`.
EOF, parent/link/path/open-handle stability and size/read-call caps passed.
All three handles, SFTP and SSH closed normally; no forced destruction or retry.

| Retained file | Bytes / SHA-256 |
|---|---|
| elementList.json | 1,491; `a091e7ab53a490c68f05486be31f659024852a27ab17770f3797e45c1b031782` |
| video-hdmi.elf | 341,436; `f6b8e5c055b41f18695f0b611c36023d0dfee75e7de445b15f6b2b1340ff039d` |
| video-sink.elf | 83,388; `61fcee10303ead7a29668582024f042c8f08701ab116a7ee87af59ce48ffaad1` |

Private raw bytes and inventory:
`build/phase-2/hdmi-element-plugin-evidence-20261115-001/`.
Inventory SHA-256:
`a1f8085a1a2fd0634b6a818668392b611b591e63c38ce324861e8c894e5ec77d`.
Owner scope/exact runner, sanitized result, offline SDK metadata and post-audit:
`build/phase-2/hdmi-element-plugin-run-20261115-001/`.
No raw endpoint, pin, credential or vendor configuration was printed.

Offline checks: JSON parses with the HDMI partial list naming both elements.
Both plugins are ARM32 little-endian soft-float shared objects with expected
SONAMEs/build IDs and pluginInfo/createPlugin exports. pluginInfo is84 bytes in
`.bss` in each; its initialized name is unknown pending static initializer tracing.
No plugin/initializer was executed or loaded, and no dependency was retrieved.
Matching metadata does not prove an atomic snapshot, active loaded identity,
receiver capacity, sink independence, hardware release or dual-HDMI operation.

Post-audit matched all43 working source pins, ELF/IPK, eight prepared sources,
five immutable receipts,201 preservation pins and50 prior analysis files. The
TOFU inventory and existing trust files remained exact; private directory,
inventory and all three raw-file ACLs verified. No source/package/guard change,
remote exec, directory listing, extra file read, app/HDMI operation, policy/key/
profile/service change or power action. The grant is consumed; no further TV
action is authorized. Next work is offline plugin identity/constructor tracing.

## Resource-client evidence — bounded single-file collection complete

2026-11-16: owner explicitly authorized one bounded resource-client read using
the saved TOFU pin and existing TV endpoint, no retries, preserving0.1.12.
Reference C1/03.53.45 comes from saved context; no new firmware/status query.
Private storage and prepared source/control bindings passed before connection.
One matching endpoint and pinned SSH/SFTP connection, one read-only open,
**99,736 bytes in431.297 ms**, three reads including EOF. Status **retrieved**,
no stop reason. One disclosed link:
`/usr/lib/libresource_mgr_client.so.1` → `libresource_mgr_client.so.1.0.0`.
Parent/link/path/open-handle metadata and all bounds passed. File handle, SFTP
and SSH closed normally; no forced destruction, retry or further connection.

Raw file SHA256:
`5f731199a4af70956cb186cd51f5c0d4cc82b16a92519ec0a0ea80b3eb988cd3`.
Raw bytes/inventory: `build/phase-2/hdmi-resource-client-evidence-20261116-001/`.
Inventory SHA256:
`f586ba775c98164ca459e44ff7c412c773ebb92947918e1bcd0cea63d5692e77`.
Authority/exact single-use runner, sanitized result, local SDK metadata and audit:
`build/phase-2/hdmi-resource-client-run-20261116-001/`.
TOFU remains owner-accepted, not independently verified identity. No raw pin,
endpoint, credential or private identifier was printed or changed.

Offline readelf confirms ARM32 LE ET_DYN, EABI5 soft-float, SONAME
libresource_mgr_client.so.1 and build ID
`39083d758eb78754368e3b3d35aabd390fc76b5b`. Forty-seven defined global
ResourceManagerClient function symbols include privateCommandResponse and
commandResponse; behavior is not yet traced. Nine dependency names were recorded;
no dependency was collected or vendor code loaded/executed. Active loaded
identity, command delivery/ownership, effective grants and dual HDMI remain unknown.

Post-audit matched43 working source pins, ELF/IPK, five new collector sources,
four shared sources,201 preservation pins,50 prior analysis files,47 trace files,
eight earlier prepared sources and five immutable receipts. Local profile and
checked trust files stayed exact; private directory/raw/inventory ACLs passed.
No prototype/package/guard change, remote exec, directory listing, other file
retrieval, app/HDMI/input operation, permission/key/profile/service/power action.
The grant is consumed; no further TV operation authorized. Next work is offline
resource-client registration/private-command delivery and owner-binding tracing.

## UMS connector evidence — bounded dependency reads

2026-11-16: during the requested resource-client trace, standing read-only owner
permission covered two exact dependencies needed to resolve command registration
and dispatch. libums_connector.so.1 delegated to libums_connector_impl.so.1;
each `/usr/lib/` seed was read once with the saved TOFU pin and matching existing
endpoint. One connection, one read-only open, one disclosed `.so.1.0.0` link and
zero retries per file. Both outcomes **retrieved**, no stop reason, stable
parent/link/path/open-handle checks and EOF. All handles, SFTP and SSH closed
normally; no forced transport closure.

| Retained file | Bytes / elapsed / SHA256 |
|---|---|
| ums-connector.elf | 34,140 /361.543 ms; `1ca5aa376e8d08811a514c5b03f1458eba0603afd0a13533f978083cf63d4f7e` |
| ums-connector-impl.elf | 83,352 /337.270 ms; `ade285c32b1ea054cf635f9c1ef2a9e3909b69930ebe9df892e8db0ac0d706a2` |

Raw/inventories: `build/phase-2/hdmi-ums-connector-evidence-20261116-001/`
and `build/phase-2/hdmi-ums-connector-impl-evidence-20261116-001/`.
Inventory hashes, respectively:
`258ac89fd355d4e123b1a31cf2bf3bd5b00ea71b8f2b2e3dbb774b0d8cd5211e` and
`bfa14d94667e06890868c590dc24bc7e2e13e37fb95385fed48cde20b1752c95`.
Frozen scopes/preparations/authorities/runners/results and static SDK analysis:
`build/phase-2/hdmi-resource-client-trace-20261116-001/`.
Each scope retained the validated30 s/27 s/3 s deadlines,32 MiB cap,64 KiB chunks,
2,049 reads, two-link maximum and single open. New literal-scope checks passed;
the unchanged engine's82-case acceptance is reused. Owner-only directory/raw/
inventory ACLs verified. Working0.1.12 sources/ELF/IPK and original evidence matched.

Offline ELF metadata has expected SONAMEs and ARM32 EABI5 soft-float identity.
Static dispatch reaches the stored ResourceManagerClient context; effective
caller authorization, server ownership/grants, actual release and independent
HDMI remain unproven. No private command, vendor-code execution, remote exec,
listing, app/input/acquisition, permission/service/power action or TV file change.
No credentials or private identifiers were printed. Both connections are closed;
standing read-only permission persists. Next: server-side TVRM receiver allocation.

## TVRM allocator evidence — bounded read-only discovery

2026-11-16: under standing owner permission, eight bounded connections completed
for the TVRM mapping question. Four single-file SFTP attempts used the saved
TOFU pin and matching existing endpoint. The exact TVRM-named services.d file
was **absent**, zero opens/reads. Three observed files were **retrieved**:

| Exact remote file | Bytes / elapsed ms / SHA256 |
|---|---|
| /usr/share/luna-service2/services.d/com.webos.service.legacybroadcast-atsc.service | 2,044 /337.6568 / `edfe060173101ca9e939bbaaa75820b77e9dbcfdc1a2439a197866c7ad91404b` |
| /usr/sbin/legacy-broadcast-atsc | 8,119,652 /2333.0463 / `7d6ed117b10a992df888279ba5cb41bcfd10df6fe14240f3e526cbdd1cbd6926` |
| /usr/sbin/tvrm | 550,784 /438.4935 / `82b6ef471b79ccc506511808ae63aad44fb4504e9ae18343497e2fded2ee4d21` |

Four separate fixed `/bin/ls -1` commands listed only filenames in
`/usr/share/luna-service2/services.d` (138 /232.5335 ms), its roles.d sibling
(241 /256.9436 ms), `/usr/share/luna-service2` (9 /253.2146 ms) and `/usr/sbin`
(365 /286.1789 ms). Each used one pinned connection/channel,3-second command
deadline,64 KiB stdout/4 KiB stderr and512-entry bounds within30 seconds.
These were passive remote exec calls; no Luna or hardware call occurred.

Total content8,672,480 bytes, three read-only opens,137 reads including EOF,
zero links/retries. All handle/SFTP/channel/SSH closures confirmed normally;
no forced destruction or stop reason. SFTP bounds stayed30/27/3 seconds,
64 KiB chunks,2,049 reads, one open; small registration cap64 KiB and executable
cap32 MiB, regular files only. Parent/path/handle metadata checks passed.

Fresh private evidence directories are `build/phase-2/hdmi-tvrm-service-evidence-20261116-001/`,
`hdmi-tvrm-legacy-service-evidence-20261116-001/`,
`hdmi-tvrm-backend-evidence-20261116-001/` and
`hdmi-tvrm-allocator-evidence-20261116-001/` under the same phase-2 root.
Exact frozen scopes, authorities, raw listings, inventories, SDK tracing and
preservation audit: `build/phase-2/hdmi-tvrm-receiver-trace-20261116-001/`.
The files were read as inert data; active loaded identity remains unknown.
Working0.1.12 and original evidence remain exact. No deployment, acquisition,
private command, input/policy/service/power action or TV file change. No new
picture/audio/remote-operation observation was requested or claimed.
All connections are closed; standing read-only permission persists.

## VHDMIRX configuration — passive qualified-key reads

2026-11-16: owner reported TV on and authorized continuation with standing
read-only access. Saved provider/client/backend code was inspected first.
Two distinct, fixed getConfigs requests then ran once each through the existing
pinned endpoint; no subscription or retry. No hardware/TVRM/private-command call.

1. Sections `extinput-service`, `tv.model`, `inputMap`:100-byte response,
   returnValue true, subscribed false, all three in missingConfigs.
   Normal exit/channel/SSH closure in265.4617 ms.
2. Exact saved key literals `extinput-service.physicalResourceNum`,
   `tv.model.videoIndex`, `inputMap.videoInputMapIndexInfo`:229-byte response,
   returnValue true, subscribed false. Config reports **vhdmirx2, ahdmirx2,
   videoIndex3**; the input-map key is in missingConfigs. Normal exit/channel/SSH
   closure in269.1007 ms. These are configuration values, not receiver-isolation
   observations, available grants or simultaneous HDMI proof.

Each used one SSH connection/channel, saved TOFU pin and endpoint binding;
30-second outer /3-second connect, command and closure bounds, luna-send wait
2 seconds,64 KiB stdout /4 KiB stderr and512 output-line maximum. Both exit0,
zero stop reasons/retries/forced closures. Total329 response bytes; no file
collection, deployment, acquisition, input/policy/service/power or TV file change.
No new picture/audio/remote restoration observation was requested or claimed.

Private fresh scope, immutable preparations, single-use runners/authorities,
raw replies/results, source-bound tracing and preservation audit:
`build/phase-2/hdmi-tvrm-provider-trace-20261116-001/`.
Raw response SHA256s, respectively:
`feb8316be05048e7da9b2863aef9533a03c6dab6254c20a83580a2cf10d2633a`
and `3a6f090d31020e99d5f2caee3afad0e076088be4f7f44be03059fb138ad59eaa`.
Prepared initial runner variants were not dispatched; executed sources are
`read-config-once-v2.cjs` and `read-config-values-once.cjs` only.
Working0.1.12 and original evidence remain unchanged. Both connections are
closed; the pin is owner-accepted TOFU, not independently verified identity.

## Video12 driver — bounded sysfs metadata

2026-11-16–17: standing read-only research scope covered exact sysfs metadata
for the saved plugin's video12 endpoint. No device was opened and no ioctl,
Luna/private command, acquisition, deployment, input/policy/service/power or TV
file change occurred.

| Scope | Actual outcome |
|---|---|
| cat exact video12 name/dev/uevent attributes |39 bytes,233.915 ms, exit0. Name empty; sysfs81:9, DEVNAMEvideo12. |
| ls -ld exact class/device/driver links |412 bytes,221.7136 ms, exit0. Resolves to platform hdmi20_v4l2 and /sys/bus/platform/drivers/hdmi20_v4l2. |
| ls -l observed driver directory |Connection timeout before SSH readiness,3265.0717 ms, zero channels/commands/response bytes. No retry. |

Each scope allowed one SSH connection/channel,30-second outer /3-second connect,
command and closure bounds,64 KiB stdout /4 KiB stderr,512 parsed-line maximum.
The successful reads matched saved pin and endpoint binding and closed channels/
connections normally. The timeout did not reach host-key verification; its
connection closed normally with no channel opened. No forced destruction in
any attempt. The owner was asked whether the TV is still reachable; no automatic
reconnect or power action was attempted. A fresh exact device-node/owner-link
request is prepared but unexecuted pending that reply.

Private one-shot sources, authorities, raw metadata/results, retained upstream
ABI references and preservation audit:
`build/phase-2/hdmi-video12-driver-trace-20261116-001/`.
The successful raw response SHA256s are
`bb874e240fccfe5df4ce9c19854151f42eff881655603d37816b92f00110660e`
and `100a9ff21db079899a94c93a9ab572a1571faaef25f9086c511d1189165f8a21`.
Timeout result SHA256:
`cd5243d882d89e3da282c380f88c9cc94a44762679d0b909a9c6741bdba9f38c`.
The sysfs driver identity is established; actual /dev node rdev comparison,
module/built-in ownership and per-open/shared selection remain unknown.
Working0.1.12 and original evidence remain exact. No new picture/audio/remote
restoration observation was requested or claimed. All connections are closed.

### hdmi20 owner and inert kernel — bounded read-only evidence

**2026-11-17, LG OLED C1 / firmware03.53.45:** after the owner reported the TV
on, the prepared node/owner request ran once, followed by four distinct fixed
metadata reads and one exact regular kernel-file collection. Standing read-only
permission applied. No device open/ioctl, acquisition, input change, deployment,
module load, kernel-memory/flash read, policy/service/power or TV file change.

| Fixed scope | Actual outcome |
|---|---|
| ls -ld /dev/video12 and observed driver/module paths |165-byte stdout,76-byte stderr,383.845 ms, exit1 because module link is absent. Actual character81:9 matches sysfs; driver directory exists. |
| cat /proc/modules and /proc/sys/kernel/osrelease |1,396 bytes,226.627 ms, exit0;22 modules and release4.4.84-229.kcl4tv.6. |
| grep exact HDMI/V4L2 name pattern in /proc/kallsyms |1,269 bytes,690.253 ms, exit0;30 symbols, none module-annotated. Runtime addresses retained privately. |
| ls -l /boot |199 bytes,243.643 ms, exit0; observed matching-release regular kernel file15,822,619 bytes and its separate symlink. |
| SFTP exact /boot/Image.lz4-4.4.84-229.kcl4tv.6 |15,822,619 bytes,243 reads including EOF,3,976.897 ms; one read-only open, zero links; stable metadata before/open/after. |
| grep six exact image anchors in /proc/kallsyms |153 bytes,727.506 ms, exit0; anchors retained privately for offline offset mapping. |

Each scope used one connection and no retry. All saved TOFU/endpoint bindings
matched; metadata channels, SFTP handle/subsystem and every SSH connection closed
normally, no forced destruction. Metadata:30 s outer,3 s connect/command/closure,
64 KiB stdout,4 KiB stderr,512 nonempty-line bounds. File: unchanged32 MiB,
30 s outer /27 s work /3 s operation,64 KiB chunks,2,049 read calls maximum,
one open, explicit `/boot` parent and regular path/handle metadata checks.
Missing module link is a retained command failure, not a successful full listing.
The earlier connection timeout was not replayed or overwritten.

As-used preparations, immutable authorities/runners/results, private raw metadata
and offline validation: `build/phase-2/hdmi-hdmi20-owner-trace-20261117-001/`.
The owner read's new raw/authority/result files remain beside its original runner
in `build/phase-2/hdmi-video12-driver-trace-20261116-001/`.
Compressed original/inventory: `build/phase-2/hdmi-kernel-image-evidence-20261117-001/`.
Image SHA256 `7c51d5e34aaf1105031386f4a3968aa81c6824191e77d58a0275f2d8859f2ed2`;
inventory SHA256 `f89667dc305250e09c23c7eec3fdcc57094b7234c77e080a8c7ecc2b5850d2f5`.
Metadata stdout hashes, in table order excluding SFTP:

- `8c7204e0547465cd57ab4ccb779e372904fb9943f072bbed7e2f693863857383`
- `c962d88987179a05f57fd963621966d9cb9efe6b9c8ff9b26f4517e516f4801e`
- `62dd0ae1a28d9e3d73d09c3800f652108a81ffb938fc9159af4eb5d2214c3fc5`
- `9a30b4e754677850d58fd999641cff89dfc8ab764eba84987e9fa2bc02112af7`
- `26fbac5c3851fb6ad6a2c005e8267d6de6f39a69e35363e51c84947b5ff5bb93`

Offline extraction/disassembly and embedded symbol matching ground built-in
hdmi20_v4l2 code; no vendor code executed. [Mechanism and limits](../research/c1-hdmi-interface-map.md#independent-second-path-research):
per-file handle, global input readback, per-port activity and port-based clear;
independent hardware/sinks remain unproven. Working0.1.12 unchanged. No new
picture/audio/remote restoration observation was requested or claimed.

### Video-output service — bounded two-file collection

**2026-11-17, LG OLED C1 / firmware03.53.45:** the owner-requested fixed read
completed once using the existing endpoint and saved TOFU pin. Descriptor
Name/direct Exec passed and its handle closed before opening the executable.

| Exact inert file | Bytes / SHA256 |
|---|---|
| /usr/share/luna-service2/services.d/com.webos.service.videooutput.service |498 /56d12961fa954d3ed1126a0220dcbafae9939f072ea766877779ef12fbe3ff35 |
| /usr/sbin/videooutputd |591,404 /e3f86a398e68d1fbf895dd1829a87eb07f7c54fd191d19ff44ab9a5f4142415f |

Total591,902 bytes in902.185 ms: one SSH/SFTP connection, two read-only opens,
13 reads including EOF. Zero retries, symlinks or forced closure. Path/ancestor/
handle metadata matched before/after; both handles, subsystem and SSH closed
normally. Pin/endpoint matched; TOFU still lacks independent identity verification.
Unchanged bounds:30 s outer/27 s work/3 s connect-operation-closure,64 KiB chunks,
64 KiB descriptor/32 MiB aggregate,2,049 reads maximum, one file handle at a time.
The ELF header is ARM32 little-endian ET_DYN; no vendor code was executed.

Raw files/inventory: `build/phase-2/hdmi-videooutput-evidence-20261117-001/`.
Inventory SHA256 `abbd3545395b47e56c3bdc0e1c5d66b0c31a5a7c83a543ab6b2f7da69eed58fb`.
As-used scope, preflight, seven exact source snapshots, one-shot runner/result
and post-audit: `build/phase-2/hdmi-videooutput-run-20261117-001/`.
All43 control sources, ELF/IPK,201 preservation pins and original evidence remain
exact. No TV exec, device open/ioctl, app/acquisition/input/policy/service/power
action or TV file change. No fresh picture/audio/remote restoration observation
was requested or claimed. Service routing/ownership and dual HDMI remain unknown;
continue offline with these saved files.

### VAL library — bounded single-file collection

**2026-11-17, LG OLED C1 / firmware03.53.45:** the owner-requested VAL read
completed once with the saved endpoint/TOFU pin. /usr/lib/libval-starfish.so.1
followed one permitted link to /usr/lib/libval-starfish.so.1.0.0. Regular file:
**203,928 bytes**, SHA256
`344afde92a524825b3cc90111c96b32c36d5d5dd6624bf556ded5a03ce8884fa`.

One SSH/SFTP connection, one read-only open, five reads including EOF,
385.325 ms. Zero retries/forced closure. Link/path/ancestor/handle metadata
matched before/after; file handle, subsystem and SSH closed normally. Pin and
endpoint matched; TOFU remains without independent identity verification.
Unchanged bounds:30 s outer/27 s work/3 s connect-operation-closure,32 MiB,
64 KiB chunks,2,049 reads, at most two exact numeric-version links within /usr/lib.

Offline header is ARM32 little-endian ET_DYN; SONAME libval-starfish.so.1 and
defined VAL::getInstance export match the requested dependency. No vendor code
executed; full ABI/active-loaded identity and dual HDMI remain unknown.
Raw/inventory: `build/phase-2/hdmi-val-library-evidence-20261117-001/`.
Inventory SHA256 `53380676bb3d30c70dfd740f8ff50342138d2810dd9d95f7d06fdacbab068585`.
As-used scope/preflight/nine source snapshots/runner/result/identity/post-audit:
`build/phase-2/hdmi-val-library-run-20261117-001/`.
All43 control source pins, ELF/IPK,201 preservation pins and prior evidence remain
exact. No TV exec, device open/ioctl, app/acquisition/input/permission/service/
power action or TV file write. No new picture/audio/remote restoration observation
was requested or claimed. Return to saved-provider tracing without another read.

### VAL capability JSON — bounded single-file collection

**2026-11-17, LG OLED C1 / firmware03.53.45:** the owner-requested single read
of /etc/palm/val/device-cap.json completed with the existing configured endpoint
and saved TOFU pin. **243 raw bytes**, SHA256
`408f13b13d2c30e1e51765c1b8e6a2dff7224410e8c4c47e057f28f00877b440`.
Inventory SHA256
`7efbdb1c7da68b5461aef78085d0cdcf0c6fafaa036e262a78390318ac1cca55`.

One SSH connection, one SFTP subsystem, one read-only open, two reads including
EOF, all15 permitted metadata calls, **342.206 ms**. Zero retries, links or forced
closure. Three exact ancestors stayed directories; regular leaf/handle metadata
matched before/open/after: mode0100644, uid0/gid0, size243, mtime1755576901.
File handle close was confirmed; SFTP and SSH closure were confirmed. Pin and
endpoint matched; TOFU remains without independent identity verification.
No atomic-snapshot claim. Unchanged64KiB retained/65,537 observed-byte/two-read
bounds,30 s outer/27 s work/3 s connect-operation/shared-cleanup bounds.

Separate local strict UTF-8/object JSON interpretation passed without duplicate
keys or unsupported plane names. Original array [MAIN,SUB0], unique byte-sorted
names [MAIN,SUB0], no duplicates or extra ordinals. For the **saved provider**,
MAIN ordinal0 pairs with software planeID44/video30; SUB0 ordinal1 with45/video31.
This verifies advertised on-disk names; currently loaded config, independent HDMI
receiver/scaler grants, hardware release, motion/audio and stability remain unknown.
No vendor parser or device-node code executed.

Raw/inventory: build/phase-2/hdmi-val-capability-evidence-20261117-001/.
Frozen as-used16 reader/test/helper sources, request/preparation/trust bindings,
one dispatch/result, post-bindings and offline verification:
build/phase-2/hdmi-val-capability-run-20261117-001/verification.json.
Native Windows owner-only ACL verification passed for raw, inventory and every
as-used provenance path. All16 source pins,201 original preservation pins and585
prior trace pins across14 trace trees matched; unchanged0.1.12 source/IPK/ELF,
helpers, guards, saved trust receipt and original evidence are preserved.

Checks: node scripts/collect-val-capability.cjs --plan passed offline;
node tests/host/val-capability-reader.test.cjs passed87 cases, zero TV connections,
credential reads or forbidden imports. The initial sandboxed suite stopped at its
private ACL check; rerunning in required native Windows context passed. A local
dispatch wrapper initially referenced an unexported helper; it was corrected
before output reservation/transport construction, so this was not a remote
attempt or retry. The validated reader itself was unchanged. The new private
verify-local.cjs independently replayed raw hash/metadata/interpretation/closure
and preservation checks with zero additional TV connections.
Final npm run lint and git diff --check passed; repository consistency checked45
documents/455 local links. Native/runtime rebuilds and prototype test repetition
were not needed because production code, ELF/IPK and guards are unchanged.

No TV exec/write, app/HDMI acquisition, installation, input/permission/service/
power action, vendor initialization or device ioctl. No new picture/sound/remote
observation was requested or claimed. One read-only collection is the entire TV
scope of this task. Subsequent saved-evidence review identifies the factory reuse
predicate and port-based cleanup limit in the
[research map](../research/c1-hdmi-interface-map.md#independent-second-path-research).
The [dual-source sequence](current-plan.md#review-only-dual-source-experiment)
is a review-only draft; it has not run and is not a runnable candidate.

### Media server descriptor — bounded absent-file result

**2026-11-17, LG OLED C1 / firmware03.53.45:** one standing-permission inert
read attempted exactly
/usr/share/luna-service2/services.d/com.webos.media.service to ground the retail
media-server executable for own-SUB0 sender/owner tracing. The candidate basename
came from pinned LG OSE source; retail presence was not assumed.

**Absent:** one SSH connection and SFTP subsystem, **zero content opens/reads**,
9 metadata calls, **286.882 ms**. Four exact ancestor directories matched before
and after the leaf-not-found result. Pin and endpoint matched; handles were never
opened, SFTP/SSH closure confirmed, zero retries/forced closure. No raw descriptor
exists and no content hash is claimed. Inventory SHA256
`67427b51e87fc5c1d88ee3309ab70c7e7d29484d88da5e199a5ba2321a6b47a6`.

Unchanged private reader limits:64KiB retained/65,537 observed bytes, two reads
including EOF,18 metadata calls, zero links/one open;30 s outer/27 s work and3 s
connect/operation/shared-cleanup bounds. No alternate descriptor lookup or
executable collection followed. This establishes only that this exact file was
absent; running com.webos.media identity and its actual registration path remain
unknown. No media service query/selector/acquisition, TV exec/write, installation,
input/permission/service/power change or device ioctl occurred.

Private receipt: build/phase-2/hdmi-media-service-evidence-20261117-001/.
As-used reader/runner/authority/result, exact transformations from the unchanged
capability reader and accepted61-case synthetic suite:
build/phase-2/hdmi-own-sub-contract-20261117-001/descriptor-read-003/.
The suite passed in native Windows context with zero TV connections, credential
reads or forbidden imports; owner-only capture ACL checks passed. Initial local
ACL/generator refusals and an obsolete interpretation assertion failure are
retained in acceptance-final.json; all occurred offline before dispatch.

Subsequent saved-only review produced the
[own-selector/evidence contract](../research/c1-hdmi-interface-map.md#independent-second-path-research):
fixed nested JSON-string payload; empty audio fields clear type; setter replies
do not prove reconnection; shared elements can retain their first backend parent.
A separate bounded process/executable-identity request is prepared but not run.
Working0.1.12, helpers/guards, prior raw evidence and consumed grant disposition
are unchanged. No new picture/sound/remote restoration observation was requested
or claimed; the dual-source draft remains unrun and not runnable.
Final local verification passed61 acceptance cases, six source identities/18
excerpts,43 working source pins and201 original preservation pins. Owner-only
ACL readback passed for the complete new evidence tree and absent-file capture;
local ACL/manifest setup refusals and successive verifier sources are retained.
Audit: build/phase-2/hdmi-own-sub-contract-20261117-001/verification.json.
npm run lint and git diff --check passed (45 documents/460 local links). No native
build or prototype test repeat was needed; production sources/IPK/ELF are unchanged.

### Media executable identity — single bounded lookup

**2026-11-17, LG OLED C1 / firmware03.53.45:** after the owner continued the
prepared next task, the fixed pidof/readlink command ran once under standing
read-only permission. The saved endpoint/TOFU pin matched. **Identified:** one
allowed executable candidate path, retained privately; **23 stdout bytes**, zero
stderr, exit0/no signal, **292.343 ms**. One SSH connection/exec channel, zero
SFTP/target-file access, retries or forced closure. Channel and SSH closure were
confirmed. No alternate process name, descriptor retry or automatic file capture.

Raw stdout SHA256
`188a7d781d2b9ee61b190fab95671a0a77ff6b79ffc8c361376f3c8d7f644b52`;
inventory SHA256
`aca6c62e01e21cc7997341e23b21c4d982f85c0accb5d668ef49a91e4e74316f`.
Closed local bytes/hash/size and strict target interpretation exactly match the
private receipt. No regular-file status, executable content hash, process birth
identity or active loaded-byte identity follows from one procfs link read; PID
reuse/exec/source races remain unknown. TOFU is not independently verified.

Unchanged request bounds: one literal command,30 s outer/27 s work,3 s clipped
connect/command/shared cleanup,1KiB stdout/1KiB stderr, one nonempty stdout line,
cancellation and confirmed closure. The command rejects absent/multiple or
nonnumeric process matches before its sole readlink and never opens/executes the
target. Raw PID/path, endpoint, profile/key and unrestricted stderr were not
printed. No app/HDMI acquisition, input switch, TV write, installation, service
query, permission/service/power change or device ioctl occurred. No new owner
picture/sound/remote restoration observation was requested or claimed.

Raw streams/authority/receipt/post-bindings:
build/phase-2/hdmi-media-identity-evidence-20261117-001/.
Reader/dispatcher/preparation,74-case offline acceptance,11 frozen as-used
source/request/helper pins and closed-local verification:
build/phase-2/hdmi-media-identity-read-20261117-001/verification.json.
The tests blocked real transport and credential reads; explicit Git Bash used
stubbed pidof/readlink functions. Acceptance covered fixed request-byte binding,
default/plan refusal, output/line/exit-code limits, late callbacks, cancellation,
connect/command/shared-cleanup deadlines and native Windows owner-only ACLs.
Pre-dispatch review fixed same-buffer request binding and late-close acceptance;
initial local harness/occupied-receipt issues are retained in preparation.json.
Only the final74-case suite passed for the frozen sources; no TV retry occurred.

Local audit matched raw hashes/target/closure, all11 frozen pins,43 working source
pins and201 original preservation pins; private ACLs passed. Unchanged0.1.12
source/IPK/ELF, original evidence, helpers and guards are preserved. No native
build/package or active trial. The separate exact inert-file request is prepared:
build/phase-2/hdmi-media-identity-read-20261117-001/executable-request.json,
SHA25625885dd02bc8da537c1b507e4323745f763000dd5214308c6e8b42c66008568b.
It binds this actual private path; its reader is not implemented/validated, no
executable bytes were retrieved and the dual-source draft remains not runnable.
Final npm run lint and git diff --check passed (45 documents/463 local links).
Prototype tests/native builds were not repeated because production sources,
guards and the working ELF/IPK are unchanged.

### Media executable — single bounded inert-file capture

**2026-11-17, LG OLED C1 / firmware03.53.45:** the owner explicitly requested
implementation/validation followed by the one capture. The request-bound
observed private path was read once with the existing endpoint and saved TOFU
pin. **529,960 bytes**, SHA256
`1f3a45553139881e2ca978352ae0c87e8654b571b0d439af131b5e2fa82c2d4e`.
Inventory SHA256
`1cd8bb41e060072ba241326613366e1fa35612a63b3b2b566ae4343405870b5f`.

One SSH/SFTP connection, one read-only regular-file open, **ten reads including
EOF**, all12 metadata checks, **452.084 ms**. Zero links, exec channels, retries
or forced closure. Two exact ancestor directories and initial/opened/after leaf
metadata matched: mode0100755, uid0/gid0, size529960, mtime1757741406. File handle
close, subsystem and SSH closure were confirmed. Raw/hash/size/EOF/metadata and
owner-only local ACLs independently passed; SFTP equality is not an atomic/inode
snapshot. TOFU remains without independent identity verification.

The unchanged request retained32MiB/64KiB/513-read/12-metadata bounds,
30s outer/27s work and3s clipped connect-operation/shared cleanup. Source capture
and interpretation are separate: only after complete closed raw verification,
local header bytes recognized ELF32 little-endian, ET_DYN(type3), ARM(machine40),
version1 and52-byte declared header. Full ELF validity, ABI closure, service role,
active loaded-byte equality and hardware ownership remain unknown. No vendor
loader/parser/code or target executable was run; no media-service query.

Raw/authority/inventory/header/post-bindings/dispatch:
build/phase-2/hdmi-media-server-evidence-20261117-001/.
As-used reader/dispatcher/header source, exact recorded derivation,87-case
acceptance and independent verification:
build/phase-2/hdmi-media-server-read-20261117-001/verification.json.
The synthetic suite passed with zero real transport imports or credential reads;
it covered the exact32MiB EOF/growth/read514 boundaries, metadata changes,
callback-time/cleanup deadlines, cancellation, immutable request-byte binding,
separate valid/invalid header outcomes and native Windows private ACLs. One
inherited delay fixture was corrected from12×2s to12×2.5s to reach the27s cutoff;
the first offline failure is preserved and the reader was unchanged by that fix.

All18 frozen source/request/helper pins,43 working source pins and201 original
preservation pins matched. Working0.1.12 source/IPK/ELF, guards, trust receipt and
original evidence remain exact. No TV write, app/HDMI acquisition, input switch,
installation, permission/service/power change or device ioctl. No fresh owner
picture/sound/remote observation was requested or claimed. No native build,
package or active trial. A subsequent saved-byte first pass bound registered
setSink to its selector/privateCommand fallback and trackResourcesStatus to
subscriber registration/observer state. It used zero further TV connections or
service calls. [HDMI findings and ownership limits](../research/c1-hdmi-interface-map.md#independent-second-path-research)
and private trace verification:
build/phase-2/hdmi-media-server-trace-20261117-001/verification.json.
A further offline pass bound the manager objects, registration's generated-ID
to actual sender-service mapping, associated-record fan-out and cached owner
selector replay. A false setSink reply can coexist with forwarding. Exact
manager virtual implementations and association validation remain outside the
saved executable.14 excerpts/22 literals/two record vtables/two singleton imports,
owner-only ACLs and201 preservation/43 working pins passed; zero further TV
connections or service calls. [Mechanisms and provider gap](../research/c1-hdmi-interface-map.md#independent-second-path-research).
Private verification: build/phase-2/hdmi-media-owner-trace-20261117-001/verification.json.
No active experiment; do not repeat completed capture or identity discovery.

### ResourceManager mapping lookup — connect timeout

**2026-11-17, LG OLED C1 / firmware 03.53.45.** The single lookup attempt
ended with `connect_timeout` at the 3-second connect deadline, with
**3,062.681 ms** total elapsed including cleanup. The saved reader requested
SSH shutdown and recorded the client close event without forced teardown.
The receipt has no confirmed host-key or endpoint match. Zero exec channels,
SFTP subsystems or retries. Both streams are empty and no command exit was
recorded. The capture remained incomplete and interpretation was skipped.
The provider path remains **unknown**. The lookup is **spent**.

Private receipts and empty streams are preserved in
build/phase-2/hdmi-resource-provider-evidence-20261117-001/.
Local verification matched the request/command bindings, receipt sizes and
SHA256 links, both empty stream hashes, 26 original/frozen pin pairs and
201 preservation pins. The capture directory and its seven files passed the
owner-only ACL check. The frozen reader confirms that the SSH closure flag
comes from the client close event in this path. No exec channel existed to close.

| Saved evidence | SHA256 |
|---|---|
| inventory.json | `7d7c71796519441162aad30ad20471c92ae04f4918fff9597f7f7b2734b02364` |
| dispatch-result.json | `76b9d32aec7ed04d0dc7eae51e0751d6cb6f316c88d477b2fddc2af423ccec10` |
| stdout.bin and stderr.bin (each) | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

Verification used local files only. No retry, new TV connection, library read
or active experiment followed.
