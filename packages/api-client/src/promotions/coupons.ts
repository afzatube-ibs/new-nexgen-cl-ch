import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import { createResourceClient, type ListQuery } from './resourceClient.js';
import type { CouponDTO, CouponInput, UpdateCouponInput, ListCouponsQuery } from './types.js';

/** `apps/backend/.../Promotions/routes.php` — `promotions/{promotion}/coupons`, `promotions.coupons.{view|manage}`. Nested under a Promotion only — no top-level "all coupons" endpoint exists. No restore route. */
function basePath(promotionId: string): string {
  return `/promotions/${promotionId}/coupons`;
}

function toCreateBody(input: CouponInput): Record<string, unknown> {
  return { code: input.code, usage_limit_global: input.usageLimitGlobal ?? null };
}

function toUpdateBody(input: UpdateCouponInput): Record<string, unknown> {
  const { expectedVersion, ...rest } = input;
  return { ...toCreateBody(rest), expected_version: expectedVersion };
}

export function listCoupons(client: ApiClient, promotionId: string, query?: ListCouponsQuery): Promise<ListEnvelope<CouponDTO>> {
  const listQuery: ListQuery | undefined = query ? { status: query.status, page: query.page } : undefined;
  return createResourceClient<CouponDTO>(client, basePath(promotionId)).list(listQuery);
}

export function getCoupon(client: ApiClient, promotionId: string, id: string): Promise<CouponDTO> {
  return createResourceClient<CouponDTO>(client, basePath(promotionId)).get(id);
}

export function createCoupon(client: ApiClient, promotionId: string, input: CouponInput): Promise<CouponDTO> {
  return createResourceClient<CouponDTO>(client, basePath(promotionId)).create(toCreateBody(input));
}

export function updateCoupon(client: ApiClient, promotionId: string, id: string, input: UpdateCouponInput): Promise<CouponDTO> {
  return createResourceClient<CouponDTO>(client, basePath(promotionId)).update(id, toUpdateBody(input));
}

export function archiveCoupon(client: ApiClient, promotionId: string, id: string, expectedVersion: number): Promise<CouponDTO> {
  return createResourceClient<CouponDTO>(client, basePath(promotionId)).archive(id, expectedVersion);
}

export function destroyCoupon(client: ApiClient, promotionId: string, id: string, expectedVersion: number): Promise<void> {
  return createResourceClient<CouponDTO>(client, basePath(promotionId)).destroy(id, expectedVersion);
}
