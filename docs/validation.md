# Phase 0 host validation record

Subsequent validation is recorded in the [Phase 0 C1 results](device-tests/2026-11-10-csp-startup.md)
and [Phase 1 C1 results](device-tests/lg-c1-phase-1.md). This page records the
original host checks.

Date: 2026-11-09 UTC. No TV connection, installation or measured C1 logs.
Research claims and access limitations are recorded in
[prior-art](research/prior-art.md); the [C1 protocol](device-tests/lg-c1-phase-0.md)
is a procedure, not a result.

## Artifact status

| Artifact/check | Result | Limit |
|---|---|---|
| Native C++ inventory | Built on Linux x86-64, GCC 14.2.0 | Not an ARM TV executable |
| Native host tests | 1 CTest passes; all three inventory outcomes preserve unknown capabilities | Mock/filesystem boundary, not target libraries |
| Web probe core tests | 7 Node tests pass | Synthetic/host only |
| Schema checks | Three generated reports validate; extra fields, missing verification evidence and redaction=false are rejected | Does not certify truth of arbitrary future evidence strings |
| ES5/JSON checks | Pass via Acorn 8.15.0 and JSON parser | Syntax check, not old-TV runtime validation |
| Chromium UI smoke | Pass, mocked transport and missing-bridge fallback | No webOS runtime/simulator/hardware validation |
| Web-only IPK | Official CLI 3.2.6 packages successfully | No TV install/runtime claim |
| IPK inspection | ar/tar allowlist and source-payload checks pass | Packaging format/content only |
| Native ARM cross-build / ABI | **blocked**: no openlgtv NDK/toolchain installed | No ARM artifact or symbol verification claimed |
| Physical LG C1 | **unknown / not tested** | Phase 0C needs a human-operated report |

Local build tooling: CMake 3.31.6, Ninja 1.11.1, Node 24.22.1, Python 3.12,
jsonschema 4.23.0. CI requests Node 22/Python 3.12 on Ubuntu 24.04; local Node 24
success alone is not a CI result.

Commands executed successfully (temporary build-tool search paths omitted;
standard setup is in build.md):

```sh
npm install --no-audit --no-fund
npm run lint
npm test
cmake -S . -B build/host -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/host
ctest --test-dir build/host --output-on-failure
build/host/multiview-probe > build/reports/native.report.json
python3 tests/host/schema_test.py
npm run package
python3 scripts/verify-ipk.py dist/io.github.tpapaz.multiview.probe_0.1.0_all.ipk
git diff --check
```

Python schema commands used jsonschema from a /tmp tool directory. Node tests
cover allowlist privacy, all capabilities remaining unknown, one-shot request
parameters, cancellation/late callbacks, timeout, malformed/oversized/denied
responses, missing bridge, synchronous completion, browser-style timer receivers,
invalid metadata and independent report instances. Native code compiles with
warnings-as-errors. Host report contents are not committed as TV evidence.

The local IPK inspected after final UI changes had SHA256:

```
e85a266dafe0cedb80172b353eb733a22a4528f71ffe923e58eea1225221a351
```

A rebuild can change container timestamps/hash; source bytes are checked exactly.
The IPK is in dist/ locally and CI uploads it as an artifact. It is not a native
package, release, signed deployment or TV-tested binary.

## Rendered UI QA

Flow under test: app loads -> explicit metadata read -> redacted result; then
export/cancel/arrow navigation and report scrolling. URL:
`http://127.0.0.1:8765/`, viewport **1920x1080**, headless Chromium
**156.0.8078.79**. Browser skill was available but its browser-control tool was
not callable after tool discovery. Local Playwright was used for the authorized
host verification. File navigation was blocked by Chromium administrator policy;
a loopback HTTP server worked outside the socket-restricted command sandbox.
No browser security policy was removed. No external/TV URL was opened.

| Check | Result / observed evidence |
|---|---|
| Page identity | Intended URL and `MultiView Passive Probe` title |
| Nonblank / overlay | Heading, initial unknown report and controls visible; no framework error overlay |
| Console health | No page errors or relevant warning/error console messages in the final run |
| Metadata | Missing bridge settles unavailable; mock success shows C1 family and numeric versions only |
| Safety/privacy | Exact three-key one-shot query; fake private fields discarded; capabilities still unknown |
| Cleanup | Mock bridge cancel count one at completion; manual cancel restores controls |
| Export | Downloaded JSON matches the displayed report |
| Remote controls | Right arrow moves focus; Down enters report and scrolls; Left returns to controls |
| Layout | No horizontal overflow at TV viewport; screenshot visually inspected |

A real browser check found an `Illegal invocation` timer-receiver error that Node
alone did not expose. Timer wrappers fixed it; a regression test and the same
browser flow passed. Screenshots `/tmp/webos-probe-ui.png` and downloaded
`/tmp/webos-ui-export.report.json` are **mock host QA evidence**, not C1 results,
and are outside version control. The optional smoke script was run from
`/tmp/webos-ui-qa.py` with the installed Python Playwright and system Chromium.
No simulator, older browser, mobile viewport, real PalmServiceBridge, Magic
Remote, TV download, on-TV close/uninstall or native ARM runtime was validated.

## Proven, candidate and next test

Proven here: source-level distinction between selected-output capture, media
presentation and input-app selection; deterministic conservative report behavior;
host compilation/tests; an inspected web package.

Candidate: SMP exported windows for later native presentation on this generation.
Unverified: a C1 per-HDMI session interface, concurrent receivers/planes/scalers,
tuner/app coexistence, audio ownership and all physical-input performance.
Nothing in the bounded audit proves simultaneous HDMI impossible or supported.

The [roadmap](../ROADMAP.md#current-position) tracks the remaining device tests.
