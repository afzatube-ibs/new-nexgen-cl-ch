# Phase 3.1 — CMS: Architecture Research

**Date:** 2026-08-17
**Scope:** An exhaustive, honest research pass over the real backend for any content-management capability — Models, Controllers, Actions, Requests, Resources, Routes, Permissions, Events, Audit, Tests, Media integration, SEO integration, Navigation integration, Storefront integration — per the master task's own Phase 3.1 Step 1 instruction. **No code was written this phase.**

---

## 1. Backend readiness: **0/10 — no CMS backend exists.**

This is not a partial or under-documented module. It is confirmed, exhaustively, that **zero CMS backend code exists anywhere in this repository**:

- `find app/Domains -maxdepth 2 -type d` lists every real domain/module directory in the backend. There are 19: Catalog, Checkout, Customers, Inventory, Orders, Payments, Pricing, Promotions, Search (Commerce); Fulfillment, Notifications, Returns, Shipping (Operations); Foundation, IdentityAccess, Installer, Localization, Media, StoreConfiguration (Platform). **None is named CMS, Content, Pages, or anything content-management-adjacent.**
- A repo-wide search for any class named `*Page`, `*Menu`, or `*Navigation`, and for `MODULE:CMS`/`MODULE:CONTENT` anywhere in the codebase, returns **zero matches**.
- Every one of the 93 real database migrations was checked by filename for `page`, `menu`, `content`, `navigation`, `cms`, `landing`, or `blog` — **zero matches**. There is no `pages` table, no `menus` table, no content-entity table of any kind.
- Every `routes.php` across all 19 real modules was checked for `page`/`menu`/`navigation` route segments — **zero matches**.

## 2. What the accepted architecture documents say (and why they don't change #1)

- `docs/04_MODULE_ARCHITECTURE.md` §7 formally defines the **Growth domain** — Reporting, CRM, Marketing, Automation — and states plainly: *"Growth modules are designed for, not built in, Phase 1... without requiring any of them to be built now."* Notably, **CMS is not even named as a Growth-domain module** in this accepted document at all; only Reporting/CRM/Marketing/Automation are.
- `planning/IMPLEMENTATION_MASTER_PLAN.md` §31 does name **"CMS & Landing Page Builder"** (covering "#44 CMS, #45 Landing Page Builder"), scoped to a future "Phase 2" in the master plan's own internal numbering — a different numbering scheme than this engagement's own Phase 2.x/3.x sequence, and, critically, a **plan**, not a build record. Its own listed dependencies (Media, SEO, Theme System) are themselves either real-but-unrelated (Media — see §4) or entirely unbuilt (a "SEO" module, a "Theme System" module — neither exists in `app/Domains/` either).
- `docs/frontend/CMS_FOUNDATION_ARCHITECTURE.md` (Accepted, 2026-08-08) is the closest thing to CMS design work that exists — but its own header states the scope boundary explicitly: *"Phase 2.0 — Frontend Architecture & Design (data model and architecture only — **no CMS editor UI, and no backend implementation, exists yet**)"* and *"does not decide which module... ultimately owns this data on the backend — that is a `MODULE:AUTHORITY`-governed decision for whichever phase actually implements it."* It defines a `Page → Section → Block → Widget` content-tree data model intended for a **future Storefront rendering engine** (`docs/frontend/THEME_ENGINE_ARCHITECTURE.md`, `docs/frontend/STOREFRONT_COMPONENT_ENGINE.md`), not a present, buildable backend contract. No API, no persistence, no controller was ever specified — only a TypeScript interface shape for a not-yet-decided future backend to eventually implement.

None of this is a gap in research. It is the accepted architecture's own explicit, repeated statement that CMS has not been built.

## 3. Existing capabilities (real, adjacent, but not CMS)

One real backend module is genuinely adjacent to what a CMS would need, and is worth naming honestly even though it does not constitute CMS on its own:

**Media** (`app/Domains/Platform/Media/`) — a real, complete, generic file-asset manager: `MediaAsset` model, `UploadMediaAction`/`DeleteMediaAction`/`RestoreMediaAction`/`UpdateMediaAltTextAction`, a full Audit Log, optimistic locking, permission-gated (`media.assets.view`/`.manage`, `media.audit_log.view`), routes for list/upload/show/update/delete/restore. This is real, already-built, currently-unexposed-in-admin capability. **It is not CMS** — there is no Page, Section, or any content entity for a media asset to attach to, and Media's own routes carry no such relationship. Building a standalone "Media Library" browser screen would be a real, legitimate, buildable admin feature — but it would not be "CMS," and building it under that label would misrepresent what was actually delivered. Flagged here as an honest, separate finding for the Product Owner's own consideration, not built.

No other adjacent capability exists. There is no SEO-metadata-as-a-standalone-entity backend (Catalog's own Product model carries its own `metaTitle`/`metaDescription`/`metaKeywords` fields directly, confirmed already consumed by this engagement's own Catalog Product Editor — that is Catalog's own SEO surface, not a general CMS/SEO module), no Navigation/Menu backend, no Static-Page backend.

## 4. Workflow, Permission model, Information architecture

Not applicable — there is no workflow to document, no permission keys exist (`Permission::query()->where('module', 'cms')` type search across every module's own `Authorization/PermissionRegistry.php` returns nothing), and no information architecture can be proposed for a screen with no backend to call.

## 5. Cross-module integrations

- **Media integration**: none — no content entity exists to select media for.
- **SEO integration**: none at the CMS level — Catalog's own Product-level SEO fields are the only real SEO surface in this backend, already fully consumed by the existing, frozen Catalog Product Editor.
- **Navigation integration**: none — no Menu/Navigation entity exists anywhere.
- **Storefront integration**: none — no Storefront application exists in this repository at all (`apps/` contains only `backend` and `admin`); `docs/frontend/STOREFRONT_COMPONENT_ENGINE.md`/`THEME_ENGINE_ARCHITECTURE.md` are themselves Accepted *design* documents for a not-yet-built Storefront, the same "designed for, not built" status as CMS itself.

## 6. Limitations

Everything in this document is a limitation: there is no CMS backend surface of any kind to build an admin UI against, per the master task's own governing principle — *"Never invent backend capabilities... Every screen must consume only real backend capabilities."*

## 7. Recommended slices

**None.** There is no real backend capability to slice. Building anything under a "CMS" label right now — even something as modest as a static-page CRUD screen — would require inventing the entire backend contract first (models, migrations, routes, permissions, requests, resources), which is explicitly out of this frontend-only engagement's power and explicitly forbidden by the master task's own "Never invent... Never modify backend contracts unless fixing a genuine backend bug... Never modify database schema" rules. This is not a missing bug to fix; it is a module that has never been built.

## 8. Product Owner decisions needed

1. **Confirm CMS remains out of scope for this engagement** until a real backend module is built for it (by whichever team/phase owns backend work) — this document is the artifact that makes that gap explicit and traceable, matching this platform's own `MODULE:AUTHORITY` governance requirement that a module boundary be formally defined before any implementation (frontend or backend) begins against it.
2. **Optional, separate, non-CMS opportunity**: a standalone "Media Library" admin screen against the real, already-complete Media module (§3) is a genuine, buildable capability today, independent of CMS. Not recommended as part of this phase (it would not fulfill "CMS Slice 1," and mislabeling it as such would misrepresent the deliverable) — named here only so the Product Owner has the option to authorize it explicitly, under its own correct name, in a future phase.

---

## 9. Outcome of this phase, per the master task's own instructions

The master task's own Step 2 instruction is explicit: *"Implement ONLY existing backend capabilities... ONLY if the backend already supports them."* With zero backend capability found, there is nothing to implement — CMS Slice 1 has no possible scope. This satisfies the master task's own contingency verbatim: *"IF CMS FINISHES EARLY: DO NOT START THE LANDING ENGINE. Instead create `NEXTGEN_BETA1_READINESS_REVIEW.md`... Documentation only."* Proceeding directly to that deliverable next.
