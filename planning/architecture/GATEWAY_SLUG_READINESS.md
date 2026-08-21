# Store API Gateway — Slug Readiness

| Field | Value |
|---|---|
| **Status** | Research — documentation only, per this phase's own "Do NOT modify Commerce modules" rule |
| **Date** | 2026-08-18 |
| **Origin** | First identified live, Phase 4.1 Slice 1 (`PHASE_4_1_STORE_API_GATEWAY_SLICE1_REPORT.md` §6.1). This document is the deeper research pass that finding's own recommendation asked for. |

---

## 1. The Gap, Precisely

Confirmed by direct code read this session and Slice 1's own live verification: `ProductController::show()`, `CategoryController::show()`, and `BrandController::show()` all use plain Laravel route-model binding on the primary key (`id`, a UUID) — none of the three models overrides `getRouteKeyName()`. `index()` on all three supports only non-slug filters (`status`, `visibility`, `brand_id`, `category_id`, `parent_id`) plus, for Products only, a `search` filter matching `name`/`sku` — **never `slug`**. There is no code path anywhere in the real Catalog backend that resolves an entity by its own `slug` field, even though every list/detail response already includes `slug` as real, stored data.

## 2. Why This Blocks Real Storefront URLs

`STORE_FRONTEND_ARCHITECTURE.md` §1.1 specifies `/products/[slug]`, `/categories/[slug]`, `/brands/[slug]` as the Storefront's own intended URL scheme — the SEO-legible, human-readable convention every real commerce storefront uses (never `/products/019fe82d-0e24-...`). Without a slug lookup, the Gateway can only serve `:id`-shaped detail routes (Slice 1's own honest, current implementation) — a real Storefront built against only these routes would need to carry the UUID through every internal link, which defeats the SEO purpose of having a slug at all.

## 3. The Concrete, Minimal Backend Change (recommended, not made)

Two independent, additive options — either alone is sufficient; recommending the first as simpler and more consistent with this backend's own existing per-field-filter convention:

### Option A — a `slug` exact-match query filter on each entity's `index()` (recommended)

```php
if ($request->filled('slug')) {
    $query->where('slug', $request->string('slug')->toString());
}
```

Added identically to `ProductController::index()`, `CategoryController::index()`, `BrandController::index()` — the same one-line pattern those methods already use for `status`/`brand_id`/`parent_id`. A caller (this Gateway) then resolves `GET /products?slug=premium-wireless-headphones` and reads `data[0]` — no route-model-binding change, no new endpoint, fully backward compatible, zero risk to any existing caller (including the Catalog admin UI, unaffected since it never sends `slug`).

### Option B — `getRouteKeyName()` override, dual-mode binding

```php
public function getRouteKeyName(): string
{
    return 'slug'; // or a custom resolveRouteBinding() supporting either UUID or slug
}
```

Rejected as the *recommended* option (though technically valid): this would change `show()`'s own binding for every existing caller, including the admin UI's own already-frozen Product/Category/Brand Editors (`apps/admin`), which currently pass the real UUID in every URL/link — a materially larger, riskier, cross-cutting change for the same outcome Option A achieves additively.

## 4. What Would Change in This Gateway Once Option A Ships

Minimal, isolated to `backend/client.ts` and `routes/catalog.ts`:

1. `backend/client.ts` gains no new method — the existing `getList` already supports arbitrary query params; `?slug=` is simply a new key in the `query` object.
2. `routes/catalog.ts`'s `:id` param becomes an `:identifier` param, resolved via a small, new seam (see §5) that tries UUID-shaped detection first (fast path, unchanged behavior for any existing caller/bookmark), falling back to a `?slug=` list lookup otherwise.
3. Cache keys (`buildCacheKey`) already key by whatever identifier string is passed — no change needed there.

No other file in this Gateway changes. This is the direct, measured payoff of Slice 1's own `composition/mappers.ts` and `backend/client.ts` separation: the identifier-resolution concern was already isolated to one seam, not scattered.

## 5. The Gateway-Side Seam Prepared Now (this slice)

`routes/catalog.ts` (Slice 1.5) introduces `resolveIdentifierKind(value): 'uuid' | 'slug'` — a pure, already-real, already-tested classification function with **no live slug-fetch path wired to it yet** (since Option A hasn't shipped) — so the day it does, the only change is a new `if (kind === 'slug') { ... }` branch in each detail route, never a redesign of the routing/caching/composition layers around it.

---

## 6. Recommendation

Flag Option A to whichever team owns `apps/backend/app/Domains/Commerce/Catalog` next, as a small, additive, backward-compatible, low-risk change. Track as a named entry in `NEXTGEN_PLATFORM_MASTER_ROADMAP.md`'s "Missing Backend Capabilities" list.

---

End of Document
