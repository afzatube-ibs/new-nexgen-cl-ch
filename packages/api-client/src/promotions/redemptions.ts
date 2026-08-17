import type { ApiClient } from '../client.js';
import type { ListEnvelope } from '../types.js';
import type { PromotionRedemptionDTO, ListRedemptionsQuery } from './types.js';

/**
 * `GET /promotions/redemptions` — `promotions.redemptions.view`. Read-only,
 * deliberately: every real `PromotionRedemption` row is created exclusively
 * by Checkout's own `SubmitCheckoutAction` calling `RedeemPromotionAction`
 * directly at the moment an order is placed — there is no admin-facing
 * "Redeem" action to wrap, and building one would invent a merchant
 * workflow this backend does not offer (confirmed via `PHASE_3_0_MARKETING_
 * ARCHITECTURE.md` §4/§9).
 */
export function listPromotionRedemptions(client: ApiClient, query?: ListRedemptionsQuery): Promise<ListEnvelope<PromotionRedemptionDTO>> {
  return client.get<ListEnvelope<PromotionRedemptionDTO>>('/promotions/redemptions', {
    query: query ? { promotion_id: query.promotionId, customer_id: query.customerId, page: query.page, per_page: query.perPage } : undefined,
  });
}
