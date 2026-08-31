import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import {
  listReviews,
  getReview,
  getReviewSummary,
  deleteReview,
  approveReview,
  rejectReview,
  respondToReview,
  type ReviewDTO,
  type ListReviewsQuery,
  type ReviewSummaryDTO,
  type ReviewExpectedVersionInput,
  type RejectReviewInput,
  type RespondToReviewInput,
  type ListEnvelope,
} from '@nexgen/api-client';
import { apiClient } from '../../../lib/apiClient.js';

const QUERY_KEY = 'reviews';

/** `ReviewController::index` — real server-side `product_id`/`status`/`customer_id`/`page`/`per_page`. */
export function useReviews(query: ListReviewsQuery): UseQueryResult<ListEnvelope<ReviewDTO>> {
  return useQuery({ queryKey: [QUERY_KEY, 'list', query], queryFn: () => listReviews(apiClient, query) });
}

export function useReview(id: string | undefined): UseQueryResult<ReviewDTO> {
  return useQuery({ queryKey: [QUERY_KEY, 'detail', id], queryFn: () => getReview(apiClient, id as string), enabled: Boolean(id) });
}

export function useReviewSummary(productId: string | undefined): UseQueryResult<ReviewSummaryDTO> {
  return useQuery({ queryKey: [QUERY_KEY, 'summary', productId], queryFn: () => getReviewSummary(apiClient, productId as string), enabled: Boolean(productId) });
}

// ---------------------------------------------------------------------------
// Workflow actions — one hook per real `ReviewWorkflowController` endpoint,
// plus delete. Each invalidates both the Reviews List (its own `status`
// column changes) and this review's own detail query (if it's ever read
// directly) — mirrors Returns' own `useWorkflowMutation` shape exactly.
// ---------------------------------------------------------------------------

function useWorkflowMutation<TInput>(
  fn: (client: typeof apiClient, id: string, input: TInput) => Promise<ReviewDTO>,
): UseMutationResult<ReviewDTO, unknown, { id: string; input: TInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => fn(apiClient, id, input),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] });
      void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'detail', id] });
    },
  });
}

export function useApproveReview(): UseMutationResult<ReviewDTO, unknown, { id: string; input: ReviewExpectedVersionInput }> {
  return useWorkflowMutation(approveReview);
}
export function useRejectReview(): UseMutationResult<ReviewDTO, unknown, { id: string; input: RejectReviewInput }> {
  return useWorkflowMutation(rejectReview);
}
export function useRespondToReview(): UseMutationResult<ReviewDTO, unknown, { id: string; input: RespondToReviewInput }> {
  return useWorkflowMutation(respondToReview);
}

export function useDeleteReview(): UseMutationResult<void, unknown, { id: string; input: ReviewExpectedVersionInput }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }) => deleteReview(apiClient, id, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'list'] }),
  });
}
