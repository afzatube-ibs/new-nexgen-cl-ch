import type { ApiClient } from '../client.js';
import type { EvaluatePromotionsInput, PromotionEvaluationDTO } from './types.js';

/**
 * `POST /promotions/evaluate` — `promotions.promotions.view`. Read-only: a
 * pure calculation over a caller-supplied cart, never mutates state (no
 * `PromotionRedemption` row is created). Mirrors Pricing's own `lookupPrice`/
 * Checkout Price Preview precedent exactly.
 */
export function evaluatePromotions(client: ApiClient, input: EvaluatePromotionsInput): Promise<PromotionEvaluationDTO> {
  return client
    .post<{ data: PromotionEvaluationDTO }>('/promotions/evaluate', {
      items: input.items.map((item) => ({
        product_id: item.productId,
        category_ids: item.categoryIds,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
      subtotal: input.subtotal,
      currency_code: input.currencyCode,
      customer_id: input.customerId ?? null,
      store_id: input.storeId ?? null,
      coupon_code: input.couponCode ?? null,
    })
    .then((res) => res.data);
}
