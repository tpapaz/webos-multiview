# C1 HDMI evidence ledger

[Current findings](c1-hdmi-interface-map.md) · [Status](../../STATUS.md) · [Procedure](../device-tests/current-plan.md) · [Actual results](../device-tests/c1-journal.md)

## How to use the evidence

This is the index to saved evidence and corrected interpretations, not an execution
queue. Reference device: LG OLED C1, firmware03.53.45. The unchanged0.1.12 result
is one short moving physical HDMI-4 picture with sound; independent HDMI1+HDMI2
remains unknown. Research addresses, resource IDs, planeIDs and register maps must
not become hardcoded cross-model application constants.

The research map owns source-bound mechanisms and exact addresses. The journal
owns actual TV outcomes, collection byte/timing counts and original hashes. The
current plan owns only the current scope and operational bounds. Status owns the
single next task. Older future-task prose and consumed one-off grants do not
override those documents or standing bounded read-only permission.

All paths below are local under ignored build/phase-2 unless otherwise stated.
Keep raw/inventory/authority, failed attempts, frozen sources and immutable
verification receipts. Do not edit them to agree with a later interpretation;
record a correction separately and use the indicated final findings.

## Collected inputs and actual outcomes

| Saved scope | Local evidence / receipt | Outcome and current relevance |
|---|---|---|
| Working physical/lifecycle control | build/reports/picture-0.1.12-20261115-001/ and build/reports/lifecycle-0.1.12-20261115-003/; frozen as-used inputs in matching phase-2 trial slots | [Actual motion/sound/termination/restoration](../device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound). Hardware release, numeric exit/alarm cause, stability and independent audio remain unknown. |
| SSH TOFU pin | hdmi-host-key-tofu-20261115-001/inventory.json; host-key preparation receipts remain unchanged | [One pre-auth observation](../device-tests/c1-journal.md#tofu-host-key-check--single-pre-auth-observation), not independently verified identity. Existing endpoint and pin must match; no automatic new-key trust or scan. |
| Element list and HDMI/sink plugins | hdmi-element-plugin-evidence-20261115-001/; hdmi-element-plugin-run-20261115-001/ | [Three inert files](../device-tests/c1-journal.md#three-file-element-evidence--bounded-collection-complete), completed/closed. /etc/extinput/elementList.json and the two exact plugin seeds; links resolved within the prepared namespace. |
| Resource-client library | hdmi-resource-client-evidence-20261116-001/; hdmi-resource-client-run-20261116-001/ | [Library read](../device-tests/c1-journal.md#resource-client-evidence--bounded-single-file-collection-complete), completed/closed. Private command delivery and generic presentation allocation. |
| UMS connector dependencies | hdmi-ums-connector-evidence-20261116-001/ and hdmi-ums-connector-impl-evidence-20261116-001/ | [Bounded dependency reads](../device-tests/c1-journal.md#ums-connector-evidence--bounded-dependency-reads), completed/closed. |
| TVRM and legacy backend | hdmi-tvrm-allocator-evidence-20261116-001/, hdmi-tvrm-backend-evidence-20261116-001/, hdmi-tvrm-legacy-service-evidence-20261116-001/ | [Discovery and exact bodies](../device-tests/c1-journal.md#tvrm-allocator-evidence--bounded-read-only-discovery). The originally named registration was absent; saved legacy registration and executable grounded the analysis. Alias equivalence/active ATSC-DVB variant remain unknown. |
| Qualified configuration replies | hdmi-tvrm-provider-trace-20261116-001/ | [Passive configuration](../device-tests/c1-journal.md#vhdmirx-configuration--passive-qualified-key-reads): vhdmirx2/ahdmirx2 and videoIndex3; requested input map missing. These are configuration, not measured free/independent receivers. |
| HDMI node/sysfs and kernel | hdmi-hdmi20-owner-trace-20261117-001/ and hdmi-kernel-image-evidence-20261117-001/ | [Actual scopes and timeout history](../device-tests/c1-journal.md#video12-driver--bounded-sysfs-metadata). video12 character81:9, hdmi20_v4l2; inert compressed Image and derived Image preserved. Full running-kernel identity remains unknown. |
| Video-output descriptor/executable | hdmi-videooutput-evidence-20261117-001/; hdmi-videooutput-run-20261117-001/ | [Two-file read](../device-tests/c1-journal.md#video-output-service--bounded-two-file-collection): exact Name/Exec binding before the executable open; completed/closed. |
| VAL provider library | hdmi-val-library-evidence-20261117-001/val-starfish.elf; hdmi-val-library-run-20261117-001/ | [Single library read](../device-tests/c1-journal.md#val-library--bounded-single-file-collection): SONAME libval-starfish.so.1; completed/closed. No vendor execution or active-loaded identity proof. |
| VAL capability JSON | hdmi-val-capability-evidence-20261117-001/{device-cap,inventory}.json; hdmi-val-capability-run-20261117-001/verification.json; original request/preparation unchanged | [One completed exact-path read](../device-tests/c1-journal.md#val-capability-json--bounded-single-file-collection):243 bytes, stable metadata/EOF/hash and confirmed closure. Original/sorted unique names [MAIN,SUB0] derive ordinals0/1 for the saved provider; active-loaded configuration remains unknown.87 offline cases passed. |
| Media server descriptor candidate | hdmi-media-service-evidence-20261117-001/inventory.json; hdmi-own-sub-contract-20261117-001/descriptor-read-003/{preparation,acceptance-final,authority,result}.json | [Exact file absent](../device-tests/c1-journal.md#media-server-descriptor--bounded-absent-file-result): one closed read-only connection, zero content opens/reads. The OSE-style basename did not ground a retail executable. No alternate lookup/retry or service call followed.61 synthetic acceptance cases passed. |
| Media executable identity | hdmi-media-identity-evidence-20261117-001/{stdout.bin,stderr.bin,inventory.json}; hdmi-media-identity-read-20261117-001/verification.json | [One completed fixed pidof/readlink lookup](../device-tests/c1-journal.md#media-executable-identity--single-bounded-lookup):23 stdout bytes, zero stderr, exit0; pin/endpoint and closure passed. Exact observed candidate kept private; no target-file bytes/metadata or loaded identity.74 offline cases passed. |
| Observed media executable | hdmi-media-server-evidence-20261117-001/{media-server.elf,inventory.json,local-identity.json}; hdmi-media-server-read-20261117-001/verification.json | [One completed inert-file capture](../device-tests/c1-journal.md#media-executable--single-bounded-inert-file-capture):529,960 bytes, ten reads including EOF,12 stable metadata checks and confirmed closure. Separate header inspection: ARM32 little-endian ET_DYN; full ELF/ABI, active loaded bytes and service ownership remain unknown.87 offline cases passed. |

Original scopes/JSON contracts retain their as-prepared status. Completed readers
keep their exact allowlists and bounds. Current helper/control hash chains still
use earlier collector modules; those modules are dependencies, even after their
individual reads completed. Their acceptance tests remain useful guard tests.

## Offline trace receipts

The current source/hash/address tables are in the corresponding research-map
sections. These roots retain full SDK assembly, selected excerpts, literals,
relocations, reviewed findings and source/preservation checks.

| Trace root | Knowledge to retain |
|---|---|
| hdmi-second-path-offline-20261115-001/ | Logical open versus boot-cache adoption; registry/load, shared elements and asynchronous release boundaries. |
| hdmi-element-binding-offline-20261115-001/ | Factory/loader and PI_PORT/PI_PRIDX separation;201 preservation pins,50 analysis files,43 working source pins. |
| hdmi-plugin-trace-offline-20261116-001/ | H/K initialized names and constructors; k→driver k+1 versus sink sourcePort k; distinct source/sink grants. |
| hdmi-sub-selector-offline-20261116-001/ | Type4/SUB0 callback/resource path and video/audio request-field provenance. |
| hdmi-resource-client-trace-20261116-001/ | Command send/reply/callback endpoint, owner/context propagation and allocation JSON. |
| hdmi-tvrm-receiver-trace-20261116-001/ | TVRM masks, grant packing, exact enum/type tables and legacy registration. |
| hdmi-tvrm-central-trace-20261116-002/ | Central-RM helper0x4598c completion and VHDMIRX mask reconciliation. Empty001 is an earlier ACL refusal, not the completed trace. |
| hdmi-tvrm-provider-trace-20261116-001/ | Non-fixed local VHDMIRX allocator and count2 configuration; no grant-to-owned-receiver binding. |
| hdmi-hdmi20-owner-trace-20261117-001/ | Actual HDMI kernel callbacks, per-port flags, shared readback and non-owner-bound release. Derived kernel.Image and recovered symbols are analysis inputs, not caches. |
| hdmi-mainthread-trace-offline-20261117-001/ | Activation consumer, configured port loop and per-port PHY/timing processing. |
| hdmi-chip-link-banks-offline-20261117-001/ | Packed chip-table stores and non-overlapping port0/1 LINK intervals in compiled branches. |
| hdmi-vsc-binding-offline-20261117-001/ | VSC controls, node-derived window index, cached-source behavior, DE/HAL/MCU path. Apply the CSEL correction below. |
| hdmi-av-output-bridge-offline-20261117-001/ | Sink-only normalization and videooutput request delivery. Use normalization-followup.json and followup-verification.json for the return-path correction. |
| hdmi-videooutput-handler-offline-20261117-001/ | HDMI descriptor, ordinal sink table, LS2 sender/context bookkeeping, replacement and release. Use raw/findings-final.json. |
| hdmi-val-provider-offline-20261117-001/ | Constructor/vtable-bound VAL→VSC mapping, sorted plane names, cache/occupancy/disconnect/close. Use raw/findings-final.json. |
| hdmi-val-capability-run-20261117-001/ |16 frozen as-used source/test/helper files, immutable preparation bindings, one dispatch/result, closed-byte interpretation and201 preservation/585 prior trace pin verification. Rechecked G factory reuse by type+grant selector without port/window/sink comparison; full saved bodies remain unchanged. |
| hdmi-own-sub-contract-20261117-001/ | selector-findings.json and18 saved-byte excerpts pin the70-byte nested-string candidate body, empty audio/video clear hazard, success-only reconnection return and first-parent retention under element sharing. Pinned Apache-2.0 OSE source is a differing counterpart, not retail proof. identity-request.json retains its immutable as-prepared status; its completed execution is recorded separately below. |
| hdmi-media-identity-read-20261117-001/ | Fixed identity reader/dispatcher,74-case synthetic acceptance including stubbed Git Bash,11 frozen as-used pins and closed raw/closure/ACL/preservation verification. executable-request.json retains its as-prepared status; completed inert capture is recorded separately. |
| hdmi-media-server-read-20261117-001/ | Hash-bound observed-path reader, exact recorded derivation from the validated raw core,87 operational/header acceptance cases,18 frozen pins and separate closed-byte header/verification records. Final cleanup elapsed check prevents late acceptance. Original prototype/helper/trust/preservation pins remain exact. |
| hdmi-media-server-trace-20261117-001/ | M=media-server.elf SHA2561f3a45553139881e2ca978352ae0c87e8654b571b0d439af131b5e2fa82c2d4e. findings.json/reviewed/ and verification.json bind SDK extraction,16 literals and two callbacks. Constructor setSink0x25c56→thunk0x68360→handler0x48c38; trackResourcesStatus0x26778→0x68528→0x5c404. Own-record/vtable selection, active policy, ordering and resource updates remain unresolved. Zero TV connections/calls; REA evidence exported and target cleared. |
| hdmi-media-owner-trace-20261117-001/ | Same M hash; inventory/findings/verification and14 excerpts bind22 literals, two record vtables and two singleton imports. Constructor0x24212–0x24220 binds RM/PM; typed node layout0x67514 and register0x55398/0x556ee bind resource ID to actual sender. setSink fans out associated IDs and may return false after sending; successful owner association replays cached selection0x4ba04. Exact manager methods/membership checks remain missing.51 indexed candidates,42 ELF32 parsed, nine unparsed; no matching manager definitions/SONAME in parsed set. Zero TV calls;201 preservation/43 working pins matched. |
| hdmi-resource-provider-lookup-20261117-001/ | Immutable preparation for the spent lookup. request.json SHA25693b0270ec4ef26e6069ec673720b0bc33d42604151b2a266b7cfe1c97131cd7d; fixed fresh-PID/exe/stat/maps command, raw reader and separate closed-byte interpreter.109 offline cases include19 exact command runs with synthetic Git Bash fixtures;26 frozen pins, private ACLs and201 preservation/43 working pins passed at preparation. |
| hdmi-resource-provider-evidence-20261117-001/ | **Spent.** One SSH connection attempt reached the connect timeout. The saved receipt confirms SSH closure without forced teardown. Zero exec channels, SFTP subsystems, output bytes or retries. No provider path or file read. [Actual outcome and hashes](../device-tests/c1-journal.md#resourcemanager-mapping-lookup--connect-timeout). |

REA identified artifacts/exports where available. Deep native providers were
unavailable; detailed instruction claims use saved ELF/Image bytes and existing
WSL SDK tools. No downloaded analysis package or vendor loading/execution is
part of those claims. ELF virtual addresses with cleared Thumb bits differ from
ARM64 decompressed Image **file offsets**, runtime addresses and physical registers.

## Corrections that supersede preliminary interpretations

| Earlier interpretation | Durable conclusion and exact evidence |
|---|---|
| Factory resource index equals HDMI jack | PI_PORT and PI_PRIDX are separate grant metadata. Physical k comes from the model input map; videoIndex3 selects a map rather than receiver3. See [factory mapping](c1-hdmi-interface-map.md#element-factory-and-portsink-mapping). |
| Uninitialized .bss plugin names are unknowable | Saved initializer instructions/relocations establish video-hdmi/video-sink1.0.0 without dlopen. See [plugin initializers](c1-hdmi-interface-map.md#plugin-initializers-port-indices-and-presentation-selection). |
| HDMI disconnect is S_EXT_CTRLS or no-op | H0x33848–0x3386c sends VIDIOC_S_CTRL0xc008561c, ID0x0098590c, stored port. Kernel flags clear by port, not owning file; close does not establish receiver deactivation. |
| VSC S_INPUT selects a source | Saved VSC S_INPUT/G_INPUT are logging stubs. CONNECT_INFO0x0098290c carries the12-byte source/port/route payload. |
| Route value2 substitutes the node index | **Reversed condition corrected:** Image0x66a03c word0x1a801280 is CSEL w0,w20,w0,NE: field!=2 selects nodeWindow; field2 keeps2. Normal VAL mode0→field1 therefore follows node routes0/1. Original report/bytes remain immutable. |
| Connector normalization nonzero means error | Both return paths send the normal connect request; nonzero takes a debug-log branch. Normalization rewrites only sink, preserving sourcePort. |
| videooutput client+64 is sink | It stores source; sink is client+40. Use the handler's raw/findings-final.json; the original reviewed note is preserved. |
| Already-connected VAL returns false | r5 retains isSinkConnected=true and returns success via0x1e8b8, without port comparison/control/output-plane write. Use VAL raw/findings-final.json. |
| Dual mode/plane IDs/cached state prove concurrency | setDualVideo0x1b880 is a success-only stub;44/45 are preassigned presentation IDs. Occupancy/source caches and even lower-error cache updates prove no independently owned receiver or hardware release. |

## Current conclusions and remaining gates

1. **Verified:** one moving physical HDMI-4 picture, audible sound and observed
   lifecycle/restoration in unchanged0.1.12. No repeat setup campaign is needed.
2. **Verified static:** port metadata, logical allocations and separately addressed
   main/aux presentation routes exist in saved code. They are different layers.
3. **Candidate:** two independently eligible HDMI receiver/sink pairs might exist.
   Count2, non-fixed logical grants, distinct LINK ranges and VSC nodes support
   investigation; none establishes concurrent frames or ownership isolation.
4. **Verified on disk / candidate loaded mapping:** MAIN/SUB0 names, sorted
   ordinals0/1, saved-provider video30/31 and software planeIDs44/45. **Unknown:**
   active-loaded config/provider/kernel/HAL/MCU path, receiver eligibility,
   safe sibling release, audio and sustained stability.
5. **Unsupported inference:** two windows, permission predictions, metadata,
   exports, successful setters or cache readback establish two live inputs.
6. **Unsafe_to_test under passive scope:** acquisition/selector/allocation calls,
   forced capture, policy/firmware changes, vendor initialization and service/power
   recovery. Future active acceptance requires both independent sources advancing
   together, isolated release and normal restoration under a separately reviewed plan.

The [review-only sequence](../device-tests/current-plan.md#review-only-dual-source-experiment)
is now concrete. No runnable dual candidate or active trial is prepared. The
grammar and allocation/reuse evidence contract are source-bound. The remaining
gate is evidenced own-session target/delivery plus runtime grants and cleanup
observability. A separate executable-identity lookup completed after the candidate
descriptor was absent, followed by one completed inert capture bound to its
observed private target. The first static pass binds setSink's mediaId/avSink
wrapper and selected-record privateCommand fallback, plus trackResourcesStatus's
subscriber/observer side effects. Acknowledgement supplies no grant evidence.
The next pass resolved those virtual calls to PM offset200 and RM offset12,
registration's sender binding and cached selector replay. Exact target functions
and association/membership checks remain external; neither a true owner reply
nor a false selector reply establishes delivery/no-action. The mapping lookup
is spent after its connect timeout. The saved timing trace verified an interval
for selection before render-ready. Replay completion before the first scaler
request, exact child ownership and actual hardware behavior remain unknown.
Private byte-verification receipt: `hdmi-sub0-timing-offline-20261117-001/verification.json`.
[Timing trace and evidence](c1-hdmi-interface-map.md#sub0-selection-before-the-first-main-connection).
Do not repeat file/identity/capability/lifecycle work.
Static/configuration evidence cannot settle independent advancing frames. The
[five-path assessment](c1-hdmi-interface-map.md#captured-capabilities-and-ownership-discriminator)
records supporting/contradicting evidence, discriminators, stop conditions and effort.

The production IPK does not need a TV SSH host key. SSH pins/credentials belong
to development evidence/deployment transport on the host; the TV app uses its
reviewed local interfaces. Never embed SSH credentials or vendor libraries in it.
