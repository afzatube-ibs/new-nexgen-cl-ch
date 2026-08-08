# neXgen Core — CMS Foundation Architecture

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Owner** | Chief Software Architect & Lead Engineer |
| **Date** | 2026-08-08 |
| **Phase** | 2.0 — Frontend Architecture & Design (data model and architecture only — no CMS editor UI, and no backend implementation, exists yet) |
| **Scope boundary** | This is the reusable foundation that lets a merchant manage storefront content *visually, later*. It does not build a visual editor, does not build every CMS feature, and does not decide which module (a new `MODULE:CMS`, or an extension of an existing one) ultimately owns this data on the backend — that is a `MODULE:AUTHORITY`-governed decision for whichever phase actually implements it. |

---

## 1. Why This Exists Now, Before Any CMS Feature Is Built

`docs/frontend/THEME_ENGINE_ARCHITECTURE.md` §2.2 (Storefront Engine) already assumes CMS-authored content exists in the shape this document defines — Sections, each with a `type` and a `configuration`. Without settling that shape now, the Theme Engine's own contract would be built against an assumption instead of a real, reviewed data model. This document is that data model: the CMS *foundation*, not the CMS *product*.

---

## 2. The Content Model

```
Page
 └─ Section (ordered)
     └─ Block (ordered, optional — not every Section has children)
         └─ Widget (optional — a Block's own reusable sub-piece)
```

### 2.1 Section

The top-level, ordered unit of a page's own content tree — one Section maps to exactly one Storefront Component Engine primitive (`docs/frontend/STOREFRONT_COMPONENT_ENGINE.md` §2), e.g. a `type: "hero"` Section resolves to the `Hero` primitive.

```ts
interface Section {
  id: string;                    // stable identifier — never reused after deletion
  type: StorefrontPrimitiveName; // e.g. "hero", "product-grid", "flash-sale"
  configuration: unknown;        // validated against `type`'s own Schema (§3)
  visibility: Visibility;        // §4
  scheduling?: Scheduling;       // §5
  locales?: Record<LocaleCode, Partial<Section['configuration']>>; // §6
}
```

### 2.2 Block

A Section's own ordered children, for primitives that are themselves composed of repeatable pieces (e.g. `FAQ`'s own list of question/answer pairs, `Testimonials`' own list of quotes). Not every Section has Blocks — `Hero` has none; `FAQ` is essentially a Section that *is* a list of Blocks. A Block carries the same `visibility`/`scheduling`/`locales` shape as a Section, so an individual FAQ item can be scheduled or localized independently of its parent Section.

### 2.3 Widget

A smaller, reusable piece embeddable *within* a Block, when a Block's own content is itself composed of independently-configurable sub-pieces (e.g. a `Countdown` widget embedded inside a `FlashSale` Section's own promotional Block, configured with its own `endsAt` independent of the Block's other content). Widgets exist as their own model specifically so a Storefront Component Engine primitive like `Countdown` (`docs/frontend/STOREFRONT_COMPONENT_ENGINE.md` §2) can be reused *inside* another primitive's own content, not only as a top-level Section.

---

## 3. Schemas

Every Storefront Component Engine primitive that can be CMS-authored declares its own **Schema** — a Zod schema (matching `ADR-0005`'s own forms-validation choice, reused here for consistency rather than introducing a second schema language) describing exactly what `configuration` shape that primitive's Section accepts. This is the same "reused, not reinvented" instinct behind every backend module's own `Http\Requests\*Request` validation:

```ts
const heroSchema = z.object({
  heading: z.string().min(1).max(120),
  subheading: z.string().max(240).optional(),
  image: z.object({ url: z.string().url(), alt: z.string() }),
  cta: z.object({ label: z.string(), href: z.string() }).optional(),
});
```

A Schema is the single source of truth for three things at once: (1) what a future visual editor renders as its own configuration form for that Section type, (2) what the Storefront Engine validates a stored Section's `configuration` against before ever passing it to a primitive (never trust stored content blindly — the same `PRINCIPLES:EXPLICIT_FAILURE` reasoning the backend applies to its own `Http\Requests\*Request` classes), and (3) the TypeScript type the primitive's own props contract (`docs/frontend/STOREFRONT_COMPONENT_ENGINE.md` §2) is inferred from — one definition, not three independently-maintained ones.

---

## 4. Visibility

```ts
type Visibility =
  | { mode: 'always' }
  | { mode: 'hidden' }
  | { mode: 'audience'; segment: string }; // named, not built — see §7
```

`always`/`hidden` are real, functional states from the first implementation. `audience`-targeted visibility (show this Section only to a specific customer segment) is named in the type now, specifically so the Schema/storage shape never needs to change to add it later, but is **not implemented** in Phase 2.0 — no audience-segmentation capability exists anywhere in this platform yet (Customers module, Phase 1, has no segment concept), and building one is explicitly out of this phase's scope.

---

## 5. Scheduling

```ts
interface Scheduling {
  startsAt?: ISODateString;
  endsAt?: ISODateString;
}
```

A Section (or Block/Widget) with a `scheduling` value is treated as `visibility: { mode: 'hidden' }` outside the `[startsAt, endsAt)` window, evaluated at request time by the Storefront Engine (`docs/frontend/THEME_ENGINE_ARCHITECTURE.md` §2.2) before a Section is ever handed to a primitive for rendering — this is also the mechanism `docs/frontend/ADR-0006`'s own per-Section ISR revalidation hint should key off, once implemented: a Section approaching its own `endsAt` needs a shorter revalidation window than one with no schedule at all, so the storefront never serves a stale "still running" Flash Sale past its real end time.

---

## 6. Localization

```ts
locales?: Record<LocaleCode, Partial<Configuration>>
```

A Section's `configuration` is authored once in a base locale; any other locale entry only needs to override the fields that actually differ (a translated `heading`, not a re-authored `image`) — a deep-partial overlay, not a full duplicate per locale. `LocaleCode` is the same locale identifier space the backend's own Localization module (Phase 1) already owns and exposes (`GET /api/v1/locales`) — this document does not invent a second locale registry; the CMS foundation *consumes* the backend's existing one.

---

## 7. What Is Explicitly Not Built in Phase 2.0

Per this document's own scope boundary and Phase 2.0's platform-wide "do not implement yet" list:

- **No visual editor** — no drag-and-drop page builder, no live preview, no Section-configuration form renderer. The Schema (§3) is what a future editor is built *against*; building the editor itself is a real, separate, substantial piece of work for a later phase.
- **No backend persistence.** Nothing in this document has a `database/migrations/` counterpart yet — where Page/Section/Block/Widget data actually lives (a new Platform or Commerce-domain module, per `MODULE:AUTHORITY`) is an explicit, deliberate non-decision here, left to whichever future phase actually builds CMS persistence, at which point `docs/04_MODULE_ARCHITECTURE.md` gets the same formal boundary-definition treatment every other module has received (most recently Search, v1.5).
- **Audience-targeted visibility** (§4) and any analytics/A-B-testing layer on top of Scheduling (§5) — named as future extension points, not built.
- **Any actual Page, Section, or content** — this document defines the shape; Phase 2.3 (Landing & Conversion Engine) and beyond is where real content is authored.
