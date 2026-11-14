# Repository layout and local artifacts

[Documentation index](README.md) · [Build guide](build.md) · [Status](../STATUS.md)

## What belongs in Git

Commit source, tests/fixtures, package-lock, build/validation scripts, schemas,
reviewed policy definitions and documentation. The app icon is an intentional
source asset. No firmware libraries, device profiles, credentials, raw vendor
logs, reports, boot/launch authority, SDK downloads or generated IPKs belong in Git.
[Git exclusions](../.gitignore) cover local output/dependency/editor directories,
native/CMake products, Python bytecode, temporary files and local secrets.
Example environment files remain eligible; actual .env files do not.

## Source and documentation ownership

| Location | Purpose |
|---|---|
| native/phase2-hdmi-picture | Preserved TV-tested 0.1.7 physical control and reviewed startup-order patch. |
| native/phase2-setup-diagnostic | Preserved TV-tested 0.1.8 setup trace implementation; no UTP calls. |
| native/phase2-entry-diagnostic* | Inert entry/guard controls, versions 0.1.5/0.1.6. |
| native/phase2-hdmi-window | Original 0.1.4 control, shared parser/core rules and reviewed policy definitions. |
| Other native/apps directories | Earlier passive/local-clip/admission/lifecycle controls. They are not queued TV tests. |
| scripts, tests, schemas | Shared collectors/controllers/validators, mock acceptance rules and report contracts. |
| STATUS.md | Current verified state, limits and one next task. |
| docs/device-tests | One current procedure and concise actual device journal; exceptional history in archive. |
| docs/research | Technical mechanisms/provenance; older detail in archive. |
| docs/build.md | Local recipes/toolchain; no duplicated live readiness or device chronology. |

Versioned native controls intentionally retain the exact paths/bytes pinned by
old package records. Combining or editing them would break historical replay.
New host code shares preflight, bounded IO, controller and deadline production;
the setup runner supplies its own fixed version/schema and omits UTP queries.
Do not add compatibility fallbacks or turn dormant controls into a live default.

## Local build material

`build/` is created by build/research tools and is ignored. It also holds original
private evidence, so deleting the whole directory would lose unreproducible facts.

- Keep original reports, private authority, firmware/providers, package records,
  frozen source/helper snapshots, ABI checks, final binaries and test outcomes.
  Current offline runners rely on those saved references; a fresh clone lacks them.
- Keep original IPKs in ignored `dist/`. They are small comparison controls;
  a build succeeds only when the actual package and inspection record exist.
- Objects, Ninja dependency logs/check caches and Python bytecode are rebuildable.
  Keep CMake configuration/build rules and final test executables; regenerate
  objects with the existing CMake build when needed.
- Temporary browser profiles can be removed after confirming no process uses
  their exact directories. Do not touch the user's normal browser profiles.
- Download archives are redundant once the installed WSL tools work and their
  provenance is retained. Keep the extracted SDK/Node and npm dependencies used
  by the build; do not replace them with a fresh download during cleanup.

The 2026-11-15 audit retained before/after hashes and an exact deletion manifest
under build/repo-audit-20261115-001/. It removed redundant SDK/Node downloads,
unused task browser profiles and generated caches. Original evidence/packages
and pinned source/runtime inputs were retained. No TV operation occurred.

Future cleanup must recheck dependencies and references. A filename matching a
cache pattern is insufficient when an evidence record pins it. Never recursively
purge build/dist or delete occupied outputs to force a versioned recipe to rerun.
