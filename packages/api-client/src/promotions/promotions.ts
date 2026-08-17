import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import { createResourceClient, type ListQuery } from './resourceClient.js';
import type { PromotionDTO, PromotionInput, UpdatePromotionInput, ListPromotionsQuery } from './types.js';

/** `apps/backend/.../Promotions/routes.php` — `promotions`, `promotions.promotions.{view|manage}`. No restore route. */
const BASE_PATH = '/promotions';

function toCreateBody(input: PromotionInput): Record<string, unknown> {
  return {
    name: input.name,
    description: input.description ?? null,
    discount_type: input.discountType,
    discount_value: input.discountValue ?? null,
    currency_code: input.currencyCode ?? null,
    buy_x_quantity: input.buyXQuantity ?? null,
    buy_x_target_type: input.buyXTargetType ?? null,
    buy_x_target_id: input.buyXTargetId ?? null,
    get_y_quantity: input.getYQuantity ?? null,
    get_y_target_type: input.getYTargetType ?? null,
    get_y_target_id: input.getYTargetId ?? null,
    get_y_discount_percentage: input.getYDiscountPercentage ?? null,
    is_stackable: input.isStackable,
    priority: input.priority,
    requires_coupon: input.requiresCoupon,
    starts_at: input.startsAt ?? null,
    ends_at: input.endsAt ?? null,
    usage_limit_global: input.usageLimitGlobal ?? null,
    usage_limit_per_customer: input.usageLimitPerCustomer ?? null,
  };
}

function toUpdateBody(input: UpdatePromotionInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { ...toCreateBody(rest), expected_version: expectedVersion };
}

function toListQuery(query?: ListPromotionsQuery): ListQuery | undefined {
  if (!query) return undefined;
  return { status: query.status, discount_type: query.discountType, page: query.page };
}

export function listPromotions(client: ApiClient, query?: ListPromotionsQuery): Promise<ListEnvelope<PromotionDTO>> {
  return createResourceClient<PromotionDTO>(client, BASE_PATH).list(toListQuery(query));
}

/** Eager-loads `conditions`/`coupons` (`PromotionController::show`). */
export function getPromotion(client: ApiClient, id: string): Promise<PromotionDTO> {
  return createResourceClient<PromotionDTO>(client, BASE_PATH).get(id);
}

export function createPromotion(client: ApiClient, input: PromotionInput): Promise<PromotionDTO> {
  return createResourceClient<PromotionDTO>(client, BASE_PATH).create(toCreateBody(input));
}

export function updatePromotion(client: ApiClient, id: string, input: UpdatePromotionInput): Promise<PromotionDTO> {
  return createResourceClient<PromotionDTO>(client, BASE_PATH).update(id, toUpdateBody(input));
}

export function archivePromotion(client: ApiClient, id: string, expectedVersion: number): Promise<PromotionDTO> {
  return createResourceClient<PromotionDTO>(client, BASE_PATH).archive(id, expectedVersion);
}

export function destroyPromotion(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<PromotionDTO>(client, BASE_PATH).destroy(id, expectedVersion);
}
