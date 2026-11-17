# Current status

Updated 2026-11-18. [Roadmap](ROADMAP.md) · [Docs](docs/README.md) · [Current procedure](docs/device-tests/current-plan.md)

## Verified milestone

**0.1.12 displayed continuously moving physical HDMI-4 video in its own centered
window, with audible sound**, once on LG OLED C1 / firmware 03.53.45.
Open/select/stop/close and local cleanup returned; independent termination and
normal picture/sound/remote restoration were observed, without recovery.
[Actual outcome and original hashes](docs/device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound).

This is one short single-input result. Independently live HDMI 1 + HDMI 2,
sustained stability, audio ownership and hardware release remain **unknown**.
Direct UTP remains selected; Glasshouse's HTML HDMI source is complementary.

## Working control

- [Source and contract](native/phase2-hdmi-candidate-0.1.12/README.md).
- IPK: dist/io.github.tpapaz.multiview.hdmiwindow_0.1.12_arm.ipk, 51,124 bytes;
  SHA256 cb7ec17381a23526299545300f5437c3d1fbeb12e45f1466adc05a71ec829e4f.
- ELF: build/phase-2/physical-candidate-arm-0.1.12/multiview-hdmi-window, 112,020 bytes;
  SHA256 7df25969c176e6560b4393c3236cd9f974e91f939b6313390e8da265670675e0.
- Immutable build/package/ABI records: build/phase-2/physical-candidate-0.1.12/.
- Physical capture: build/reports/picture-0.1.12-20261115-001/;
  frozen inputs: build/phase-2/picture-trial-0.1.12-20261115-001/.
- Lifecycle capture: build/reports/lifecycle-0.1.12-20261115-003/.

The retained narrow own-app/four-method permission grant is **loaded pending
separate cleanup**, not revoked. Completed acquisition grants are consumed.
All completed collection connections are closed. Useful bounded passive research
has [standing permission](docs/safety.md#standing-read-only-permission); active
acquisition, deployment, policy/service and power actions require separate scope.

## Research conclusion

Saved evidence now traces factory/resource arbitration through HDMI port
selection and videooutput→VAL→VSC presentation. HDMI sourcePort k remains separate
from receiver grants and sink IDs. VAL sink ordinals 0/1 open video30/31; normal
mode0 follows node routes0/1. The one bounded capability read completed:
243 bytes, stable metadata/EOF/hash and confirmed handle/SFTP/SSH closure.
On disk, planes are [MAIN,SUB0]; unique byte-sorted ordinals are MAIN=0/SUB0=1.
For the saved provider these pair with video30/31 and software planeIDs44/45.
The running service's loaded configuration remains unknown.
Distinct presentation routes and configured VHDMIRX count2 support a **candidate**,
not proof of independent receivers.

Cached adoption, reuse/rebinding, port switching and independent allocation remain
different explanations. Cached success, setDualVideo's success stub, software
planeIDs44/45 and occupancy/source caches cannot establish concurrency or release.
The factory's inspected reuse match compares resource type and grant selector,
not sourcePort/window/sink. HDMI activity clear is port-based without an owner
check in that path; file close alone does not clear it. Distinct grants and
isolated sibling motion therefore need separate evidence.
The source-bound SUB0 contract now fixes the private-command grammar, rejects
empty audio/video filler fields and separates delivery from completion. The
element can retain its **first backend parent** across sharing; the own-target
join must therefore include logical UTP, backend/element context, child resource
owner and generated command service. Setter success proves none of those joins.
[Authoritative mechanisms, corrections and path assessment](docs/research/c1-hdmi-interface-map.md).
[Saved evidence and interpretation guide](docs/research/c1-hdmi-evidence-ledger.md).
Firmware addresses/IDs are research evidence, never portable app constants.

## Single next task

**ResourceManager mapping lookup spent.** The single SSH connection attempt
timed out during connect. The saved reader receipt confirms SSH closure after
3.063 s total, with zero exec channels, SFTP subsystems or retries. The provider
path remains unknown. No device operation is queued.
[Actual outcome and hashes](docs/device-tests/c1-journal.md#resourcemanager-mapping-lookup--connect-timeout)
· [Closed scope and original bounds](docs/device-tests/current-plan.md#spent-bounded-resourcemanager-path-lookup).

**Current result.** The [offline caller trace](docs/research/c1-hdmi-interface-map.md#can-the-app-wait-for-hdmi-2-to-confirm-sub0)
found that a fresh `switchExternalInput` sets up the connector and starts
playback inside one backend request. The app can postpone select after open,
but its logical ID cannot confirm that HDMI 2 owns a connector with SUB0
applied. The [internal timing interval](docs/research/c1-hdmi-interface-map.md#sub0-selection-before-the-first-main-connection)
has no verified app-controlled wait. The first scaler choice and independent
HDMI 1 + HDMI 2 remain **unknown**.

**Construction trace complete.** The [saved HDMI clients and load handlers](docs/research/c1-hdmi-interface-map.md#can-hdmi-2-select-sub0-when-its-connector-is-created)
provide no verified way to give a fresh HDMI 2 connector type 4 before its
first scaler choice. Stock PiP changes the exported rectangle. UTP window
options remain window metadata at the video sink, and `mediaFrontend` selects
an element configuration. The explicit sink field was traced in SMP local
playback. The saved construction trace stops at these boundaries.

**Retail G4 comparison.** Offline analysis of G4 firmware 03.11.20 identified
a conditional secondary scaler path. The first scaler choice on a fresh
HDMI 2 session remains **unknown**. The next offline trace needs to establish
whether the connector receives its secondary assignment before its
first scaler request.
[Retail G4 comparison](docs/research/prior-art.md#retail-g4-comparison).

The completed single executable capture remains:
529,960 bytes, SHA2561f3a45553139881e2ca978352ae0c87e8654b571b0d439af131b5e2fa82c2d4e,
ten reads including EOF,12 stable metadata checks,452.084 ms and confirmed
handle/SFTP/SSH closure. One connection/open; no exec, retry or forced closure.
Do not repeat the file/identity lookup or absent descriptor read.

Saved input: build/phase-2/hdmi-media-server-evidence-20261117-001/media-server.elf.
Closed local header: ARM32, little-endian, ET_DYN, e_machine40, version1.
This is **retrieved inert evidence and header identity**, not full ELF/ABI,
service-role, active-loaded identity or hardware-ownership verification. Preserve
the original bytes/receipts. Offline tracing now binds server+32 to
PipelineManager and server+28 to ResourceManager. Registration binds generated
resource IDs to actual sender service names. setSink's fallback caches the
selector and fans out over associated record IDs without an avconnector filter;
its outer reply can remain false after forwarding. Successful owner association
can replay the cached selector to the supplied child. Neither reply is a
completion or hardware grant receipt; do not retry based on it.

Exact manager virtual bodies remain missing: ResourceManager offsets12/16/64/68
for record lookup/registration/association acceptance and membership, then
PipelineManager offset200 for primary selection. No matching manager provider
was found in42 parsed saved ELF32 artifacts; nine unparsed candidates are explicit
exclusions. DT_NEEDED names are not exact paths or loaded identities. The
own-session join, caller checks, SUB-before-MAIN timing and resource update/release
semantics remain unknown. The timeout leaves the mapped candidate, symbol
resolution, regular-file identity and loaded-byte equality unknown.

The [smallest concrete sequence](docs/device-tests/current-plan.md#review-only-dual-source-experiment)
is HDMI1/MAIN, HDMI2/SUB0, simultaneous independent motion, release HDMI2 while
HDMI1 continues, then release HDMI1 and confirm normal restoration. It is ready
for design review, **not runnable or authorized**; own-selector delivery/ownership evidence,
bounded implementation and recovery review remain gates. Passive code/config
cannot establish active HAL/MCU behavior, concurrent frames or hardware release.

[Own-selector contract and source-bound evidence requirements](docs/research/c1-hdmi-interface-map.md#own-sub0-selector-and-allocation-evidence-contract).
[Media executable capture](docs/device-tests/c1-journal.md#media-executable--single-bounded-inert-file-capture):
raw hash/size/EOF/metadata/closure and owner-only ACLs passed; target path private.
87 offline operational/header acceptance cases passed;18 frozen source/request
pins,43 working source pins and201 preservation pins matched. Private audit:
build/phase-2/hdmi-media-server-read-20261117-001/verification.json.
Static excerpts,16 literal and two callback bindings, SDK extraction and
preservation/ACL checks passed:
build/phase-2/hdmi-media-server-trace-20261117-001/verification.json.
Manager/record/sender/replay review:14 excerpts,22 literals, two record vtables
and two singleton imports verified;201 preservation and43 working pins matched:
build/phase-2/hdmi-media-owner-trace-20261117-001/verification.json.
The earlier243-byte capability capture and87-case acceptance remain immutable.
No0.1.12/helper/guard or TV file change; no active experiment, build, package,
commit or push. First-picture/audio/restoration remain the only physical result.
