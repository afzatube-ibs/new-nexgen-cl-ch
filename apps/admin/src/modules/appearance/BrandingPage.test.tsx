import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrandingPage } from './BrandingPage.js';

const mocks = vi.hoisted(() => ({
  refetchStore: vi.fn(),
  refetchAppearance: vi.fn(),
  storeQuery: { data: [] as unknown[], isLoading: false, isError: false, refetch: vi.fn() },
  appearanceQuery: { data: undefined, isLoading: false, isError: false, refetch: vi.fn() },
}));

vi.mock('../../auth/useAuth.js', () => ({
  useAuth: () => ({ can: () => true }),
}));

vi.mock('./queries.js', () => ({
  useCurrentStore: () => mocks.storeQuery,
  useStoreAppearance: () => mocks.appearanceQuery,
  useUpdateStore: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdateStoreAppearance: () => ({ isPending: false, mutateAsync: vi.fn() }),
  usePublishStoreAppearance: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useResetStoreAppearance: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

describe('BrandingPage load states', () => {
  beforeEach(() => {
    mocks.storeQuery.data = [];
    mocks.storeQuery.isLoading = false;
    mocks.storeQuery.isError = false;
    mocks.storeQuery.refetch = mocks.refetchStore;
    mocks.appearanceQuery.data = undefined;
    mocks.appearanceQuery.isLoading = false;
    mocks.appearanceQuery.isError = false;
    mocks.appearanceQuery.refetch = mocks.refetchAppearance;
    vi.clearAllMocks();
  });

  it('shows an actionable empty state instead of an endless spinner when no store exists', () => {
    render(<BrandingPage />);

    expect(screen.getByText('No store configured')).toBeInTheDocument();
    expect(screen.getByText(/Create your store in Settings first/i)).toBeInTheDocument();
  });

  it('shows a retryable error instead of an endless spinner when the store request fails', () => {
    mocks.storeQuery.isError = true;

    render(<BrandingPage />);

    expect(screen.getByText('Could not load store settings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
