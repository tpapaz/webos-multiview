# C1 HDMI evidence map

Updated 2026-11-13. LG OLED C1, firmware 03.53.45 / SDK 6.5.3.
[Status](../../STATUS.md) · [Current procedure](../device-tests/current-plan.md) ·
[Prototype contract](../../native/phase2-hdmi-window/README.md)

This is the current finding index. The complete
[saved investigation](archive/c1-hdmi-investigation-2026-11-12.md) retains exact
addresses, source/firmware hashes, earlier hypotheses and licensing references.
Historical next steps in that record describe their original stage.

## Findings and limits

| Question | Current conclusion | Exact evidence |
|---|---|---|
| Can the client bind HDMI to its own surface? | **Verified/static:** stock frontend exports its own window, receives its ID and passes it to UTP open before numbered-port selection. It supports building a candidate, not a working HDMI claim. | [Window acquisition trace](archive/c1-hdmi-investigation-2026-11-12.md#the-missing-client-side-connection) |
| Does a cached session supply another receiver? | **Unsupported inference:** the nonempty cache is boot-to-client adoption, not independent allocation. `NormalWindow` controls the evidenced rebinding branch; the candidate supplies it. | [Cache and close](archive/c1-hdmi-investigation-2026-11-12.md#cached-session-eligibility-and-failed-close--2026-11-12) |
| Can close success prove release? | **No:** UTP and backend bookkeeping can remove IDs after a returned backend failure. Outer acknowledgments do not prove hardware release. | [Backend failure](archive/c1-hdmi-investigation-2026-11-12.md#hdmi-backend-implementation-and-release-failure--2026-11-12) |
| What does stop do? | Saved unmodified UTP routes dispatch `stop`, with no pause alias; the saved HDMI backend registers no stop. **Unsupported by saved dispatch/registration**, with effective live overrides unknown. Close independently requests release; pause retains ownership and is not a fallback. | [Stop and resource wait](archive/c1-hdmi-investigation-2026-11-12.md#stop-routing-resolved-and-downstream-release-boundary--2026-11-12) |
| Is cleanup bounded in hardware? | **Unknown:** the resource client has an untimed wait. Client cancellation/alarms bound local work, not backend release. | [Release boundary](archive/c1-hdmi-investigation-2026-11-12.md#stop-routing-resolved-and-downstream-release-boundary--2026-11-12) |
| Is narrow admission feasible? | **Prepared/static:** additive four-method/one-app policy, no duplicate role. Parser/trust, live activation/removal and actual admission remain untested. | [Policy design](../../native/phase2-hdmi-window/policy/README.md), [saved hub trace](archive/c1-hdmi-investigation-2026-11-12.md#narrow-root-policy-and-missing-provider-files--2026-11-12) |
| Who can administer that manifest? | **Verified/static route:** stock `/usr/bin/luna-send`, own default generated identity, no `-m`/`-a`, existing core coverage for both add/remove. Live predictions can fall back to configured groups and do not prove mutation success. | [Caller and expiry](archive/c1-hdmi-investigation-2026-11-12.md#administrative-caller-and-expiring-launch--2026-11-12) |
| Can a delayed queued launch acquire later? | **Local guard implemented/tested:** same-boot ≤3-second start deadline, fixed exclusive report reservation and boot-time dispatch cutoffs. Actual launcher/jail integration remains untested. | [Expiry proof and ABI check](archive/c1-hdmi-investigation-2026-11-12.md#administrative-caller-and-expiring-launch--2026-11-12) |
| How is a stuck/lost session restored? | **Owner contingency only:** bounded client cleanup → one UI attempt → one safe true cold cycle. Usable recovery is untested; no bounded software reset is established. | [Restoration evidence](archive/c1-hdmi-investigation-2026-11-12.md#stuck-or-lost-session-restoration-decision--2026-11-12), [current procedure](../device-tests/current-plan.md#restoration-route--proposal-for-one-owner-attended-trial) |
| Can HDMI 1 and HDMI 2 advance independently? | **Unknown.** No second independent receiver/presentation path or concurrent physical-input result is established. | [Missing second-picture connection](archive/c1-hdmi-investigation-2026-11-12.md#what-remains-missing-for-a-second-independently-live-picture) |

## Evidence location

The dated investigation names exact local inventories and hashes for both UTP
providers, provider/service configuration, extinput-integration and its release
dependencies. Those owner-authorized reads are complete; no additional firmware
file is currently needed. Raw firmware/assembly and original reports remain
private under ignored `build/phase-2/`.

For upstream boundaries and attribution, use [prior art](prior-art.md),
[pinned sources](source-lock.json) and the investigation's
[licensing section](archive/c1-hdmi-investigation-2026-11-12.md#pinned-upstream-boundaries-and-licensing).
No exported symbol, compile result, local-clip playback or close acknowledgment
establishes simultaneous physical HDMI support.
