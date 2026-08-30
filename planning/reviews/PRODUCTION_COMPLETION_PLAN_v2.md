# neXgen Commerce Platform — Production Completion Plan v2

**Mode:** Production Completion Mode — audit only. No code was written, modified, or committed to produce this document.
**Method:** Every claim below traces to a direct read of the actual repository on `main` as of this commit (`ed0393b`) — file counts, `grep`/`find` output, route/permission/test/seeder enumeration, and targeted source reads where a count alone would mislead. Old planning documents (`planning/architecture/*`, prior `planning/reviews/*`) were **not** used as a source of truth for any completion figure below — where a prior document's claim is cited, it is only to flag that it is now confirmed, contradicted, or superseded by this fresh read.
**Scope:** All 19 real backend modules across 3 domains, the Gateway, the Admin app, and the Storefront app. A fourth domain — **Growth** (Reporting, CRM, Marketing, Automation) — has **zero implementation**: no directory exists under `app/Domains/Growth` at all. It is scored 0% throughout and is not a milestone candidate on its own (see Part 3).

---

## Part 0 — How Completion % Is Judged

There is no single formula that would not be spuriously precise. Each module's % below is a judgment call grounded in the evidence in its row, weighted roughly: backend core (Actions/Controllers/Models/Requests/Resources/routes/Permissions) ~40%, tests ~15%, Admin UI ~15%, Storefront/Gateway integration where the module has customer-facing relevance ~15%, and operational completeness (seeders/config/jobs/events/docs) ~15%. A backend-only module with no customer-facing surface (e.g. Identity & Access) is scored against Admin UI instead of Storefront integration.

---

## Part 1 — Module-by-Module Audit

### Commerce domain

#### Catalog
| Dimension | Finding |
|---|---|
| **Completion** | **~85%** |
| **Production readiness** | High. The platform's most mature module. |
| Backend structure | 54 Actions, 18 Controllers, 30 Requests, 14 Resources, 13 Models, 4 Events, 1 Console Command, real `routes.php`, real `PermissionRegistry` (15 permissions). |
| Missing Integrations | None material — Categories/Brands/Collections/Tags/Attributes/Variants/Images/Relationships all real and wired to Media. |
| Missing APIs | None found. |
| Missing UI (Storefront) | Real — product/category/brand/collection pages exist, but browse-time price is always `null` (see Pricing row) and search results have no page (see Search row). |
| Missing Admin | Minor — 53 files, the largest Admin module; no gaps found structurally. |
| Missing Tests | 14 backend test files — solid but proportionally the thinnest coverage-to-Action ratio of any Commerce module (54 Actions vs. 14 test files). |
| Missing Documentation | None material. |
| Missing Seeders | **Real gap** — no product/category/brand demo-data seeder exists anywhere in `database/seeders/`; only a `CatalogPermissionSeeder`. A fresh install has zero sellable products. |
| Missing Permissions | None found. |
| Missing Events | None material. |
| Missing Background Jobs | None — image processing, if any, is synchronous. |
| Missing Config | No `config/catalog.php` exists — nothing here is runtime-tunable (e.g. default visibility, image size presets are hardcoded). |
| Missing Validation | None found. |

#### Checkout
| Dimension | Finding |
|---|---|
| **Completion** | **~85%** (raised from the pre-Milestone-1 baseline by this session's own Shipping integration work) |
| **Production readiness** | High for guest checkout; **no registered-customer checkout UI exists on the Storefront** (backend supports it — see Customers). |
| Backend structure | 12 Actions, 9 Controllers, 8 Requests, 3 Resources, 2 Models, 3 Events, 2 Console Commands, real saga (`SubmitCheckoutAction`), real idempotency, real recovery, real expiration sweep. |
| Missing Integrations | Shipping — closed this session. Tax — real (`Pricing\CalculateTaxAction`). Pricing display pre-checkout — not integrated (see Pricing). |
| Missing APIs | None found. |
| Missing UI | No express checkout (Buy Now bypasses full form only partially), no saved-address reuse UI beyond the address book lookup already wired for registered customers (who cannot log in on the Storefront today). |
| Missing Admin | No dedicated "Checkout Sessions" admin view (abandoned-cart visibility for staff does not exist as a UI, only as data). |
| Missing Tests | 11 backend test files — solid. |
| Missing Documentation | `PHASE_2_7_CHECKOUT_ARCHITECTURE.md` now has a dated addendum (this session); otherwise current. |
| Missing Seeders | N/A (session data, correctly not seeded). |
| Missing Permissions | None found. |
| Missing Events | `CheckoutAbandoned` exists but has **no listener** — no abandoned-cart notification fires today. |
| Missing Background Jobs | The expiration sweep (`ExpireCheckoutSessionsCommand`) is a scheduled Artisan command, not a queued Job — fine for its purpose, but confirms Checkout has zero real async work. |
| Missing Config | No `config/checkout.php` — session TTL (`LIFETIME_MINUTES = 60`) is a hardcoded class constant, not configurable per store. |
| Missing Validation | None found. |

#### Customers
| Dimension | Finding |
|---|---|
| **Completion** | **~55%** |
| **Production readiness** | Low for the module's real e-commerce purpose. The backend CRUD is solid, but **customers cannot register, log in, or self-serve on the Storefront at all** — `routes.php` gates every route behind staff `auth:sanctum`, confirmed by direct read: no customer-facing auth route exists anywhere in the repository. Every real order placed today is guest checkout. |
| Backend structure | 7 Actions, 3 Controllers, 5 Requests, 3 Resources, 2 Models, 2 Events, 1 Console Command, 3 permissions. |
| Missing Integrations | No session/token issuance for a customer identity at all (only the Gateway's own service-account tokens exist). |
| Missing APIs | **Register, login, logout, password reset, "my orders," "my addresses," "my profile"** — none exist. `SendWelcomeEmailOnCustomerRegistered` listener exists and fires correctly when a staff member creates a Customer record, but there is no path for a shopper to create their own. |
| Missing UI | Entire Storefront account surface: `/account`, `/login`, `/register`, `/orders` (customer-facing, distinct from the existing guest order-lookup page) do not exist. |
| Missing Admin | 13 files exist — customer list/detail/address-book management for staff is real. |
| Missing Tests | 5 backend test files — thin relative to Orders/Checkout, which depend on this module. |
| Missing Documentation | None material beyond the gap above being undocumented as a launch blocker anywhere current. |
| Missing Seeders | No demo-customer seeder. |
| Missing Permissions | None found for the staff-facing surface. |
| Missing Events | `CustomerRegistered` exists and is wired; no `CustomerLoggedIn`/`PasswordResetRequested` exist (moot until real auth exists). |
| Missing Background Jobs | None. |
| Missing Config | No `config/customers.php`. |
| Missing Validation | None found for the existing staff-facing surface. |

#### Inventory
| Dimension | Finding |
|---|---|
| **Completion** | **~80%** |
| **Production readiness** | High for staff operations; storefront-facing stock display not independently verified this pass. |
| Backend structure | 12 Actions, 6 Controllers, 6 Requests, 6 Resources, 5 Models, 3 Events, 1 Console Command, 7 permissions. Warehouses, stock items, reservations, transfers all real. |
| Missing Integrations | No low-stock → Notifications/Dashboard alert path exists (confirmed — no code anywhere matches a low-stock alert mechanism). |
| Missing APIs | None found. |
| Missing UI | Real-time "X left in stock" urgency messaging does not exist on the Storefront (correctly avoided per this platform's own anti-fabrication discipline — only real stock states, no manufactured urgency). |
| Missing Admin | 38 files — mature (transfers, reservations, warehouses, audit logs all present). |
| Missing Tests | 10 backend test files. |
| Missing Documentation | None material. |
| Missing Seeders | No warehouse/stock demo seeder. |
| Missing Permissions | None found. |
| Missing Events | `StockReserved`/`StockReleased`-class events exist (3 total) but nothing subscribes to them for a real low-stock alert. |
| Missing Background Jobs | None — reservation expiry, if any, was not confirmed as a queued/scheduled mechanism this pass. |
| Missing Config | No `config/inventory.php` — reservation TTL, if any, is not externally tunable. |
| Missing Validation | None found. |

#### Orders
| Dimension | Finding |
|---|---|
| **Completion** | **~85%** |
| **Production readiness** | High. |
| Backend structure | 7 Actions, 4 Controllers, 4 Resources, 6 Models, 2 Events, 1 Console Command, 4 permissions. Deliberately thin by design (records figures Checkout already resolved, per its own arch-test-documented boundary). |
| Missing Integrations | None found. |
| Missing APIs | **Corrected by Milestone 3's own direct code read — the original claim below was wrong.** ~~`OrderCancelled` does not exist as an event or an action — there is no real "cancel an order" capability in the backend at all today, staff or customer.~~ `Actions\CancelOrderAction` is real and complete: version-checked, audit-logged, publishes `OrderStatusChanged` (this module's one shared status-transition event, reused across every transition rather than one event class per transition — see that event's own docblock), wired to `OrderStatusController::cancel()` at `POST orders/{order}/cancel` behind `orders.orders.manage`, validated by `CancelOrderRequest`, and already has a real Admin UI (`OrderCancelDialog.tsx`) and test coverage (`OrderStatusTest.php`). The only real gap this milestone found was that nothing *notified the customer* of a cancellation — closed by `SendOrderCancellationNoticeOnOrderStatusChanged` (see Milestone 3 report). |
| Missing UI | None — see correction above. |
| Missing Admin | None — see correction above. |
| Missing Tests | 7 backend test files (`OrderStatusTest.php` covers cancellation). |
| Missing Documentation | None — corrected above. |
| Missing Seeders | No demo-order seeder (expected — orders are transactional, not demo content). |
| Missing Permissions | None found — cancellation reuses the existing `orders.orders.manage` permission. |
| Missing Events | None — `OrderStatusChanged` already covers this transition (see correction above). |
| Missing Background Jobs | None. |
| Missing Config | No `config/orders.php`. |
| Missing Validation | None found for existing surface. |

#### Payments
| Dimension | Finding |
|---|---|
| **Completion** | **~80%** code, **~30%** live-usable |
| **Production readiness** | Code is mature; **operationally, only Cash on Delivery and Bank Transfer can process a real payment today** — every bKash/Nagad/SSLCommerz/Pathao/Steadfast credential in `.env` is present as a key but empty. This is a merchant-configuration gap, not a code gap, but it materially caps real production readiness. |
| Backend structure | 10 Actions, 8 Controllers, 6 Requests, 4 Resources, 3 Models, **7 Events** (the richest event surface of any Commerce module), 2 Console Commands, 4 permissions. Gateway abstraction (`Gateways\Contracts\RefundableGateway` etc.) is real. |
| Missing Integrations | None structurally — bKash/Nagad/SSLCommerz gateway classes exist and compile, they are simply unconfigured. |
| Missing APIs | None found. |
| Missing UI | None found — `PaymentMethodSelector` correctly shows every real gateway and honestly fails at initiation for an unconfigured one. |
| Missing Admin | 16 files — payment list/detail/refund-initiation present. |
| Missing Tests | 17 backend test files — the best-covered module in the platform. |
| Missing Documentation | None material. |
| Missing Seeders | N/A (transactional). |
| Missing Permissions | None found. |
| Missing Events | **`PaymentFailed` exists but has no Notifications listener** — a shopper whose payment fails receives no real email/SMS about it today (this is the sprint brief's own named "Failed payment" trigger, confirmed genuinely missing). |
| Missing Background Jobs | None found — gateway webhook processing, if any, was not confirmed as queued. |
| Missing Config | `config/payments.php` exists and is real (the one Commerce module with dedicated config) — covers gateway credentials and the named COD-fee extension points. |
| Missing Validation | None found. |

#### Pricing
| Dimension | Finding |
|---|---|
| **Completion** | **~65%** overall (**backend ~90%**, **Storefront integration ~0%**) |
| **Production readiness** | **Low, and this is the single most damaging gap in the platform.** Confirmed by direct source read of `packages/storefront-engine/src/cart/CartSummary.tsx`'s own docblock: "every real product on this Storefront resolves `unitPrice: null`... no Pricing route composed from the Gateway yet." Every product detail page shows the literal text "Price coming soon." **A real shopper cannot see a price for any product before checkout, on any page, anywhere on the Storefront.** |
| Backend structure | 21 Actions, 8 Controllers, 13 Requests, 7 Resources, 5 Models, 1 Event, 1 Console Command, 5 permissions. Price lists, tax rates/classes, tax calculation, price-list entries all real and well-built. |
| Missing Integrations | **The entire Gateway↔Pricing composition path.** No `module: 'pricing'` call exists anywhere in `apps/store-api-gateway/src` (confirmed by grep — the Gateway's real module set is `branding, catalog, checkout, orders, payments, search, shipping`; Pricing is not among them). |
| Missing APIs | A real, customer-facing "resolve price for product X in currency Y" Gateway endpoint does not exist. |
| Missing UI | None on the backend/Admin side; on the Storefront, `PriceBlock.tsx` already has a real, honest "Price coming soon" empty state ready to be filled the moment real data flows. |
| Missing Admin | 25 files — price lists, tax classes/rates, price-list entries all manageable by staff already. |
| Missing Tests | 12 backend test files. |
| Missing Documentation | None material — the gap is already honestly documented in `CartSummary.tsx`'s own code comment, just not in a planning document. |
| Missing Seeders | Real gap — no demo price-list-entry seeder; combined with Catalog's own missing product seeder, a fresh install has no real, priced catalog to demo at all. |
| Missing Permissions | None found. |
| Missing Events | None found missing for existing scope. |
| Missing Background Jobs | None. |
| Missing Config | No `config/pricing.php`. |
| Missing Validation | None found. |

#### Promotions
| Dimension | Finding |
|---|---|
| **Completion** | **~75%** |
| **Production readiness** | Medium-high for checkout-time coupons; no browse-time promotional badges/banners are real (correctly, since Pricing itself isn't composed to browse pages either). |
| Backend structure | 13 Actions, 6 Controllers, 9 Requests, 6 Resources, 4 Models, 2 Events, 1 Console Command, 6 permissions. |
| Missing Integrations | Not exposed via the Gateway's own module set at all (absent from the same grep as Pricing above) — coupon application happens only inside the Checkout saga server-side, never previewed to the shopper before that step. |
| Missing APIs | A real "preview this coupon code" endpoint independent of full checkout submission was not found. |
| Missing UI | `PromoCodePlaceholder` (per this engagement's own established pattern) exists on the Storefront but a full apply/preview flow was not confirmed this pass. |
| Missing Admin | 20 files (the "marketing" module folder) — promotions, redemptions, conditions, activity all present. |
| Missing Tests | 10 backend test files. |
| Missing Documentation | None material. |
| Missing Seeders | No demo-promotion seeder. |
| Missing Permissions | None found. |
| Missing Events | None found missing for existing scope. |
| Missing Background Jobs | None. |
| Missing Config | No `config/promotions.php`. |
| Missing Validation | None found. |

#### Search
| Dimension | Finding |
|---|---|
| **Completion** | **~55%** overall (**backend ~90%**, **Storefront integration ~0%**) |
| **Production readiness** | Low for its actual purpose. Confirmed by direct source read of `SearchOverlay.tsx`'s own docblock: "no Search backend — the real Gateway `/v1/search` route exists... but is deliberately not called from this overlay." Submitting a search shows an honest "search isn't available yet" message. Recent-search history (localStorage) is the only genuinely working piece today. |
| Backend structure | 4 Actions, 2 Controllers, 1 Request, 2 Resources, 1 Model, 3 Listeners (Search is the one module with its own in-domain listeners, per its documented same-domain exception), 2 Console Commands, 3 permissions. |
| Missing Integrations | The Storefront never calls the real, working Gateway `/v1/search` route. |
| Missing APIs | A real `/search` results page route does not exist on the Storefront (`apps/storefront/src/app` has no `search/` directory). |
| Missing UI | Results page, keyboard-navigable result list, loading/empty states for real results, mobile search UX. |
| Missing Admin | No dedicated Search admin surface (index health, reindex trigger) was found in Admin's module list. |
| Missing Tests | 14 backend test files (strong) — but zero Storefront-side search tests exist since there is nothing to test yet. |
| Missing Documentation | None material — again, honestly self-documented in code, just not centrally tracked as a launch blocker. |
| Missing Seeders | Depends on Catalog's own missing product seeder to have anything real to index. |
| Missing Permissions | None found. |
| Missing Events | None found missing. |
| Missing Background Jobs | Index maintenance runs via Console Commands, not confirmed as queued. |
| Missing Config | `config/search.php` exists and is real. |
| Missing Validation | None found. |

---

### Operations domain

#### Shipping
| Dimension | Finding |
|---|---|
| **Completion** | **~85%** (raised this session — see Milestone 1) |
| **Production readiness** | High for the one real configured zone (Dhaka Metro, BD); **most destinations honestly return no shipping options today**, a merchant-configuration gap, not a code gap. |
| Backend structure | 14 Actions, 7 Controllers, 9 Requests, 7 Resources, 3 Models, 1 Event, 1 Console Command, 8 permissions. 7 real courier provider classes; only Steadfast has a documented live API shape, none has live credentials configured. |
| Missing Integrations | Closed this session (Checkout composition). |
| Missing APIs | None found. |
| Missing UI | None on Storefront (real, per Milestone 1). |
| Missing Admin | 29 files — zones/methods/rates/providers all manageable. |
| Missing Tests | 12 backend test files (+5 new this session). |
| Missing Documentation | Updated this session. |
| Missing Seeders | **Real gap** — no zone/method/rate demo seeder; this installation's one real zone was created ad hoc, not reproducibly. |
| Missing Permissions | None found. |
| Missing Events | None found missing. |
| Missing Background Jobs | Live courier booking, when a provider supports it, is synchronous — no queued retry/backoff for a flaky courier API. |
| Missing Config | `config/shipping.php` exists and is real (documents which providers support live quoting). |
| Missing Validation | None found. |

#### Fulfillment
| Dimension | Finding |
|---|---|
| **Completion** | **~60%** |
| **Production readiness** | Low-medium. Backend is real (pick→pack→dispatch workflow, Shipment aggregate), but **no Admin UI exists for it at all** — confirmed: `apps/admin/src/modules` has no `fulfillment` directory. Staff cannot create or progress a shipment through any UI today. |
| Backend structure | 15 Actions, 5 Controllers, 8 Requests, 5 Resources, 4 Models, 3 Events, 1 Console Command, 7 permissions. |
| Missing Integrations | None structurally — `CreateShipmentOnOrderPlaced` (cross-domain listener) already auto-creates a shipment on order placement. |
| Missing APIs | None found. |
| Missing UI | Entire Admin surface — shipment list, item picking, packing, dispatch, tracking-number entry. |
| Missing Admin | Confirmed absent (see above) — this is the largest single Admin gap in Operations. |
| Missing Tests | 10 backend test files. |
| Missing Documentation | `PHASE_2_8_SHIPPING_ARCHITECTURE.md` covers this module's design but nothing tracks the missing Admin UI as a launch blocker. |
| Missing Seeders | N/A (transactional). |
| Missing Permissions | None found for existing scope. |
| Missing Events | None found missing. |
| Missing Background Jobs | None. |
| Missing Config | No `config/fulfillment.php`. |
| Missing Validation | None found. |

#### Returns
| Dimension | Finding |
|---|---|
| **Completion** | **~55%** |
| **Production readiness** | Low-medium, for the identical reason as Fulfillment: **no Admin UI exists** (confirmed absent from `apps/admin/src/modules`), and **no Storefront return-request flow exists** for a customer to initiate a return at all. |
| Backend structure | 17 Actions, 6 Controllers, 7 Requests, 7 Resources, 6 Models, **8 Events** (tied with Payments for the richest event surface), 1 Console Command, 7 permissions. The refund flow correctly crosses into Payments only via the event bus (`ReturnResolved` → `PaymentRefunded`), per its own documented boundary. |
| Missing Integrations | None structurally on the backend side. |
| Missing APIs | A customer-facing "request a return for order X" endpoint was not confirmed — the existing surface reads as staff-initiated only. |
| Missing UI | Entire Admin surface (RMA list, approve/reject, refund processing) and entire Storefront surface (return request form, RMA status lookup). |
| Missing Admin | Confirmed absent. |
| Missing Tests | 12 backend test files. |
| Missing Documentation | None material beyond the gap being untracked. |
| Missing Seeders | N/A. |
| Missing Permissions | None found for existing scope. |
| Missing Events | None found missing for existing scope. |
| Missing Background Jobs | None. |
| Missing Config | No `config/returns.php`. |
| Missing Validation | None found. |

#### Notifications
| Dimension | Finding |
|---|---|
| **Completion** | **~65%** code-wired, **materially lower operationally** |
| **Production readiness** | Medium. This module is **considerably more complete than assumed in this engagement's own prior sprint brief** — a direct read of `app/Listeners/` and `NotificationTemplateSeeder.php` shows **8 of 11 named real-world triggers are genuinely wired end-to-end today**: Order Placed, Payment Captured, Payment Refunded, Refund Issued, Return Requested, Shipment Dispatched, Shipment Delivered, Customer Registered — each has a real listener, a real queued `QueueNotificationAction` call, and a real seeded template. **However, the real Mailgun email credentials in `.env` are empty**, so even a correctly-triggered email cannot actually send in this installation today — a merchant-configuration gap layered on top of a real code gap. |
| Backend structure | 6 Actions, 4 Controllers, 4 Requests, 4 Resources, 3 Models, 2 Events, **1 Job** (the only queued Job class in the entire platform), 1 Console Command, 5 permissions. Channel abstraction (`Channels\Contracts`) is real. |
| Missing Integrations | Three specific, confirmed gaps: **(1)** `Payments\Events\PaymentFailed` exists but has no listener. **(2)** `Checkout\Events\CheckoutAbandoned` exists but has no listener. **(3)** No `OrderCancelled` event exists at all in Orders (see Orders row), so it cannot be wired here regardless. No admin-facing alert (new order, low stock) exists at all — zero code anywhere matches such a mechanism. |
| Missing APIs | None found for existing scope. |
| Missing UI | **No Admin UI exists** for notification templates or delivery logs — confirmed absent from `apps/admin/src/modules`; a merchant cannot see or edit a single template today without direct database/API access. |
| Missing Admin | Confirmed absent (see above). |
| Missing Tests | 17 backend test files — the second-best-covered module in the platform. |
| Missing Documentation | None material. |
| Missing Seeders | `NotificationTemplateSeeder` exists and is real (8 templates) — the one non-permission demo-data seeder in the entire platform. |
| Missing Permissions | None found for existing scope. |
| Missing Events | See Missing Integrations above. |
| Missing Background Jobs | The one real Job exists; nothing else in the platform uses the queue at all despite Redis being the real, configured `QUEUE_CONNECTION`. |
| Missing Config | `config/notifications.php` exists and is real. |
| Missing Validation | None found. |

---

### Platform domain

#### Appearance
| Dimension | Finding |
|---|---|
| **Completion** | **~60%** |
| **Production readiness** | Medium. Real draft/publish/reset pattern, real branding preview, real logo/favicon upload via Media — but **zero test coverage**. |
| Backend structure | 4 Actions, 2 Controllers, 2 Requests, 2 Resources, 1 Model, 1 Console Command, 3 permissions. |
| Missing Integrations | None structurally. |
| Missing APIs | None found. |
| Missing UI | None found for existing scope — Admin has a real live-preview mockup. |
| Missing Admin | 6 files — real. |
| Missing Tests | **Confirmed zero** — no test file anywhere matches `*appearance*` or `*StoreAppearance*` in `tests/`. This is the single largest test-coverage gap of any built module in the platform. |
| Missing Documentation | None material. |
| Missing Seeders | No default-theme seeder — a fresh install has no branding until an operator sets one. |
| Missing Permissions | None found. |
| Missing Events | None found missing. |
| Missing Background Jobs | None. |
| Missing Config | No `config/appearance.php`. |
| Missing Validation | None found. |

#### Identity & Access
| Dimension | Finding |
|---|---|
| **Completion** | **~65%** |
| **Production readiness** | Medium. Backend RBAC is mature and is the platform's own real, only authorization mechanism — but **there is no Admin UI for it**: confirmed absent from `apps/admin/src/modules` (no `identity-access`, `users`, or `roles` folder; grepping the whole Admin app for "user management"/"role management" text returns nothing). A merchant cannot invite a staff member, assign a role, or view an audit trail of who has access to what through any UI today — this can only be done via direct API calls or database access, which is a genuine operational and security-hygiene gap for a real deployment. |
| Backend structure | 11 Actions, 7 Controllers, 7 Requests, 5 Resources, 3 Models, 7 Events, 2 Console Commands, 7 permissions. |
| Missing Integrations | None structurally. |
| Missing APIs | None found — the backend surface (users, roles, permissions, invitations if any) appears complete; only its UI is missing. |
| Missing UI | Entire Admin surface: user list/invite/edit, role list/edit, permission-to-role assignment, session/token management. |
| Missing Admin | Confirmed absent — see above. This is arguably the **highest-severity single gap in the entire platform**: every other Admin feature assumes an operator can already be authenticated and permissioned, but there is no self-service way to create that operator's account today beyond whatever bootstrap/seeder path exists. |
| Missing Tests | 10 backend test files. |
| Missing Documentation | None material beyond the Admin gap being untracked as a launch blocker. |
| Missing Seeders | `RoleSeeder`/`PermissionSeeder` exist and are real; no demo-user seeder beyond whatever the installer flow creates. |
| Missing Permissions | None found for existing scope. |
| Missing Events | None found missing. |
| Missing Background Jobs | None. |
| Missing Config | `config/auth.php`/`config/sanctum.php` exist (Laravel-standard); no module-specific config beyond that. |
| Missing Validation | None found. |

#### Installer
| Dimension | Finding |
|---|---|
| **Completion** | **~70%** |
| **Production readiness** | Adequate for its narrow, one-time-setup scope. |
| Backend structure | 1 Action, 1 Controller, 1 Request, 1 Resource, 1 Model, 1 Event, real `routes.php`, no `PermissionRegistry` (correct — pre-authentication by nature). |
| Missing Integrations | Not independently re-verified this pass beyond structural presence. |
| Missing APIs | None found for its scope. |
| Missing UI | Not independently re-verified this pass. |
| Missing Admin | N/A — this module's whole purpose is to run before an Admin exists. |
| Missing Tests | 2 backend test files — thin, but the module's surface is intentionally small. |
| Missing Documentation | None material. |
| Missing Seeders | N/A by design. |
| Missing Permissions | N/A by design (documented exception in `ArchitectureTest.php`). |
| Missing Events | None found missing. |
| Missing Background Jobs | None. |
| Missing Config | Uses `config/app.php` directly; no dedicated file. |
| Missing Validation | None found. |

#### Localization & Currency
| Dimension | Finding |
|---|---|
| **Completion** | **~55%** |
| **Production readiness** | Low-medium. Backend currency/locale rules are real (`IsValidCurrencyCode`, reused correctly by 5+ other modules), but the Storefront is **hardcoded to BD/BDT everywhere** — confirmed by `CheckoutForm.tsx`'s own docblock: `currencyCode: 'BDT'` is a hardcoded literal, explicitly because "this form is already Bangladesh-only." Multi-currency/multi-locale is real in the backend and entirely unused by the Storefront today. |
| Backend structure | 8 Actions, 3 Controllers, 5 Requests, 3 Resources, 2 Models, 2 Events, 1 Console Command, 5 permissions. |
| Missing Integrations | The Storefront never asks the Gateway which currencies/locales are actually enabled. |
| Missing APIs | None found on the backend side. |
| Missing UI | No currency/locale switcher anywhere on the Storefront. |
| Missing Admin | **No dedicated Localization admin surface** — confirmed absent from `apps/admin/src/modules` (no `localization` folder). |
| Missing Tests | 6 backend test files. |
| Missing Documentation | None material. |
| Missing Seeders | Whatever currency/locale rows exist were seeded ad hoc, not via a tracked seeder file specific to this module. |
| Missing Permissions | None found for existing scope. |
| Missing Events | None found missing. |
| Missing Background Jobs | None. |
| Missing Config | No `config/localization.php`. |
| Missing Validation | None found. |

#### Media
| Dimension | Finding |
|---|---|
| **Completion** | **~65%** |
| **Production readiness** | Medium — works correctly as a service consumed by Catalog and Appearance, with no standalone surface of its own. |
| Backend structure | 4 Actions, 2 Controllers, 3 Requests, 2 Resources, 1 Model, 2 Events, 1 Console Command, 3 permissions. |
| Missing Integrations | None found — consumed correctly by both known callers. |
| Missing APIs | None found. |
| Missing UI | No standalone "Media Library" Admin page (browse/search all uploaded assets across every module) — confirmed absent as its own module folder; upload UI exists only inline within Catalog/Appearance's own screens. |
| Missing Admin | See above. |
| Missing Tests | 5 backend test files. |
| Missing Documentation | None material. |
| Missing Seeders | No demo-asset seeder. |
| Missing Permissions | None found. |
| Missing Events | None found missing. |
| Missing Background Jobs | Image resizing/variant generation, if any, was not confirmed as queued — likely synchronous, a real scalability risk for large uploads. |
| Missing Config | No `config/media.php` — max upload size, allowed types are presumably hardcoded. |
| Missing Validation | None found. |

#### Store Configuration
| Dimension | Finding |
|---|---|
| **Completion** | **~45%** |
| **Production readiness** | Low. This is the platform's weakest built module by evidence: the real Settings framework (`SettingsPage.tsx`) is honestly built to register other modules' panels, but a direct read confirms **zero modules — not even Store Configuration's own — register a single settings panel today**. The Settings screen in Admin renders its own honest empty state ("No settings panels yet") on a production install right now. |
| Backend structure | 4 Actions, 2 Controllers, 3 Requests, 2 Resources, 1 Model, 1 Event, 1 Console Command, 3 permissions. |
| Missing Integrations | The framework-to-panel wiring itself — real on both ends, connected nowhere. |
| Missing APIs | Not independently re-verified beyond structural presence. |
| Missing UI | Its own settings panel (store name, default currency, timezone, contact info — whatever this module actually owns) does not render anywhere. |
| Missing Admin | See above — this is the concrete, current-state gap. |
| Missing Tests | 5 backend test files. |
| Missing Documentation | The Settings framework's own docblock already honestly names this gap; no planning document tracks it as a launch blocker. |
| Missing Seeders | No default store-configuration seeder — a fresh install's store name/currency/etc. are whatever the Installer flow set, not independently verified. |
| Missing Permissions | None found for existing scope. |
| Missing Events | None found missing. |
| Missing Background Jobs | None. |
| Missing Config | Ironically, no `config/store_configuration.php` for a module whose entire purpose is configuration. |
| Missing Validation | None found. |

---

### Growth domain — Reporting, CRM, Marketing/Automation

**Completion: 0%.** No directory exists under `app/Domains/Growth` at all — confirmed by direct `find`. This is not a completion gap within a module; the domain has never been started. Not included as an individual milestone below (too large and undifferentiated for one); see Part 3's closing note.

### Reviews (does not exist as a module)

**Completion: 0%.** No `Review` model, controller, or migration exists anywhere in the backend. The Storefront's `RatingSummary`/`ReviewList`/`QASection` components exist and correctly render honest "No reviews yet" empty states with no data source at all. See Milestone 11.

### Dashboard (Admin, cross-cutting)

**Completion: ~15%.** The `dashboardWidgets` registration framework is real and tested (`moduleRegistry.test.ts`), but a grep of every Admin module's `module.ts` confirms **zero real modules register a single dashboard widget**. The Dashboard page renders whatever the (currently empty) registry gives it. See Milestone 8.

---

## Part 2 — Cross-Cutting Platform Findings

These apply across most or all modules, not to any one of them:

1. **Only one background Job class exists in the entire platform** (`Operations\Notifications`'s queue job), despite Redis being the real, configured queue connection. Nothing else — image processing, search indexing, report generation, bulk exports — runs asynchronously.
2. **Seeders are almost exclusively permission seeders.** Of 21 files in `database/seeders/`, 17 are per-module `*PermissionSeeder`s, 1 is `RoleSeeder`, 1 is `DatabaseSeeder`, and exactly **1** (`NotificationTemplateSeeder`) seeds real business/demo content. No product, category, brand, price-list-entry, shipping-zone, or customer seeder exists anywhere. A fresh `migrate --seed` produces a platform with correct permissions and zero sellable inventory.
3. **Config files exist for only 7 of 19 modules** (`api`, `payments`, `notifications`, `search`, `shipping`, plus Laravel-standard `auth`/`sanctum`/`cache`/etc.). The other 12 have no dedicated config file — every tunable value in those modules is a hardcoded class constant.
4. **Admin UI exists for 10 of 19 backend modules.** Missing entirely: Identity & Access (users/roles), Fulfillment, Returns, Notifications (templates/logs), Search (index health), Localization, Store Configuration's own panel, and a standalone Media Library.
5. **The Gateway exposes 7 of 19 backend modules** to the Storefront (`branding, catalog, checkout, orders, payments, search, shipping`). Pricing and Promotions — both mature backends — are not among them, which is the direct cause of the "Price coming soon" gap.
6. **No customer authentication exists anywhere in the platform.** Every real transaction is guest checkout. This is the single deepest structural gap and blocks Reviews-with-verified-purchase, order history, wishlists, and saved addresses from ever being real features until it is built.
7. **Every third-party credential in `.env` is empty** except sandbox/region flags — bKash, Nagad, SSLCommerz, Pathao, Steadfast, Mailgun, Brevo. This caps *operational* readiness (not code readiness) for Payments and Notifications specifically, and is a merchant-configuration task, not an engineering one.

---

## Part 3 — Production Milestones

Each milestone is scoped to be independently shippable: it does not require any other milestone below to be started first (dependencies are called out explicitly where a soft benefit, not a hard requirement, exists). Ordered by production value first, effort-to-value ratio second. Milestone 1 (Checkout → Shipping Integration) is already shipped — see `NEXGEN_OVERNIGHT_SPRINT_MILESTONE_1_REPORT.md`. Milestone 2 (Product Pricing → Storefront) is shipped — see `MILESTONE_2_PRICING_STOREFRONT_COMPLETION_REPORT.md` (includes the Gateway service-account provisioning production-configuration fix). Milestone 3 (Notifications Completion) is shipped — see `MILESTONE_3_NOTIFICATIONS_COMPLETION_REPORT.md`. Milestone 4 (Storefront Search Wiring) was found already shipped as a side effect of Milestone 2's own escalation round — see that milestone's own corrected section below. Milestone 5 (Customer Accounts) is shipped — see `MILESTONE_5_CUSTOMER_ACCOUNTS_COMPLETION_REPORT.md`. Milestone 5b (Password Reset) is shipped — see `MILESTONE_5B_PASSWORD_RESET_COMPLETION_REPORT.md`. Milestone 6 (Identity & Access Admin UI) is shipped — see `MILESTONE_6_IDENTITY_ACCESS_ADMIN_UI_COMPLETION_REPORT.md`.

### Milestone 2 — Product Pricing → Storefront
- **Objective**: Compose real Pricing (+ tax, + active Promotions) into the Gateway and display it on every product card, product detail page, and cart/checkout summary — closing the platform's single most damaging gap ("Price coming soon" on every product, everywhere).
- **Estimated files**: ~15–20 (Gateway: new Pricing client + composition into `catalog.ts`/`checkout.ts` responses, ~5–6 files; Storefront: `PriceBlock`, `CartSummary`, `ProductCard` wiring to real data, ~5–6 files; tests across both, ~5–8 files).
- **Estimated complexity**: Medium-High — same shape of cross-module composition work as Milestone 1 (Gateway-side, Category-A read composition), but touches more render surfaces (grid cards, PDP, cart, checkout).
- **Dependencies**: None hard. Soft benefit: reuses the Category-A `BackendClient` pattern Milestone 1 already exercised.
- **Production value**: **Highest of any remaining item.** A store where no product ever shows a price is not a store a merchant can demo, let alone launch.
- **Expected completion after**: Pricing 65% → ~90%.

### Milestone 3 — Notifications Completion — ✅ Shipped
- **Objective (corrected against code before implementation)**: Close the two real, confirmed gaps — `PaymentFailed` and `CheckoutAbandoned` were both published with zero subscribers. **Correction to this plan's original text**: order cancellation itself was never missing — `Actions\CancelOrderAction` already existed, complete, tested, and wired to a real Admin UI; the only real gap was that its `OrderStatusChanged` transition to `cancelled` had no notification listener either. No new event was needed.
- **Files actually changed**: 3 new listeners (`SendPaymentFailureNoticeOnPaymentFailed`, `SendAbandonedCartReminderOnCheckoutAbandoned`, `SendOrderCancellationNoticeOnOrderStatusChanged`), `AppServiceProvider` (registrations), `NotificationTemplateSeeder` (+3 templates), `NotificationListenersTest` (+4 tests). Also fixed two newly-discovered decimal-cast bugs (`CheckoutSession`/`CheckoutItem`, same bug class Milestone 2 found on Pricing) hit while testing this change.
- **Complexity**: Low, as predicted — the established pattern (a thin cross-domain listener calling `QueueNotificationAction`) needed no new framework code.
- **Admin UI for notification logs/templates**: Not built this pass — descoped as a separate, larger Admin-surface gap (tracked under Milestone 6/7's own "Admin UI" pattern), not blocking the actual notification-delivery gap this milestone targeted.
- **Production value**: High, for low effort — closes real, customer-visible communication gaps (a shopper whose payment fails or who abandons a cart now receives a real, template-driven email; a cancelled order now notifies its customer).
- **Completion after**: Notifications ~65% → ~85% (delivery gaps closed; Admin UI for templates/logs remains a real, separate gap). See `MILESTONE_3_NOTIFICATIONS_COMPLETION_REPORT.md`.

### Milestone 4 — Storefront Search Wiring — ✅ Already shipped (verified, not re-implemented)
- **Found already complete** when re-verified against the repository before starting: this milestone's entire scope was delivered as a side effect of Milestone 2's own escalation round in this session (`SearchOverlay.tsx` real debounced fetch + `search/searchClient.ts` + `apps/storefront/src/app/search/page.tsx`, all already committed under the Milestone 2 commits). Re-confirmed by direct read: real 300ms debounce with `AbortController` request-superseding, real loading/error/honest-empty states, Enter/"see all results" navigates to a real paginated `/search` page reusing `ProductGrid` (so mobile responsiveness and real pricing come for free, the same shared path every other listing page uses), recent-search history preserved. `test/SearchOverlay.test.tsx` (5 tests) passing; full `storefront-engine` suite 113/113 passing.
- **No new code required.** Nothing to implement, so nothing new to commit for this milestone beyond this correction.
- **Genuinely remaining, not part of this milestone's original scope**: custom arrow-key result navigation within the overlay (Tab/Enter already work via native focusable `<a>` elements — this is a nice-to-have, not a functional gap); the real MySQL-FULLTEXT-vs-SQLite limitation (pre-existing, environment-specific, documented in Milestone 2's own report) still means this can't be demonstrated end-to-end on this local dev machine, but is real and correct against the CI/production MySQL database.
- **Completion**: Search ~55% → ~85% (already reflected by Milestone 2's own report; no further change here).

### Milestone 5 — Customer Accounts (Storefront Authentication) — ✅ Shipped
- **Objective**: Real customer register/login/logout, a real `/account` area (profile, address book, order history), issued via a real, scoped customer session.
- **Design sign-off obtained before implementation** (per this milestone's own flagged requirement): session transport is an httpOnly, Secure, SameSite=Lax cookie set by a Next.js Route Handler — the real bearer token is forwarded server-to-server (Next.js → Gateway → Backend) and never reaches client-side JS. Password reset is an explicit, deliberate fast-follow (Milestone 5b), not built this pass.
- **What actually shipped**:
  - **Backend**: `Customer` model gained real `HasApiTokens`/`Authenticatable` (resolving the exact gap `RegisterCustomerAction`'s own pre-existing docblock had named as future work); `LoginCustomerAction` (mirrors `AuthenticateUserAction` exactly); `CustomerAuthController` (register/login/logout/me/updateMe, reusing the already-existing `RegisterCustomerAction`/`UpdateCustomerProfileAction` unchanged); `CustomerSelfAddressController` (self-service address book, reusing the existing Add/Update/Delete address Actions, with a real, load-bearing ownership check those Actions don't perform themselves); `CustomerOrderController` (real order history, always scoped to the caller's own id — never a client-suppliable `customer_id`). Two new defense-in-depth middlewares (`EnsureCustomerPrincipal`, `EnsureStaffPrincipal`) make "a customer token can never satisfy a staff-only check" structural, not assumed — closing a real, if previously unexercised, gap on two pre-existing Identity & Access routes (`auth/me`, `auth/logout`) that carried no `permission:` middleware at all.
  - **Gateway**: A new Category C credential path (`CustomerBackendClient`) — unlike Category A/B's one fixed service token, this one holds none; every call forwards the live customer's own token, exactly as received. New `unauthenticated` GatewayError code (a 401 here is a routine, expected outcome, never a Gateway misconfiguration the way it would be for A/B).
  - **Storefront**: Real `/login`, `/register`, `/account` (profile/addresses/orders), all backed by Next.js Route Handlers that are the only code that ever touches the real session cookie. `OrderConfirmationSummary` — a real, complete component built in Beta Sprint 3 with zero live route to reach it — is now genuinely wired, unmodified, at `/account/orders/[id]`.
- **Real bugs found and fixed during this milestone**: a platform-wide `Middleware::alias()` overwrite bug (a second call silently replaced every `permission:` middleware registration — caught before commit via a full-suite regression, would have broken every staff-permission-gated route in production); a missing pagination-shape normalization on the new `/orders/mine` Gateway route (raw Laravel paginator fields leaking through unstyled instead of this platform's own established camelCase `meta.pagination` shape); a real cross-test-suite rate-limiter collision (a new test reused a sentinel email an unrelated, pre-existing test already used against the same shared `login` limiter).
- **Files changed**: ~45 (backend ~19, Gateway ~6, storefront-engine ~14, storefront app ~14 — larger than the original estimate, primarily because the confirmed httpOnly-cookie transport design required a full Route Handler proxy layer for every mutation, not just login).
- **Completion**: Customers ~55% → ~85%. See `MILESTONE_5_CUSTOMER_ACCOUNTS_COMPLETION_REPORT.md`.

### Milestone 5b — Password Reset — ✅ Shipped
- **Objective**: Real forgot-password/reset-password flow for customer accounts, plugging into Milestone 5's own auth surface without architectural change, exactly as designed.
- **What shipped**: `customer_password_reset_tokens` table (its own, email-keyed, hash-stored — the exact table `config/auth.php`'s own docblock named as missing); `RequestPasswordResetAction`/`ResetPasswordAction` (same anti-enumeration discipline as login: an unknown email, wrong token, and expired token are all indistinguishable to the caller); a real queued email via the existing Notifications pipeline (`customer.password_reset` template); a dedicated, tighter `password-reset` rate limiter (3/minute by email+IP — forgot-password emails a third party, a real spam vector `login`'s own 5/minute wasn't built for); real `/forgot-password` and `/reset-password` Storefront pages, the latter auto-signing the customer in with their new password on success (mirroring `RegisterForm`'s own UX). A successful reset revokes every one of the customer's existing Sanctum tokens.
- **Real, platform-wide bug found and fixed during live verification** (not a Customers-specific issue): `apps/store-api-gateway/src/lib/errors.ts`'s `extractBackendValidationDetails` had never correctly parsed this backend's actual, confirmed validation-error envelope (`{"error":{"type","message","details":{field: [msgs]}}}`, per direct read of `bootstrap/app.php`'s own `$envelope` closure) — its prior two docblocks each assumed a different, incorrect shape (a bare top-level `errors` key; a claimed second "Payments-only" shape that turned out to just be the same envelope with `details` omitted). Every Gateway route surfacing a real 422 was affected, not just Customers' new ones — confirmed live via `POST /v1/customers/login` with a wrong password returning a generic `upstream_error`/502 instead of the real, specific validation message, before the fix.
- **Completion**: Customers' self-service auth surface now includes the one piece explicitly deferred from Milestone 5. See `MILESTONE_5B_PASSWORD_RESET_COMPLETION_REPORT.md`.

### Milestone 6 — Admin: Identity & Access (User & Role Management UI) — ✅ Shipped
- **Objective**: A real Admin UI for creating staff accounts, assigning roles, and composing roles from the real permission catalog — the backend RBAC is mature; before this milestone it was completely unreachable by any UI, confirmed absent by `find apps/admin/src/modules -maxdepth 1` returning no `identity-access`/`users`/`roles` directory.
- **What shipped**: `packages/api-client` gained the missing CRUD wrappers (`roles.ts`, `permissions.ts`, `userRoles.ts`, extended `users.ts` — the DTOs themselves, `UserDTO`/`RoleDTO`/`PermissionDTO`, already existed, unused). New Admin module `identity-access`: `UsersListPage`/`UserDetailPage` (profile, role assignment with a real self-role-change guard preventing accidental self-lockout), `RolesListPage`/`RoleFormDialog` (a real, grouped-by-module permission matrix built from the live `GET /permissions` catalog — never an invented permission list). Registered through the identical `registerModule()` mechanism every other module uses.
- **Named risk resolved, not avoided**: the plan's own concern — "a role editor must not let a non-Administrator escalate their own privileges" — was investigated directly against the real backend (`UserRoleController`/`AssignRoleAction`), which confirmed no such backend-level restriction exists for any holder of `identity_access.user_roles.manage`. A real, honest client-side guardrail was added (disabling self-role-change on one's own detail page, preventing the single most disruptive *accidental* mistake), documented explicitly as a usability protection, not a claim of enforced privilege-escalation prevention — closing that for real is a backend authorization change, correctly out of this UI-only milestone's scope.
- **Real, live-found backend bugs found and fixed during live browser verification** (not the test suite — every scenario below rendered correctly in isolation but crashed the instant a real user's real role data reached the UI): `UserController::index()` never eager-loaded `roles` at all (the key was entirely absent from every list response, not `[]`); `UserController::show()` and `UserRoleController::store()` both loaded `roles` but not the nested `roles.permissions` (each role's own `permissions` key was absent). All three crashed the real Admin UI with `Cannot read properties of undefined (reading 'length')` the moment a user with a real, permission-bearing role was rendered — including, for the `show()`/list bugs, the very first Administrator account every fresh install creates. Fixed by eager-loading `roles.permissions` (`AuthController::me()` already did this correctly — the fix makes the other three endpoints consistent with it), with new regression tests added to each affected endpoint's own test file.
- **Live end-to-end verification**: created a real admin account via `identity-access:create-admin`, signed into the real Admin app, created a real staff account, assigned and revoked a real role from its detail page, and created a real role with a real permission selected from the live matrix — all data deleted from the dev database afterward.
- **Completion**: Identity & Access ~65% → ~90%. See `MILESTONE_6_IDENTITY_ACCESS_ADMIN_UI_COMPLETION_REPORT.md`.

### Milestone 7 — Admin: Fulfillment & Returns UI — ✅ Shipped (Fulfillment found already shipped; Returns built this milestone)
- **Corrected against the repository before implementation, per instruction**: the plan's own claim ("Fulfillment... no Admin UI exists for it at all — confirmed: `apps/admin/src/modules` has no `fulfillment` directory") is literally true and functionally **wrong** — the real Admin UI for Shipment list/detail/pick/pack/dispatch/in-transit/deliver/fail/cancel/items/notes/destination all already exists, complete, registered, and permission-gated, living inside the `shipping` module (`apps/admin/src/modules/shipping/shipments/*`, `shipping/module.ts`) rather than a separately-named `fulfillment` one — Shipping and Fulfillment share the one real `Shipment` aggregate, so one Admin module covers both by design, not oversight. `packages/api-client/src/fulfillment/*` (types, CRUD, workflow, destination/items/notes wrappers, all real and tested) already existed too. **No new code needed for Fulfillment** — this correction was the only change for that half.
- **What shipped (Returns half)**: `packages/api-client/src/returns/` (types + CRUD + workflow + notes + refund/exchange sub-resource wrappers + audit log, mirroring `fulfillment`'s own file layout). New Admin module `returns`: `ReturnRequestsListPage`/`ReturnRequestFormDialog`/`ReturnRequestDetailPage` (a 7-milestone status rail, a full permission-gated workflow action bar for every real `ReturnRequestWorkflowController` transition, a Refund/Exchange sub-panel, read-only Items, Notes, Timeline) and `ReturnsAuditLogPage`, mirroring the Shipment/Fulfillment Admin UI pattern throughout.
- **Real, live-found backend bug found and fixed**: `RefundRequest` was missing the `decimal:4` cast its own migration's precision requires — the same SQLite dynamic-typing bug class already fixed twice earlier this engagement (`PriceListEntry`/`TaxRate`, `CheckoutSession`/`CheckoutItem`) — which crashed every refund resolution against a whole-number amount with a live `TypeError`. Fixed and verified live.
- **Live end-to-end verification**: created and walked four real return requests through the full lifecycle — a refund resolution (exposing and confirming the fix above), a complete exchange resolution (prepare → ship → complete, settling the parent request to `completed`), an early-stage rejection, and a note added to a terminal request — plus the Returns Audit Log. All test data deleted from the dev database afterward.
- **Completion**: Fulfillment unchanged (already ~85%, this audit's own prior estimate was already accurate for it, just mis-attributed to "missing"); Returns 55% → ~85%. See `MILESTONE_7_RETURNS_ADMIN_UI_COMPLETION_REPORT.md`.

### Milestone 8 — Dashboard Real Widgets — ✅ Shipped
- **Corrected against the repository before implementation, per instruction**: the plan's own file estimate ("~10–14 files... reusing the existing framework — no new framework code needed") assumed every widget could be built from endpoints that already existed. Verified directly: `OrderController::index()` supports no date-range filter and no aggregate at all, and `StockItemController::index()` had no way to find low-stock items without fetching every SKU — genuine, narrow backend gaps, not something to fake around client-side. Two small, additive, read-only backend endpoints were added (see below) rather than forcing the widgets to either fabricate numbers or page through unbounded data client-side.
- **What shipped**: A new shared `DashboardWidgetCard` framework primitive (loading/error states standardized once, matching `DataTable`'s own convention), and all 9 named widgets, each reading a real endpoint:
  - **Orders module**: Pending Orders, Today's Orders, Today's Revenue, This Month's Revenue (all four share one `GET /orders/metrics` call, deduplicated by React Query), Recent Orders, Top Selling Products (`GET /orders/top-products`), Recent Activity (Orders' own audit log — no unified cross-domain activity feed exists on the real backend, so this is honestly scoped to Orders' own stream, not a fabricated platform-wide one).
  - **Inventory module**: Low Stock, via a new `quantity_lte` filter on `StockItemController::index()` (`StockItem` has no stored "available" column — filtered against the same `quantity_on_hand - quantity_reserved` expression the model's own `available()` method already uses).
  - **Customers module**: Latest Customers, reusing the already-real, already-sorted-by-`created_at`-desc `listCustomers()`.
- **A real multi-currency finding, handled honestly**: this platform's real order data spans more than one currency (confirmed directly against the dev database — USD and BDT both present). Revenue is reported per-currency, never blended into one fabricated number — `OrderMetricsController`'s own docblock states why.
- **A real, live-found bug fixed in passing**: while building the revenue widgets, found a 6th instance of the recurring SQLite decimal-cast bug, this time on `Order`, `OrderItem`, `OrderDiscount`, `Currency`, and `PromotionRedemption` — the platform's own central financial models. Fixed and covered by a new regression test file.
- **A real, small gap found and fixed while wiring the Pending Orders widget's own deep link**: `OrdersListPage` read `customer_id` from the URL to seed its filter but never `status` — `?status=pending` was silently ignored. Fixed to mirror the existing `customer_id` pattern exactly; live-verified.
- **Completion**: Dashboard 15% → ~90%. See `MILESTONE_8_DASHBOARD_WIDGETS_COMPLETION_REPORT.md`.

### Milestone 9 — Collections Completion — ✅ Shipped (found already partially implemented)
- **Corrected against the repository before implementation, per instruction**: the plan's own claim ("collection page currently renders an honest empty state only," needing a new backend filter + Gateway passthrough) was stale on every count. Direct verification found `ProductController::index()` already had a real `collection_id` filter, the Gateway already passed it through with real cache tagging, and `storefront-engine`'s `getProducts()` already forwarded it — all shipped under an earlier "neXgen Production Sprint — Milestone 2" initiative this plan's own audit had missed. The Collection page itself was real, not an empty state, but functionally thin: no `searchParams` at all, so it could not sort, filter, or paginate — unlike its sibling `categories/[idSlug]` page, already rebuilt to a full "Professional Category Page" standard (Beta Milestone 2). **Classification: partially implemented** (real, production-ready data path; a materially incomplete page UI relative to its own sibling and the plan's own named objective).
- **What shipped**: Rebuilt the Collection page to real parity with the Category page's own proven pattern — real Toolbar (sort/grid-list toggle), Brand filter sidebar/drawer (a Collection has no sibling/child hierarchy the way a Category does, so Brand is its one real second filter dimension, mirroring the Category page's own), real Pagination, full URL sync. Reused every component unchanged. Also corrected two stale code comments (`CollectionSummary`'s own docblock in `storefront-engine` and the Gateway) that still claimed the `collection_id` filter didn't exist.
- **Completion**: Collections (part of Catalog) — production ready. See `MILESTONE_9_COLLECTIONS_COMPLETION_REPORT.md`.

### Milestone 10 — Settings Framework Population + Localization Admin — ✅ Shipped
- **Corrected against the repository before implementation, per instruction**: the Settings framework claim ("zero modules currently register one") was accurate — confirmed real and tested but genuinely empty. The two domains named needed a more precise classification than the plan gave them: **Store Configuration was partially implemented**, not simply missing — `name`/contact/address were already real, editable fields on Appearance's own Branding screen, and `updateStore()` already accepted `currencyCode`/`locale`/`timezone`, but no screen anywhere exposed those three fields. **Localization (Currency/Locale management) was disconnected** — a fully real, complete backend (`CurrencyController`/`LocaleController`, full CRUD + archive + delete + audit log) with zero Admin UI and zero `packages/api-client` wrapper anywhere in the repository.
- **What shipped**: `packages/api-client/src/localization/` (full Currency/Locale CRUD wrappers). A new `localization` Admin module whose entire contribution is two real `settingsPanels` (no top-level nav/route, per the plan's own framing): **Store Configuration** (the previously-unexposed default currency/locale/timezone, populated from the live Currency/Locale catalogs — deliberately not duplicating Branding's own identity/contact/address fields) and **Localization** (real Currency and Locale CRUD, each a Settings-panel section rather than a routed page, with a "Base"/"Default" guard mirroring `RolesListPage`'s own guard on the seeded `administrator` role).
- **A real error-mapping bug caught before shipping**: `CannotRemoveBaseCurrencyException`/`CannotRemoveDefaultLocaleException` map to HTTP 422 on the real backend, confirmed by reading `bootstrap/app.php` directly — not 409, the status this codebase's other business-rule violations use. Would have surfaced as a generic, unhelpful message had the mapper assumed the more common shape instead of verifying.
- **Completion**: Store Configuration and Localization both connected to a real, tested, live-verified Admin UI. See `MILESTONE_10_SETTINGS_LOCALIZATION_COMPLETION_REPORT.md`.

### Milestone 11 — Reviews Foundation (new module)
- **Objective**: A full new backend module — product reviews, rating summary, review count, moderation, permissions — built to the exact same real, tested pattern every other module already follows, wired to the already-built, currently-empty Storefront `RatingSummary`/`ReviewList`/`QASection` components.
- **Estimated files**: ~30–35 (new domain module: Models/migrations/Actions/Controllers/Requests/Resources/Authorization/routes.php/tests, ~20–24; Gateway composition, ~3–4; Storefront wiring, ~4–6).
- **Estimated complexity**: High — it is a ground-up module, not an integration task, the largest single build on this list after Customer Accounts.
- **Dependencies**: Soft, strong benefit from Milestone 5 (Customer Accounts) — a real platform should gate reviews to verified purchasers, which requires a real customer identity to check against. Shippable without it (guest-name reviews, honestly labeled as unverified) but materially better with it.
- **Production value**: Medium-high — a real trust signal for conversion, but not launch-blocking the way Pricing/Search are.
- **Expected completion after**: Reviews 0% → ~70%.

### Milestone 12 — Merchant Onboarding & Production Readiness Indicators
- **Objective**: A real onboarding checklist, a production-readiness indicator, and honest configuration warnings (missing payment gateway credentials, missing shipping zones, empty catalog, unconfigured email) surfaced directly in the Admin Dashboard — largely assembled from evidence this audit itself already gathered (e.g. "every payment gateway credential is empty," "only one shipping zone is configured," "the catalog has zero seeded products").
- **Estimated files**: ~10–12 (a real configuration-health check service reading each module's own real state, plus a Dashboard-integrated warnings panel).
- **Estimated complexity**: Low-Medium — mostly read-only checks against already-real data; no new domain logic.
- **Dependencies**: Soft — most valuable after Milestone 8 (Dashboard) exists to host it, but could ship as its own standalone Admin page first.
- **Production value**: High — turns every "merchant-configuration gap" named throughout this document into something the merchant is actually told about, rather than silently discovering at their first real customer's expense.
- **Expected completion after**: New capability; indirectly raises perceived production-readiness of every module it reports on.

---

**This document ends here, per instruction. Nothing above was implemented, modified, or committed.**
