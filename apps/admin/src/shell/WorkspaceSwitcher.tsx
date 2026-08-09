import { useQuery } from '@tanstack/react-query';
import { ChevronsUpDown, Store } from 'lucide-react';
import { listStores } from '@nexgen/api-client';
import { Skeleton, Tooltip, TooltipTrigger, TooltipContent } from '@nexgen/ui';
import { apiClient } from '../lib/apiClient.js';

/**
 * ADMIN_SHELL_ARCHITECTURE.md §3: real data (`GET /api/v1/stores`), disabled
 * dropdown affordance — "Coming soon" until multi-store/tenant switching is
 * a real backend concept. Its contract is fixed now so a future real
 * implementation is a data-wiring change, not a layout change.
 */
export function WorkspaceSwitcher() {
  const { data, isLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: () => listStores(apiClient),
  });

  const currentStore = data?.[0];

  if (isLoading) {
    return <Skeleton shape="text" className="h-6 w-32" />;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled
          className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-body-strong text-text-primary disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Store className="size-4 shrink-0 text-text-secondary" />
          {/* Store name is icon-only below `sm` (390px-wide phones have no
              room left once the hamburger and the header's own right-side
              icon cluster are accounted for — found live via this shell's
              own responsive QA pass, a real ~40px horizontal overflow, not
              hypothetical) — the same "hide, don't silently truncate to
              uselessness" instinct already applied to the search bar. */}
          <span className="hidden max-w-[6rem] truncate sm:inline sm:max-w-[10rem]">
            {currentStore?.name ?? 'No store configured'}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-text-secondary" />
        </button>
      </TooltipTrigger>
      <TooltipContent>Multi-store switching — coming soon</TooltipContent>
    </Tooltip>
  );
}
