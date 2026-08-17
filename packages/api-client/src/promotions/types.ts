/**
 * Phase 3.0 — Marketing, Slice 1. The real backend module is `Commerce/
 * Promotions` (`apps/backend/app/Domains/Commerce/Promotions/`) — there is
 * no module named "Marketing" anywhere in this codebase; see
 * `planning/architecture/PHASE_3_0_MARKETING_ARCHITECTURE.md` §1 for the
 * full rationale. Every shape below is read directly from the real
 * `Http\Resources\*` classes, not assumed.
 */

export type DiscountType = 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping';
export type PromotionTargetType = 'product' | 'category';
export type PromotionStatus = 'active' | 'archived';
export type ConditionType = 'product' | 'category' | 'customer' | 'store' | 'minimum_order_amount';

/** `PromotionResource` — `conditions`/`coupons` are `whenLoaded()`, present on `show()`, always `[]` from `index()`. */
export interface PromotionDTO {
  id: string;
  name: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: string | null;
  currencyCode: string | null;
  buyXQuantity: number | null;
  buyXTargetType: PromotionTargetType | null;
  buyXTargetId: string | null;
  getYQuantity: number | null;
  getYTargetType: PromotionTargetType | null;
  getYTargetId: string | null;
  getYDiscountPercentage: string | null;
  isStackable: boolean;
  priority: number;
  requiresCoupon: boolean;
  startsAt: string | null;
  endsAt: string | null;
  usageLimitGlobal: number | null;
  usageCountGlobal: number;
  usageLimitPerCustomer: number | null;
  status: PromotionStatus;
  conditions: PromotionConditionDTO[];
  coupons: CouponDTO[];
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** `PromotionConditionResource`. No `version` of its own — mutations thread the parent Promotion's own `expected_version`. */
export interface PromotionConditionDTO {
  id: string;
  promotionId: string;
  conditionType: ConditionType;
  referenceId: string | null;
  numericValue: string | null;
}

/** `CouponResource`. Independently versioned from its parent Promotion (its own `lock_version`), confirmed via the model's own docblock. */
export interface CouponDTO {
  id: string;
  promotionId: string;
  code: string;
  usageLimitGlobal: number | null;
  usageCountGlobal: number;
  status: PromotionStatus;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** `PromotionRedemptionResource` — an immutable, append-only record; no `version`, since it is never updated after creation. */
export interface PromotionRedemptionDTO {
  id: string;
  promotionId: string;
  couponId: string | null;
  customerId: string | null;
  orderReference: string | null;
  discountAmount: string;
  currencyCode: string;
  redeemedAt: string;
}

/** `PromotionController::index` — `status`/`discount_type` only, confirmed by reading the controller directly. No free-text search. */
export interface ListPromotionsQuery {
  status?: PromotionStatus;
  discountType?: DiscountType;
  page?: number;
}

/** `CouponController::index` — `status` only, scoped to one Promotion (`GET /promotions/{promotion}/coupons`). No top-level "all coupons" endpoint exists. */
export interface ListCouponsQuery {
  status?: PromotionStatus;
  page?: number;
}

/** `PromotionRedemptionController::index` — `promotion_id`/`customer_id`/`per_page` only, confirmed by reading the controller directly. */
export interface ListRedemptionsQuery {
  promotionId?: string;
  customerId?: string;
  page?: number;
  perPage?: number;
}

export const PROMOTIONS_TARGET_TYPES: Record<string, string> = {
  'App\\Domains\\Commerce\\Promotions\\Models\\Promotion': 'Promotion',
  'App\\Domains\\Commerce\\Promotions\\Models\\Coupon': 'Coupon',
  'App\\Domains\\Commerce\\Promotions\\Models\\PromotionCondition': 'Promotion Condition',
};

/** `AuditLogController::index` (Promotions' own) — the identical flat, append-only shape every other module's own audit log already uses. */
export interface PromotionsAuditLogDTO {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  correlationId: string | null;
  createdAt: string;
}

/** `actor_id`/`target_type`/`per_page` only, confirmed by reading the controller directly. No `target_id` filter. */
export interface ListPromotionsAuditLogsQuery {
  targetType?: string;
  actorId?: string;
  page?: number;
  perPage?: number;
}

/**
 * `EvaluatePromotionsRequest` — the real, read-only (`promotions.promotions.
 * view`) cart-evaluation contract `PromotionEvaluationController` exposes.
 * Mirrors Pricing's own `TaxCalculationController`/Checkout Price Preview
 * precedent exactly (confirmed by that controller's own docblock, which
 * names this exact parallel) — a pure calculation endpoint intended for
 * exactly this kind of "what would apply" admin tool, not an invented one.
 */
export interface EvaluateCartLineItemInput {
  productId: string;
  categoryIds?: string[];
  quantity: number;
  unitPrice: string;
}

export interface EvaluatePromotionsInput {
  items: EvaluateCartLineItemInput[];
  subtotal: string;
  currencyCode: string;
  customerId?: string | null;
  storeId?: string | null;
  couponCode?: string | null;
}

/** `PromotionEvaluationResource` — wraps `Support\PromotionEvaluationResult`, not an Eloquent model (no `id`/`version`). */
export interface AppliedPromotionDTO {
  promotionId: string;
  name: string;
  discountType: DiscountType;
  discountAmount: string;
  couponId: string | null;
}

export interface PromotionEvaluationDTO {
  appliedPromotions: AppliedPromotionDTO[];
  totalDiscount: string;
  freeShipping: boolean;
}

// ---------------------------------------------------------------------------
// Write inputs — one per real `CreatePromotionRequest`/`UpdatePromotionRequest`/
// `CreateCouponRequest`/`UpdateCouponRequest`/`AddPromotionConditionRequest`/
// `UpdatePromotionConditionRequest`, confirmed against each directly.
// ---------------------------------------------------------------------------

export interface PromotionInput {
  name: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue?: string | null;
  currencyCode?: string | null;
  buyXQuantity?: number | null;
  buyXTargetType?: PromotionTargetType | null;
  buyXTargetId?: string | null;
  getYQuantity?: number | null;
  getYTargetType?: PromotionTargetType | null;
  getYTargetId?: string | null;
  getYDiscountPercentage?: string | null;
  isStackable?: boolean;
  priority?: number;
  requiresCoupon?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimitGlobal?: number | null;
  usageLimitPerCustomer?: number | null;
}

export interface UpdatePromotionInput extends PromotionInput {
  expectedVersion: number;
}

export interface CouponInput {
  code: string;
  usageLimitGlobal?: number | null;
}

export interface UpdateCouponInput extends CouponInput {
  expectedVersion: number;
}

/** `AddPromotionConditionRequest` — `expected_version` here is the *parent Promotion's* own version. */
export interface PromotionConditionInput {
  conditionType: ConditionType;
  referenceId?: string | null;
  numericValue?: string | null;
  expectedVersion: number;
}
