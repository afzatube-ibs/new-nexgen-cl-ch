# neXgen Core — CMS Architecture (Backend Design Proposal)

| Field | Value |
|---|---|
| **Status** | **Draft — Proposed, pending Product Owner review.** Proposes a new `MODULE:CMS`, which per `MODULE:AUTHORITY` requires formal addition to `04_MODULE_ARCHITECTURE.md` before any implementation begins. This document is that proposal, not the addition itself. |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-17 |
| **Builds on** | `docs/frontend/CMS_FOUNDATION_ARCHITECTURE.md` (Accepted, Phase 2.0 — the frontend content *model*: Page→Section→Block→Widget), `planning/architecture/PHASE_3_1_CMS_ARCHITECTURE.md` (confirmed: zero CMS backend exists anywhere in this repository), `IMPLEMENTATION_MASTER_PLAN.md` §31/§30/§32 (CMS & Landing Page Builder / SEO / Blog, all unbuilt) |
| **Answers** | The Product Owner's own instruction: *"Research. Current project has NO backend. Design what backend SHOULD exist."* |

---

## 1. What This Document Is, Precisely

`CMS_FOUNDATION_ARCHITECTURE.md` already settled the **content shape** a merchant authors (`Page → Section → Block → Widget`, Zod Schemas, Visibility, Scheduling, Localization) — and explicitly declined to decide where that data lives on the backend, deferring that to "whichever phase actually implements it" under `MODULE:AUTHORITY`. This is that document: it proposes the owning module, its data ownership, its public contract, and the operational capabilities (drafts, publishing, scheduling, versioning, revision history, approval workflow, menus, reusable snippets) a real CMS needs beyond the content shape alone. Per the governing instruction for this entire research pass, **nothing here is implemented** — this is the specification a future implementation phase would build from, after Product Owner approval, exactly like every other module boundary this project has formally added (`Search`, `Notifications`, `Customers`, `Payments`, all via the same `MODULE:AUTHORITY` process, all cited in `04_MODULE_ARCHITECTURE.md`'s own Change Log).

---

## 2. Module Boundary Proposal

**`MODULE:CMS`, Platform domain.**

**Why Platform, not Commerce/Operations/Growth**: CMS owns no commerce transaction data (rules out Commerce), does not react to Operations' fulfillment events (rules out Operations), and — critically — must be depended upon by the Storefront's own rendering path for *every* page including Product/Category pages that layer CMS-authored Sections around Catalog data (`STORE_FRONTEND_ARCHITECTURE.md` §1.1's catch-all route), which rules out Growth entirely: `04_MODULE_ARCHITECTURE.md` §7's own rule is that "no Commerce, Operations, or Platform module may depend on a Growth module" — if CMS were Growth-domain, nothing could safely render CMS content, which is self-defeating. Platform is the only domain every other domain may depend on directly (`MODULE:INTERACTION_RULES`), and CMS's actual shape — foundational, broadly depended-upon, owning no domain-specific business data — is structurally identical to `Media`, which already holds this exact position for an analogous reason (uploaded assets vs. authored content). This mirrors `04_MODULE_ARCHITECTURE.md` v1.4's own reasoning for placing `Notifications` in Operations rather than Platform (a real, cited precedent for this kind of placement decision, applied here to the opposite conclusion because the actual dependency shape differs).

- **Purpose**: Owns non-catalog content — Pages, Blog Posts (thin extension, §7), Menus/Navigation, reusable content Snippets — and the publishing lifecycle around all of them.
- **Dependencies**: Media (`MODULE:MEDIA` — image/asset references), Localization & Currency (per-locale content, `CMS_FOUNDATION_ARCHITECTURE.md` §6), Identity & Access (authorship/approval, via the Platform-internal exception every Platform module already has). Catalog/Search are referenced **by identifier only** (a Menu item linking to a real Category, a Section embedding a real Product) — never a real code-level dependency, per `ARCH:CROSS_DOMAIN_COMMUNICATION`, mirroring exactly how `Promotions` already references `Catalog`/`Customers` by identifier without a schema-level coupling.
- **Public Contracts**: Page CRUD, publish/unpublish/schedule, revision list/restore, Menu CRUD, Snippet CRUD, Blog Post CRUD.
- **Events**: `PagePublished`, `PageUnpublished`, `PageScheduled`, `MenuUpdated`, `PostPublished` (matching `IMPLEMENTATION_MASTER_PLAN.md` §31's already-named `PagePublished`, corrected here from that entry's own typo `Pagepublished`).
- **Data Ownership**: Pages, their content trees, revisions, Menus, Snippets, Blog Posts — Public once published, Internal while draft/scheduled, per `DATA:CLASSIFICATION` (matching the master plan's own existing classification for this data).
- **Security Considerations**: `SECURITY:OUTPUT_ENCODING` is the single highest-severity concern this module owns — every field a merchant authors is rendered, unescaped-by-default risk, to every anonymous storefront visitor. This is stated at equal severity to how `08_SECURITY_STANDARD.md` already treats Payments' card-data handling, because the blast radius (every visitor, not one transaction) is comparably large even though the failure mode (XSS, not fraud) differs.
- **Stability**: **Experimental** at first implementation (per `MODULE:STABILITY`'s own definition — "not yet built... or built but not yet proven"), the same classification every other module received at its own Phase 1 introduction.

---

## 3. Data Model Proposal

### 3.1 Storage shape: JSON content tree, not fully normalized

`cms_pages` owns one row per Page, with the entire `Section[]` tree (per `CMS_FOUNDATION_ARCHITECTURE.md` §2) stored as **one JSON column** (`content`), not normalized into separate `cms_sections`/`cms_blocks`/`cms_widgets` tables. This mirrors an already-real, already-accepted pattern in this exact backend — `CheckoutSession.billing_address`/`shipping_address` and `Product.metadata` are both JSON columns holding structured, Schema-validated-at-the-application-layer data, not normalized rows, for the identical reason: this data is always read and written as one coherent tree per parent record, never queried or filtered by an individual Section's own fields at the database layer. Normalizing it would buy nothing (no real query need) at the cost of real complexity (a three-table join to reconstruct one Page). The Zod Schema (`CMS_FOUNDATION_ARCHITECTURE.md` §3) validates this JSON's shape at the API boundary, per `SECURITY:INPUT_VALIDATION` — exactly as `Http\Requests\*Request` classes already validate every other JSON-shaped field in this backend.

```
cms_pages
  id, tenant_id, slug (unique per tenant+locale), title,
  content (json — the Section[] tree),
  status (draft | scheduled | published | archived),
  published_at, scheduled_at,
  locale, meta_title, meta_description, meta_keywords (mirrors Catalog's
    own Product-level SEO fields exactly — PHASE_3_1_CMS_ARCHITECTURE.md §3
    already confirmed this is the only real SEO pattern in this backend;
    this module extends that same pattern rather than inventing a
    separate SEO module `IMPLEMENTATION_MASTER_PLAN.md` §30 only speculates),
  version (optimistic locking, per DATA:VERSIONING — identical mechanism
    to every other frozen module's `expected_version` pattern)
```

### 3.2 Revision history — a real gap the existing flat audit log doesn't fill

Every other frozen module's audit log (`AuditLogger`, confirmed real across Checkout/Promotions/every module) records **that** a field changed and **who** changed it — never a restorable snapshot of the full prior content. That is sufficient for operational data (an address, a price) but insufficient for editorial content, where "revert to how this Page read yesterday" is a real, expected capability no incumbent CMS ships without. Proposed: `cms_page_revisions` (`page_id`, `content` snapshot, `created_by`, `created_at`) — append-only, one row per save, independent of the flat audit log (which still separately records the *action* of saving, per every other module's existing pattern). Restoring a revision is itself a new, audited write (a new current `content`, a new revision row) — never a silent rollback that erases the fact a rollback occurred, per the same principle `SECURITY:BACKUP_RECOVERY` already states for data recovery generally.

### 3.3 Draft → Scheduled → Published → Archived, with an optional Approval step

```
draft --(submit for review, if approval workflow enabled)--> pending_review --(approve)--> scheduled/published
draft --(publish directly, if approval workflow disabled)--> published
published --(schedule a future change)--> scheduled --(startsAt reached)--> published
any --(archive)--> archived
```

**Approval workflow is a per-store configuration toggle** (`PRINCIPLES:CONFIGURATION_OVER_CUSTOMIZATION`), not a mandatory step — an independent merchant with one operator has no use for a review gate; a growing team with a content editor and a publisher role does. When enabled, a new permission (`cms.pages.approve`, distinct from `cms.pages.manage`) gates the `pending_review → published` transition — the same `permission:`-per-operation pattern every other module's `PermissionRegistry` already uses, not a bespoke workflow engine.

### 3.4 Menus & Navigation

```
cms_menus       (id, tenant_id, handle — e.g. "main-nav", "footer")
cms_menu_items  (id, menu_id, parent_id [nullable, for nesting], label,
                 target_type [url | page | category | product | external],
                 target_value, order, version)
```

A `target_type: page|category|product` item stores the real entity's identifier, resolved by the Storefront's own BFF (`STORE_FRONTEND_ARCHITECTURE.md` §3.2) at render time — never a hardcoded URL that silently breaks when a product's slug changes, directly serving `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH`.

### 3.5 Reusable Snippets (Global Blocks)

```
cms_snippets (id, tenant_id, name, type [matches a StorefrontPrimitiveName],
              configuration (json), version)
```

A `Section.configuration` may reference a Snippet by id instead of embedding its own configuration inline — editing the Snippet updates every Page referencing it, the concrete backend counterpart to the master task's own "Global snippets" requirement, and a genuine differentiator over page builders that only support copy-paste duplication of a block (every incumbent named in `LANDING_ENGINE_ARCHITECTURE.md` §2 requires re-editing a duplicated block in every page it was pasted into).

### 3.6 Media Optimization

No new capability required — every Page/Section/Block/Snippet references a Media asset by identifier (`MODULE:MEDIA`'s existing contract), and optimization itself (responsive `srcset`, format negotiation, R2/S3-compatible delivery) is already fully specified by `next/image` + `PERFORMANCE_FOUNDATION.md` §2/§7. This module adds no image-processing logic of its own.

---

## 4. Public Contract (Sketch — Not a Full OpenAPI Spec)

| Capability | Notes |
|---|---|
| `GET/POST/PATCH/DELETE /cms/pages` | Standard CRUD, `expected_version` on write, per every other module's established pattern |
| `POST /cms/pages/{id}/publish`, `/schedule`, `/unpublish`, `/archive` | Explicit status-transition endpoints, mirroring `Products`' own `publish` endpoint pattern (`PHASE_2_2` Catalog work) rather than a generic `PATCH status` field, so each transition can carry its own validation (e.g. publishing requires a non-empty `content`) |
| `GET /cms/pages/{id}/revisions`, `POST /cms/pages/{id}/revisions/{revisionId}/restore` | §3.2 |
| `GET/POST/PATCH/DELETE /cms/menus`, `/cms/menus/{id}/items` | §3.4 |
| `GET/POST/PATCH/DELETE /cms/snippets` | §3.5 |
| `GET/POST/PATCH/DELETE /cms/posts` | §7, Blog |

Every write is permission-gated (`cms.pages.manage`, `cms.pages.approve`, `cms.menus.manage`, `cms.snippets.manage`) exactly like every existing module — **staff-only, admin-facing**, consistent with `STORE_FRONTEND_ARCHITECTURE.md` §0's confirmed platform-wide pattern. The Storefront itself never calls these write endpoints; it reads published content only, through the BFF's Category-A service-credential path (`STORE_FRONTEND_ARCHITECTURE.md` §3.2), which this module's own `GET /cms/pages/{slug}` (published-only, locale-aware) is designed to serve.

---

## 5. Future Visual Editor

Named as required, not designed, per this exact document's own §1 scope and matching `CMS_FOUNDATION_ARCHITECTURE.md` §7's identical precedent: a visual editor is a real, substantial, separate future phase, built as a pure editing surface over §3.1's Schema-validated `content` JSON — it must never introduce a second content representation, per the same constraint `LANDING_ENGINE_ARCHITECTURE.md` §4 already states for its own future builder (the two are, in fact, the same future editor — a landing page and a CMS Page are the same entity, per that document's own §3.1).

---

## 6. What This Document Deliberately Does Not Do

- Does not write a migration, a controller, or any code — a proposal only, per `MODULE:AUTHORITY`'s own required sequence (formal `04_MODULE_ARCHITECTURE.md` addition and Product Owner approval come before implementation, not after).
- Does not decide whether Blog is truly "thin" enough to stay inside this same module or deserves its own (§7 recommends thin-extension, matching the master plan's own existing framing, but this is a real open question the implementing phase should re-confirm).
- Does not design SEO as a separate module — recommends against it, per §3.1's own reasoning that Catalog's existing per-entity-field pattern is simpler and already proven.

---

## 7. Blog — Thin Extension, Not a Separate Module

`cms_posts` (id, tenant_id, page_id [nullable — a Post may or may not also be a full CMS Page], title, slug, excerpt, content [same JSON Section-tree shape as a Page, reused rather than reinvented], category, published_at, meta_title/description/keywords) — structurally identical to `cms_pages` with two additions (`excerpt`, `category`) and one removal (no Menu placement by default). Recommending this stay inside `MODULE:CMS` rather than become its own module, per the master plan's own "thin extension of CMS" framing (§32) — a separate module would duplicate §3.1–§3.3's entire draft/publish/revision/versioning machinery for no real architectural benefit.

---

End of Document
