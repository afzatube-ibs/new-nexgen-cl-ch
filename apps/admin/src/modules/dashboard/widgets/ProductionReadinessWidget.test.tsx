import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { UseQueryResult } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductionReadinessWidget } from './ProductionReadinessWidget.js';
import * as readinessQueries from './queries.js';

vi.mock('./queries.js');

function settledQuery<T>(data: T): UseQueryResult<T> {
  return { data, status: 'success', refetch: vi.fn() } as unknown as UseQueryResult<T>;
}

describe('ProductionReadinessWidget', () => {
  beforeEach(() => {
    vi.mocked(readinessQueries.useStorefrontReadiness).mockReturnValue(
      settledQuery({
        hasStore: true,
        identityReady: true,
        appearancePublished: true,
        homepagePublished: true,
        navigationPublished: true,
      }),
    );
    vi.mocked(readinessQueries.useCatalogReadiness).mockReturnValue(
      settledQuery({ activeProductCount: 6 }),
    );
    vi.mocked(readinessQueries.usePricingReadiness).mockReturnValue(
      settledQuery({ hasActiveDefaultList: true, pricedSkuCount: 6 }),
    );
    vi.mocked(readinessQueries.useInventoryReadiness).mockReturnValue(
      settledQuery({ hasActiveWarehouse: true, hasAvailableStock: true }),
    );
    vi.mocked(readinessQueries.usePaymentReadiness).mockReturnValue(
      settledQuery({ hasAnyGateway: true, hasOnlineGateway: false }),
    );
    vi.mocked(readinessQueries.useShippingReadiness).mockReturnValue(
      settledQuery({ hasRealCourier: false, zoneCount: 1 }),
    );
    vi.mocked(readinessQueries.useNotificationReadiness).mockReturnValue(
      settledQuery({ hasProvider: false }),
    );
  });

  it('shows the complete real launch checklist and actionable gaps', () => {
    render(
      <MemoryRouter>
        <ProductionReadinessWidget />
      </MemoryRouter>,
    );

    expect(screen.getByText('Storefront appearance is published')).toBeInTheDocument();
    expect(screen.getByText('6 active products in your catalog')).toBeInTheDocument();
    expect(screen.getByText('6 SKU prices configured')).toBeInTheDocument();
    expect(screen.getByText('At least one SKU has real available stock')).toBeInTheDocument();
    expect(screen.getByText('At least one customer payment method is available')).toBeInTheDocument();
    expect(screen.getByText(/No online payment gateway configured/)).toBeInTheDocument();
    expect(screen.getByText(/No real courier integration configured/)).toBeInTheDocument();
    expect(screen.getByText(/No email notification provider configured/)).toBeInTheDocument();
  });

  it('links merchant-fixable launch blockers to their real Admin screens', () => {
    vi.mocked(readinessQueries.useStorefrontReadiness).mockReturnValue(
      settledQuery({
        hasStore: true,
        identityReady: false,
        appearancePublished: false,
        homepagePublished: false,
        navigationPublished: false,
      }),
    );
    vi.mocked(readinessQueries.usePricingReadiness).mockReturnValue(
      settledQuery({ hasActiveDefaultList: false, pricedSkuCount: 0 }),
    );
    vi.mocked(readinessQueries.useInventoryReadiness).mockReturnValue(
      settledQuery({ hasActiveWarehouse: false, hasAvailableStock: false }),
    );

    render(
      <MemoryRouter>
        <ProductionReadinessWidget />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('link', { name: /Complete|Publish|Configure|Add prices|Update stock/ })).toHaveLength(8);
    expect(screen.getByRole('link', { name: 'Update stock →' })).toHaveAttribute('href', '/inventory/stock-levels');
  });
});
