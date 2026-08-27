# Appearance Workspace Specification

| Field | Value |
|---|---|
| **Status** | Specification — a complete design and gap-analysis document. **No code was written to produce this document.** |
| **Requested by** | Product Owner, following live review of the running Admin app, which surfaced "no Appearance/Theme workspace exists" as the largest remaining UX gap. |
| **Method** | Every architectural claim below is grounded in direct source reads performed to produce this document: `docs/product/NEXGEN_PRODUCT_MASTER_VISION.md`, `planning/architecture/BETA_EXPERIENCE_MAP.md`, `planning/architecture/BETA_EXPERIENCE_BLUEPRINT.md`, `docs/frontend/THEME_ENGINE_ARCHITECTURE.md`, `docs/frontend/CUSTOMER_EXPERIENCE_ARCHITECTURE.md`, `planning/reviews/EVIDENCE_BASED_PLATFORM_AUDIT.md` (all six named explicitly), plus the architecture those six documents themselves depend on and this spec cannot honestly avoid reading — `docs/frontend/CMS_FOUNDATION_ARCHITECTURE.md`, `docs/frontend/STOREFRONT_COMPONENT_ENGINE.md` — and the real, current backend/Admin source: `apps/backend/app/Domains/Platform/StoreConfiguration/Models/Store.php`, `apps/backend/app/Domains/Platform/Media/Models/MediaAsset.php`, both domains' real `routes.php`/`PermissionRegistry.php`, `apps/store-api-gateway/src/routes/preview.ts`, and `apps/admin/src/registry/moduleRegistry.ts`. Nowhere below is a backend capability assumed to exist that was not directly confirmed, or explicitly named as missing. |
| **Relationship to other documents** | This document does not replace `THEME_ENGINE_ARCHITECTURE.md` (the *engine* contract) or `CMS_FOUNDATION_ARCHITECTURE.md` (the *content model*) — it is the *merchant-facing workspace* built on top of both, exactly as `BETA_EXPERIENCE_BLUEPRINT.md` §1.9 already named it. Where this document proposes new backend capability, it names the real, existing `MODULE:AUTHORITY` process (`00_PROJECT_GOVERNANCE.md`) that capability must go through before implementation — it does not treat that process as already satisfied. |
| **Instruction under which this was produced** | "Do NOT implement yet... Stop after producing the complete Appearance Workspace specification." No implementation, no commit, no code change accompanies this document. |

---

## 0. The one-sentence brief

**Appearance is where a merchant makes their store look like their brand instead of like every other neXgen store** — a first-class workspace, sibling to Sell/Grow/Orders/Operations/Customers/Insights/Settings (`BETA_EXPERIENCE_BLUEPRINT.md` Part 1), never a tab under Settings, because Settings answers "what is true about my business" and Appearance answers "what does my business look like" — two different questions a merchant reaches for in two different moods, at two different frequencies, for two different reasons (Blueprint §1.8 vs §1.9, already drawing this exact line).

---

## 1. Navigation

### 1.1 The proposed structure

```
Appearance
 ├── Overview                       (workspace home — new, matches every other workspace's own landing screen)
 ├── Theme Studio                   (the visual canvas — houses Homepage, Header, Footer, and every other page archetype)
 ├── Branding
 │    ├── Store Identity & Logo
 │    ├── Favicon
 │    ├── Colors
 │    ├── Typography
 │    └── Brand Assets              (a filtered view of the real Media Library, §7)
 ├── Menus                          (Header Menu / Footer Menu link structures — reusable, shared across Theme Studio placements)
 ├── Theme Library                  (Installed / Draft / Published, Clone, Import, Export, Rollback)
 ├── Custom Code (Advanced)         (gated behind its own, narrower permission — §11)
 └── Version History                (every published/rolled-back version of the active configuration)
```

Preview and Publish are **not sidebar destinations** — see 1.3.

### 1.2 What changed from the brief's example, and why

The brief's own example listed 14 flat items, including `Homepage Builder`, `Header & Navigation`, `Footer`, `Sections`, `Preview`, and `Publish` as separate top-level entries. The brief explicitly invited improvement ("Example (improve if needed)"). Four changes are proposed, each with a concrete reason, not a stylistic preference:

| Brief's item | Where it lives here | Why |
|---|---|---|
| `Homepage Builder` | Inside **Theme Studio**, as the `homepage` archetype selected from the canvas's own page switcher | Shopify's own Theme Editor (the explicit named comparable) does not have a separate "Homepage Builder" app distinct from its main editor — a homepage is one archetype among several the same canvas edits. Splitting it into its own nav item would mean building two visual editors that both do "arrange Sections on a page," which is the same tool. §6 still specifies Homepage Builder in full, as its own capability — it is a *view*, not a *destination*. |
| `Header & Navigation`, `Footer` | Also inside **Theme Studio**, as two more archetypes/placements on the same canvas | Same reasoning — a header and a footer are both "arrange Sections/Blocks on a surface," the identical mechanism a homepage uses (`CMS_FOUNDATION_ARCHITECTURE.md` §2's Section/Block model makes no structural distinction between a homepage Section and a header Section). Two editors for one mechanism would be real duplication, not two features. |
| `Sections` | A left-sidebar tab **inside Theme Studio** (§5.1), not a top-level nav item | A Section is something a merchant adds *to* a page inside the canvas, the same way a Shopify merchant doesn't leave the editor to "go to Sections" — it is the canvas's own block palette. |
| `Preview`, `Publish` | A **persistent toolbar inside Theme Studio** (and Homepage Builder, being the same canvas), not separate pages | This is the single largest deliberate deviation, and the most important one: a professional creative tool never makes "preview" or "publish" a page navigation away from the work — it is a live, always-visible mode toggle and a single button, exactly matching §0's own "distinctly neXgen, comparable to Shopify Theme Editor" bar. Making these sidebar links would mean leaving your work to check your work, which is the opposite of what a creative workspace should feel like. |

`Menus` is kept as its own top-level item — real, deliberate, and *not* folded into Theme Studio, because a menu (an ordered list of links) is genuinely reused across multiple placements (a Header can reference the same Menu two different pages both use) and across time (edited independently of any one page's redesign) — this is the one piece of the brief's list that is not "arrange Sections on a canvas," and Shopify's own Theme Editor keeps Navigation as a distinct area for the identical reason.

### 1.3 Where this attaches in the real Admin app

`apps/admin/src/modules/index.ts` is a flat list of side-effecting imports, one per top-level workspace (`./catalog/module.js`, `./settings/module.js`, ...). Appearance is exactly one more line — `./appearance/module.js` — calling the same real `registerModule()` (`apps/admin/src/registry/moduleRegistry.ts`) every existing workspace already calls, with its own `navigation: ModuleNavItem[]` tree (the registry's own `filterNavItems` already supports arbitrarily nested `children`, confirmed from source — the 8-item, 2-level tree above requires zero framework change). This is the literal, mechanical answer to "Appearance must become a first-class workspace, not another page under Settings": it is registered exactly as its own module, the same way Catalog, Orders, and Settings each are, never as a `settingsPanels` entry inside `settings/module.ts`.

---

## 2. Merchant workflow — how a merchant creates a beautiful store from zero

A new merchant, first login, no theme configured, no branding set (today's real state, verified — `Store` has no branding fields at all, §4):

1. **Onboarding nudge.** The Command Center's own daily priority list (`NEXGEN_PRODUCT_MASTER_VISION.md` §2) or a dedicated first-run checklist (Vision §16's own named "Onboarding/setup checklist" v1.0 item, not yet built) surfaces one ranked action: *"Your store has no logo or brand colors yet — customers see a generic look. Set up your brand identity (2 minutes)."* One button: **Go to Appearance**.
2. **Branding, first.** The merchant lands in **Branding**, not Theme Studio — logo upload, favicon, one primary brand color, one accent color, a font pairing chosen from a short curated list (not a raw font-picker with hundreds of options; §7). This is deliberately the *first* stop (Blueprint §1.9's own "the first workspace a brand-new merchant should ever be guided into") because it requires no design skill and pays off immediately: the Storefront header, favicon, and buy-box CTA color update the instant it's saved.
3. **See it live.** A persistent "View live Storefront" affordance (reusing the real Gateway Preview Framework, §9) lets the merchant open their actual Storefront in a new tab at any point in this flow — no separate "am I done yet" uncertainty.
4. **Theme Library, second.** The merchant is offered `nexgen-default` (the platform's own first real theme, §8, not yet built — see the honest gap in §13) pre-selected, with a short list of alternate presets once more than one theme exists. One click: **Use this theme**. No merchant is required to visit Theme Studio at all to have a complete, on-brand store — the branding fields plus a chosen theme's own defaults are enough for a genuinely presentable store with zero further effort, matching `NEXGEN_PRODUCT_MASTER_VISION.md` §14's "simple by default, powerful on demand."
5. **Theme Studio, optional, for the merchant who wants more.** Open the canvas, land on the `homepage` archetype pre-populated from the chosen theme's own `ThemeTemplate.defaultSections` (`THEME_ENGINE_ARCHITECTURE.md` §6 — real, Draft-but-designed mechanism). Add, remove, reorder Sections; edit each Section's own configuration in the right Inspector (§5). Every change is a **draft** — nothing customers see changes yet (§10).
6. **Preview across devices.** Desktop/Tablet/Mobile toggle (§9) inside the same canvas, before publishing.
7. **Publish.** One button, one confirmation, a real version snapshot created automatically (§10) — the live Storefront updates, and the merchant can roll back in one click if anything looks wrong (§10).
8. **Iterate.** A merchant returns to Theme Studio "opened rarely after initial setup" (Blueprint §1.9's own stated cadence) — for a seasonal banner, a new hero image, a homepage reorder for a sale — never a daily-open workspace, by design, the same way Settings is not.

This is the complete zero-to-published path, and every step above names a real mechanism this spec grounds in an actual document or actual source file — nothing above requires an invented capability that isn't also named honestly as "not built yet" in §13.

---

## 3. Workspace layout — a creative workspace, not a CRUD list

### 3.1 The design point of view, inherited, not reinvented

`BETA_EXPERIENCE_BLUEPRINT.md` §0 already set the platform's whole visual point of view — "Apple's restraint met Amazon's rigor, running on Daraz's own market fluency" — and named Shopify Horizon as "the closest sibling in spirit: block-based, merchant-flexible, restrained-but-warm." Appearance is where that comparison is most literal: this workspace's own *chrome* (the tool merchants use to build) should read like a design tool — generous canvas space, a quiet toolchrome, real visual feedback — while never pretending to be a general-purpose design app (Figma, Canva) a merchant has to learn from scratch. It is opinionated and narrow on purpose.

### 3.2 What "not CRUD" means, concretely

Every other Admin workspace (Catalog, Orders, Customers) is fundamentally: a list, a filter bar, a detail form, a save button. Appearance's primary surface (Theme Studio) inverts that: **the canvas *is* the record.** There is no "Homepage" list row to click into a form — there is one live, visual, WYSIWYG-adjacent surface a merchant directly manipulates, with the Inspector (§5.3) functioning as the "form" only for the one Section currently selected, never the whole page. Branding and Theme Library retain a more traditional settings/list shape, deliberately — not everything in Appearance needs to be a canvas, only the two surfaces (Theme Studio, and by extension Homepage/Header/Footer) where visual arrangement is the actual task.

### 3.3 Overview screen (workspace home)

A quiet landing screen, not a dashboard with KPIs (Appearance has none, per §0's own "no performance number, a configuration workspace" pattern already established for Settings, Blueprint §1.8) — three real things only:

1. **Current state**: active theme name + a live thumbnail (server-rendered screenshot or a lightweight live iframe preview — §9), last published date/time, last published by (staff attribution, real — every Admin action already carries a real `updated_by`/audit pattern, confirmed platform-wide).
2. **Unpublished changes indicator**: "You have unpublished changes to Homepage" (or none) — a real, honest draft/published distinction (§10), never silently implied.
3. **Quick actions**: Open Theme Studio · Edit Branding · View Theme Library · View live Storefront.

### 3.4 Theme Studio's own three-pane layout

Full detail in §5. In summary: **left sidebar** (page/archetype switcher + Section list + Section library), **center canvas** (the live, direct-manipulation preview), **right inspector** (the selected Section/Block's own configuration form, generated from that primitive's real Zod Schema — `CMS_FOUNDATION_ARCHITECTURE.md` §3). A persistent top toolbar carries: page/archetype switcher, responsive-preview toggle (§9), undo/redo (§5.5), Draft/Published state indicator, Preview, and Publish (§10).

---

## 4. Backend requirements — exactly what is missing, nothing invented

This is the section most at risk of inventing an API, so every line below is qualified by what was directly confirmed versus what is proposed and requires `MODULE:AUTHORITY` review before a line of it is built.

### 4.1 What already, genuinely exists and can be reused as-is

| Capability | Real source | Reusable for Appearance as |
|---|---|---|
| File/asset upload, storage-agnostic URL resolution, alt text, soft-delete/restore | `App\Domains\Platform\Media\Models\MediaAsset` + `UploadMediaAction`/`DeleteMediaAction`/`RestoreMediaAction`/`UpdateMediaAltTextAction`, real routes at `POST/GET/PATCH/DELETE /api/v1/media`, permissions `media.assets.view`/`media.assets.manage` | The exact mechanism for logo/favicon/hero-image upload — a brand logo is a `media_id` reference, never a raw URL, exactly as `THEME_ENGINE_ARCHITECTURE.md` §8 already specifies ("a Media-module asset identifier, per `MODULE:MEDIA`, never a raw URL") |
| A real, versioned, audited, tenant-scoped aggregate-root pattern | `Store.php` — `HasOptimisticLocking`, `SoftDeletes`, `lock_version`, `tenant_id` (designed-in, single-default-tenant exercised — confirmed from source) | The exact pattern any new Appearance table should follow — not a new pattern to invent |
| Signed, time-limited preview tokens with no dependency on what's being previewed | `apps/store-api-gateway/src/routes/preview.ts` — `POST /preview/mint` (`kind: 'cms' \| 'theme' \| 'landing' \| 'draft'`, `targetId`), `GET /preview/resolve` | Theme Studio's live-preview and shareable-preview-link mechanism (§9) — `kind: 'theme'` already exists as an accepted enum value, unused only because nothing calls it yet |
| Theme resolution contract, fallback-to-default guarantee, token-override shape, `extends`/inheritance shape | `THEME_ENGINE_ARCHITECTURE.md` §§2–9 (`ThemePackage` interface, `ThemeTemplate` interface) | The real target shape every backend table in §4.2 below exists to persist and serve |
| 14 real, working default primitive implementations, data-in/markup-out | `packages/storefront-engine/src/primitives/*`, `packages/ui`'s own primitive contracts, `docs/frontend/STOREFRONT_COMPONENT_ENGINE.md` §2 | What Theme Studio's canvas actually renders per Section — no new rendering engine needed |
| Section/Block/Widget content-tree shape, Visibility, Scheduling, Localization overlay | `CMS_FOUNDATION_ARCHITECTURE.md` §§2–6 | The real target shape Homepage Builder's own persistence (§4.2) must match — an Accepted, reviewed shape, not this document's own invention |
| A real, matching, filterable navigation/module-registration mechanism | `apps/admin/src/registry/moduleRegistry.ts` | Zero Admin Shell change required to add this workspace (§1.3) |
| Permission-naming convention, per-module `PermissionRegistry`, seeder-synced into a shared `permissions` table | `StoreConfiguration`'s and `Media`'s own `PermissionRegistry.php` | The exact pattern Appearance's own new permissions (§11) must follow |

### 4.2 What is genuinely missing — the real, additive backend work required

**(a) `Store` has zero branding fields.** Confirmed directly from `Store.php`'s own `$fillable` and PHPDoc block: `name, legal_name, currency_code, locale, timezone, contact_email, contact_phone, address_line1, address_line2, city, region, postal_code, country_code, status, lock_version`. No `logo_media_id`, no brand color, no theme reference, no favicon, nothing. `BETA_EXPERIENCE_MAP.md` §1.3 already named this precisely: *"merchant-configurable branding is not a Settings-screen gap alone — it is a backend data-model gap first."* Two real options, not a decision this document makes:

  - **Option A**: add branding columns directly to `stores`. Simple, but couples a fast-moving, versioned concern (brand color changes far more often than a legal name) to the same row/lock as core business identity — every branding edit would increment `Store.lock_version`, a real risk of spurious `409` conflicts against unrelated Store-identity edits happening concurrently (a real, if narrow, operational risk `HasOptimisticLocking`'s own design is meant to surface, not hide).
  - **Option B (recommended)**: a new `store_appearances` table, one row per store (`store_id` unique FK, its own `lock_version`), owning: `logo_media_id` (nullable FK → `media_assets.id`), `favicon_media_id` (nullable FK), `primary_color`, `accent_color` (hex strings, validated server-side), `font_heading`, `font_body` (enum or string, matched against a curated list — §7), `active_theme_id` (nullable FK → the new `themes` table, (b) below). This keeps Store's own identity/legal/tax concerns and a store's *look* as two independently-versioned aggregates, matching `HasOptimisticLocking`'s own real design intent, and matches `THEME_ENGINE_ARCHITECTURE.md` §3 step 2's own framing of "a real 'active theme' field... the natural owner of this setting" without literally cramming it onto the same row as `contact_email`.

**(b) No `themes` table exists at all.** Needed: `id`, `tenant_id`, `name`, `status` (`installed` / `draft` / `published` — §8), `components_config` / `tokens_config` (JSON, matching `ThemePackage.tokens`'s own shape — §2.3 of the Theme Engine doc), `templates_config` (JSON, matching `ThemeTemplate` — §6), `extends_theme_id` (nullable self-FK, matching §9's `extends`), `supports_dark_mode` (boolean, matching §8's `supportsDarkMode`), `lock_version`. This table is the real, durable home for what `ThemePackage` (a TypeScript *interface* today, never persisted) actually becomes as data.

**(c) No `theme_versions` table exists.** Needed for §10's own "safe publishing with version history" and §8's "Rollback": `id`, `theme_id` (FK), `snapshot` (a full JSON snapshot of that theme's own config at publish time — never a diff, so a rollback is a real, simple "restore this exact snapshot," not a replay of edits), `published_by` (FK → `users`), `published_at`, `label` (optional, merchant-supplied, e.g. "Eid campaign homepage").

**(d) No Page/Section/Block/Widget persistence exists anywhere.** This is the single largest real gap, confirmed directly from `CMS_FOUNDATION_ARCHITECTURE.md` §7's own words: *"No backend persistence. Nothing in this document has a `database/migrations/` counterpart yet... an explicit, deliberate non-decision."* Homepage Builder (§6) cannot persist a single real change without this. Two real, honestly-different-sized options:
  - **Full CMS persistence** (`pages`, `sections`, `blocks`, `widgets` tables, matching `CMS_FOUNDATION_ARCHITECTURE.md` §2's tree exactly) — the architecturally "correct," complete answer, but a genuinely large scope: multi-page, localized, scheduled, audience-targeted content for the *entire* Storefront, not just Appearance's own concern.
  - **A narrower, Appearance-scoped `theme_page_sections` table** (recommended for the first Experience Pack, §14) — persists exactly the Section list for the small, fixed set of archetypes Appearance itself needs first (`homepage`, `header`, `footer`), using the identical `Section` shape (`id`, `type`, `configuration` JSON, `visibility` JSON, `position`) but scoped to `theme_id` rather than an arbitrary merchant-authored `Page`. This is explicitly a **subset** of the real, Accepted CMS shape, not a competing one — the moment full CMS persistence is built (a separate, larger, `MODULE:AUTHORITY`-governed decision this document does not make), `theme_page_sections` rows migrate cleanly into real `pages`/`sections` rows with zero shape mismatch, because the column shapes were deliberately kept identical from day one.

**(e) No `menus` / `menu_items` tables exist.** Needed: `menus` (`id`, `tenant_id`, `name`, `location` — e.g. `header-primary`, `footer-primary`, matching how a Theme's Header/Footer Section would reference a menu by a stable slug, not a hardcoded id), `menu_items` (`id`, `menu_id`, `label`, `url` or `linked_resource` — a Category/Collection/Brand/Product id + type, so a menu link can be a real, resolvable internal reference rather than a raw string the merchant has to keep in sync by hand — `position`, `parent_id` for one level of nesting, matching a realistic header dropdown).

**(f) No custom-code storage exists.** Needed only for §11's own narrower "Advanced" surface: a `custom_css` / `custom_head_html` text column, most naturally on `store_appearances` (b) or `themes` (b), sanitized/sandboxed at render time (out of this document's own scope to design the sanitization mechanism — named as a real, required security review item before this specific sub-feature ships, not before the rest of Appearance does).

### 4.3 The formal process this backend work must go through

Every table above is new, additive, backward-compatible (nothing here modifies an existing table's own meaning) — but per `00_PROJECT_GOVERNANCE.md`'s own `GOVERNANCE:MODULE_AUTHORITY`, a genuinely new module boundary (whether this is added to `StoreConfiguration`, added to `Media`, or proposed as a new `Appearance` domain module under `Platform` — a real, undecided question this document does not resolve) requires formal addition to `04_MODULE_ARCHITECTURE.md`, the same process Search went through at v1.5 and CMS/Landing/CDP/Insights/Marketplace each already went through to reach their own current Draft status. **This specification is the input to that proposal, not a substitute for it.**

---

## 5. Theme Studio

### 5.1 Left sidebar

- **Page/archetype switcher** (top): Home · Header · Footer · (future: Product, Category, Cart, once those archetypes are in scope — not this pack, §14) — switching re-points the canvas and the Section list below at that archetype's own `ThemeTemplate.defaultSections`-seeded or already-customized Section list (§6 governs exactly how a new page starts).
- **Section list** (the current page's own ordered tree): every Section currently on this page, in render order, drag-reorderable, each row showing its own primitive name/icon (from the real 14-primitive inventory, `STOREFRONT_COMPONENT_ENGINE.md` §2) + a visibility toggle (real, `always`/`hidden` — `CMS_FOUNDATION_ARCHITECTURE.md` §4) + a Block-count badge if the Section has children (FAQ, Testimonials).
- **Add Section** (bottom, or a floating `+`): opens the **Section library** — every primitive this Theme (or its parent, if a child theme — §8/§9) provides a `components` entry for, grouped by purpose (Merchandising: ProductGrid/CategoryGrid/FlashSale/UpsellBlock/CrossSellBlock/RecentlyViewed/RecommendedProducts; Trust & Content: TrustBar/Testimonials/FAQ/Banner; Hero & Brand: Hero/BrandSlider) — never a flat alphabetical dump.

### 5.2 Visual canvas

A live, direct-manipulation render of the actual Storefront primitives (§4.1's real 14 implementations), not a mockup or an approximation — the same component that will render for a real customer, fed the Section's own real `configuration` plus real sample/live data (a real product query for a `ProductGrid` Section, not a fabricated placeholder grid — matching `PRINCIPLES:EXPLICIT_FAILURE`'s "never fake data" discipline extended to the editor itself). Click a Section to select it (opens the Inspector, §5.3); drag to reorder; a subtle insertion indicator shows where a dragged or newly-added Section will land. The canvas is the actual responsive-preview surface (§9) — switching Desktop/Tablet/Mobile resizes this same canvas, it does not open a second view.

### 5.3 Right inspector

The selected Section's own configuration form, generated directly from that primitive's real Zod Schema (`CMS_FOUNDATION_ARCHITECTURE.md` §3 — "the single source of truth for... what a future visual editor renders as its own configuration form"). This is not a new form-generation mechanism to invent: `apps/admin` already generates real, validated forms from Zod schemas platform-wide (React Hook Form + `@hookform/resolvers/zod`, confirmed the established pattern across every Catalog/Pricing/Shipping form built this engagement) — the Inspector reuses that exact toolchain against a Section's own Schema instead of a `Create{X}Request`-derived one. A Section with Blocks (FAQ, Testimonials) shows a real, add/remove/reorder list of Block entries inside the same Inspector, each Block's own fields following the identical Schema-driven pattern.

### 5.4 Responsive preview

Desktop / Tablet / Mobile — three real breakpoint widths (reusing `packages/tokens`' own real, Accepted breakpoint values, `DESIGN_SYSTEM.md` §1.6, "Responsive Rules" — never inventing new breakpoints Appearance owns independently) applied to the canvas (§5.2) via a resized iframe or an equivalent real-viewport-width render — not a scaled-down thumbnail, since a scaled thumbnail would misrepresent real text-wrap/overflow behavior a merchant needs to actually see. Full detail: §9.

### 5.5 Undo / redo

Operates on the **draft** (§10) only — every Section add/remove/reorder/configuration-edit is one entry in a local, per-session undo stack (standard command-pattern history, no new architecture required — this is client-side editor state, not a backend concern) until the merchant explicitly **saves the draft** (persists to `theme_page_sections`/`pages`, §4.2(d)) or **discards**. Undo/redo does not reach across a save boundary — once saved, "undo" further back is a Version History rollback (§10), a fundamentally different, server-recorded operation, not a client-side history entry. This distinction is stated explicitly because conflating the two (making undo silently reach into published history) would be a real trust violation of the "safe publishing" bar §10 sets.

### 5.6 Draft

The default, always-current working state — every Theme Studio edit is a draft edit until Publish (§10) is pressed. A draft is real, persisted (§4.2(d)), and survives a closed tab/browser crash (server-saved, not only in-memory undo history) — a merchant should never lose work because they closed the tab mid-edit.

### 5.7 Publish

Full flow: §10.

### 5.8 Rollback

Full flow: §8 (Theme Library) and §10 (Publish flow's own version-history consequence).

---

## 6. Homepage Builder

Per §1.2, Homepage Builder is Theme Studio's canvas (§5) with the page switcher set to the `homepage` archetype — every mechanism named in §5 applies here without modification. What's specific to homepage, restated for completeness since the brief asks for it as its own numbered capability:

- **Starting point for a brand-new store**: seeded from the active theme's own `ThemeTemplate` for `archetype: 'homepage'` (`THEME_ENGINE_ARCHITECTURE.md` §6) — realistically `Hero`, `CategoryGrid`, `TrustBar`, and one or two merchandising rails (`ProductGrid`/`RecommendedProducts`), matching `CUSTOMER_EXPERIENCE_ARCHITECTURE.md` §2's own named realistic default composition (`Hero`, `CategoryGrid`, `FlashSale`, `TrustBar`, `Testimonials`) — never a blank canvas for a first-time merchant, per §6's own "always renders something" guarantee extended from rendering to *authoring*.
- **A merchant edits without code**: add a `FlashSale` Section for a real sale, reorder `CategoryGrid` above `TrustBar`, remove a rail they don't want, edit `Hero`'s own heading/subheading/image/CTA directly in the Inspector (§5.3) — every one of these is a real, already-specified Section-tree operation (`CMS_FOUNDATION_ARCHITECTURE.md` §2), none requiring a deploy or a developer.
- **Real data, not fabricated preview data**: a `ProductGrid` Section added to the homepage in Theme Studio queries the real Catalog (the same query the live Storefront's own homepage already runs, confirmed real, `apps/storefront`'s existing 5 independently-fetched sections) — a merchant sees their real, current products while arranging the page, never a placeholder grid.
- **Directly replaces the literal hardcoded hero copy** `BETA_EXPERIENCE_MAP.md` §2.2 and `EVIDENCE_BASED_PLATFORM_AUDIT.md` Part 5 both independently confirmed still exists today (`"Welcome to the store"` / `"Real products, real prices, one system — never two that can drift apart."`, `apps/storefront/src/app/page.tsx`'s own current default) — this is the concrete, named "before" state Homepage Builder replaces with real, merchant-authored content.

---

## 7. Branding

### 7.1 What gets stored, and how

Per §4.2(a)/(f): a new `store_appearances` row per store, holding `logo_media_id`, `favicon_media_id` (both real `media_assets.id` references — never a raw uploaded-file URL baked into a column, so a re-upload or a storage-disk migration never breaks a stale reference, exactly the discoverability guarantee `MediaAsset::url()`'s own storage-agnostic design already provides every other consumer), `primary_color`/`accent_color` (hex, server-validated), `font_heading`/`font_body`.

### 7.2 Logo & favicon

Upload flow reuses the real `POST /api/v1/media` endpoint directly (§4.1) — the Admin UI is a thin, real upload widget (already an established pattern; Catalog's own Product Media tab already uploads through this exact endpoint) that, on success, writes the returned `media_id` into `store_appearances.logo_media_id`. Favicon gets its own upload slot, its own `media_id` column, and its own real constraint the UI enforces before ever calling the backend: square aspect ratio, a small real max dimension (e.g. 512×512, matching common favicon generation practice) — client-side validation as a courtesy, server-side validation (via `UploadMediaRequest`, already real) as the actual guarantee.

### 7.3 Colors

Two real semantic roles to start, deliberately narrow rather than an open palette: `primary_color` (maps to `packages/tokens`' own real `color.brand.default/.hover/.active` semantic roles once the Theme Engine's own token-override mechanism, §2.3/§7 of `THEME_ENGINE_ARCHITECTURE.md`, actually consumes it — this document does not invent a fifth semantic color category, per that document's own explicit "additive, never structural" rule) and `accent_color` (a second, distinct role for secondary CTAs/highlights, not yet a named token role in `DESIGN_SYSTEM.md` §1.1 — a real, small addition that document's own governance would need to formally accept before Appearance can consume it, named honestly as a dependency, not assumed). A real, live contrast check runs the moment a color is set (`BETA_EXPERIENCE_BLUEPRINT.md` §1.9's own named AI example: *"Your brand color has low contrast against your button text — this may fail accessibility"*) — a real, buildable check (WCAG contrast ratio math against the fixed white/near-black text colors buttons actually render with) requiring no new backend capability, pure client-side computation against the real, already-known token pairing.

### 7.4 Typography

A curated list of font pairings (heading font + body font), not a raw Google-Fonts-style search — matching `NEXGEN_PRODUCT_MASTER_VISION.md` §14's "simple by default" principle and avoiding the real risk of a merchant picking a genuinely illegible or brand-mismatched pairing with no guardrail. The list itself is a small, versioned, code-defined constant (mirroring how `PAYMENT_METHOD_LABELS`/`REAL_BACKEND_PAYMENT_METHODS` are already real, code-defined constants elsewhere in this platform, not a database table) — a real, working, finite set from day one, expandable by a future release without a schema change (`font_heading`/`font_body` are plain strings, not enum-constrained at the database layer).

### 7.5 Brand Assets

A filtered view of the real Media Library (`GET /api/v1/media`, already real, already paginated) scoped to assets tagged or used as brand assets (logo, favicon, any hero imagery uploaded through Theme Studio) — not a second, separate asset-storage mechanism. This is presentation-layer filtering over one real, existing data source, never a new upload pipeline.

---

## 8. Theme Library

Given the honest gap named in §13 (no real Theme Package has ever been built — `THEME_ENGINE_ARCHITECTURE.md` §2.4's own words: *"No Theme Package exists yet"*), Theme Library's own real, launchable scope is narrower than the brief's full list until more of §4.2 lands. What each capability means, and its real current status:

- **Installed themes**: the `themes` table (§4.2(b)) rows a given tenant has. Today, this would be exactly one row — `nexgen-default`, the platform's own first theme, itself not yet built (§13) — the moment it exists, "installed" is trivially true for every store by default, with no install *action* to build yet (no external theme source exists to install *from* — that's §10 of the Theme Engine doc, explicitly Draft/future/marketplace-only).
- **Draft**: a theme (or, more precisely per §4.2(d)'s recommended scoping, a theme's *page content*) with unpublished changes — real, backed by `theme_page_sections` rows with no corresponding `theme_versions` snapshot yet.
- **Published**: the theme configuration currently live on the Storefront — the most recent `theme_versions` row (§4.2(c)), resolved at request time exactly as `THEME_ENGINE_ARCHITECTURE.md` §3 already specifies.
- **Clone**: duplicate an existing theme's own full config (`components_config`/`tokens_config`/`templates_config` + its current `theme_page_sections`) into a new `themes` row with a new `id` and `name` — a real, mechanical row-copy operation once §4.2(b)/(d) exist; no new mechanism beyond "insert a copy."
- **Import / Export**: export = serialize a theme's own full config (§4.2(b)) plus its current Section trees (§4.2(d)) to a real, downloadable JSON file matching the `ThemePackage`/`ThemeTemplate` shapes exactly (`THEME_ENGINE_ARCHITECTURE.md` §§2.3/6) — a real, portable artifact, not a proprietary format. Import = the reverse, validated against those same real TypeScript-mirrored Zod schemas before being written. **Honestly named as later scope** (§14) — valuable, but not required for the first Experience Pack, since there is nothing to import *from* until a second real theme or a real export exists to test against.
- **Rollback**: restore a `theme_versions` snapshot as the current published state — a real, already-designed mechanism (§4.2(c)'s own "a full JSON snapshot... never a diff, so a rollback is a real, simple 'restore this exact snapshot'"). Full flow: §10.

---

## 9. Preview

Desktop / Tablet / Mobile, as specified in §5.4, using the real breakpoint values `packages/tokens` already defines (`DESIGN_SYSTEM.md` §1.6) — never a second, Appearance-owned breakpoint definition.

**Live preview mechanism**: the real Gateway Preview Framework (§4.1) — `POST /preview/mint` with `{kind: 'theme', targetId: <theme_id or draft revision id>}` returns a signed, time-limited token; the Storefront's own real rendering path (once it consumes `theme_page_sections`/`Store.active_theme_id`, §4.2) is extended to accept `?previewToken=`, resolve it via `GET /preview/resolve`, and render the **draft** state instead of the published one for that one request — the same real token mechanism `kind: 'cms'`/`'landing'`/`'draft'` already support for their own eventual consumers, applied to `kind: 'theme'` for the first time. This is a real, already-tested (`test/unit/preview/token.test.ts`, confirmed real and passing this session) mechanism being *used*, not a new one being invented.

**Shareable preview links**: a direct, real consequence of the mechanism above — the minted token is a URL query parameter, so "share this preview with a colleague before publishing" is already the token's own real capability, requiring no additional backend work beyond what §4.2 and the Storefront-side consumption above already require.

---

## 10. Publish flow — safe publishing with version history

1. Merchant clicks **Publish** in Theme Studio's own persistent toolbar (§5).
2. A confirmation step shows a real, honest diff summary — "3 Sections changed on Homepage, 1 Section added" (a real comparison between the current draft's `theme_page_sections` rows and the most recent `theme_versions` snapshot, not a fabricated count) — never a bare "Are you sure?" with no information about what's actually changing.
3. On confirm: the backend (a) writes a new `theme_versions` row — a full snapshot of the theme's current resolved config + Section trees, `published_by` = the real authenticated staff user, `published_at` = now; (b) the resolution step `THEME_ENGINE_ARCHITECTURE.md` §3 already specifies (Core looks up `Store.active_theme_id` → resolves that theme's *published* state) now serves this new snapshot to real customers on their very next request — no deploy, no cache-purge step beyond what the Storefront's own existing ISR/ Gateway-cache invalidation already handles for any other content change (a real, already-solved problem elsewhere in this platform, not a new one Appearance introduces).
4. The draft state (`theme_page_sections`) is **not cleared** after publish — it simply now matches the newly-published snapshot exactly, so the merchant's very next edit starts from "currently published," never from an empty page.
5. **Rollback**: from Version History (§1.1) or Theme Library (§8), select any prior `theme_versions` row → **Restore this version** → a new `theme_versions` row is created (a rollback is itself a real, audited publish event, never a silent history-rewrite) whose `snapshot` is a copy of the selected historical one, and the live Storefront reflects it immediately, identically to step 3 above. This means "roll back" and "publish" are, deliberately, the exact same underlying operation — one less mechanism to build, test, and reason about.

---

## 11. Permission model — who can edit appearance

Following the real, established `<module>.<resource>.<action>` convention (`StoreConfiguration`'s and `Media`'s own `PermissionRegistry.php`, confirmed the platform-wide pattern), a new `Appearance` `PermissionRegistry` would define:

| Permission | Grants |
|---|---|
| `appearance.branding.view` | See current logo/colors/typography |
| `appearance.branding.manage` | Upload logo/favicon, change colors/typography |
| `appearance.pages.view` | See Theme Studio's current draft/published state, read-only |
| `appearance.pages.manage` | Edit Sections/Blocks in Theme Studio, save drafts |
| `appearance.themes.view` | Browse Theme Library |
| `appearance.themes.manage` | Clone/import/export themes, switch a store's active theme |
| `appearance.themes.publish` | **Deliberately separate from `.pages.manage`** — publish a draft live, or roll back to a prior version |
| `appearance.menus.manage` | Edit Header/Footer menu structures |
| `appearance.custom_code.manage` | **Deliberately its own, narrower permission**, not implied by any of the above — custom CSS/HTML injection is a categorically different risk class (real script/style injection surface) than arranging Sections, and should require a distinct, consciously-granted permission the same way Settings' own "Payments & Couriers credential management" is treated as more sensitive than "Store Info" (`BETA_EXPERIENCE_BLUEPRINT.md` §1.8's own implicit tiering) |
| `appearance.audit_log.view` | View Appearance's own audit trail (real, platform-wide pattern — every domain already has one, `AuditLogController`/`AuditLogger` confirmed present in both `StoreConfiguration` and `Media`) |

**Why `.manage` and `.publish` are split**, concretely: this is the real, natural first instance of `NEXGEN_PRODUCT_MASTER_VISION.md` §10's own named "Approval Flows" concept (*"a real workflow layer... for the actions that need a second signature"*) — a growing team's Marketing/Content staff can be granted `appearance.pages.manage` to build and preview freely, while only a Store Manager/Owner role template holds `appearance.themes.publish`, so nothing goes live without a second, more senior set of eyes, without building any new approval-workflow infrastructure to get that benefit on day one — the split permission alone achieves it.

**Role template mapping** (using Vision §10's own named role-template concept, not yet built as a distinct mechanism — today this is a literal, direct grant of the permissions above to whichever real Role a store's staff structure uses, `Identity & Access`'s already-real RBAC): Owner/Admin — all Appearance permissions. A "Content Editor" template — `branding.view`, `pages.view`, `pages.manage`, `menus.manage`, `themes.view` — can build and preview, cannot publish or touch custom code. A "Store Manager" template — everything above plus `themes.publish` and `themes.manage`. `custom_code.manage` granted individually, never bundled into a template by default, matching its own named risk tier.

---

## 12. Future SaaS readiness — how Appearance works in a multi-tenant environment

`NEXGEN_PRODUCT_MASTER_VISION.md` §12 names the real architectural gap plainly: *"today: one hardcoded default tenant, platform-wide... A real multi-tenant model is the single technical precondition every other item below depends on."* Appearance does not solve that gap — no document proposes solving it here — but it must not make it *harder* to solve later, and the real, already-established pattern already shows the way:

- Every table proposed in §4.2 carries `tenant_id` from its very first migration, **exactly matching `Store.php`'s and `MediaAsset.php`'s own real, current, already-shipped pattern** (`TenantId::DEFAULT` on create, an unexercised-but-present column) — this is not new discipline invented for Appearance; it is copying what every real Platform-domain model in this codebase already does today, single-tenant in practice, tenant-scoped in shape.
- A theme, a store's branding, and a menu are all naturally **store-scoped, not tenant-scoped globally** — an enterprise merchant with multiple stores under one tenant (`NEXGEN_PRODUCT_MASTER_VISION.md` §10's own "Multi-brand & Franchise... an enterprise merchant is, architecturally, a tenant with multiple stores under one billing relationship") gets independently-themed stores for free, structurally, the moment `store_appearances`/`themes` key off `store_id` (already true in this spec's own §4.2 design) rather than `tenant_id` directly — no redesign required when multi-store ships, only a real, additive UI affordance (a store switcher) this document does not need to design.
- **Theme Marketplace readiness** (`THEME_ENGINE_ARCHITECTURE.md` §10, Draft, future) is the SaaS-adjacent extension this spec's own §4.2(b) `themes` table shape was deliberately kept compatible with: `extends_theme_id` (child-theme inheritance, §9 of that document) and the plain, self-contained `ThemePackage` JSON shape are exactly "the sandboxing boundary a third-party-authored theme would need to be safe to install," per that document's own §10 — this spec does not build a marketplace, but its own data shapes do not need to change when one is eventually proposed.
- **Data ownership** (`NEXGEN_PRODUCT_MASTER_VISION.md` §14: *"Full export, always, in a real usable format, for every tenant"*) is directly satisfied by §8's own real Export capability — a merchant's brand identity and theme configuration are never locked into a proprietary, non-portable format, self-hosted or SaaS, by the same design that makes Import/Export/Clone real in the first place.

---

## 13. Gap analysis

| Item | Status | Evidence |
|---|---|---|
| Theme Engine resolution contract (`ThemePackage`, four-layer architecture, swap-safety rules) | **Architecture only, Accepted** | `THEME_ENGINE_ARCHITECTURE.md` §§1–5, Accepted 2026-08-08. Real TypeScript interface, zero rows of data ever persisted against it. |
| Templates, Design Token Hierarchy, Dark Mode/Brand Themes, Child Themes, Marketplace shape | **Architecture only, Draft — unreviewed** | `THEME_ENGINE_ARCHITECTURE.md` §§6–10, added 2026-08-17, explicitly "pending Product Owner review," not yet Accepted, not built. |
| CMS content model (Page/Section/Block/Widget, Visibility, Scheduling, Locales) | **Architecture only, Accepted** | `CMS_FOUNDATION_ARCHITECTURE.md`, Accepted, but its own §7 states plainly: "No backend persistence... No visual editor... Any actual Page, Section, or content" all explicitly not built. |
| 14 real default Storefront primitives (Hero, ProductGrid, TrustBar, etc.) | **Already implemented** | `packages/storefront-engine/src/primitives/*`, confirmed real, tested, in production use on the live Storefront today. |
| Media upload/storage/retrieval | **Already implemented** | `App\Domains\Platform\Media`, full real domain (Actions, Model, Controller, routes, permissions), confirmed from source. |
| Gateway Preview Framework (`/preview/mint`, `/preview/resolve`, `kind: 'theme'` already accepted) | **Already implemented, unused** | `apps/store-api-gateway/src/routes/preview.ts`, real, tested (`test/unit/preview/token.test.ts`), zero current caller for `kind: 'theme'` specifically. |
| Store branding fields (logo/favicon/color/typography) | **Missing entirely** | `Store.php`'s own `$fillable`/PHPDoc, directly confirmed, zero branding fields. |
| `Store.active_theme_id` | **Missing entirely** | Named as the exact gap in `THEME_ENGINE_ARCHITECTURE.md` §3 step 2's own words: "not added in Phase 2.0." Still not added. |
| `themes` / `theme_versions` tables | **Missing entirely** | No migration of this shape exists anywhere in `apps/backend/database/migrations/`. |
| Page/Section persistence (full CMS, or the narrower `theme_page_sections` alternative) | **Missing entirely** | `CMS_FOUNDATION_ARCHITECTURE.md` §7, confirmed directly, unchanged since that document's own 2026-08-08 acceptance. |
| `menus`/`menu_items` tables | **Missing entirely** | No such module, table, or route exists anywhere in the backend. |
| Custom code storage/sanitization | **Missing entirely** | No prior art anywhere in this platform for merchant-supplied CSS/HTML injection — a genuinely new, security-sensitive surface. |
| Admin "Appearance" module (navigation, any screen) | **Missing entirely** | Confirmed via `apps/admin/src/modules/index.ts` — no `appearance/module.js` import exists; confirmed via `BETA_EXPERIENCE_MAP.md` §1.4's own explicit listing of "Store branding/theme configuration" among workspaces that "do not exist as any screen, framework, or partial implementation." |
| Storefront's own theme-consumption wiring (Core resolving an active theme per §3 of the Theme Engine doc) | **Missing entirely** | No code path in `apps/storefront` currently reads any theme identifier — there is nothing to read yet (previous row) — every real page today renders through `packages/ui`'s own default primitives unconditionally, exactly matching the engine's own documented "no theme configured" fallback state, confirmed still the live, current behavior. |
| Real first theme (`nexgen-default` or equivalent) | **Missing entirely** | `THEME_ENGINE_ARCHITECTURE.md` §2.4's own words, unchanged: "No Theme Package exists yet... explicitly Phase 2.3+ scope." |

**Summary read**: Appearance today is **all engine, no product** — a genuinely real, Accepted (for §§1–5) or at-least-drafted (§§6–10) contract for what a theme *is*, a real, complete asset-upload mechanism, a real, unused preview-token mechanism, and real, already-built default components ready to be arranged — with zero backend persistence for a merchant's own configuration, zero Admin screen, and zero Storefront consumption of any of it. This is a genuinely favorable place to be building from: the hardest architectural thinking (the contract, the swap-safety rules, the rendering fallback guarantee) is already done and already reviewed; what remains is real, but is additive, sequenceable, and mechanical relative to that foundation, not a from-zero design problem.

---

## 14. Implementation roadmap — Experience Packs

Each pack below is independently shippable, ends in a real, demoable capability, and does not require the pack after it to be useful on its own — matching this engagement's own established "no fake data, no half-built UI shipped as done" discipline throughout every prior sprint.

### Pack 1 — Branding Foundation
**Backend**: `store_appearances` migration (§4.2(a): `logo_media_id`, `favicon_media_id`, `primary_color`, `accent_color`, `font_heading`, `font_body`), real `StoreAppearanceController`/Actions/Resource following the exact `StoreController`/`MediaController` pattern, new `appearance.branding.*` permissions.
**Admin**: the Appearance module registered (§1.3) with exactly **Overview** and **Branding** live; every other nav item present but honestly disabled/"coming soon," never hidden (matching this platform's own established "reachable, honestly inert" pattern over silently absent navigation).
**Storefront**: Core reads `store_appearances` for `<title>`, favicon `<link>`, header logo, and the real primary-color token override applied to `Button`'s brand-role classes — this alone directly, visibly answers the Product Owner's own original "generic template" complaint's single biggest lever, before any canvas editor exists at all.
**Demo-able outcome**: a merchant uploads a real logo and picks a real color; the live Storefront's header and buttons change immediately.

### Pack 2 — Theme Studio Shell & Live Preview
**Backend**: `themes` + `theme_versions` migrations (§4.2(b)/(c)), `Store.active_theme_id` column, Gateway wiring of `kind: 'theme'` preview-token consumption (§9) into the Storefront's real render path.
**Admin**: Theme Studio's three-pane shell (§5) live, but read-only against the *default* theme's own hardcoded fallback Sections (no editing yet) — Preview toggle (§9) fully functional, Publish disabled/named "coming soon" honestly.
**Demo-able outcome**: a merchant can open Theme Studio, see their real live Storefront rendered in-canvas, toggle Desktop/Tablet/Mobile, and share a real, working preview link — before a single Section can be edited.

### Pack 3 — Homepage Builder (editing + publishing)
**Backend**: `theme_page_sections` (§4.2(d), scoped to `homepage` archetype only this pack), real Section CRUD (add/remove/reorder/configure) matching `CMS_FOUNDATION_ARCHITECTURE.md` §2's shape, the real Publish flow (§10) writing real `theme_versions` snapshots.
**Admin**: full Theme Studio editing (§5.1–5.3, §5.5 undo/redo, §5.6 draft) for the `homepage` archetype specifically; Version History (§1.1) live for homepage only.
**Demo-able outcome**: the complete zero-to-published workflow in §2, end to end, for a homepage — the first real, no-code homepage edit this platform has ever supported.

### Pack 4 — Header, Footer, Menus
**Backend**: `menus`/`menu_items` migrations (§4.2(e)), extend `theme_page_sections` scope to `header`/`footer` archetypes.
**Admin**: **Menus** nav item live; Theme Studio's page switcher gains Header/Footer.
**Demo-able outcome**: a merchant restructures their site navigation and footer content without a deploy.

### Pack 5 — Theme Library: Clone, Import, Export
**Backend**: the real serialize/deserialize logic named in §8, validated against the real Zod-mirrored schemas.
**Admin**: Theme Library's full real feature set (§8) beyond the single-theme baseline Pack 2 already established.
**Demo-able outcome**: a merchant (or this engagement's own next phase) can clone the default theme into a real second variant and switch between them — the first real evidence the "swap a theme with zero code" promise `THEME_ENGINE_ARCHITECTURE.md` §1 exists to fulfill actually holds.

### Pack 6 — Custom Code (Advanced)
**Backend**: custom-code storage (§4.2(f)) plus a real, dedicated security review of the sanitization/sandboxing approach before this pack ships — explicitly named as its own gate, not a checkbox inside a larger pack's own review.
**Admin**: the **Custom Code (Advanced)** surface, gated behind its own permission (§11) and a real, explicit in-product warning before a merchant's first save.
**Demo-able outcome**: an advanced merchant/agency injects real custom CSS without needing a developer to touch the codebase — deliberately last, since it is the one capability in this entire roadmap with a real, distinct security profile the rest of Appearance does not share.

### What this roadmap deliberately excludes

A real, installable **second, third-party, or marketplace-sourced theme** (Theme Engine §10, "Future Marketplace Support," explicitly not scheduled to any phase); a **visual drag-and-drop cross-archetype template system** beyond the fixed Home/Header/Footer archetypes named above (Product/Category/Cart archetypes are a real, natural Pack 7+ extension of the identical mechanism, not named here as a numbered pack only because this document's own scope, per the brief, is Appearance's first-class existence, not a full site-builder's total page coverage); **audience-targeted Section visibility** (`CMS_FOUNDATION_ARCHITECTURE.md` §4's own named, explicitly-not-built future extension). None of these block Packs 1–6 from being real, complete, and valuable on their own.

---

## Stop

This is the complete Appearance Workspace specification requested. No code was written, no migration was created, no Admin module was registered, no commit was made. Every backend capability proposed in §4 requires the real `GOVERNANCE:MODULE_AUTHORITY` review named in §4.3 before implementation begins — this document is the input to that review, not a substitute for it. Awaiting direction on next steps, per instruction.
