# Phase 3.0 — Marketing: Architecture Research

## 1. Backend readiness

**The real backend module for "Marketing" is `Commerce/Promotions`** (`apps/backend/app/Domains/Commerce/Promotions/`) — there is no module named `Marketing` anywhere in the codebase; `docs/04_MODULE_ARCHITECTURE.md`'s own domain map places Promotions under Commerce, and it is the only module that implements Coupons, Discount Rules, and Promotions as the master task's own examples name them. It is a mature, fully-tested module: real `Models`, `Actions`, `Http\{Controllers,Requests,Resources}`, `Authorization\PermissionRegistry`, `Audit\{AuditLog,AuditLogger}`, `Events`, `Exceptions`, and 6 real Feature/Unit test files already exist and pass. No new backend work is required for a real Slice 1.

**Readiness: 8/10.** Full CRUD for Promotions and Coupons, a real condition-based eligibility engine, real redemption history, and a real audit log all exist and are routed. The two points held back: (1) no "Restore" endpoint for either Promotion or Coupon — archive/delete only, the same platform-wide gap already found and worked around in Catalog/Pricing/Payments; (2) no free-text search on either List endpoint (`status`/`discount_type` filters only for Promotions, `status` only for Coupons) — a real constraint to design the UI around, not invent past.

## 2. Module responsibilities (what this module actually owns)

- **Promotion** — the aggregate root. A rule combining a discount (`percentage` | `fixed_amount` | `buy_x_get_y` | `free_shipping`), eligibility conditions, a schedule window, a priority/stackability model, and global/per-customer usage limits.
- **PromotionCondition** — zero or more per Promotion, each one of `product` | `category` | `customer` | `store` | `minimum_order_amount`. Evaluation semantics (from the migration's own docblock, confirmed by `EvaluatePromotionsAction`'s own test coverage): **OR within a `condition_type`, AND across `condition_type`s** — e.g. two `product` conditions mean "product A OR product B," but a `product` condition plus a `minimum_order_amount` condition means both must hold.
- **Coupon** — a manual code belonging to exactly one Promotion (`requires_coupon` on the parent gates whether a coupon is even relevant), with its own independent usage limit/count and its own `lock_version` (deliberately not versioned through the parent Promotion — confirmed via the model's own docblock).
- **PromotionRedemption** — an immutable, append-only record of one real application of a Promotion (optionally via a specific Coupon) to a real Order, created exclusively by Checkout's own `SubmitCheckoutAction` calling `RedeemPromotionAction` directly — **never an admin-facing write action**. This module is the real "History" the master task's own example list names.
- **AuditLog** — the identical flat, append-only shape every other module's own audit log already uses (`actor_id`/`target_type`/`per_page` filters only, no `target_id`).

## 3. Workflow (system-level)

1. A merchant creates a Promotion (discount type + optional conditions + schedule + usage limits), optionally attaches one or more Coupons to it.
2. At Checkout, `ApplyCouponAction`/`ReviewCheckoutAction` evaluate eligible Promotions against the real cart (via `EvaluatePromotionsAction`, which this Slice does not touch — it is Checkout's own consumption path, not an admin-facing endpoint).
3. On submission, `SubmitCheckoutAction` calls `RedeemPromotionAction`, creating a real `PromotionRedemption` row and incrementing the Promotion's (and Coupon's, if used) `usage_count_global`.
4. Every write to Promotion/Coupon/PromotionCondition is captured in this module's own `AuditLog`.

## 4. Merchant workflow (what an admin actually does)

- Create/edit a Promotion: name, discount type + its type-specific required fields (a real, server-enforced `withValidator` rule set — e.g. `buy_x_get_y` requires `buy_x_quantity`/`get_y_quantity`/`get_y_discount_percentage`; `fixed_amount` requires a `currency_code`), stackability, priority, schedule window (`starts_at`/`ends_at`, `ends_at` must be `after:starts_at`), global and per-customer usage limits.
- Add/edit/remove eligibility Conditions on a Promotion (each condition mutates the parent Promotion's own `expected_version` — Conditions are not independently versioned, mirroring Options' own `OptionValue` pattern already established in Catalog).
- Create/edit Coupon codes under a Promotion (a plain, merchant-supplied, globally-unique code — no auto-generation exists in the backend), each with its own usage limit.
- Archive or delete a Promotion or Coupon (no restore — a real, confirmed backend gap, not invented around).
- Review real Redemption history, filterable by Promotion or Customer.
- Review the real Promotions Audit Log.

## 5. Permission model

| Permission | Grants |
|---|---|
| `promotions.promotions.view` | View promotions and their conditions |
| `promotions.promotions.manage` | Create, update, archive, and delete promotions and their conditions |
| `promotions.coupons.view` | View coupon codes |
| `promotions.coupons.manage` | Create, update, archive, and delete coupon codes |
| `promotions.redemptions.view` | View promotion and coupon redemption records |
| `promotions.audit_log.view` | View Promotions' audit log |

No per-object policies exist — `RequirePermission anyOf={[...]}` is the only gating mechanism needed, per every prior module's own established pattern.

## 6. Cross-module integrations (real, confirmed by reading the code)

- **Checkout** (real, live, already-exercised): `Checkout\Actions\ApplyCouponAction`, `ReviewCheckoutAction`, and `SubmitCheckoutAction` all call into Promotions directly — Promotions is a genuine, already-load-bearing dependency of the real checkout flow, not a hypothetical future integration.
- **Orders**: `PromotionRedemption.order_reference` is identifier-only (mirrors every other module's own "never a live FK into another aggregate" convention) — no reverse lookup exists from an Order to its redemptions; Order Detail (frozen) has no Promotions card and this phase does not add one (would require reopening a frozen module).
- **Customers**: `PromotionCondition.condition_type = 'customer'` and `PromotionRedemption.customer_id` both reference a real Customer id, identifier-only, same convention.
- **Catalog**: `PromotionCondition`/`Promotion.buy_x_target_id`/`get_y_target_id` reference real Product or Category ids (`buy_x_target_type`/`get_y_target_type` distinguish which) — identifier-only, no FK.
- **Pricing**: no code-level relationship exists between Promotions and Pricing (Price Lists/Tax) — confirmed by grep; they are parallel, independent discount mechanisms a cart can combine, not layered.
- **Notifications**: no listener anywhere subscribes to `PromotionApplied` or `CouponRedeemed` — confirmed by an exhaustive search of `app/Listeners/` and every module's own listener registrations. **No promotion/coupon-triggered notification exists in this backend at all** — a real, confirmed absence, not a Slice 1 gap.
- **Analytics**: no Analytics module exists in this codebase at all (confirmed absent from `docs/04_MODULE_ARCHITECTURE.md`'s domain map) — any "Marketing Analytics" capability is out of scope by definition, not merely undeferred.

## 7. Existing capabilities (what Slice 1 can honestly build)

- Promotions: full CRUD, list with `status`/`discount_type` filters, priority-then-name ordering (server-hardcoded, no override), Detail view with eager-loaded Conditions + Coupons, Archive, Delete.
- Promotion Conditions: add/edit/remove within the parent Promotion's own detail view (a sub-resource, mirroring Options' `OptionValuesManager` pattern — no standalone route, since none exists on the backend).
- Coupons: full CRUD nested under their parent Promotion (`GET/POST /promotions/{promotion}/coupons`), list with `status` filter, Archive, Delete. **No top-level "all coupons across every promotion" list exists on the backend** — a real constraint, not an oversight to work around.
- Redemptions: read-only history list, filterable by `promotion_id`/`customer_id`, paginated.
- Audit Log: the standard module-wide, `actor_id`/`target_type`-filtered log.

## 8. Limitations (confirmed absent, not deferred)

- No Restore for either Promotion or Coupon (archive/delete only).
- No free-text search on Promotions or Coupons — filter-only.
- No top-level Coupons list independent of a Promotion.
- No manual "Redeem" admin action (and none should be built — redemption is exclusively a real-time Checkout consequence; a manual admin trigger would invent a business capability this backend does not offer and Checkout's own aggregate-consistency model does not expect).
- No Promotion→Notification integration of any kind.
- No Email Marketing, SMS, Automation, Loyalty, Affiliate, Rewards, Referral, AI Marketing, or Analytics module exists anywhere in this backend — all structurally absent, matching the master task's own explicit "Do NOT build" list exactly.

## 9. Recommended implementation slices

**Slice 1 — Merchant Promotions & Coupons (recommended, this phase):**
- `packages/api-client/src/promotions/` — typed REST layer (types, promotions, promotionConditions, coupons, redemptions, auditLogs).
- Promotions List (status/discount_type filters, pagination) + a dedicated Promotion Detail route (Overview, type-specific discount fields rendered legibly, Conditions sub-list with add/edit/remove, Coupons sub-list with full CRUD, Archive/Delete).
- A Redemptions read-only history screen (filterable by Promotion/Customer, matching the real backend's own two filters).
- A Promotions Audit Log screen, matching every other module's own established shape exactly.
- All gated by the 6 real permissions in §5.

**Not recommended this phase (named explicitly, not silently skipped):** a top-level Coupons list (no backend endpoint), a manual Redeem action (real backend capability exists but is exclusively Checkout's own concern, not a merchant workflow), any Notification/Analytics surface (nothing exists on the backend to surface).

## 10. Product Owner decisions

None required to begin Slice 1 — every capability named above is real, routed, and permission-gated exactly as this phase's own instruction requires. The one open question worth flagging: whether a future phase should add a Promotions↔Orders cross-link (an Order Detail "Promotions applied" card, mirroring the Payments/Fulfillment/Notifications cards Orders' own Slice 2 already built) — this would require reopening the frozen Orders module and is out of this phase's own power to decide or build.
