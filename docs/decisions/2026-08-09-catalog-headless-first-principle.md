# Decision: Catalog Engine is Headless-First

| Field | Value |
|---|---|
| **Date** | 2026-08-09 |
| **Status** | Accepted |
| **Decided by** | Product Owner |
| **Scope** | Permanent product principle — applies to Catalog today, and to every future Commerce-domain module (Orders, Customers, Inventory, Pricing, Marketing, Reports) |

## Decision

The Catalog Engine — and every module built after it — is **headless-first**: every product capability must be consumable by the future Storefront, public/partner APIs, mobile apps, marketplaces, POS, and AI agents without assuming a specific frontend. The Admin UI is **one consumer** of the Catalog, not its owner.

## What this means in practice

1. **No admin-only business logic.** A rule the backend already owns — e.g. `PublishProductAction`'s completeness check (name, SKU, ≥1 category, ≥1 variant for configurable products) — is never re-implemented or duplicated in the Admin UI. The UI calls the real endpoint and surfaces the server's own response (including a `422`'s `reasons` list) verbatim. If the Admin UI and a future Storefront ever disagreed about whether a product were "ready," that would mean the rule leaked into a client — this decision forbids that by construction.
2. **`@nexgen/api-client`'s Catalog functions are generic, not admin-specific.** They are thin, typed wrappers over the public REST contract (`06_API_STANDARD.md`) — the same functions a future `@nexgen/storefront-engine`, a mobile app, or a server-side integration would use. Nothing in `packages/api-client/src/catalog/` imports or assumes anything about `apps/admin`.
3. **The backend's REST contract is the single source of truth.** The Admin UI never invents a capability the API doesn't expose (see `PROJECT_STATUS.md`'s Phase 2.2 entry for the concrete list of fields/actions this ruled out for Slice 1 — price/cost/weight/dimensions, extra product types, vendor/warranty/HS-code, bulk/import endpoints). Where the UI needs to fake a UX (e.g. client-orchestrated Bulk Actions, since no batch endpoint exists), that orchestration lives in an isolated, swappable layer (`apps/admin/src/framework/bulk/`) that talks only to the existing single-record endpoints — it is explicitly not a new backend contract, and is designed to be replaced by a real batch endpoint later with zero UI change.
4. **Extension points, not admin-embedded features.** Capabilities the Admin UI doesn't yet build (e.g. the future Product Import Engine) are named as type-only contracts (`apps/admin/src/extension-points/`, `apps/admin/src/modules/catalog/products/productImportExtensionPoint.ts`) rather than half-built inside a single module — keeping the door open for that capability to become its own dedicated module/service later, consumable the same way by every other client.

## Why

A platform that wants a real Storefront, third-party integrations, a POS, and AI-driven catalog tooling later cannot afford to discover — after the fact — that half its business rules only exist inside `apps/admin`'s React components. Deciding this now, before any Catalog UI code was written, costs nothing; retrofitting it after Storefront/Orders/Inventory are all built directly against Catalog would mean redesigning the Catalog module itself.

## Where this is enforced

- Code review: any PR touching `apps/admin/src/modules/catalog/` that re-derives a rule already enforced by `apps/backend` should be rejected in favor of surfacing the backend's own response.
- `packages/api-client/src/catalog/`: reviewed as a standalone, admin-agnostic package boundary (already true structurally — nothing there imports from `apps/admin`).
