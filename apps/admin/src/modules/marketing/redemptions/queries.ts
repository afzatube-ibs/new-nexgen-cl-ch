import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { listPromotionRedemptions, type PromotionRedemptionDTO, type ListRedemptionsQuery, type ListEnvelope } from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

/** `GET /promotions/redemptions` — real, immutable redemption history. No write action exists (see `redemptions.ts`'s own docblock in `packages/api-client`). */
export function usePromotionRedemptions(query: ListRedemptionsQuery): UseQueryResult<ListEnvelope<PromotionRedemptionDTO>> {
  return useQuery({ queryKey: ['promotion-redemptions', query], queryFn: () => listPromotionRedemptions(apiClient, query) });
}
