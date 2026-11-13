# Root-assisted UTP permission candidate

[Current procedure](../../../docs/device-tests/current-plan.md#scoped-admission-validation--prepared-not-executed) ·
[Evidence map](../../../docs/research/c1-hdmi-interface-map.md)

**Prepared and scope-checked locally. Not deployed, C1-parser-tested, activated,
removed or admission-tested.** These four files are a reviewable candidate,
not an installer. No policy is bundled in the application IPK.

## Exact scope

Manifest ID: `io.github.tpapaz.multiview.hdmiwindow.utp-policy`.
One non-public group: `io.github.tpapaz.multiview.hdmiwindow.utp`, granted only to
connection `io.github.tpapaz.multiview.hdmiwindow`, for four additional methods:

- `com.webos.service.utp.extinputs/open`
- `com.webos.service.utp.extinputs/switchExternalInput`
- `com.webos.service.utp.extinputs/stop`
- `com.webos.service.utp.extinputs/close`

| File | Purpose |
|---|---|
| `hdmiwindow-utp.manifest.json` | Separate manifest referencing only our three payloads. |
| `hdmiwindow-utp.api.json` | Four exact methods in our group. |
| `hdmiwindow-utp.client.json` | Our group for the exact app name only. |
| `hdmiwindow-utp.groups.json` | One description and `public:false`, no added trust metadata. |

Prospective manifest path:
`/var/luna-service2/manifests.d/io.github.tpapaz.multiview.hdmiwindow.utp-policy.json`.
Three payload references are below `/var/luna-service2/multiview-hdmi-window/`.
No LG/generated file is replaced. No role, service, inbound endpoint, wildcard,
borrowed name, broad `all`/`private` or bus administration grant is added;
app `requiredACG` stays empty. Existing public access belongs to generated policy.

Before deployment, verify generated roles bind the exact own executable
`/media/developer/apps/usr/palm/applications/io.github.tpapaz.multiview.hdmiwindow/multiview-hdmi-window`
to the app name and permit the destination. Pin ELF/manifest bytes as well as the
path. A mismatch stops validation; do not create a substitute role.
An extra role would introduce executable-key removal/merge risks without need.

Method admission cannot constrain port/window/pipeline payload ownership or
prove receiver independence and safe release. Keep the native client fixed;
no direct-backend grant or stop→pause fallback is proposed.

## Static support and limits

Saved C1 hub traces support additive required/provided groups and explicit
manifest removal. Stock `/usr/bin/luna-send` under its own default PID-derived
name has existing core coverage for both admin methods: use neither `-m` nor
`-a`, and do not substitute `luna-send-pub`. Its existing grant is not copied into
the app. Live registration, trust/parser behavior and loaded policy are untested.
Positive queries can fall back to configured groups; they do not prove active-cache
population or a later mutation. A removal acknowledgment alone does not prove
unload. Copying/moving/unlinking JSON alone does not establish effective revocation.

The current procedure owns exact payloads and baseline → overlay → removed
validation. Close the app before grant changes; finish acquisition cleanup before
revoking its methods. Stage payloads first, manifest last; explicitly unload only
our manifest, preserve/move it out of the scanned directory and verify fresh-client
revocation. No file deletion, hub signal, restart or broader fallback is proposed.
Policy removal does not restore HDMI.

## Local scope check

```powershell
npm run check:utp-policy
```

The checker rejects extra methods/groups/identities, roles/services, unowned
paths, inbound APIs and broad metadata grants. It does not emulate C1 parsing,
trust, activation/removal or UTP. Payload hashes are pinned with the package record.

Provider/backend reads and caller discovery are complete; **no extra firmware
file is currently needed**. Completed retrieval requests and exact addresses/hashes
are preserved in the [investigation](../../../docs/research/archive/c1-hdmi-investigation-2026-11-12.md#narrow-root-policy-and-missing-provider-files--2026-11-12),
[release trace](../../../docs/research/archive/c1-hdmi-investigation-2026-11-12.md#stop-routing-resolved-and-downstream-release-boundary--2026-11-12)
and [caller trace](../../../docs/research/archive/c1-hdmi-investigation-2026-11-12.md#administrative-caller-and-expiring-launch--2026-11-12).
