# C1 test journal

Updated 2026-11-12. LG OLED C1, firmware 03.53.45 / SDK 6.5.3.
[Current status](../../STATUS.md) · [Current test plan](current-plan.md) · [Documentation index](../README.md)

This is the compact record of **actual TV results**. Original machine reports,
hashes and owner observations are unchanged; full commands/diagnosis are archived
below. Past runs authorize no repeats. Local simulations are not TV evidence.

## Phase 0

2026-11-10: passive probe 0.1.0 passed after a local-asset CSP fix. Metadata,
remote navigation, Close to Home and uninstall worked; owner confirmed normal
HDMI picture/sound afterward. On-TV file export and in-flight cancellation
remain unknown. Report: `build/reports/c1-web.report.json`. [Detail](archive/lg-c1-phase-0.md).

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
[Full journal, reports and build hashes](archive/lg-c1-phase-1.md).

## Admission app

2026-11-11–12: 0.1.0 had a normal-launch stdout capture gap; 0.1.1 returned Home
at its launcher-argument guard without producing a report. Version 0.1.2 accepted
launcher metadata and registered its dedicated identity, then the first hub
permission query returned **allowed: false** (13 ms). No IWC list/setter ran.
Report recovered; self-reported cleanup and observed process absence. Retained
exit records show normal failure exits, not crash signals. Zero candidate counts
were defaults, not HDMI observations. No relaunch is queued. [Detail](archive/c1-admission-preflight.md).

## Root read 001

2026-11-12: actual stock `luna-send` listing **passed**, zero publications/HDMI
candidates, exit 0 and cleanup confirmed, 401 ms. Visible input unknown; this
does not prove absent HDMI receivers. App stayed closed. [Detail](archive/c1-iwc-root-read-001.md).

## Root read 002

2026-11-12: after owner-selected stable live HDMI, listing **passed**, one total
publication/HDMI-app candidate, exit 0 and cleanup confirmed, 449 ms. Owner later
confirmed HDMI 4, normal view/motion/sound. Exported counts contain no reusable
target or logical dimensions. No input/geometry change. [Detail](archive/c1-iwc-root-read-002.md).

## Native normal

2026-11-12: fake-worker normal control **passed**. Helper 284 ms; reply validated,
actor/worker reaped, launcher exit 0, no survivors, stage removed without host
rescue. App absent before/after; zero IWC calls. Owner confirmed normal viewing
afterward; before/during unknown. [Detail](archive/c1-lifecycle-normal-001.md).

## Native control EOF

2026-11-12: fake-worker control loss **passed**. Host sent stdin EOF at 128 ms;
native helper observed loss, cancelled/reaped both children and finished in
108 ms (different clock origin), exit 0. No survivors; stage removed without
host rescue. Both SSH connections remained up. App absent; zero IWC calls;
owner confirmed normal picture/motion/sound before and after. This proves no
whole-transport/app survival or HDMI recovery. [Detail](archive/c1-lifecycle-control-loss-001.md).

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

## UTP provider retrieval

2026-11-12: owner-authorized **read-only SFTP** of exactly `/usr/sbin/utp-atsc`
and `/usr/sbin/utp-dvb` succeeded (8,792,988 / 8,788,888 bytes). Size/mtime
checks stayed stable; local SHA-256 and provenance are in the
[provider review](../research/archive/c1-hdmi-investigation-2026-11-12.md#utp-provider-allocation-and-cleanup--2026-11-12)
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
[Exact provenance and limits](../research/archive/c1-hdmi-investigation-2026-11-12.md#provider-routing-metadata-and-cleanup-boundary--2026-11-12);
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
[Provenance and remaining gate](../research/archive/c1-hdmi-investigation-2026-11-12.md#hdmi-backend-mapping-and-cleanup-timeout-boundary--2026-11-12).
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
[Exact files, hashes, limits and remaining gates](../research/archive/c1-hdmi-investigation-2026-11-12.md#hdmi-backend-implementation-and-release-failure--2026-11-12).
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
or restoration result is claimed. [Exact findings and limits](../research/archive/c1-hdmi-investigation-2026-11-12.md#stop-routing-resolved-and-downstream-release-boundary--2026-11-12).

## Current conclusion and archive

**Verified:** local main/sub playback, root listing and normal/EOF fake-process
lifecycle. **Unknown:** actual setter admission, applied reset ordering, HDMI
resize/recovery and simultaneous HDMI 1 + 2. Active geometry/crop remains
**unsafe_to_test under the current recovery contract**. [Remaining gates](../research/c1-iwc-gates-after-lifecycle.md).

The [archived lifecycle-only plan](archive/c1-lifecycle-only-plan.md) is completed
history; no further generic lifecycle case is queued. Every former device-test
file is retained under `archive/`, including its original commands, hashes and
limits. Use the single [current plan](current-plan.md) for the proposed next test.
Append short results here after future authorized runs; keep raw reports immutable.
