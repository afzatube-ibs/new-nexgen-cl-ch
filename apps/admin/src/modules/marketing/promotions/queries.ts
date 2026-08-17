import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listPromotions,
  getPromotion,
  createPromotion,
  updatePromotion,
  archivePromotion,
  destroyPromotion,
  addPromotionCondition,
  updatePromotionCondition,
  removePromotionCondition,
  listCoupons,
  createCoupon,
  updateCoupon,
  archiveCoupon,
  destroyCoupon,
  type PromotionDTO,
  type CouponDTO,
  type PromotionConditionDTO,
  type ListPromotionsQuery,
  type ListCouponsQuery,
  type PromotionInput,
  type UpdatePromotionInput,
  type PromotionConditionInput,
  type CouponInput,
  type UpdateCouponInput,
  type ListEnvelope,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

const QUERY_KEY = 'promotions';

/** `PromotionController::index` — `status`/`discount_type` filters only, confirmed by reading the controller directly. No free-text search. Server-hardcoded `priority desc, name` ordering, no override. */
export function usePromotions(query: ListPromotionsQuery): UseQueryResult<ListEnvelope<PromotionDTO>> {
  return useQuery({ queryKey: [QUERY_KEY, 'list', query], queryFn: () => listPromotions(apiClient, query) });
}

/** `PromotionController::show` — the only query that eager-loads `conditions`/`coupons`. */
export function usePromotion(id: string | undefined): UseQueryResult<PromotionDTO> {
  return useQuery({
    queryKey: [QUERY_KEY, 'detail', id],
    queryFn: () => getPromotion(apiClient, id as string),
    enabled: Boolean(id),
  });
}

function invalidatePromotion(queryClient: ReturnType<typeof useQueryClient>, id?: string): void {
  void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
  if (id) void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
}

export function useCreatePromotion(): UseMutationResult<PromotionDTO, unknown, PromotionInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => createPromotion(apiClient, input),
    onSuccess: () => invalidatePromotion(queryClient),
  });
}

export function useUpdatePromotion(): UseMutationResult<PromotionDTO, unknown, { id: string; input: UpdatePromotionInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => updatePromotion(apiClient, id, input),
    onSuccess: (_data, { id }) => invalidatePromotion(queryClient, id),
  });
}

export function useArchivePromotion(): UseMutationResult<PromotionDTO, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => archivePromotion(apiClient, id, expectedVersion),
    onSuccess: (_data, { id }) => invalidatePromotion(queryClient, id),
  });
}

export function useDestroyPromotion(): UseMutationResult<void, unknown, { id: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expectedVersion }) => destroyPromotion(apiClient, id, expectedVersion),
    onSuccess: () => invalidatePromotion(queryClient),
  });
}

// ---------------------------------------------------------------------------
// Promotion Conditions — managed as part of the parent Promotion (no own
// list/get endpoint; `expectedVersion` on every write is the *Promotion's*
// own version). Mirrors Catalog's own `OptionValuesManager` pattern.
// ---------------------------------------------------------------------------

export function useAddPromotionCondition(): UseMutationResult<PromotionConditionDTO, unknown, { promotionId: string; input: PromotionConditionInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ promotionId, input }) => addPromotionCondition(apiClient, promotionId, input),
    onSuccess: (_data, { promotionId }) => invalidatePromotion(queryClient, promotionId),
  });
}

export function useUpdatePromotionCondition(): UseMutationResult<
  PromotionConditionDTO,
  unknown,
  { promotionId: string; conditionId: string; input: PromotionConditionInput }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ promotionId, conditionId, input }) => updatePromotionCondition(apiClient, promotionId, conditionId, input),
    onSuccess: (_data, { promotionId }) => invalidatePromotion(queryClient, promotionId),
  });
}

export function useRemovePromotionCondition(): UseMutationResult<void, unknown, { promotionId: string; conditionId: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ promotionId, conditionId, expectedVersion }) => removePromotionCondition(apiClient, promotionId, conditionId, expectedVersion),
    onSuccess: (_data, { promotionId }) => invalidatePromotion(queryClient, promotionId),
  });
}

// ---------------------------------------------------------------------------
// Coupons — nested under one Promotion (`GET /promotions/{promotion}/coupons`).
// No top-level "all coupons" endpoint exists on this real backend.
// ---------------------------------------------------------------------------

export function useCoupons(promotionId: string | undefined, query?: ListCouponsQuery): UseQueryResult<ListEnvelope<CouponDTO>> {
  return useQuery({
    queryKey: [QUERY_KEY, 'coupons', promotionId, query],
    queryFn: () => listCoupons(apiClient, promotionId as string, query),
    enabled: Boolean(promotionId),
  });
}

export function useCreateCoupon(): UseMutationResult<CouponDTO, unknown, { promotionId: string; input: CouponInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ promotionId, input }) => createCoupon(apiClient, promotionId, input),
    onSuccess: (_data, { promotionId }) => invalidatePromotion(queryClient, promotionId),
  });
}

export function useUpdateCoupon(): UseMutationResult<CouponDTO, unknown, { promotionId: string; couponId: string; input: UpdateCouponInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ promotionId, couponId, input }) => updateCoupon(apiClient, promotionId, couponId, input),
    onSuccess: (_data, { promotionId }) => invalidatePromotion(queryClient, promotionId),
  });
}

export function useArchiveCoupon(): UseMutationResult<CouponDTO, unknown, { promotionId: string; couponId: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ promotionId, couponId, expectedVersion }) => archiveCoupon(apiClient, promotionId, couponId, expectedVersion),
    onSuccess: (_data, { promotionId }) => invalidatePromotion(queryClient, promotionId),
  });
}

export function useDestroyCoupon(): UseMutationResult<void, unknown, { promotionId: string; couponId: string; expectedVersion: number }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ promotionId, couponId, expectedVersion }) => destroyCoupon(apiClient, promotionId, couponId, expectedVersion),
    onSuccess: (_data, { promotionId }) => invalidatePromotion(queryClient, promotionId),
  });
}
