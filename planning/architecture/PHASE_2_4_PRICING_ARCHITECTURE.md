# Phase 2.4 — Pricing Engine: Architecture & Product Design

| | |
|---|---|
| **Status** | 🟡 Draft — awaiting Product Owner approval. **No implementation code has been written. No backend, database, permission, route, Admin Shell, Navigation, Authentication, Design System, or Module Registration change was made.** |
| **Date** | 2026-08-12 |
| **Author** | Engineering (research + planning pass, per Product Owner's Phase 2.4 kickoff brief) |
| **Scope** | Research and documentation only: what the real Pricing backend supports today, its data model and relationships, and a recommended (not yet approved) admin UI slice plan |
| **Explicitly not in scope** | Any React/PHP implementation code, any new backend endpoint, schema change, or invented API contract |

---

## 0. Framing: what this document is built on

Every fact below is read directly from `apps/backend/app/Domains/Commerce/Pricing/` — its models, migrations, actions, controllers, requests, resources, permissions, audit trail, exceptions, events, and its existing Pest test suite (7 Feature test files, 4 Unit test files, all already passing per the module's own coverage). Nothing here is proposed or assumed. Where a capability the brief asked about ("Customer Group Pricing," "Cost Price," etc.) does not exist in the code, this document says so plainly in §2 and §11 rather than silently designing around the gap.

Two things make this research pass different from Inventory's (`planning/architecture/PHASE_2_3_INVENTORY_ARCHITECTURE.md`), and both matter for the plan in §10:

1. **Pricing is not an island.** Unlike Inventory at the time of its own architecture pass, Pricing already has real, live, code-level consumers: **Checkout and Orders are already built** (delivered ahead of their master-plan phase position, per Product Owner direction on 2026-08-04 — `planning/IMPLEMENTATION_MASTER_PLAN.md` entries 17–18). `Checkout\Actions\ReviewCheckoutAction` already calls `Pricing\Actions\LookupPriceAction` and `Pricing\Actions\CalculateTaxAction` on every cart review. This means the Pricing Admin UI is not being built for a hypothetical future consumer — it is configuring data a real transaction path reads from *today*, in this same codebase, on every checkout review. Any admin screen this phase builds should be judged partly by "would a merchant trust this to feed a live checkout," not just "is this a clean CRUD form."
2. **Pricing is deliberately narrower than the brief's own idea-list.** The brief's "think about" list (Customer Group Pricing, Wholesale Pricing, Variant Pricing, Channel Pricing, Cost Price/Margin, Bulk Price Changes) is explicitly *not* all implemented — §2 and §11 draw a hard line between what exists and what doesn't, per the brief's own "clearly separate: Supported / Missing / Future possibility" instruction.

---

## 1. Current backend capabilities

Read from `app/Domains/Commerce/Pricing/routes.php` and every controller/action behind it — this is the complete, real API surface, nothing added:

| Capability | Endpoint(s) | Permission |
|---|---|---|
| Price List CRUD (create, list, show, update, archive, delete) | `GET\|POST /price-lists`, `GET\|PATCH\|DELETE /price-lists/{id}`, `POST /price-lists/{id}/archive` | `pricing.price_lists.view` / `.manage` |
| Price List Entry CRUD (per-SKU pricing within a list) | `POST /price-lists/{id}/entries`, `PATCH\|DELETE /price-lists/{id}/entries/{entry}` | `pricing.price_lists.manage` |
| Price lookup (resolve a SKU's current effective price in a currency) | `GET /pricing/lookup?sku=&currency_code=` | `pricing.price_lists.view` |
| Tax Zone CRUD | `GET\|POST /tax-zones`, `GET\|PATCH\|DELETE /tax-zones/{id}`, `POST /tax-zones/{id}/archive` | `pricing.tax.view` / `.manage` |
| Tax Class CRUD | `GET\|POST /tax-classes`, `GET\|PATCH\|DELETE /tax-classes/{id}`, `POST /tax-classes/{id}/archive` | `pricing.tax.view` / `.manage` |
| Tax Rate CRUD (zone × class → rate) | `GET\|POST /tax-rates`, `GET\|PATCH\|DELETE /tax-rates/{id}`, `POST /tax-rates/{id}/archive` | `pricing.tax.view` / `.manage` |
| Tax calculation (stateless: amount → tax owed, given class + jurisdiction) | `POST /tax/calculate` | `pricing.tax.view` |
| Audit log | `GET /pricing/audit-logs` | `pricing.audit_log.view` |

**Notably absent from the route list** (confirmed by reading `routes.php` directly, not inferred): no restore endpoint for any Pricing entity (Price Lists, Tax Zones/Classes/Rates are archivable and soft-deletable, but nothing reverses either — see §11's discussion of the identical gap the Inventory Freeze audit found and partially fixed for Warehouses), no bulk-write endpoint of any kind, no CSV import/export, no price-history/revision endpoint (only the flat audit log's before/after snapshots), no customer-group or channel/store-scoping parameter anywhere.

---

## 2. Data model

Five real tables, all under `database/migrations/2026_08_03_1600{01..06}_*`, all following this platform's now-standard shape: `uuid` PK, `tenant_id` (unexercised multi-tenant boundary, same as every other module), `status` + `SoftDeletes` (lifecycle), `lock_version` (optimistic locking), `timestamps`.

### 2.1 `PriceList` (`price_lists`) — the aggregate root for base pricing
| Field | Type | Notes |
|---|---|---|
| `name` | string | |
| `currency_code` | char(3) | Upper-cased on save; validated against a real, curated ISO 4217 active-currency list (144 codes) owned by Localization & Currency (`IsValidCurrencyCode`) — a declared cross-module dependency, not a duplicated list |
| `is_default` | bool | At most one default list **per currency** — enforced transactionally in `UpdatePriceListAction`, never at create time (`CreatePriceListAction` always creates non-default; promotion is a separate, explicit update) |
| `status` | `active`\|`archived` | |
| `version` | int | `lock_version`, required as `expected_version` on update/archive/delete |

"Price Lists" and "Price Books" are **the same concept** in this schema — a named, currency-scoped collection of prices — per the migration's own docblock, not two mechanisms.

### 2.2 `PriceListEntry` (`price_list_entries`) — one SKU's pricing within a list
| Field | Type | Notes |
|---|---|---|
| `price_list_id` | FK → `price_lists`, `cascadeOnDelete` | Deleting a list soft-deletes every entry it holds, in the same transaction |
| `sku` | string, upper-cased | **Not a foreign key into Catalog's `products`/`product_variants` tables** — matched by value only, the identical pattern Inventory's `StockItem.sku` already established. One row per `(price_list_id, sku)` — unique constraint, upsert-shaped |
| `base_price` | decimal(14,4) | The standing price |
| `compare_at_price` | decimal(14,4), nullable | The "was" price shown alongside `base_price` — a pure display field; confirmed not read by any pricing/tax calculation anywhere in the codebase |
| `sale_price` | decimal(14,4), nullable | Must be strictly `<` `base_price` when both are set — a sale priced at or above the standing price is rejected as invalid, not silently accepted |
| `sale_starts_at` / `sale_ends_at` | timestamp, nullable, either or both | Open-ended in either direction; `sale_ends_at` must be after `sale_starts_at` when both are set |
| `version` | int | Its own `lock_version`, independent of the parent list's — no cross-row invariant spans multiple entries in one list, so no shared-parent versioning is needed (contrast `PriceList.is_default`, which does span rows and is enforced at the list level) |

**"Sale Price" and "Scheduled Pricing" are one mechanism, not two** — a sale is simply a second price active only within its own date window; there is no separate discount *rule* engine here. `PriceListEntry::effectivePrice()` resolves this at read time: the sale price if `isSaleActive()` (now falls within the optional window), otherwise `base_price`.

### 2.3 `TaxZone` (`tax_zones`) — a geographic tax jurisdiction
| Field | Notes |
|---|---|
| `country_code` | char(2), upper-cased |
| `region` | string, **empty string, not null**, for a country-wide zone — a nullable region would let MySQL/SQLite's NULL-uniqueness semantics silently allow duplicate country-wide zones, so `''` is the real "no region" value; `unique(tenant_id, country_code, region)` |
| `status` | `active`\|`archived` | |

### 2.4 `TaxClass` (`tax_classes`) — a tax classification (e.g. "Standard," "Reduced," "Zero-Rated," "Exempt")
| Field | Notes |
|---|---|
| `name` | unique per tenant |
| `status` | `active`\|`archived` | |

No schema-level relationship to Catalog's `Product` in either direction — see §3.6 for why this is a real, confirmed gap, not a deliberate loose-coupling choice.

### 2.5 `TaxRate` (`tax_rates`) — the rate applied when a `TaxClass` is taxed within a `TaxZone`
| Field | Notes |
|---|---|
| `tax_zone_id` | FK, `restrictOnDelete` |
| `tax_class_id` | FK, `restrictOnDelete` |
| `rate` | decimal(8,4), 0–100 — a percentage, e.g. `8.5000` = 8.5% |
| `status` | `active`\|`archived` | Unique `(tax_zone_id, tax_class_id)` — one rate per zone×class pair; **this pairing *is* "Tax Rules"** — "Tax Rates" and "Tax Rules" are one concept here, not two, per the migration docblock |

### 2.6 `pricing_audit_logs` — Pricing's own, separate audit table
Structurally identical to every other module's audit log (`actor_id`, `action`, `target_type`/`target_id`, `before`/`after` JSON, `correlation_id`, immutable — no `updated_at`, no update/delete code path anywhere). See §6.

### 2.7 Entity relationship diagram

```
PriceList (1) ──────< PriceListEntry (N)   [one row per (price_list_id, sku)]
   is_default: at most one TRUE per currency_code
                              │
                              sku (string) ⇠⇠⇠ value-matches ⇠⇠⇠ Catalog.Product.sku / ProductVariant.sku
                              (no schema relationship — resolved only by an Admin UI joining
                               two independent API responses client-side, identical to how
                               Inventory's StockItem.sku already does this)

TaxZone (1) ──────< TaxRate (N) >────── (1) TaxClass
   restrictOnDelete both directions — a Zone or Class still referenced by a Rate cannot be deleted

TaxClass  ⇠ ⇠ ⇠  (NO relationship exists) ⇠ ⇠ ⇠  Catalog.Product
   Nothing in Catalog's schema stores a tax_class_id. The only place a
   tax_class_id is ever associated with a product today is Checkout's
   CheckoutItem.tax_class_id — supplied by whatever caller adds the item
   to the cart, not resolved from Catalog automatically. See §3.6/§11.
```

---

## 3. Relationships

Read directly from real, already-running code — not the master plan's aspirational dependency list, though it matches it (`planning/IMPLEMENTATION_MASTER_PLAN.md`'s Pricing & Tax entry: "Dependencies: Catalog, Localization & Currency").

### 3.1 Catalog
**No code-level relationship exists.** `Product`/`ProductVariant` have a `sku` column and nothing else pricing-adjacent (no `price`, no `cost`, no `tax_class_id` — confirmed by reading both models' `$fillable` arrays directly). `PriceListEntry.sku` matches Catalog's SKU **by value only**, exactly like Inventory's `StockItem.sku` — a reference-by-identifier relationship, not a schema-level coupling, per `ARCH:CROSS_DOMAIN_COMMUNICATION`. This means **Catalog genuinely has zero pricing data of its own** — Pricing is already, today, the single source of truth for what something costs, with no competing/duplicate price field anywhere else in the platform to reconcile. This is a real architectural strength worth preserving in the UI design (§9): never let the Product Editor grow its own price field.

### 3.2 Inventory
**No relationship of any kind** — confirmed by grep, zero references either direction. Inventory's `StockItem.sku` and Pricing's `PriceListEntry.sku` are two independent value-matched joins to the same Catalog SKU space, never to each other.

### 3.3 Orders
**Read-only, one-way, at order-creation time only.** `CreateOrderAction`'s own docblock states it explicitly: *"Every price, discount, and tax figure arrives already resolved in `$attributes` — this action only sums them into the order's own totals via bcmath; it never calls Pricing or Promotions to calculate anything itself"* — matching the master plan's Orders entry ("records the outcome of pricing and promotion decisions... never recalculates them independently"). Orders never queries Pricing directly; it trusts figures Checkout already resolved and hands off. This is a deliberate, correct boundary — the Pricing Admin UI has no reason to touch or display Order data.

### 3.4 Checkout — the real, live consumer
This is the relationship that matters most for this phase. `Checkout\Actions\ReviewCheckoutAction` (the action that recomputes a cart's full price/tax/discount/shipping breakdown on every review) is, per its own docblock, *"the one place this module calls Pricing's `LookupPriceAction`/`CalculateTaxAction`"*:

```php
$priceEntry = $this->lookupPriceAction->execute($item->sku, $session->currency_code);
// null → CheckoutValidationException('price_unavailable') — a cart line with
// no resolvable price blocks checkout review outright, it does not silently
// default to zero or fall through
$unitPrice = $priceEntry->effectivePrice();

if ($item->tax_class_id !== null) {
    $taxResult = $this->calculateTaxAction->execute($item->tax_class_id, $countryCode, $region, $lineSubtotal);
}
```

Two consequences worth being explicit about:
- **A SKU with no `PriceListEntry` in the default list for the cart's currency makes that cart un-reviewable.** This is not a hypothetical edge case an admin UI can treat as low-priority — every SKU a merchant intends to sell needs a priced entry in the relevant default list, or checkout breaks for it, today, in this same running system.
- **`CheckoutItem.tax_class_id` is supplied by whatever code adds the item to the cart** (`AddCheckoutItemAction`: `'tax_class_id' => $attributes['tax_class_id'] ?? null`) — **not resolved from Catalog automatically**, because nothing in Catalog stores it. See §3.6 and §11 — this is the single most consequential gap this research found.

### 3.5 Customers
**No relationship exists.** No `customer_id`, `customer_group_id`, or any customer-scoping concept anywhere in Pricing's schema or actions. "Customer Group Pricing" and "Wholesale Pricing" (both named in the brief's "think about" list) are **not implemented** — see §11.

### 3.6 Variants
**No special handling — and that's fine, not a gap.** `ProductVariant.sku` is just another SKU value; `PriceListEntry` treats a variant's SKU identically to a simple product's SKU (both are plain strings to this module). "Variant Pricing" is therefore **already supported**, in the sense that a merchant prices each variant SKU as its own `PriceListEntry` — there is no separate "variant pricing" mechanism to build because none is needed. The real gap adjacent to this (§3.6's actual finding) is narrower and specific: **no product or variant carries a `tax_class_id` anywhere in Catalog's schema**, so nothing links "this SKU" to "which tax class it belongs to" as a stored, discoverable fact — only Checkout's caller-supplied, per-cart-item value exists, and that's assigned per checkout session, not per product. A merchant cannot today say "all shirts are Standard-taxed" once and have it stick; each caller of `AddCheckoutItemAction` must know and pass the right `tax_class_id` every time.

---

## 4. Pricing lifecycle

### 4.1 Price List lifecycle
```
create (always is_default=false) ──> active ──archive──> archived
                │                        │
                │                        └──delete (cascades: soft-deletes every entry too)
                │
                └──update{is_default:true}──> promotes this list, demotes the prior
                                                default IN THE SAME CURRENCY ONLY
                                                (a EUR default and a USD default
                                                 are independent facts)
```
Changing `currency_code` is blocked (409) once a list has any priced entries — every existing entry's price means "in the list's *current* currency"; reinterpreting them under a new currency silently would be a real data-integrity failure. An operator must clear or replace entries first.

**No restore action exists for an archived or deleted Price List** — see §11's discussion of this same gap already found (and its UI symptom already fixed) in Inventory's own Freeze audit for Warehouses.

### 4.2 Price List Entry lifecycle
```
create (base_price required; compare_at_price/sale_price/schedule optional)
   │
   ▼
update (any subset of fields; sale_price validated against the *effective* base_price —
   │     either this same request's new base_price, or the entry's current one if base_price
   │     isn't part of this particular update — so a request that only changes sale_price
   │     still validates correctly against a base_price it never touched)
   │
   ▼
delete (hard business action — no archive state for an entry; only Active or Deleted)
```
`effectivePrice()` is resolved **at read time**, not stored — never a scheduled job flipping a status column. A sale silently "activates" and "ends" purely as a function of `now()` against `sale_starts_at`/`sale_ends_at`, computed fresh on every `PriceListEntryResource`/`LookupPriceAction` call.

### 4.3 Tax Zone / Tax Class / Tax Rate lifecycle
All three: `create → active → archive → archived`, `delete` (soft, blocked 409 by `DependentRecordsExistException` if a `TaxRate` still references the Zone or Class being deleted — Rates themselves have no such guard, since nothing else in this module references a Rate by identifier; Checkout resolves rates fresh via `CalculateTaxAction` at calculation time, never by stored reference). Same "no restore" gap as §4.1.

### 4.4 Tax calculation (stateless — not a stored lifecycle at all)
`CalculateTaxAction` reads nothing it writes, writes nothing, publishes nothing. Given `(tax_class_id, country_code, region, amount)`: matches the more specific zone first (exact country+region), falls back to the country-wide zone (`region=''`), and **resolves to zero tax — a valid, common, non-error outcome — when no active rate matches**, per the explicit distinction this module draws between a genuine failure and a legitimate zero-value result. Uses `bcmath`, not native floats, for the multiplication — this is the platform's first real monetary calculation, and rounding error is treated as unacceptable here specifically.

---

## 5. Permission model

Five keys, read directly from `PermissionRegistry::definitions()` — nothing invented:

| Key | Grants |
|---|---|
| `pricing.price_lists.view` | List/show Price Lists and their entries; price lookup |
| `pricing.price_lists.manage` | Create/update/archive/delete Price Lists and their entries |
| `pricing.tax.view` | List/show Tax Zones, Classes, Rates; calculate tax |
| `pricing.tax.manage` | Create/update/archive/delete Tax Zones, Classes, Rates |
| `pricing.audit_log.view` | View Pricing's own audit log |

Two design notes worth carrying into the UI (§9):
- **Zones, Classes, and Rates share one `pricing.tax.*` pair, not three.** Per the registry's own docblock, they're "one closely-related configuration cluster typically managed by the same operator" — mirroring Customers' `customers.customers.manage` covering both Customer and its address book. An admin UI should *not* invent finer-grained gating than the backend actually enforces (e.g. a merchant who can manage Tax Rates can always manage Tax Zones/Classes too — don't design a screen that implies otherwise).
- **No per-object policy classes exist anywhere in this domain** — route-level `permission:` middleware only, the same flat model every other Commerce module (Catalog, Inventory) already uses. `RequirePermission anyOf={[...]}` is the only gating primitive needed; nothing new to design.

Permissions are synced into Identity & Access's shared `permissions` table via `Database\Seeders\PricingPermissionSeeder`, run through `SyncPermissionsCommand` — the same cross-module integration point every prior module uses.

---

## 6. Audit behaviour

A **separate table** (`pricing_audit_logs`), owned entirely by this module, per `DATA:AUDIT_DATA`'s "audit data is owned by the same module that owns the data it describes" — not the same physical table Catalog or Inventory write to, even though the shape is identical.

- **Every mutation is audited** — every Create/Update/Archive/Delete action across all five entities calls `AuditLogger::log()` inside the same database transaction as the write itself, per this module's own Security Considerations entry in the master plan: *"Price/tax tampering is a direct financial risk — every mutation audited."* Confirmed present in all 15 CRUD-adjacent actions read in §1.
- **Reads are explicitly not audited.** Per the `pricing_audit_logs` migration's own docblock, pricing/tax data is classified Confidential, not Sensitive, so this module follows Store Configuration's mutation-only audit precedent rather than Identity & Access's/Customers' read-and-write precedent for genuinely Sensitive data. (Contrast: this is a real, deliberate design choice — not an oversight — and the UI's own Activity/Audit tab should not imply read-tracking exists.)
- **Immutable** — no `updated_at` column, no update/delete code path anywhere in the module. Same guarantee Inventory's `StockAdjustment` ledger carries for stock movements, applied here to price and tax mutations instead.
- **Stamped with the ambient correlation id** (`Context::get('correlation_id')`, set by Platform Foundation's `AssignCorrelationId` middleware) so an audit trail can be joined back to the request/log lines that produced it, per `API:CORRELATION` — identical mechanism to every other module.
- **`AuditLogController::index`** supports `actor_id` and `target_type` filters plus a genuinely configurable `per_page` (`(int) $request->integer('per_page', 25)`) — worth noting because Inventory's own equivalent endpoint does *not* support `per_page` (confirmed during the Inventory Freeze audit); Pricing's is more capable here, a real difference an Admin UI reusing a shared "Activity tab" component should account for rather than assume identical.

**Price history is only reconstructable from this flat audit log's `before`/`after` JSON per mutation — there is no dedicated, queryable price-history/revision table.** A merchant wanting "show me every price this SKU has ever had" gets that by filtering the audit log to `target_type = PriceListEntry::class` and reading each entry's `before.base_price`/`after.base_price`, not a purpose-built history view. See §11.

---

## 7. Validation rules

Read directly from every `FormRequest`'s `rules()`/`withValidator()` — the real, enforced rules, not a summary:

**Price List**
- `name`: required (create) / sometimes (update), string, max 255.
- `currency_code`: required/sometimes, exactly 3 chars, must be a real ISO 4217 active currency (`IsValidCurrencyCode`) — not a bare shape check.
- `is_default`: never accepted on create (see §4.1); boolean on update.
- `expected_version`: required integer ≥ 1 on every mutating endpoint except create.

**Price List Entry**
- `sku`: required/sometimes, string, max 100, unique **within the same price list** (`Rule::unique(...)->where(fn ($q) => $q->where('price_list_id', ...))` — the same SKU is explicitly allowed across two *different* lists, confirmed by a dedicated passing test).
- `base_price`: required/sometimes, numeric, min 0.01 (zero and negative prices are rejected).
- `compare_at_price`: nullable, numeric, min 0.01.
- `sale_price`: nullable, numeric, min 0.01, **must be strictly less than `base_price`** — on create via a static `lt:base_price` rule; on update via a custom `withValidator` check against the *effective* base price (this request's new value if present, otherwise the entry's current stored value) — a deliberate asymmetry between create and update, not an inconsistency: a partial update that only touches `sale_price` still has something correct to validate against.
- `sale_starts_at` / `sale_ends_at`: nullable dates; `sale_ends_at` must be `after:sale_starts_at` when both are present.

**Tax Zone**
- `name`: required/sometimes, string, max 255.
- `country_code`: required/sometimes, matches `/^[A-Z]{2}$/i`.
- `region`: sometimes, string, max 100 (defaults to `''` server-side if omitted).
- `(country_code, region)` uniqueness enforced via a custom `withValidator` check (not a column-level `Rule::unique`, since the invariant spans two fields with a normalized empty-string meaning neither field alone expresses).

**Tax Class**
- `name`: required/sometimes, string, max 255, unique.

**Tax Rate**
- `tax_zone_id` / `tax_class_id`: required/sometimes, valid UUID, must reference an existing row (`exists:`).
- `rate`: required/sometimes, numeric, 0–100 inclusive.
- `(tax_zone_id, tax_class_id)` uniqueness enforced via `Rule::unique` on create, a custom `withValidator` check on update (mirroring the entry-update pattern above).

**Tax calculation request**
- `tax_class_id`: required, valid UUID, must exist.
- `country_code`: required, 2-letter.
- `region`: optional, defaults to `''`.
- `amount`: required, numeric, min 0.

Every mutating endpoint (update/archive/delete) requires `expected_version` — the platform's standard optimistic-locking contract, surfaced as a `409 { error: { type: 'conflict' } }` via `ConcurrencyConflictException`, mapped in `bootstrap/app.php` exactly like every other module. `DependentRecordsExistException` (a Zone/Class still referenced by a Rate) maps to the same `409 conflict` shape with a different, specific message — the UI needs one `pricingErrorMessage()`-style helper (mirroring `inventoryErrorMessage()`/`catalogErrorMessage()`) to surface both correctly, not a new error-handling concept.

---

## 8. Merchant workflows

Grounded in what the real backend actually enables end-to-end, not aspirational:

1. **Set up a currency's base pricing.** Create a Price List for a currency, mark it default, add priced entries for every SKU that should be sellable in that currency. *(This is the workflow that unblocks Checkout — see §3.4. It is not optional setup; a SKU with no entry in the relevant default list cannot be checked out against.)*
2. **Run a scheduled sale.** Set `sale_price` + optional `sale_starts_at`/`sale_ends_at` on an existing entry — no separate "create a promotion" flow needed for a plain price-drop; that's what this *is*, per §2.2's docblock. (Contrast: a coupon-triggered or tiered discount is Promotions' job, not Pricing's — see §11's boundary note.)
3. **Show a "was" price.** Set `compare_at_price` alongside `base_price` — purely a display value (§2.2), never affects any calculation.
4. **Configure tax jurisdictions once.** Create Tax Zones (country or country+region), Tax Classes (Standard/Reduced/Zero-Rated/etc.), then Tax Rates connecting each Zone×Class pair to a percentage. This is genuinely a one-time-per-market setup task, not a per-product task — no product-level tax configuration exists (§3.6).
5. **Support multiple currencies for the same catalog.** Create one default Price List per currency; each is priced independently — there's no "convert automatically" mechanism, each list's entries are set by hand (or a future bulk mechanism — see §11).
6. **Audit a price change.** Look up Pricing's Activity/Audit log, filtered by `target_type = PriceListEntry`, to see who changed a price and when, with the exact before/after values (§6) — the closest thing to "price history" this backend offers today.

**Explicitly not a supported workflow today** (§11 has the full list): assign a tax class to a product from Catalog (no field exists to persist it); price by customer group/wholesale tier; price by store/channel within the same currency; bulk-edit many entries at once; restore an archived/deleted Price List, Tax Zone, Tax Class, or Tax Rate; see cost price or a computed margin/profit figure anywhere.

---

## 9. Information architecture

A proposed navigation shape — **not yet built, not approved** — following the exact same top-level-group + `CrudPageLayout`/`DataTable`/`{Entity}FormDialog` pattern Catalog and Inventory already established, so nothing new is invented at the framework level:

```
Pricing
 ├─ Price Lists          (list → detail, with an inline entries table — the primary landing page)
 │    └─ [detail] Entries  (per-list SKU pricing — add/edit/delete rows, inline or a row-dialog)
 ├─ Tax Zones             (setup screen, visited rarely once configured)
 ├─ Tax Classes           (setup screen, visited rarely once configured)
 ├─ Tax Rates             (the zone×class×rate matrix — likely wants a distinct, denser
 │                          presentation than a plain DataTable once zone/class counts grow;
 │                          see the Slice 3 note in §10)
 └─ Activity              (Pricing's own audit log tab — same shape as Catalog's/Inventory's)
```

Design implications worth carrying into an eventual UX pass (not decided here, flagged for that future work):
- **Price Lists is naturally the entry point**, not Tax — it's the workflow every merchant needs on day one (§8.1), while Tax setup is one-time configuration. Landing a merchant on Price Lists (mirroring Inventory's "Stock Levels is the default landing page" decision) is the likely right call, subject to the Product Owner's own read of merchant priority.
- **The "default list per currency" concept needs to be visually unmissable** — a merchant with three currency-scoped lists needs to see at a glance which one is live for Checkout, since a mis-set default silently breaks pricing for every SKU in that currency (§3.4). This is the single highest-stakes piece of information architecture in this whole module.
- **A SKU's priced-entry status should be visible from a Catalog-adjacent surface eventually** ("does this product have a price in every currency it needs to sell in") — but building that cross-module view is explicitly a *later* slice, not Slice 1 (§10), since it requires joining two independent list endpoints client-side at potentially 100,000-SKU scale, the same class of problem Inventory's own SKU-join already solves and that pattern is directly reusable for Pricing.
- **Tax Rates as a matrix, not a flat list, is a real design question**, not a given — at real-world scale (many zones × few classes, or few zones × many classes) a flat `DataTable` of individual rate rows may be the wrong shape entirely. This document deliberately does not decide that; it's exactly the kind of question a dedicated UX pass (mirroring Slice 1's own eventual UX-refinement pass for Inventory) should resolve with real data in front of it, not guessed at here.

---

## 10. Recommended implementation slices

Modeled on the same incremental, independently-shippable approach Inventory's own three build slices used successfully:

**Slice 1 — Price Lists + Entries (the core, unblocks Checkout for real).**
`packages/api-client/src/pricing/` (types + price-lists/price-list-entries wrappers), Price Lists list + create/edit/archive/delete, entry management within a list's detail view (create/edit/delete, sale-price + schedule fields, Catalog-SKU-match enrichment mirroring Inventory's own established pattern). This alone gives a merchant the one workflow that actually matters most (§8.1) and is the highest-value, lowest-risk slice — exactly Inventory's own Slice 1 rationale, applied here.

**Slice 2 — Price lookup / preview tooling.**
A read-only "what does this SKU cost right now, in this currency" preview surface (backed by the real `GET /pricing/lookup` endpoint), likely surfaced both as its own small tool and embedded wherever an entry is being edited, so a merchant can confirm what Checkout will actually resolve before saving. Low build cost, directly derisks §3.4's "this silently breaks checkout" concern.

**Slice 3 — Tax Zones, Classes, Rates.**
Three CRUD screens (mirroring the exact taxonomy pattern Catalog's Brands/Categories/etc. already use) plus the zone/class/rate relationship UI question flagged in §9 as needing its own design decision. Sequenced after Price Lists since tax setup, while necessary, is lower-frequency than pricing itself (§8.4) and independent of it.

**Slice 4 — Activity / Audit.**
Pricing's Activity tab (§6), same shape as Catalog's/Inventory's. Lowest urgency — valuable but not blocking day-one usability, and benefits from Slices 1–3 already existing so there's real data to show.

Each slice independently passes the same quality gates this engagement has used throughout (`typecheck`/`lint`/`test`/`build`/`test:e2e`) and is independently shippable, matching Inventory's own precedent.

---

## 11. Known backend limitations

Every item below is a real, confirmed gap in the current backend — not a UI decision this phase can work around, and not something this research pass is authorized to fix (per the brief's explicit "only study, only document" rule). Each is marked **Supported / Missing / Future possibility**, per the brief's own instruction to separate these clearly.

| Brief's idea-list item | Status | Detail |
|---|---|---|
| Base Price | ✅ Supported | `PriceListEntry.base_price` |
| Compare Price (MRP) | ✅ Supported | `compare_at_price` — display-only, confirmed unused in any calculation |
| Cost Price | ❌ Missing | No `cost_price` (or any cost-adjacent) field anywhere in Pricing *or* Catalog — confirmed by grep across both domains |
| Profit / Margin | ❌ Missing | Follows directly from no Cost Price existing — nothing to compute a margin against |
| Special Prices | ✅ Supported | This *is* `sale_price` — no separate mechanism |
| Scheduled Pricing | ✅ Supported | `sale_starts_at`/`sale_ends_at`, open-ended either direction |
| Customer Group Pricing | ❌ Missing | No customer/customer-group concept anywhere in Pricing's schema |
| Wholesale Pricing | ❌ Missing | Same as above — no tiered/quantity/group pricing mechanism at all |
| Variant Pricing | ✅ Supported | Not a distinct mechanism — a variant's SKU is priced exactly like any other SKU (§3.6) |
| Channel Pricing | ❌ Missing | No `store_id`/channel concept in the schema; "store pricing support" today means only "pass that store's currency_code as a parameter to lookup" — two stores in the *same* currency cannot have different default pricing |
| Future Currency | ✅ Supported today | Real ISO 4217 validation, fully currency-scoped Price Lists — this one is already done, not just "future" |
| Future Tax | ✅ Supported today | Zones/Classes/Rates, jurisdiction-aware calculation — also already done |
| Future Promotions | ⚠️ Adjacent, separate module | `Promotions` is a real, already-built module (`EvaluatePromotionsAction`) that layers on top of Pricing's base value — confirmed live in `ReviewCheckoutAction` — but is architecturally required to stay a separate concern (master plan Acceptance Criteria: "Promotions only ever adjusting, never replacing, Pricing's base value"). Out of scope for this phase's UI regardless. |
| Price History | ⚠️ Partial | Reconstructable from the audit log's before/after JSON per mutation (§6) — no dedicated, purpose-built history/revision view or endpoint |
| Bulk Price Changes | ❌ Missing | No bulk-write endpoint of any kind — every entry is created/updated/deleted one at a time |

**Additional limitations found, not on the brief's own list but consequential:**

- **No product-to-tax-class link exists anywhere in Catalog.** The single most consequential gap this research found (§3.6) — `CheckoutItem.tax_class_id` is caller-supplied per cart-add, not resolved from any stored product attribute, because no such attribute exists. A merchant cannot configure "this product's tax class" once and have it apply automatically; whatever adds items to a cart today must already know and pass the correct value every time. **This is a real product gap that affects whether a Pricing/Tax Admin UI can deliver its most obviously-expected workflow ("assign a tax class to a product") at all** — it structurally cannot, without a Catalog schema change, which is out of this phase's authority to make unilaterally. See §12.
- **No restore action for any of the five entities** — Price Lists, Tax Zones, Tax Classes, and Tax Rates are all archivable and soft-deletable, but nothing reverses either state through any exposed endpoint. This is the *exact same shape of gap* the Inventory Freeze audit found for Warehouses this same engagement (`PHASE_2_3_INVENTORY_FREEZE_REPORT.md` §2.3): an "archive" with no way back except direct database access. Worth the Product Owner's attention now, before any Pricing UI ships an "Archive" button that turns out to be similarly one-way-only in practice.
- **No cross-currency conversion.** Each currency's Price List is priced independently by a human (or a future bulk mechanism); there is no "derive EUR pricing from USD pricing at rate X" feature.

---

## 12. Product Owner decisions required

Specific, answerable-now questions this research surfaced — none of them block the research itself, but each meaningfully changes what Slice 1 (§10) should actually build:

1. **The Catalog↔TaxClass gap (§11).** Is a Product-level `tax_class_id` field (a Catalog schema change) needed before or alongside Slice 3 (§10), or is the current caller-supplied-per-cart-item model (§3.4/§3.6) acceptable for v1 Beta? This is the one finding in this document that a pure admin-UI build cannot itself resolve — it requires either a Catalog schema change (out of this phase's scope to make unilaterally) or an explicit decision to defer the "assign tax class to a product" workflow entirely.
2. **Is the "no restore" gap (§11) something to flag now for a future backend fix, mirroring how the Inventory Freeze audit handled the identical Warehouse-archive gap** — i.e., should this phase's UI proactively avoid the same misleading-affordance mistake found there (don't offer a "Restore" action that doesn't work), or is a real backend restore capability wanted before Pricing ships?
3. **Landing page choice (§9)**: Price Lists or Tax as the default view when a merchant opens "Pricing"? This document recommends Price Lists (§9) but the decision is the Product Owner's.
4. **Tax Rates presentation (§9)**: flat list or a zone×class matrix? Recommend deferring this specific decision to a dedicated UX pass once Slice 3 is underway and real zone/class counts inform the choice, rather than guessing now.
5. **Slice order (§10)**: confirm Price Lists → Lookup preview → Tax → Activity, or reprioritize (e.g., Tax before Price Lists if jurisdiction setup is expected to block launch in a specific market).
6. **Scope confirmation**: Customer Group/Wholesale/Channel Pricing and Cost Price/Margin (§11) are confirmed **not** in this phase's backend — should any of them be raised as a candidate for a future backend phase, or are they explicitly out of scope for the foreseeable roadmap? No action needed from this phase's UI either way, but worth an explicit Product Owner read for future planning.

---

## Closing summary

### Backend readiness score: **82 / 100**

Strong, production-shaped core: correct transactional boundaries on every mutation, correct and deliberate concurrency handling (optimistic `expected_version` throughout, matching how infrequently these records actually contend — unlike Inventory's pessimistic-locking hot path, nothing here needs that), a real fraud-grade audit trail matching the module's own stated financial-risk posture, comprehensive existing test coverage (7 Feature + 4 Unit test files, all the workflows in this document independently verified there), and a genuinely single-source-of-truth pricing model with zero competing price fields elsewhere in the platform. The 18-point deduction is concentrated entirely in §11's confirmed gaps — most importantly the missing Catalog↔TaxClass link, which is the one finding that constrains what an admin UI can honestly promise a merchant, plus the shared "no restore" pattern already known from Inventory's own freeze audit and the intentionally-deferred Customer Group/Wholesale/Channel/Cost-Price capabilities.

### Recommended implementation slices
See §10 in full: **1)** Price Lists + Entries, **2)** Price lookup/preview tooling, **3)** Tax Zones/Classes/Rates, **4)** Activity/Audit.

### Potential risks
- Shipping a Tax Class management screen without also resolving §11/§12's Catalog↔TaxClass gap risks a merchant building tax classes they have no way to actually apply to a product — worth sequencing or messaging carefully regardless of which way §12.1 is decided.
- The "default Price List per currency" concept (§9) is high-stakes and easy to under-design — a mis-set default silently breaks Checkout for every SKU in that currency with no obvious symptom until an order fails to price.
- Repeating the exact "Archive with no working Restore" mistake already found and partially fixed in Inventory this same engagement (§11) is a real, avoidable risk if this phase's UI is built without deliberately accounting for it.

### Product Owner decisions
See §12 in full — six specific, answerable questions, most importantly #1 (the Catalog↔TaxClass gap) and #2 (whether to proactively design around the no-restore gap).

---

**Awaiting Product Owner approval before any Pricing frontend implementation begins**, per the explicit instruction this document was commissioned under.
