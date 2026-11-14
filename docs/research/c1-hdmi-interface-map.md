# C1 HDMI evidence map

Updated 2026-11-14. LG OLED C1, firmware 03.53.45 / SDK 6.5.3.
[Status](../../STATUS.md) · [Current procedure](../device-tests/current-plan.md) ·
[Candidate contract](../../native/phase2-hdmi-window/README.md)

This page owns the consolidated technical conclusions. Exact static traces and
superseded hypotheses are in the [2026-11-12 investigation](archive/c1-hdmi-investigation-2026-11-12.md)
and [2026-11-14 admission investigation](archive/c1-hdmi-admission-2026-11-14.md).
Actual TV outcomes belong in the [journal](../device-tests/c1-journal.md).

## Findings and limits

| Question | Supported conclusion | Evidence |
|---|---|---|
| How can HDMI reach our window? | **Verified/static:** stock frontend exports its own window, receives its ID and passes it into UTP open before port selection. This supports the candidate, not a working picture claim. | [Acquisition trace](archive/c1-hdmi-investigation-2026-11-12.md#the-missing-client-side-connection). |
| What is the fixed candidate? | **Built/installed:** 0.1.4 uses a transparent/type-2 own export, `NormalWindow`, HDMI 4 and fixed geometry. No runtime acquisition yet. | [Client contract](../../native/phase2-hdmi-window/README.md#fixed-client-contract). |
| Does a cached session allocate another receiver? | **Unsupported inference:** the nonempty cache supports boot-to-client adoption; `NormalWindow` selects the evidenced rebinding branch. It does not establish independent allocation. | [Allocation/cache trace](archive/c1-hdmi-investigation-2026-11-12.md#cached-session-eligibility-and-failed-close--2026-11-12). |
| Is narrow permission coverage established? | **Verified maps:** latest activation from the held manifest changes fresh denied maps to exactly `[1,1,1,1]`, only our own group/app/four methods. Actual live-caller UTP admission remains **unknown**. | [TV result](../device-tests/c1-journal.md#014-narrow-permission-activation-and-coverage-verified), [scope/checker](../../native/phase2-hdmi-window/policy/README.md). |
| Did the old native allowed predictions prove a grant? | **No.** Saved hub code has empty-data allow branches; later nonempty maps predicted denial. The original runtime branch/cause remains **unknown** and its failed acceptance is unchanged. | [Branch trace and limits](archive/c1-hdmi-admission-2026-11-14.md#why-the-all-allowed-baseline-does-not-establish-a-grant). |
| Are installed modes still a blocker? | **No at latest capture:** exact 0.1.4 contents/owners and ELF0755/appinfo0644 pass. Skip correction. Historical 0.1.3 mode-change cause remains **unknown**. | [Readback](../device-tests/c1-journal.md#014-installed-files-and-modes-verified). |
| Does close success prove hardware release? | **No:** UTP/backend bookkeeping can remove IDs after a returned backend failure. The report retains release **unknown** even with acknowledgments/local cleanup. | [Backend trace](archive/c1-hdmi-investigation-2026-11-12.md#hdmi-backend-implementation-and-release-failure--2026-11-12). |
| Is stop supported and release bounded? | Saved UTP routes dispatch `stop`; saved HDMI backend registers no stop and no pause alias. Effective live overrides are **unknown**. Resource release has an untimed wait; client deadlines do not bound it. | [Routing/resource trace](archive/c1-hdmi-investigation-2026-11-12.md#stop-routing-resolved-and-downstream-release-boundary--2026-11-12). |
| What happened to the earlier policy removal? | One dispatch lost transport; receipt/execution/cause remain **unknown**. Later denied maps independently proved rollback. Latest authorized activation has loaded the grant again; no retry of removal is queued. | [Detailed device history](../device-tests/archive/c1-hdmi-preparation-2026-11-14.md#narrow-utp-activation-and-interrupted-rollback). |
| How is a lost session restored? | **Candidate owner contingency only:** bounded client cleanup and one UI attempt. No proven bounded software reset. Power recovery is separately scoped, never a routine diagnostic. | [Current stop rules](../device-tests/current-plan.md#restoration-and-stop-rules). |
| Can HDMI 1 and HDMI 2 advance independently? | **Unknown.** No concurrent physical-input result or independent second allocation/presentation path is established. | [Missing connection](archive/c1-hdmi-investigation-2026-11-12.md#what-remains-missing-for-a-second-independently-live-picture). |

## Current launch correction

The owner-reported cold boot returned the same UUID; uptime 444 seconds versus
2,379 host seconds since preservation supports restart. UUID uniqueness is not
established. The frozen changed-ID verifier remains failed; independent denied
maps proved policy rollback. No repeat boot investigation is needed.

0.1.4 adds an absolute three-second expiry alongside the existing uptime deadline.
Both clocks must fall inside their issue windows before report reservation and
graphics/LS2. Matching reused UUID/uptime cannot revive an already expired absolute
deadline while real time advances. Clock skew/failure rejects; a simultaneous
wall-clock reset into the old window remains a limitation. Fresh one-shot delivery
and the existing uptime dispatch/alarm bounds remain required.

Implementation: [producer](../../scripts/hdmi-window-launch.cjs),
[native parser/predicate](../../native/phase2-hdmi-window/session.cpp),
[clock reads](../../native/phase2-hdmi-window/launch-clock.h),
[entry checks](../../native/phase2-hdmi-window/main.cpp).
Regression tests cover reused UUID plus matching uptime with expired real time.
Host tests, ARM build, direct C1 ABI and archive checks pass; runtime clocks,
graphics and HDMI remain untested. [Historical analysis](archive/c1-hdmi-admission-2026-11-14.md#current-launch-correction).

## Policy lifetime and cleanup

Saved hub caches are process-local and replayed by same-process configuration
reload; startup rescans configured manifest directories. A suffix-only rename
inside a scan root is insufficient. These are static findings, not a guaranteed
cleanup API. [Exact addresses and hashes](archive/c1-hdmi-admission-2026-11-14.md#prepared-correction-route--startup-cache-and-two-file-modes).

The original manifest was preserved outside scan roots; post-boot maps restored
the original denied semantics. That independently verifies rollback at that capture,
without upgrading the failed UUID gate or the interrupted live-removal report.
The latest activation from that held path is verified, so the current recorded
disposition is **grant retained loaded pending trial/separate cleanup**. No file
move, repeat activation, hot remove, config reload or routine boot is queued.
Permission cleanup and HDMI restoration are distinct outcomes.

## Browser research

The six-browser [source review](webos-browser-architecture.md) found useful own-
surface/media techniques, but no new HDMI/tuner ingress or second receiver path.
It does not justify replacing UTP acquisition, importing a root launcher or
delaying the first physical-picture trial. Its extra experiments remain proposals.

## Evidence location

Saved firmware/assembly, original reports, private boot bindings and earlier
packages remain under ignored `build/` and `dist/`; do not publish or refetch them.
The archives retain exact paths, provenance, hashes and analysis limits. Upstream
reuse/licensing boundaries remain in [prior art](prior-art.md),
[the source lock](source-lock.json) and the pinned browser review.
No export, successful compilation, decoder session or local-clip result proves
simultaneous physical HDMI support.
