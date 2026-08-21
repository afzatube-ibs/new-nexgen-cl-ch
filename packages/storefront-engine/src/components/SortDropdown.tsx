'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@nexgen/ui';

/**
 * Store Components library — sort control for the Category/Search
 * toolbar. The option list is deliberately limited to what the real
 * Gateway `/v1/products` route actually supports today
 * (`productListQuerySchema`'s own `sort: z.enum(['name', 'sku',
 * 'created_at', 'published_at'])` — confirmed by direct code read,
 * `apps/store-api-gateway/src/routes/catalog.ts`). **No "Price: low to
 * high" option exists** — there is no price field or price sort on the
 * real backend response at all yet (`PriceBlock.tsx`'s own docblock);
 * inventing that option here would silently promise a capability that
 * does not exist. Named in `MISSING_ECOMMERCE_FEATURES_AUDIT.md`.
 *
 * A client component (needs `useRouter`) that still produces a real,
 * shareable, SSR-rendered URL — the same "URL is the source of truth"
 * pattern `FilterSidebar`'s own plain `<Link>`s use, just triggered via a
 * select control instead of an anchor.
 */
const SORT_OPTIONS = [
  { value: 'published_at:desc', label: 'Newest' },
  { value: 'published_at:asc', label: 'Oldest' },
  { value: 'name:asc', label: 'Name: A to Z' },
  { value: 'name:desc', label: 'Name: Z to A' },
] as const;

export interface SortDropdownProps {
  sort?: string;
  direction?: string;
}

export function SortDropdown({ sort, direction }: SortDropdownProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = `${sort ?? 'published_at'}:${direction ?? 'desc'}`;

  function handleChange(value: string) {
    const [nextSort, nextDirection] = value.split(':');
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', nextSort ?? 'published_at');
    params.set('direction', nextDirection ?? 'desc');
    params.delete('page');
    router.push(`?${params.toString()}`, { scroll: false });
  }

  return (
    <Select
      label="Sort by"
      options={SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
      value={SORT_OPTIONS.some((option) => option.value === current) ? current : SORT_OPTIONS[0].value}
      onValueChange={handleChange}
    />
  );
}
