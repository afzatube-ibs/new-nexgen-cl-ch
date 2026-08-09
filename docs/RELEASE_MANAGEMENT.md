# neXgen Core
## RELEASE_MANAGEMENT

| Field | Value |
|---|---|
| **Title** | Versioning & Release Management Strategy |
| **Document ID** | RELEASE |
| **Version** | 1.0 |
| **Status** | Accepted |
| **Author** | Chief Software Architect & Lead Engineer |
| **Approved By** | Product Owner (2026-08-09) |
| **Last Updated** | 2026-08-09 |
| **Category** | Process Document — not a Foundation Document (`00`–`11`). `docs/11_DEPLOYMENT_STANDARD.md` is explicitly the final, closed document in the foundation roadmap; this document does not join that sequence, it sits alongside it |
| **Parent Document** | `docs/00_PROJECT_GOVERNANCE.md` (`GOVERNANCE:CHANGE_MANAGEMENT`, `GOVERNANCE:DOCUMENT_LIFECYCLE`) |
| **Related Documents** | `docs/10_TESTING_STANDARD.md` (`TESTING:QUALITY_GATES`, `TESTING:RELEASE_VERIFICATION`), `docs/11_DEPLOYMENT_STANDARD.md` (`DEPLOYMENT:RELEASE_STRATEGY`, `DEPLOYMENT:ROLLBACK_PHILOSOPHY`, `DEPLOYMENT:UPGRADE_STRATEGY`), `docs/operations/*` (concrete backend runbooks this document does not duplicate), `PROJECT_STATUS.md`, `CHANGELOG.md` |
| **Applies To** | Every git tag, release package, and version number this repository produces, across every module and app it ever contains (`apps/backend` today; `apps/admin`, `apps/storefront`, `packages/*`, and any future update-engine/marketplace surface) |

Unlike `00`–`11`, this document deliberately **names real tools** (git, ZIP, SHA-256, npm/composer) — it is a concrete, operational policy in the same spirit as `docs/operations/*`, not an abstract, implementation-independent constitution. Where it must state a principle abstractly, it says so.

## Change Log

| Version | Date | Change | Reason |
|---|---|---|---|
| 1.0 | 2026-08-09 | Initial version. Created ahead of Phase 2.1 (Admin Engine) because the existing single ad hoc tag (`v1.0.0-phase1`) does not scale to a multi-app, multi-release platform. Defines semantic versioning policy, git tag strategy, release process, release package structure, and update-engine preparation. | Explicit Product Owner governance request, 2026-08-09, preceding Phase 2.1 implementation |

---

# 1. Purpose

**Identifier: RELEASE:PURPOSE**

This document defines how neXgen Core is versioned, tagged, packaged, and released — permanently, and independent of any single phase. It exists because the repository's only version marker to date, the git tag `v1.0.0-phase1`, encodes a development *phase* rather than a platform *capability*, and phase-numbered tags do not scale once multiple apps (`apps/backend`, `apps/admin`, `apps/storefront`), a plugin/theme ecosystem, and independent release cadences exist.

---

# 2. Scope

**Identifier: RELEASE:SCOPE**

Covers: semantic versioning policy; git tag taxonomy (release, hotfix, RC, beta, alpha, developer build); the release process from development through emergency patch; the mandatory contents of a release package; and the design principles a future Update Engine, Marketplace, and license-verification system must be built against.

Does **not** cover: the deployment topology itself (`docs/11_DEPLOYMENT_STANDARD.md`, `docs/operations/PRODUCTION_DEPLOYMENT_GUIDE.md` already own that), the testing pyramid or quality-gate *content* (`docs/10_TESTING_STANDARD.md` owns that — this document only says *when* those gates must pass, not what they check), or CI/CD tooling implementation (a future `docs/operations/` runbook's job, per that folder's own existing pattern of concrete-but-implementation-specific guides).

---

# 3. Authority

**Identifier: RELEASE:AUTHORITY**

This document is subordinate to `docs/00_PROJECT_GOVERNANCE.md` and does not override `docs/10_TESTING_STANDARD.md` or `docs/11_DEPLOYMENT_STANDARD.md` — it operationalizes `DEPLOYMENT:RELEASE_STRATEGY` ("a release is a deliberate, defined event... does not proceed until `TESTING:RELEASE_VERIFICATION` has passed") into a concrete numbering and tagging scheme. Any conflict between this document and `00`–`11` is resolved in favor of `00`–`11`, corrected here via `GOVERNANCE:CHANGE_MANAGEMENT`.

---

# 4. Semantic Versioning Policy

**Identifier: RELEASE:SEMVER_POLICY**

neXgen Core adopts [Semantic Versioning 2.0.0](https://semver.org) (`MAJOR.MINOR.PATCH`), applied at the **whole-repository (monorepo)** level — one version number describes the state of the entire platform (backend + every frontend app + shared packages) at a given commit, not each app independently. An app that has not changed since the last release is still re-tagged, so "what version is running" never requires cross-referencing per-app history.

## 4.1 What each digit means

| Digit | Bumped when | Example trigger |
|---|---|---|
| **MAJOR** | A new platform *capability tier* ships — a whole new class of functionality becomes real and usable, not merely designed. Per this document's own governing rule (**"future major versions represent platform capabilities, not development phases"**), a MAJOR bump requires shippable, verified artifacts — architecture/design documents alone (e.g. Phase 2.0) do not, by themselves, warrant a MAJOR bump; see §4.3. | Backend platform goes live (v1); the frontend platform (Admin + Storefront) goes live (v2); a full multi-surface commerce platform (Marketplace/Update Engine/extensions) goes live (v3) |
| **MINOR** | A complete, production-ready module or engine is added within the current MAJOR capability tier, with no breaking change to any existing public contract (`API:BACKWARD_COMPATIBILITY`, `MODULE:STABILITY`) | Admin Engine ships (v2.1.0); Storefront Engine ships (v2.2.0) |
| **PATCH** | Bug fixes, security patches, hardening passes, and documentation-only governance updates that change no public contract | Phase 1.1 Production Hardening Pass (v1.1.0 — see §4.3 note on why this one is MINOR, not PATCH, historically) |

## 4.2 Pre-release and build metadata

Standard SemVer suffixes are used exactly as SemVer 2.0.0 defines them — never invented ad hoc:

- Pre-release: `v2.1.0-alpha.1`, `v2.1.0-beta.2`, `v2.1.0-rc.1` (precedence: `alpha` < `beta` < `rc` < release, all lower than the final `v2.1.0`)
- Build metadata (informational only, never affects precedence): `v2.1.0+20260809.a1b2c3d`

## 4.3 Canonical version → capability roadmap

This is the authoritative mapping this project designs toward. It is a **roadmap**, not a guarantee — scope may shift under `GOVERNANCE:CHANGE_MANAGEMENT`, at which point this table is updated, never silently reinterpreted.

| Version | Capability | Status as of 2026-08-09 |
|---|---|---|
| `v1.0.0` | Backend Foundation — all 19 Phase 1 backend modules | ✅ Shipped — historically tagged `v1.0.0-phase1` (see §4.4) |
| `v1.1.0` | Production Hardening — rate limiting, CORS, security headers, operational runbooks | ✅ Shipped, commit `a8a0828`/`57e5938` — **not separately tagged** (see §4.4) |
| `v2.0.0` | Frontend Architecture — accepted ADRs (`0005`/`0006`/`0009`) and full `docs/frontend/*` design specification | ✅ Documents/architecture only, commit `18446aa` — **not separately tagged** (see §4.4); no frontend code exists yet, so this tier is architecturally complete but not yet operationally "live" |
| `v2.1.0` | Admin Engine | 🔜 Next — this document precedes its implementation |
| `v2.2.0` | Storefront Engine | Planned |
| `v2.3.0` | Theme Engine | Planned |
| `v2.4.0` | CMS Engine | Planned |
| `v2.5.0` | Tracking & Analytics | Planned |
| `v2.6.0` | Reports & Insights | Planned |
| `v3.0.0` | Commerce Platform — full multi-surface platform incl. Marketplace/Update Engine (§8) | Future |

## 4.4 Historical tags — not rewritten, not retroactively reissued

Per this task's explicit constraint (no history rewriting, no tag deletion), `v1.0.0-phase1` **remains exactly as it is, permanently**, as the historical record of Phase 1 completion. This policy does **not** retroactively cut `v1.0.0`, `v1.1.0`, or `v2.0.0` tags against past commits — doing so unilaterally would create tags that, unlike a commit, this project's own rule above says can never be deleted if they turn out to be wrong. Historical tags are named in §4.3 as backward-looking clarification of what the old scheme *would map to*, not new tags placed on the repository below. All new tags, starting with the Phase 2.1 release, follow this document's scheme going forward (§5).

---

# 5. Git Tag Strategy

**Identifier: RELEASE:TAG_STRATEGY**

All tags are **annotated** (`git tag -a`, never lightweight) so each carries a message, tagger, and timestamp — matching the existing `v1.0.0-phase1` tag's own format. All tags are created on `main` only, after that commit's quality gates (§6) have passed.

| Tag type | Format | Created from | Pushed to `origin`? | Purpose |
|---|---|---|---|---|
| **Release** | `vX.Y.Z` | `main`, at the exact commit that passed Release Candidate sign-off | Yes | The permanent, immutable record of a production release. One per shipped version, never reused, never force-moved. |
| **Hotfix** | `vX.Y.Z` (Z incremented from the release it patches) | A `hotfix/vX.Y.Z` branch cut from the release tag it fixes, merged back to `main` | Yes | Same format as a release tag — a hotfix *is* a patch release, just released outside the normal cadence. Distinguished from a normal patch release only by its `hotfix/*` source branch, recorded in the tag message. |
| **Release Candidate (RC)** | `vX.Y.Z-rc.N` (N starts at 1, increments per re-spin) | `main`, once Testing (§6.2) is green | Yes — RCs are real, referenceable artifacts for staging verification, not private | The version under final verification before a Release tag is cut. A release is never tagged directly from Development or Testing — an RC tag must exist first. |
| **Beta** | `vX.Y.Z-beta.N` | `main`, a feature-complete but not fully hardened milestone | Yes | Wider pre-release validation (e.g. a future opt-in merchant beta program) — heavier exposure than alpha, still explicitly pre-release. |
| **Alpha** | `vX.Y.Z-alpha.N` | `main`, an early, incomplete milestone | Optional — may stay local | Internal-only early validation. No compatibility or stability guarantee of any kind. |
| **Developer Build** | *Not tagged.* Referenced by commit SHA only, optionally a local-only `vX.Y.Z-dev.<shortsha>` for a developer's own bench, never pushed | N/A | **Never** | Ordinary day-to-day commits on `main` between releases. Tagging every commit would devalue tags as a release signal — `main`'s own commit history (already the case today) is the record of in-progress work. |

## 5.1 Branch model

The repository currently has a single branch, `main` (confirmed: `git branch -a` shows only `main` and its remote tracking ref). This document keeps that simple model for ordinary development and adds exactly two narrowly-scoped, short-lived branch types, only when the corresponding tag type is needed:

- `hotfix/vX.Y.Z` — cut from the release tag being patched, merged back to `main` via the same review/quality-gate process as any other change, deleted after merge.
- `release/vX.Y` — **optional**, only if a MINOR line needs to receive patches after a newer MINOR has already started on `main` (e.g. `v2.1.x` still receiving fixes after `v2.2.0` work has begun). Not created until this project actually needs to support two MINOR lines concurrently — do not create speculatively.

## 5.2 What a tag message must contain

Mirroring `v1.0.0-phase1`'s own existing format (module/capability list, verification evidence line, pointer to `CHANGELOG.md`/`PROJECT_STATUS.md`): every Release and Hotfix tag message states what shipped, one line of verification evidence (which quality gates passed), and a pointer to the corresponding `CHANGELOG.md` entry. RC/Beta/Alpha tag messages state what is being verified and what is explicitly still incomplete.

---

# 6. Release Process

**Identifier: RELEASE:RELEASE_PROCESS**

Six stages. Every release — including a MINOR module release like Phase 2.1 — passes through 6.1–6.4 in order. 6.5 and 6.6 are exception paths, not part of the normal sequence.

## 6.1 Development

Work happens on `main` (per §5.1's current single-branch model) or a short-lived feature branch merged back to `main`. Every module/app-level quality gate already established in this repository's own practice must pass **before merge**, per `docs/09_ENGINEERING_STANDARD.md` and this repo's own demonstrated pattern:

- Backend (`apps/backend`): `composer test` (Deptrac boundaries + full Pest suite against real MySQL/Redis), `composer analyse` (PHPStan/Larastan level 8, 0 errors), Pint clean, `migrate:fresh --seed` clean.
- Frontend (`apps/admin`, `apps/storefront`, once they exist): lint (`eslint`, including `eslint-plugin-jsx-a11y` per `docs/frontend/DESIGN_SYSTEM.md`), typecheck, unit tests (Vitest/React Testing Library), build succeeds with zero errors.

## 6.2 Testing

Full `docs/10_TESTING_STANDARD.md` `TESTING:RELEASE_VERIFICATION` pass against the release candidate build: the full automated suite (unit/integration/contract/architecture tests for every changed module), plus a live smoke test (this repository's own established practice — every prior module delivery includes one, per `CHANGELOG.md`), plus, once a browser UI exists, end-to-end tests (Playwright) and an accessibility pass (`@axe-core/playwright`, per `docs/frontend/DESIGN_SYSTEM.md`'s own accessibility baseline).

Testing is where a Release Candidate tag (§5) is cut — not before.

## 6.3 Release Candidate

The RC tag (`vX.Y.Z-rc.1`) is pushed. Verification happens against the RC build itself (not a re-build from a later commit) — the Release tag, when cut, points at the **exact same commit** as its final RC, so what was verified is byte-for-byte what ships. If a defect is found, fix it, re-tag `vX.Y.Z-rc.2`, and re-verify from 6.2 — never patch the existing RC tag in place.

## 6.4 Production Release

Once the RC passes: cut the `vX.Y.Z` Release tag (§5.2 message format) at the RC's exact commit, assemble the Release Package (§7), publish it, and update `CHANGELOG.md` and `PROJECT_STATUS.md` (already this repository's established practice for every prior delivery). Push the tag to `origin`. Deploy per `docs/11_DEPLOYMENT_STANDARD.md` / `docs/operations/PRODUCTION_DEPLOYMENT_GUIDE.md`, which own the deployment mechanics this document does not duplicate.

## 6.5 Rollback

Per `DEPLOYMENT:ROLLBACK_PHILOSOPHY` ("every deployment can be reversed... rollback capability must be verified before it is relied upon, not assumed"): rolling back means redeploying the immediately-prior Release tag's package (§7) — never editing or reusing the failed tag. The failed release's tag and package are kept, never deleted, so the failure remains diagnosable. A rollback is itself logged in `CHANGELOG.md`, same as a forward release.

## 6.6 Emergency Patch

For a defect requiring a fix faster than the normal 6.1–6.4 cadence allows (e.g. a live security issue): branch `hotfix/vX.Y.Z` from the affected Release tag, fix the defect with the **narrowest possible change**, run the full quality-gate set from §6.1–6.2 against that narrow change (an emergency does not waive verification — `TESTING:QUALITY_GATES`'s "must be objective, repeatable, evidence-based, never individual judgment alone" applies with equal force here), tag and release as a Hotfix (§5), then merge `hotfix/vX.Y.Z` back into `main` so the fix is not lost on the next normal release.

---

# 7. Release Package Structure

**Identifier: RELEASE:PACKAGE_STRUCTURE**

Every Release and Hotfix tag (never RC/Beta/Alpha/Developer builds) produces one package with this fixed structure:

```
nexgen-core-vX.Y.Z/
├── nexgen-core-vX.Y.Z.zip          # the release payload (source or build artifacts, per app)
├── nexgen-core-vX.Y.Z.zip.sha256   # SHA-256 checksum of the ZIP — integrity verification, not authentication
├── RELEASE_NOTES.md                 # what changed, written for the platform's actual audience (VISION:AUDIENCE) — plain language, not a raw commit log
├── MIGRATION_NOTES.md               # every database migration this release introduces, and any manual data-migration step (empty file with "No migrations in this release" if none — never omitted)
├── UPGRADE_NOTES.md                 # step-by-step: what to do to move from the immediately-prior version to this one (env vars, config changes, breaking changes and their mitigation)
├── ROLLBACK_NOTES.md                # step-by-step: what to do to revert to the immediately-prior version, incl. any migration that must be reversed and how
├── COMPATIBILITY_MATRIX.md          # supported PHP/Node/MySQL/Redis versions, and which app versions in a multi-app release are compatible with which (relevant once apps/admin, apps/storefront version semi-independently within one repo tag)
└── DB_MIGRATION_SUMMARY.md          # a flat list of every migration file included, in run order, with a one-line description each
```

`RELEASE_NOTES.md`/`MIGRATION_NOTES.md`/etc. are generated from `CHANGELOG.md`'s corresponding entry, not authored separately from scratch — `CHANGELOG.md` remains the single source of truth; these files are audience-specific extracts of it, packaged for someone performing an upgrade who should not need to read the full repository changelog.

`DB_MIGRATION_SUMMARY.md` and `MIGRATION_NOTES.md` are both empty-but-present, never omitted, on a release that introduces no schema change — an absent file is indistinguishable from a forgotten one; an explicit "none" is not.

---

# 8. Update Engine Preparation

**Identifier: RELEASE:UPDATE_ENGINE_PREPARATION**

No Update Engine, Marketplace, or license-verification system exists in this repository today — this section is **forward-looking design preparation**, not an implementation. It exists so that when this capability is built (targeted at `v3.0.0`, per §4.3), it is built against contracts this document already committed to, not invented ad hoc at that point and retrofitted onto whatever versioning happened to exist by then.

## 8.1 Design principles (binding on the future implementation)

- **Same provider-trio pattern as every other integration in this platform.** Payments' Gateway trio, Shipping's Courier trio, Notifications' Channel trio, and Search's Engine trio (`Contracts\...Contract` + `Registry`/`Factory`/`Resolver`) are this codebase's own established, repeated pattern for "one capability, multiple swappable real implementations." An Update Engine's connection to an Update Server, and a Marketplace's connection to Theme/Extension sources, follow the identical shape — not a new one invented for this feature alone.
- **SemVer is the update contract.** An update/extension/theme package declares the SemVer range of the core platform it requires (e.g. `"requires": ">=2.1.0 <3.0.0"`), checked before an update or install is offered — never applied blind.
- **Every remotely-fetched package is checksum-verified before use**, using the same SHA-256 mechanism this document already establishes for core releases (§7) — one verification mechanism, not a separate one invented for third-party content.
- **License verification is presence/validity-checked, never a code-execution gate.** Consistent with `SECURITY:SECURE_CONFIGURATION` and this project's "no unnecessary attack surface" posture: a license check confirms an extension/theme is entitled to install, it never becomes a remote-code-execution vector or phones home with more than the minimum needed to verify entitlement.
- **Incremental patches, not full-package reinstalls, where safe.** A PATCH-level update (§4.1) SHOULD be deliverable as a diff/incremental patch against the previous version; a MINOR or MAJOR update ships the full Release Package (§7) — mirroring `DEPLOYMENT:UPGRADE_STRATEGY`'s existing compatibility-tier reasoning.
- **Extension/Theme updates respect `MODULE:STABILITY` and the `ThemePackage` contract** `docs/frontend/THEME_ENGINE_ARCHITECTURE.md` already defines — an Update Engine does not get to bypass a boundary rule that document already settled (e.g. "no Theme Package may fetch its own data or import another theme").

## 8.2 Explicitly deferred (not designed here)

The Update Server's own hosting/transport, the Marketplace's commercial/listing model, and the specific license-key algorithm are deliberately **not** specified in this document — exactly the same "architecture principle now, implementation detail later" discipline `docs/11_DEPLOYMENT_STANDARD.md` already applies to its own topic. They are designed when `v3.0.0` work actually begins, against the principles in §8.1, through this same `GOVERNANCE:CHANGE_MANAGEMENT` process.

---

# 9. Documentation & Index Maintenance

**Identifier: RELEASE:DOCUMENTATION**

This document is itself permanent (`GOVERNANCE:DOCUMENT_LIFECYCLE`) and is registered in `docs/README.md` under a new **Process & Release Documents** section (not the closed Foundation Documents `00`–`11` table). Every future release updates: `CHANGELOG.md` (the entry this package's `RELEASE_NOTES.md` is extracted from), `PROJECT_STATUS.md` (the live snapshot), and, if the roadmap in §4.3 changes, this document's own §4.3 table and Change Log — never silently.

---

# 10. Review Checklist

Before any tag in §5 is pushed to `origin`, confirm:

- [ ] Version number matches §4.1's MAJOR/MINOR/PATCH rules for what actually changed, not merely what feels right
- [ ] Tag is annotated, on `main`, at a commit whose quality gates (§6.1–6.2) are green
- [ ] Tag message follows §5.2's format
- [ ] Release Package (§7) is complete — all seven files present, `MIGRATION_NOTES.md`/`DB_MIGRATION_SUMMARY.md` explicitly say "none" if empty, checksum file matches the ZIP
- [ ] `CHANGELOG.md` and `PROJECT_STATUS.md` updated in the same change that cuts the tag, never after
- [ ] No existing tag was deleted, moved, or force-reused (§4.4, §5)
