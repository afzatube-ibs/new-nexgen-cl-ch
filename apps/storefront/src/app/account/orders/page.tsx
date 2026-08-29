import type { Metadata } from 'next';
import Link from 'next/link';
import { getMyOrders, Pagination } from '@nexgen/storefront-engine';
import { Badge, Card, CardContent, EmptyState, Text } from '@nexgen/ui';
import { requireCustomerToken } from '@/lib/customerSession';

export const metadata: Metadata = { title: 'My orders' };

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

function formatMoney(amount: string, currencyCode: string): string {
  const value = Number.parseFloat(amount);
  if (Number.isNaN(value)) return amount;
  return new Intl.NumberFormat('en', { style: 'currency', currency: currencyCode }).format(value);
}

export default async function AccountOrdersPage({ searchParams }: PageProps) {
  const token = await requireCustomerToken('/account/orders');
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam ?? '1') || 1;
  const { data: orders, pagination } = await getMyOrders(token, page);

  if (orders.length === 0) {
    return <EmptyState title="No orders yet" description="Orders you place will show up here." />;
  }

  return (
    <div className="flex flex-col gap-4">
      {orders.map((order) => (
        <Link key={order.id} href={`/account/orders/${order.id}`}>
          <Card className="transition hover:border-brand">
            <CardContent className="flex items-center justify-between gap-4 pt-4">
              <div className="flex flex-col gap-1">
                <Text as="span" variant="body-strong" className="text-text-primary">
                  {order.orderNumber}
                </Text>
                <Text as="span" variant="caption" className="text-text-secondary">
                  {new Date(order.placedAt).toLocaleDateString()}
                </Text>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={order.status === 'cancelled' ? 'danger' : order.status === 'delivered' ? 'success' : 'warning'}>{order.status}</Badge>
                <Text as="span" variant="body-strong" className="text-text-primary">
                  {formatMoney(order.grandTotal, order.currencyCode)}
                </Text>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
      {pagination && pagination.lastPage > 1 && (
        <Pagination pagination={pagination} buildHref={(nextPage) => `/account/orders?page=${nextPage}`} />
      )}
    </div>
  );
}
