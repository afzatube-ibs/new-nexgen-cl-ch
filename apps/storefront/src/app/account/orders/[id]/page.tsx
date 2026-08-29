import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMyOrder, GatewayRequestError, OrderConfirmationSummary } from '@nexgen/storefront-engine';
import { requireCustomerToken } from '@/lib/customerSession';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Order details' };

/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — the
 * first real, live route for `OrderConfirmationSummary`
 * (`order/OrderConfirmationSummary.tsx`), a real component that has
 * existed since Beta Sprint 3 with no Storefront-reachable data source
 * (see that component's own docblock) until this milestone's real
 * `GET /orders/mine/{id}` gave the Storefront one. Rendered here
 * unchanged — no new order-rendering logic, reusing the exact component
 * built for this exact shape.
 */
export default async function AccountOrderDetailPage({ params }: PageProps) {
  const token = await requireCustomerToken('/account/orders');
  const { id } = await params;

  try {
    const order = await getMyOrder(token, id);
    return <OrderConfirmationSummary order={order} />;
  } catch (error) {
    if (error instanceof GatewayRequestError && error.isNotFound) {
      notFound();
    }
    throw error;
  }
}
