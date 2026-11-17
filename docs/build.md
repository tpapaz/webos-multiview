# Build and validate the current prototype

[Status](../STATUS.md) · [Contract](../native/phase2-hdmi-candidate-0.1.12/README.md) · [Layout](repository-layout.md)

## Offline host checks

From the repository root in PowerShell:

~~~powershell
npm test
npm run lint
npm run test:controls
node tests/host/hdmi-element-collector.test.cjs
node scripts/collect-hdmi-elements.cjs --plan
node tests/host/hdmi-host-key-check.test.cjs
node scripts/check-hdmi-host-key.cjs --plan
node tests/host/resource-client-collector.test.cjs
node scripts/collect-resource-client.cjs --plan
node tests/host/videooutput-collector.test.cjs
node scripts/collect-videooutput.cjs --plan
node tests/host/val-library-reader.test.cjs
node scripts/collect-val-library.cjs --plan
node tests/host/val-capability-reader.test.cjs
node scripts/collect-val-capability.cjs --plan
~~~

npm test exercises the current schema2 report/witness, evidence gate, shared
controller/IO, native launch-authority rules, runner/foreground orchestration,
registration role and exact UTP coverage. It uses synthetic transports; it never
loads a TV profile. Optional controls cover the retained passive/local-media code.
The separate element-collector suite uses synthetic SFTP and fake transport inputs;
its real local capture check verifies owner-only Windows ACLs through PowerShell 7.
Run it in normal native Windows user context: a sandbox that prevents those ACLs
causes a fail-closed refusal. The collector plan checks local pins only. Neither
command authorizes or makes a TV connection. [Collector bounds and readiness](research/c1-hdmi-evidence-ledger.md#collected-inputs-and-actual-outcomes).
The host-key suite adds synthetic acceptance and a temporary loopback-only SSH
server, closed afterward. It proves the installed client rejects the observed
key before authentication; it reads no real profile/key. The TOFU plan is also
offline. [Host-key check contract](device-tests/c1-journal.md#tofu-host-key-check--single-pre-auth-observation).

The resource-client suite uses synthetic SSH/SFTP and injected profile/key fixtures;
it never reads a real profile or private key. Run it in native Windows user context
for the owner-only directory/raw-file/inventory ACL acceptance. Its plan verifies
only saved request/trust-receipt hashes and working-control pins, with no transport
import or endpoint lookup. [One-candidate bounds and completed collection](device-tests/c1-journal.md#resource-client-evidence--bounded-single-file-collection-complete).

The video-output suite adds the exact descriptor-before-executable rule, inert
Name/Exec binding, fixed zero-link paths, aggregate bounds, metadata/EOF/ELF
checks, deadline/cancellation/late-callback behavior and private Windows outputs.
It blocks real transport imports and profile/key reads. Use native Windows context
for ACL acceptance. Its --plan command checks saved request/trust/control pins
locally, with no endpoint lookup or connection. [Completed two-file outcome](device-tests/c1-journal.md#video-output-service--bounded-two-file-collection).

The VAL-reader suite covers its fixed single-file candidate, exact two-link
namespace, mutation/refusal/byte/read/time bounds, ELF-header check, cancellation,
late callbacks and confirmed cleanup. It blocks real transport and profile/key
access, and uses native Windows context for private-output ACL acceptance.
Its --plan binds only the immutable local request/trust/control pins. Neither
command connects to the TV. [Completed VAL outcome](device-tests/c1-journal.md#val-library--bounded-single-file-collection).

The capability-reader suite validates the fixed64 KiB/two-read/zero-link scope,
metadata, strict local JSON/plane interpretation and shared cleanup deadline with
synthetic transport only. It blocks real profiles/keys and transport imports;
native Windows context is required for private-output ACL acceptance. Its --plan
checks saved request/control/evidence pins locally. No TV connection or ELF/IPK
build is needed for this reader. [Completed read and exact scope](device-tests/current-plan.md#completed-capability-file-read).

Native acceptance requires CMake/Ninja, json-c and GLib in the existing Ubuntu
WSL environment. Use fresh output directories for the entry/trace/witness and
adapter/core acceptance projects:

~~~powershell
wsl -d Ubuntu --exec cmake -S /mnt/d/Development/webos-multiview/native/phase2-hdmi-candidate-0.1.12 -B /mnt/d/Development/webos-multiview/build/check-prototype -G Ninja -DCMAKE_BUILD_TYPE=Debug
wsl -d Ubuntu --exec cmake --build /mnt/d/Development/webos-multiview/build/check-prototype
wsl -d Ubuntu --exec ctest --test-dir /mnt/d/Development/webos-multiview/build/check-prototype --output-on-failure
wsl -d Ubuntu --exec cmake -S /mnt/d/Development/webos-multiview/native/phase2-hdmi-dispatch -B /mnt/d/Development/webos-multiview/build/check-adapter -G Ninja -DCMAKE_BUILD_TYPE=Debug
wsl -d Ubuntu --exec cmake --build /mnt/d/Development/webos-multiview/build/check-adapter
wsl -d Ubuntu --exec ctest --test-dir /mnt/d/Development/webos-multiview/build/check-adapter --output-on-failure
~~~

If json-c headers are not on the host search path, supply
-DJSON_C_INCLUDE_DIR=<existing-json-c-include-directory>. The current workspace
retains its validated header input at
build/phase-2/entry-diagnostic-host-0.1.11/include. That is a local dependency,
not another installed app. Do not delete all build evidence as a cache cleanup.

## ARM build and saved ABI inputs

The existing extracted SDK is
/home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot.
Use its share/buildroot/toolchainfile.cmake with the current candidate CMake
project in a fresh build directory. Retail C1 uses ARM32 soft-float and
/lib/ld-linux.so.3. Supply the retained C1 LS2/json-c/rt/pthread libraries used
by the existing build rather than inventing or downloading replacement providers.
The sources must not bundle those firmware libraries.

The current ELF is already built and direct-ABI checked:118 imports/10 exact
saved providers,112,020 bytes. scripts/verify-hdmi-window-abi.py checks a specified
local ELF using retained provider inventories. Native/ASan/UBSan acceptance and
the one actual lifecycle/physical TV result are recorded with the artifact;
build success alone never establishes firmware runtime behavior or dual HDMI.
ThreadSanitizer could not start in the tested host environment; no pass is claimed.

## Current package and immutable records

IPK: dist/io.github.tpapaz.multiview.hdmiwindow_0.1.12_arm.ipk,51,124 bytes,
SHA256 cb7ec17381a23526299545300f5437c3d1fbeb12e45f1466adc05a71ec829e4f.
Build/package/ABI records: build/phase-2/physical-candidate-0.1.12/.
[Actual picture result](device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound).

The build record retains its build-time archiveVerified false fact. The separate
package-validation.json binds its exact hash, ELF, manifest/version/schema and
IPK bytes. Later TV outcomes remain separate immutable captures. Do not rewrite
old receipts to make cleanup or a later device result appear to have happened
at build time.

The pinned validate-physical-candidate.py and package-physical-candidate.py are
as-built one-shot recipes. Their occupied outputs are preserved, and their old
preservation inputs include retired controls/IPKs. They are retained as current
artifact provenance, not rerunnable commands for the consolidated tree. A future
native revision needs a fresh version/output contract. No package is built here.

## Safe local plan and device execution

~~~powershell
node scripts/run-physical-candidate.cjs --plan
~~~

This hashes local sources/package and reports the plan without loading the TV
adapter. Live flags are owned by the prototype contract and require explicit
owner scope. Retain normal PowerShell foreground execution, prompt owner timer
cue and scheduled bounded collection. No dev server, GitHub Actions, automatic
commit/push, TV connection or install is part of any offline check.
