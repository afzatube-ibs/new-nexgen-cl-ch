# Phase 2.4 — Pricing Engine: Architecture Decision Review

| | |
|---|---|
| **Status** | Product Owner review — recommendation below. **No code written, no backend/frontend modified.** |
| **Date** | 2026-08-12 |
| **Scope** | Validates `planning/architecture/PHASE_2_4_PRICING_ARCHITECTURE.md`'s two open Product Owner decisions (Tax Class ownership, Archive/Restore) against a full codebase review — Catalog, Pricing, Checkout, Orders, and confirmation that no Storefront exists yet — before Slice 1 begins |

---

## Task 1 — Tax Class ownership: root cause

**Reviewed the entire codebase for any existing product→tax-class assignment mechanism. None exists — confirmed by exhaustive search, not assumed.**

- Grepped every reference to `tax_class_id`/`TaxClass` across the backend (41 files). Every match is either Pricing's own `TaxClass`/`TaxRate` CRUD, its test suite, or Checkout's `CheckoutItem.tax_class_id`.
- `Catalog\Models\Product` and `Catalog\Models\ProductVariant` — read both `$fillable` arrays directly: `sku`, `barcode`, `name`, `product_type`, `status`, etc. **No `tax_class_id` field, no price field, no cost field, anywhere.**
- `Pricing\Models\PriceListEntry` — read its `$fillable` directly: `sku`, `base_price`, `compare_at_price`, `sale_price`, `sale_starts_at`, `sale_ends_at`. **No `tax_class_id` field either.**
- `Checkout\Http\Requests\AddCheckoutItemRequest`: `'tax_class_id' => ['sometimes', 'nullable', 'uuid', 'exists:tax_classes,id']` — **optional, caller-supplied, validated only for existence.** `AddCheckoutItemAction` stores exactly what the caller passed (`$attributes['tax_class_id'] ?? null`) with no resolution against Catalog, no default lookup, no fallback logic of any kind.
- `Orders` — confirmed (again, by direct grep) zero references to `TaxClass` anywhere in that domain; `CreateOrderAction`'s own docblock states it "never recalculates independently," consistent with tax having already been resolved upstream by Checkout.
- **No Storefront exists.** `apps/` contains only `admin` and `backend`. Every "storefront" reference in the codebase is a docblock note about a *future* consumer (e.g. Customers' `RegisterCustomerAction`: *"no storefront; ADR-0006 storefront rendering remains Draft"*). There is no live or planned workflow anywhere that could be assigning tax class today.

**Classification: an unfinished backend capability that has left a genuine missing platform capability — not an intentional architecture.**

The distinction matters: `docs/04_MODULE_ARCHITECTURE.md` *is* explicit and intentional that Catalog must not depend on Pricing ("Pricing depends on Catalog," never the reverse) — that boundary is real, deliberate, and should not be crossed carelessly. But nothing in the master plan, the module architecture doc, or any code comment ever addresses *how* a product's tax classification is meant to get set in the first place. That's not a boundary being respected — it's a decision nobody made. Checkout's caller-supplied `tax_class_id` was a pragmatic, minimal way to let Checkout's own tax calculation function at all once Checkout was built ahead of schedule (2026-08-04, per Product Owner direction) — a stopgap, not a design.

## Task 1 — Recommended architecture: **`Product.tax_class_id`**

**Recommend exactly one: add a plain, loosely-coupled `tax_class_id` reference to `Catalog\Product`.** Not Variant, not `PriceListEntry`.

**Why Product, not Variant:** Tax classification is almost always a property of *what the item fundamentally is* ("this is a grocery item," "this is standard-rated apparel"), not of its size/color/SKU variation. Putting it on Variant would force a merchant to redundantly re-declare the same tax class on every one of a product's variants for no real benefit, and would need an awkward "does the variant override the product" fallback rule the backend doesn't need. If a genuine future need for variant-level tax differences ever surfaces (rare), it's a small, additive, nullable `tax_class_id` on Variant that falls back to the product's own — cheap to add later, not worth designing for now.

**Why Product, not `PriceListEntry`:** Tax classification is a fact about the *item*, not about its price in one particular currency-scoped list. Putting it there would mean re-declaring the same tax class on every currency's Price List entry for the same SKU — duplicative, and conceptually wrong: whether a product is "standard-rated" doesn't change because it's priced in EUR instead of USD. The rate that classification resolves to *does* vary by jurisdiction (`TaxZone`) — that's already correctly separated in Pricing's own `CalculateTaxAction` (zone × class → rate). Conflating "what class is this" with "what price list is this" would blur a distinction the backend already gets right elsewhere.

**How, at the architecture level (not an implementation instruction — a shape for the Product Owner to weigh):** a plain `tax_class_id` UUID column on `products`, **with no database foreign-key constraint into Pricing's `tax_classes` table** — validated only at the request layer (`exists:tax_classes,id`), exactly the same loosely-coupled, reference-by-identifier pattern this codebase already uses everywhere a cross-domain relationship exists (Inventory's `StockItem.sku`, Pricing's own `PriceListEntry.sku`, Checkout's existing `CheckoutItem.tax_class_id`). This keeps Catalog→Pricing a value-reference, not a schema-level dependency — Catalog still never queries Pricing directly, it just carries an opaque identifier a caller (Checkout, a future Storefront) can pass through unchanged instead of having to know it by other means.

**Impact on Checkout:** `AddCheckoutItemAction` could default `tax_class_id` from the Product's own stored value when the caller doesn't explicitly override it, instead of requiring every single caller to already know and supply the correct value on every add-to-cart call — closing the exact gap this review found. The existing caller-override parameter stays valid (a legitimate per-transaction exception is still expressible), it just stops being the *only* way tax class ever gets set.

**Impact on Orders:** None directly — Orders already only records what Checkout resolved; it never queries tax class itself.

**Impact on future multi-country tax / VAT/GST:** This is the architecturally correct split for real-world VAT/GST systems: the *classification* ("reduced rate," "zero-rated," "standard") is a stable product attribute that rarely changes; the *rate* that classification resolves to legitimately differs by country (UK reduced-rate ≠ Germany reduced-rate for the same class) — which is exactly what `TaxZone` × `TaxClass` → `TaxRate` already models correctly today. Anchoring the classification on Product, not on any per-country structure, means adding a new country is purely a Pricing-side `TaxZone`/`TaxRate` configuration exercise — zero Catalog changes needed per new market.

**Impact on future B2B:** Orthogonal, not a conflict. A B2B customer's own tax treatment (reverse-charge, exemption, a registered VAT number) is a *customer or order-level* fact, layered on top of the *product's* classification at calculation time — not a reason to change where the product-level classification itself lives. This recommendation doesn't need to anticipate B2B's shape to remain correct once B2B exists.

## Task 2 — Archive/Restore: platform-wide pattern, confirmed

Reviewed every module with a `restore()` action in the backend (10 controllers, grepped directly), not just Pricing:

| Module | Entities with **both** a `status` column **and** `SoftDeletes` | Restore behavior |
|---|---|---|
| Inventory | `Warehouse` | **Confirmed broken, found and fixed this engagement** (Inventory Freeze audit) — `restore()` only cleared `deleted_at`, never touched `status`; an archived warehouse had no way back |
| Catalog | `Brand`, `Category`, `Collection`, `Product` | **Structurally identical code** to Warehouse's pre-fix version (`RestoreXAction::execute()` is `$model->restore()` and nothing else, confirmed by reading all four) — not yet live-verified, already flagged as a background task this same session |
| Catalog | `Tag`, `Attribute`, `AttributeGroup`, `Option` | **Not affected** — these entities never had a separate `status` column, only `SoftDeletes`; `restore()` genuinely is the complete lifecycle undo for them |
| Platform | `MediaAsset` | **Not affected** — same reason, `SoftDeletes` only, no `status` |
| Pricing | `PriceList`, `TaxZone`, `TaxClass`, `TaxRate` | **No restore endpoint exists at all** for any of the four — confirmed by reading `routes.php` directly. Not broken; honestly incomplete. An archived-or-deleted Pricing record currently has *zero* path back to active through any API, working or not. |

**Root cause, precisely: the bug is not per-module carelessness — it's a single reusable code shape (`RestoreXAction::execute() { $model->restore(); }`) applied uniformly, which is only correct for entities that never had a separate archive-style `status` to begin with.** Wherever a module later added a `status` lifecycle *alongside* `SoftDeletes` (Warehouse, and — very likely — Brand/Category/Collection/Product), the same restore pattern silently stopped being correct, and nothing caught it because Eloquent's `restore()` always "succeeds" (200, no error) regardless of whether it did anything meaningful.

**Recommendation: yes, this should become one platform-wide ADR before more modules ship this pattern a third and fourth time**, not another round of module-by-module discovery-and-patch. The correct model is **two independent lifecycle axes, not one linear chain**:

```
Axis 1 (business status):     active ⇄ archived        (Archive / Reactivate — both real, working, two-way actions)
Axis 2 (existence):           not-deleted ⇄ deleted     (Delete / Restore — SoftDeletes' own pair, orthogonal to Axis 1)
```
A record's full state is the combination of both. "Restore" must only ever undo Axis 2 — bringing a deleted record back to *whatever Axis-1 state it was in before deletion*, not forcing it to `active`. "Reactivate" (a real, new, distinct action per entity — not a reuse of `restore()`) is the only thing that should ever move Axis 1 from `archived` back to `active`. This is a small correction to the example lifecycle in this Task's own brief (`Archive → Restore/Reactivate → Delete` as one chain) — modeling it as two independent axes, rather than one linear pipeline with two names for the same step, is what actually matches how `status` and `SoftDeletes` already coexist in this codebase's real schema today.

---

## Task 3 — Readiness Review

### 1. Root cause(s)
- **Tax Class ownership**: never designed, not intentionally deferred — Checkout's caller-supplied `tax_class_id` was a minimal stopgap enabling Checkout's own early delivery, not a considered architecture.
- **Archive/Restore**: one reusable `restore()` code shape applied to every archivable entity uniformly, correct only for entities without a separate `status` column — silently wrong wherever `status` was later added alongside `SoftDeletes`.

### 2. Recommended architecture
- **Tax Class**: `Product.tax_class_id` — a loosely-coupled reference (no DB foreign key into Pricing), validated at the request layer, mirroring every other cross-domain reference this platform already uses. See Task 1 for full reasoning.
- **Archive/Restore**: a platform-wide ADR formalizing two independent lifecycle axes (`active⇄archived` via real Archive/Reactivate actions; `not-deleted⇄deleted` via Delete/Restore) rather than continuing to conflate them per module.

### 3. Migration impact
- **Tax Class**: a real Catalog schema change (`ALTER TABLE products ADD tax_class_id`) plus corresponding `CreateProductRequest`/`UpdateProductRequest`/`ProductResource` additions and a small Product Editor field — all currently out of scope (Catalog is frozen; touching it again is itself a decision requiring explicit Product Owner sign-off, not something to fold quietly into Pricing's own build). **Not proposed to happen now** — this review recommends the *shape*, not the timing.
- **Archive/Restore ADR**: no immediate migration required for any entity — Warehouse is already fixed; Catalog's four affected entities need only new Action logic (no schema change, `status` already exists), once the Product Owner confirms the ADR direction. Pricing's four entities need genuinely new restore/reactivate endpoints if and when the Product Owner wants archived Pricing records to be recoverable at all.

### 4. Long-term impact
- Getting Tax Class ownership right *before* Pricing's Tax Class screens ship avoids building a UI that implies a capability ("assign this product's tax class") the platform can't yet deliver — better to design Slice 3 knowing the real constraint than discover it live, the way the Restore gap was discovered live for Warehouses.
- A formal Archive/Restore ADR, decided once, removes this exact discovery-and-patch cycle from recurring in Customers, Orders, or any future module that pairs `status` with `SoftDeletes` — cheaper to fix as a pattern now than as N more individual bugs later.

### 5. Recommendation

**READY FOR PRICING IMPLEMENTATION — scoped specifically to Slice 1 (Price Lists + Entries).**

Slice 1 touches neither open question directly: it has no Tax Class concept at all, and its own archivable entity (`PriceList`) can be built correctly from day one simply by **not** offering a "Restore" action for an archived Price List — applying the lesson from Warehouse's fix proactively, at design time, rather than retrofitting it after shipping a misleading button a second time. That is a design constraint this review can respond to now; it does not require a new Product Owner decision to apply the one already made and reported for Inventory.

**Slice 3 (Tax Zones/Classes/Rates) remains conditioned on Task 1's decision and should not begin until the Product Owner confirms the `Product.tax_class_id` direction (or an alternative)** — building Tax Class management UI without resolving where it attaches would ship a screen with no real product to point it at.

The Archive/Restore ADR (Task 2) is recommended as a genuine, worthwhile platform decision but is **not a blocker for Slice 1** — it's a pattern worth fixing once, formally, before it recurs a third time, not a gate on the very next unit of work.

---

**Awaiting Product Owner confirmation before Slice 1 begins**, per the explicit instruction this review was commissioned under.
