# Phase 2.5 — Customers: Architecture &amp; Product Owner Research

**Status: research only. No frontend code, no `@nexgen/api-client` layer, no admin UI was written for this phase.** This document exists to let the Product Owner decide *whether* and *how* to build the Customers admin experience, on top of a backend that is already complete and already tested.

Confirmed before writing a line of this: `apps/admin/src/modules/` and `packages/api-client/src/` contain **zero** Customers code today — this is a genuinely clean slate, not a continuation of partial work.

---

## 1. Backend Readiness

**Complete and production-shaped.** Every file a real module needs already exists and follows the exact same conventions Pricing/Inventory/Catalog were each built against:

| Layer | File(s) | Notes |
|---|---|---|
| Model (aggregate root) | `Models/Customer.php` | `HasUuids`, `HasOptimisticLocking` (`lock_version`), `SoftDeletes`, `status` (active/archived), `tenant_id` (unexercised multi-tenant scaffold) — identical shape to every Pricing/Inventory entity audited this engagement. |
| Model (child entity) | `Models/CustomerAddress.php` | Belongs to Customer; carries **no `lock_version` of its own** — deliberately, per the migration's own docblock: Customer + its address book is *one aggregate*, versioned only at the root. |
| Actions | `RegisterCustomerAction`, `UpdateCustomerProfileAction`, `ArchiveCustomerAction`, `DeleteCustomerAction`, `AddCustomerAddressAction`, `UpdateCustomerAddressAction`, `DeleteCustomerAddressAction` | Every mutation is transactional, optimistic-lock-checked, audit-logged, and (where relevant) publishes a domain event. |
| Requests | `RegisterCustomerRequest`, `UpdateCustomerProfileRequest`, `AddCustomerAddressRequest`, `UpdateCustomerAddressRequest`, `ExpectedVersionRequest` | Real validation, not placeholders — see §3. |
| Resources | `CustomerResource`, `CustomerAddressResource` | camelCase, deliberately excludes the password hash and `tenant_id`. |
| Controllers | `CustomerController` (index/show/store/update/archive/destroy/**export**), `CustomerAddressController` (store/update/destroy), `AuditLogController` | Full CRUD plus a GDPR-style export endpoint (§3). |
| Routes | `routes.php` | 11 routes, all under `auth:sanctum` + `permission:`, versioned `/api/v1`, registered via the same `ServiceProvider::boot()` pattern every prior module uses. |
| Permissions | `Authorization/PermissionRegistry.php` | `customers.customers.view`, `customers.customers.manage`, `customers.audit_log.view` — 3 keys, synced by `CustomersPermissionSeeder`. |
| Events | `Events/CustomerRegistered`, `Events/CustomerProfileUpdated` | Published on the `DomainEventBus`, explicitly scoped for a future CRM/Growth-domain consumer that doesn't exist yet. |
| Audit | `Audit/AuditLogger`, `Audit/AuditLog`, `AuditLogController` | Logs **reads as well as writes** (`customer.listed`, `customer.viewed`, `customer.exported`, plus every mutation) — Customer data is classified Sensitive, mirroring Identity & Access's own treatment of staff User data. |
| Tests | `CustomerManagementTest` (200 lines), `CustomerAddressManagementTest` (174 lines), `AuditLogTest` (43 lines), `PermissionRegistryTest`, `HasOptimisticLockingTest` | Real Feature-level coverage already exists — this is not a "build tests too" phase, it's "consume an already-tested backend," the same posture Pricing/Inventory/Catalog were each in. |

**Verdict: the backend needs nothing before an admin UI can be built.** No missing endpoint, no missing validation, no missing test coverage was found.

---

## 2. Existing Capabilities (what the backend already does)

- **Customer CRUD**: register (staff-initiated), view one/list all, update profile (name/email/phone), archive, hard-delete (soft delete + cascades to the address book).
- **Search & sort, server-side**: `GET /customers?q=&status=&sort=&direction=&per_page=` — `q` is a real `LIKE` match across `name`/`email`/`phone` (not a fake client-side filter), `sort` is a genuine allowlisted server-side `orderBy` (`name`/`email`/`created_at`), and `per_page` is a real, honored parameter. **This is a materially better list contract than Pricing's own** — every one of Pricing's list endpoints (Price Lists, Tax Zones, Tax Classes, Tax Rates) had no `sort` and no free-text `search` at all, forcing the "fetch everything, filter client-side" pattern audited earlier this session. Customers needs none of that: the admin UI can (and should) drive search/sort/pagination straight through the real query params, matching Catalog's own Products-list precedent, not Pricing's.
- **Address book management**: add/update/delete an address, with a real single-default-per-type invariant (`is_default_shipping`/`is_default_billing`, enforced transactionally in the Action layer, not just the schema) — independent shipping vs. billing defaults, matching how a merchant would actually expect this to behave.
- **Optimistic concurrency**: every mutation (profile *and* address) requires the parent Customer's `expected_version` — address mutations bump the *aggregate's* version, not a version of their own, so a stale-address-tab conflict surfaces correctly as a Customer-level 409.
- **Audit trail, already query-able**: `GET /customers/audit-logs`, permission-gated separately (`customers.audit_log.view`) from `customers.customers.view` — a merchant could restrict "who can see the audit trail" independently of "who can see customer records," a finer-grained split than Pricing has for the equivalent (`pricing.audit_log.view` exists too, but — as this session's own Freeze Audit report notes — Pricing has no screen for it either; Customers is in the identical position).
- **Staff-initiated data export**: `GET /customers/{customer}/export`, separately audited (`customer.exported`) — explicitly framed in the controller's own docblock as "e.g. a data-subject access request," i.e. GDPR/CCPA-style compliance tooling, not a general reporting feature.
- **Cross-domain integration, already live and correct**: Checkout (`CheckoutSession.customer_id`, nullable — guest checkout is a first-class case) and Orders (`Order.customer_id`, `customer_name`, `customer_email` denormalized onto the Order itself) both already reference a Customer **by identifier only, never a real foreign key** — confirmed by reading both migrations' own docblocks, which cite the same `ARCH:CROSS_DOMAIN_COMMUNICATION` principle this session's own Pricing audit saw applied to SKU-keying. This is a deliberate, already-proven design, not a gap: an Order keeps its own snapshot of the customer's name/email at time of purchase specifically so a later Customer edit or delete never rewrites order history.

---

## 3. Notable Backend Details a Frontend Implementer Must Know

- **`Customer.password` is real** (`Password::min(12)->mixedCase()->numbers()->symbols()`, hashed, hidden from every Resource) even though **no customer-facing login exists yet** — `RegisterCustomerAction`'s own docblock is explicit that this is staff-initiated account creation only, in anticipation of a future self-service flow this platform hasn't built (no storefront yet; ADR-0006 storefront rendering is still Draft). **The admin "New Customer" form will need a password field** (with confirmation, per `'password' => ['required', 'confirmed', ...]`) — an unusual thing for a staff CRUD screen to ask for, worth flagging to the Product Owner as a UX decision: does staff set an initial password on a customer's behalf, or should this be generated/randomized and never shown, with the real answer being "a password reset flow doesn't exist yet either"? This is a real open decision, not a frontend implementation detail.
- **No restore endpoint** — identical gap to every entity audited in Pricing this session (Price Lists, Tax Zones, Tax Classes, Tax Rates all have the same hole). Confirmed by reading `routes.php` directly: `archive`/`destroy` exist, `restore` does not, for both Customer and (implicitly, since it has no own lifecycle state) CustomerAddress. The admin UI should not offer a "Restore" action, matching the precedent already established.
- **`DeleteCustomerAction` has no dependent-record check** — but this is correct, not a gap, given `customer_id` is identifier-only everywhere it's referenced (§2): there's nothing to protect. A hard-deleted Customer simply stops resolving; Orders/Checkout already carry their own denormalized snapshot and are unaffected. Worth stating plainly in whatever confirmation dialog the admin builds, though: "this customer's order history is preserved, but the customer record itself is deleted" is a genuinely different guarantee than Pricing's `DependentRecordsExistException` pattern, and a merchant used to that pattern elsewhere in this app might wrongly assume deletion is blocked here the same way.
- **Free-text search already covers phone**, not just name/email — worth surfacing in the search field's own placeholder text, since a merchant is more likely to have a phone number on hand from a support call than a spelled-correctly name.
- **Two independently gated permissions exist beyond basic CRUD**: `customers.audit_log.view` and the export endpoint (gated by plain `customers.customers.view`, notably *not* `.manage` — reading and exporting are the same permission tier here, unlike view/manage's split everywhere else in this module). Confirm with the Product Owner whether "can export a customer's full record" being equivalent to "can merely view one" is the intended posture before building an Export button that any viewer-permission staff account can click.

---

## 4. Merchant Workflows This Module Needs to Support

1. **Find a customer** — by name, email, or phone (all three already server-searched); by status (active/archived); sorted by name, email, or signup date.
2. **View a customer's full profile** — contact info, full address book, account status, when they signed up / were last updated.
3. **Register a new customer on their behalf** (staff-initiated, e.g. a phone order) — including the password question raised in §3.
4. **Edit a customer's profile** — name, email, phone; optimistic-lock-aware.
5. **Manage a customer's address book** — add/edit/remove addresses, mark one shipping-default and one billing-default (independently).
6. **Archive a customer** — a non-destructive "no longer an active customer" state, distinct from deletion.
7. **Delete a customer** — a real, permanent action (soft-delete + cascaded address deletion), with a confirmation dialog that correctly describes the "order history is preserved" guarantee from §3, not a generic "this cannot be undone."
8. **Export a customer's data** — a compliance/support workflow, likely presented distinctly from the general "view" experience (e.g. a dedicated action, not just a page you happen to be able to screenshot).
9. **View a customer's audit trail** — who viewed, edited, exported, archived, or deleted this record, and when — likely as a per-customer activity tab/drawer (matching Inventory's own Activity precedent) rather than only the module-wide `customers/audit-logs` feed, though both are available.

---

## 5. Information Architecture — Recommendation

Given the backend shape, this reads as a **single primary module** (unlike Pricing's necessary split into Price Lists + 4 read-only tools + 3 Tax entities): one list page, one detail view.

- **Customers (list)** — a real server-driven `DataTable`: search (name/email/phone), status filter, sortable columns (Name, Email, Signed up) — **this should use TanStack Query's server-side pagination directly against `GET /customers`**, not the `fetchAllPages` client-side-everything pattern Pricing was forced into by its own list endpoints' limitations. This is a meaningfully different, better-suited pattern than every Pricing screen audited this session, and should not be copy-pasted from there by default.
- **Customer detail** — given the backend already returns the full address book on `show` (`$customer->load('addresses')`), a drawer (matching Price List Entries' / Inventory Reservations' own precedent for "child collection with no cross-parent listing endpoint") is defensible, but a **dedicated route** (`customers/:id`) is likely the better call here specifically *because* of the audit-trail and export workflows (§4.8–4.9) wanting their own clear, linkable, bookmark-able surface — closer to how Catalog's own Product Editor got a full route rather than a dialog once its scope grew past a few fields. Recommend a real route with an Overview / Addresses / Activity structure (tabs or stacked sections — a UX call, not an architectural one).
- **New/Edit Customer** — a dialog is likely sufficient (4 fields: name, email, phone, plus password-on-create only), matching Tax Class's own "small form, dialog is fine" precedent rather than Product Editor's "big form, needs a route" one.
- **Address add/edit** — a dialog within the detail view, matching Price List Entry's own precedent.

---

## 6. Recommended Implementation Slices

1. **Slice 1 — Customer CRUD + Address Book**: list (real server search/sort/filter/pagination), detail route with Overview + Addresses, New/Edit Customer dialog, Add/Edit/Delete Address dialogs, Archive + Delete with the correctly-worded confirmation from §3. This alone covers workflows 1–7.
2. **Slice 2 — Audit Trail + Export**: a Customer-scoped Activity view (reusing `GET /customers/audit-logs` filtered by target, or `GET /customers/{id}` calls already being logged) and a dedicated Export action/view. Small, but deliberately separated from Slice 1 since both are Sensitive-data-handling UI that benefits from its own focused review, mirroring how this engagement kept Tax Engine (Slice 3) separate from Merchant Pricing Tools (Slice 2) even though both sit on Pricing's backend.

No further slicing is obviously necessary — this module's backend surface is smaller and more uniform than Pricing's was.

---

## 7. Risks

- **The password-on-create question (§3)** is a genuine open UX/product decision, not an implementation detail — building the wrong answer (e.g. silently generating and never surfacing a password with no reset flow to recover it) could create unsupportable accounts. Needs a Product Owner decision before Slice 1's New Customer form is built.
- **Export's permission level (§3)** — building an Export button gated only by `.view` without flagging it could let more staff than intended pull a full customer record (name, email, phone, full address book) in one click. Worth a deliberate Product Owner confirmation, not a silent frontend assumption either way.
- **No restore** is a real, now-repeated platform-wide gap (Pricing's four entities, and now Customers) — this is the third module in a row where this engagement has found the same hole. Worth escalating as a platform-level backlog item rather than continuing to silently design around it slice after slice.
- **Delete's "no dependent-record check" behavior (§3)** needs clear messaging in the confirmation UI, or a merchant could be surprised that deleting a customer doesn't touch their past orders at all (which is correct, but non-obvious coming from Pricing's very different, blocking delete pattern).

---

## 8. Product Owner Recommendations

- Build **Slice 1** first — it's self-contained, the backend is fully ready, and it delivers the core "find and manage a customer" workflow every other Commerce module (Orders, Checkout) already assumes exists somewhere.
- Resolve the **password-on-create** question before Slice 1's form ships, not after — this is the one place this module's backend contract asks the frontend to make a real product decision rather than just consume an existing rule.
- Use the **real server-side search/sort/pagination** `GET /customers` already supports — do not default to Pricing's "fetch everything client-side" pattern out of habit; that pattern was a *workaround* for endpoints that lacked this, not a house style to repeat where it isn't needed.
- Treat **Slice 2 (Audit + Export)** as worth doing, not optional polish — Customer data is the platform's own Sensitive classification, and right now there is no way for an authorized staff member to actually see the audit trail this backend has been faithfully recording since Phase 1.

---

## 9. Open Decisions (need a Product Owner answer, not a frontend guess)

1. Who sets a new customer's password at registration, and how does a customer ever reset it, given no self-service flow exists yet?
2. Should Export require `.manage`, not just `.view`?
3. Detail view: dedicated route (recommended, §5) or drawer — final call?
4. Is a per-customer Activity tab (Slice 2) needed at initial launch, or can it trail Slice 1 by one release?

---

## 10. Readiness Score: **97 / 100**

Backend is complete, tested, and consistent with every convention this engagement has already proven out. The 3-point deduction is entirely for the open product decisions in §9 — nothing here reflects missing or broken backend work. This is, if anything, a **more** ready starting point than Pricing was at the equivalent research stage (Pricing's own list endpoints lacked search/sort entirely; Customers' does not).

---

## Next Steps

Per instruction: **no implementation, no commit, no push.** This document is for Product Owner review. Awaiting approval and answers to §9 before any Customers frontend work begins.
