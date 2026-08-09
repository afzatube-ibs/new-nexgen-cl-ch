import { QueryClient } from '@tanstack/react-query';
import { UnauthenticatedError } from '@nexgen/api-client';

/**
 * ADR-0005: TanStack Query owns caching, de-duplication, and background
 * refetch for every admin screen's server data — no module reinvents its
 * own fetch-and-cache logic.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // 401 is handled globally by the ApiClient's onUnauthenticated hook
        // (session clear + redirect to login) — retrying it would just
        // repeat a request that's already known to fail.
        if (error instanceof UnauthenticatedError) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
