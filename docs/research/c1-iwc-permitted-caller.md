# C1 permitted IWC caller research

> Research/tool record. [Current status](../../STATUS.md) · [Documentation index](../README.md). Earlier next steps and untested labels describe that stage; use Status and later device records for current results.

2026-11-12; reference LG OLED C1, firmware 03.53.45, SDK 6.5.3.
**Read-only research.** No app relaunch, utility execution, Luna call, permission
edit, install, geometry or crop experiment. Normal app admission remains denied
at the first policy query; actual IWC listing remains untested.

Plan: reuse run 002 and its policy explanation; follow installed manifest
references to existing legitimate diagnostic callers; verify the chosen
utility's default identity offline; distinguish a privileged diagnostic path
from a future standalone application's permissions.

## Finding

**Verified installed declarations:** the stock `/usr/bin/luna-send` has its own
privileged executable-bound role. The installed client-permission map grants
`all` to `com.webos.lunasend-*`. This intersects the installed API rule
`all: ["*/*"]` for `com.webos.service.iwc/listPublishedWindows`.
No app role or permission change is needed to use that existing diagnostic
utility as intended under the owner's root shell.

**Verified static utility behavior:** the copied C1 ELF constructs its own
default name from `com.webos.lunasend` and a process suffix, then calls
`LSRegister`. It is not necessary to supply an overridden service name, app ID
or borrowed system-app identity. Do not register our app/helper under the
utility's name: the permitted path means executing the actual installed tool
under its existing role, not copying its name into our runner.

**Candidate, not TV-tested:** a bounded, owner-operated, one-shot read through
that exact utility is an evidenced permitted diagnostic path. Loaded grants,
actual IWC read admission and reply semantics remain device gates. This does
not grant the normal application access or establish a deployable helper.

## Evidence

Saved evidence was used first: run 002's report and binding, the C1 hub trace,
the API/group explanation, and the installed `luna-service2.manifest.json`
references in `build/phase-2/admission-permission-20261112/`.

Missing referenced files were retrieved using fixed-path SFTP only (six JSON
files, 17,417 bytes total; 64 KiB per-file and 30-second bounds). The utility
was separately copied with a 1 MiB/30-second cap, never executed. Files and
inventories are ignored under `build/phase-2/iwc-permitted-caller-20261112/`.

| Installed artifact | Finding | SHA-256 |
|---|---|---|
| `roles.d/com.webos.lunasend.role.json` | `/usr/bin/luna-send`, privileged, allowed names/outbound `*` | `e0489f583726ef458f38692fc325de79d5b2cc073335c060c128f403b2d41e24` |
| `client-permissions.d/luna-service2.perm.json` | `com.webos.lunasend-*` → `all`; monitor pattern → `luna.internal`; general wildcard → `luna.internal.public` | `89216942a6282d18a9ac54bfb2ac3df69b4e92ffad4641e993ae3357dc1ad555` |
| `roles.d/com.webos.lunasendpub.role.json` | `/usr/bin/luna-send-pub`, devmode role; no matching explicit `all` grant in the above client map | `5220d44c828e152c3904ea01977055ca7a1a6eb3f46dae9f9fc0a0e398bb4c8f` |
| `groups.d/all.groups.json` | `all` describes global service access; `public: false` | `a862c30388dddea94d03c87c1ed2e05bbd104a575bc3b3ba1d5fbbe07725f7d9` |
| `groups.d/luna-service2.groups.json` | `all` has OEM trust metadata | `63c1bb60eaccbfe713a5b1c6631e6503961f231730e6487363e3c5c0ff5025ff` |
| `/usr/bin/luna-send` | 17,864 bytes; observed mode `0700` | `b9b25626a9d7295cfcaca45052555952dd9113707a45893b4b35c27497d9c2af` |

Policy paths in the table are under `/usr/share/luna-service2/`. Exact paths,
byte lengths and remaining monitor-role hash are in `inventory.json`.
The saved manifest points to these roles and client map; its hash is
`5ac7122335778a2f0a310401a3e2d13c269aeccd71821e85897fe248439509f1`.

Local SDK `objdump -dC -M force-thumb` against the saved utility identifies:

- `0x1a74–0x1a78`: absent explicit service name branches to default generation.
- `0x1b2c`: `getpid`; `0x1b3c`: `g_strdup_printf`; branch returns to registration.
- Literal calculations resolve name at `0x280c` (`com.webos.lunasend`) and format
  at `0x2c60` (`%s-%d`). `static-findings.json` records the checked offsets.
- `0x1a88`: `LSRegister`; `0x1a96`: GLib attachment.
- `0x191c–0x1938`: numeric timeout setup ending in `g_timeout_add`.

LG's Apache-2.0 upstream source at commit
`5bc38aa348b35f5799f1bf9ed7c6cb513bc5f702`,
[`luna-send.cpp:403–419`](https://github.com/webosose/luna-service2/blob/5bc38aa348b35f5799f1bf9ed7c6cb513bc5f702/src/luna-send/luna-send.cpp#L403-L419),
independently describes automatic identity and registration. Its
[`-w` handler](https://github.com/webosose/luna-service2/blob/5bc38aa348b35f5799f1bf9ed7c6cb513bc5f702/src/luna-send/luna-send.cpp#L384-L386)
and [LG usage guide](https://www.webosose.org/docs/tools/commands/luna-send/)
document timeout milliseconds and reply-count options. This is contextual
upstream evidence, not an assertion of identical retail source. No upstream
implementation was copied.

## Paths assessed

| Path | Status and boundary |
|---|---|
| Current named-public app, 0.1.2 | **Denied** in run 002's policy prediction; actual list not sent. |
| Change SDK registration function or private/public flag | **Unknown** as a remedy; no evidence that this supplies a missing configured group. Do not retry blindly. |
| Declare/request `all` in app metadata | Not a justified public-app solution. Installed metadata marks it non-public/OEM; no permission change is authorized. |
| Stock `luna-send-pub` | No equivalent explicit `all` grant in examined map; not selected as an alternative. |
| Stock `ls-monitor` | Monitor/internal grants do not establish an ordinary IWC caller; not selected. |
| Actual stock `luna-send` in owner-operated root context | **Verified configured route; candidate runtime admission.** Use its own automatic name only. |
| Dedicated repository-owned privileged helper | **Unimplemented/unknown.** Executing an arbitrary new binary as root is not proof of its own executable-bound LS2 role/grants. Review separately if needed. |

The utility is broad and privileged. This research supports a narrowly bounded
diagnostic invocation, not embedding an arbitrary-command or privileged Luna
proxy in the app. No legitimate public-app IWC path has been found within the
examined SDK/policy evidence; this is not a proof that none exists elsewhere.

## Next gate, specification only

Prepare a host collector around the existing stock utility before seeking a
new device read. Do not execute it during this research task. Proposed contract:

1. Verify the installed utility hash/mode and current referenced policy hashes.
   Preserve run 002 and its app denial; no installation or app relaunch needed.
2. Allow exactly one fixed `listPublishedWindows` destination with
   `{"subscribe":false}`. Use default utility identity; no `-m`, `-a`, proxy,
   interactive/repeating mode, setters or arbitrary command/URI parameters.
3. One reply (`-n 1`), utility timeout (`-w 2000`), eight-second external process
   deadline including SSH/cleanup. A utility timeout/zero exit code alone must
   never pass: require a complete, valid reply and confirmed utility exit.
4. Bound stdout at 32 KiB, publications at 64; parse/redact in memory. Retain
   only fixed status, policy/binary bindings, counts and cleanup/exit evidence.
   Do not print/store raw replies, publication/window IDs or arbitrary errors.
5. IWC may be dynamically activated by listing. Record that possibility before
   the future read; do not switch/reopen an input or create publications.
6. Label any success **root diagnostic IWC read admission**. It cannot pass
   normal-app admission, prove geometry permission/application, establish a
   target/full-view baseline or demonstrate simultaneous HDMI.

Checks completed locally: static identity literal/registration assertions,
offline role/name/group/API-pattern intersection, `git diff --check`. No host
application test, build, package, simulator test or TV service experiment was
needed. The utility was only copied for offline inspection. Next work is the
small fixed read collector and its local acceptance cases; device execution
requires a later owner instruction.

Follow-up: the [fixed host collector](c1-iwc-diagnostic-collector.md) is now
implemented and locally tested against simulated SSH/SFTP and saved pins.
No connection or device invocation occurred. Its explicit execution form is
reserved for a later owner-authorized diagnostic read; no app rebuild/install
or permission changes are required by this collector.
