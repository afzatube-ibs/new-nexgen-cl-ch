import { useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Archive, Trash2, Copy, Plus, MoreHorizontal, Star, Download } from 'lucide-react';
import {
  Text,
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
  ErrorState,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  useToast,
} from '@nexgen/ui';
import type { CustomerAddressDTO } from '@nexgen/api-client';
import { ConfirmDialog, RequirePermission, downloadFile } from '../../../framework/index.js';
import { customersErrorMessage } from '../shared/errors.js';
import { useCustomer, useArchiveCustomer, useDestroyCustomer, useDeleteCustomerAddress, useExportCustomer } from '../shared/queries.js';
import { CustomerFormDialog } from '../CustomerFormDialog.js';
import { CustomerAddressFormDialog } from './CustomerAddressFormDialog.js';
import { CustomerRecentOrdersCard } from './CustomerRecentOrdersCard.js';
import { CustomerRecentActivityCard } from './CustomerRecentActivityCard.js';

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
}

function OverviewField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <Text variant="caption" className="text-text-secondary">
        {label}
      </Text>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

function formatAddressLines(address: CustomerAddressDTO): string {
  return [
    address.addressLine1,
    address.addressLine2,
    [address.city, address.region].filter(Boolean).join(', '),
    address.postalCode,
    address.countryCode,
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * Customer detail — a dedicated route (`customers/:id`), not a drawer: per
 * this slice's own brief, given the Audit workflow (Slice 2) and Export
 * workflow (deferred) both want a real, linkable, bookmarkable surface —
 * see `PHASE_2_5_CUSTOMERS_ARCHITECTURE.md` §5's own reasoning, the same
 * shape the Product Editor's own growth from a few fields into a full page
 * already established.
 *
 * `CustomerController::show` is the only endpoint that embeds `addresses`
 * (`$customer->load('addresses')`) — this page's one `useCustomer(id)`
 * query is the single source for both the Overview and Addresses sections
 * below.
 */
export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: customer, status: queryStatus, refetch } = useCustomer(id);
  const archiveMutation = useArchiveCustomer();
  const destroyMutation = useDestroyCustomer();
  const deleteAddressMutation = useDeleteCustomerAddress(id ?? '');
  const exportMutation = useExportCustomer();

  const [editOpen, setEditOpen] = useState(false);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddressDTO | undefined>(undefined);

  function openAddAddress(): void {
    setEditingAddress(undefined);
    setAddressFormOpen(true);
  }

  function openEditAddress(address: CustomerAddressDTO): void {
    setEditingAddress(address);
    setAddressFormOpen(true);
  }

  async function handleCopyId(): Promise<void> {
    if (!customer) return;
    await navigator.clipboard.writeText(customer.id);
    toast({ variant: 'success', title: 'Customer ID copied' });
  }

  async function handleArchive(): Promise<void> {
    if (!customer) return;
    try {
      await archiveMutation.mutateAsync({ id: customer.id, expectedVersion: customer.version });
      toast({ variant: 'success', title: 'Customer archived' });
    } catch (error) {
      toast({ variant: 'danger', title: "Couldn't archive customer", description: customersErrorMessage(error) });
    }
  }

  /**
   * `GET /customers/{id}/export` returns the real `CustomerResource` shape
   * (profile + addresses) — downloaded verbatim as JSON, the shape the
   * backend actually returns, rather than reformatting it into a CSV this
   * slice would have to invent a column layout for. Every call is
   * separately audited server-side (`customer.exported`).
   */
  async function handleExport(): Promise<void> {
    if (!customer) return;
    try {
      const exported = await exportMutation.mutateAsync(customer.id);
      downloadFile(`customer-${customer.id}.json`, JSON.stringify(exported, null, 2), 'application/json');
      toast({ variant: 'success', title: 'Customer exported' });
    } catch (error) {
      toast({ variant: 'danger', title: "Couldn't export customer", description: customersErrorMessage(error) });
    }
  }

  if (queryStatus === 'pending') {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton shape="block" className="h-8 w-64" />
        <Skeleton shape="block" className="h-40 w-full" />
        <Skeleton shape="block" className="h-40 w-full" />
      </div>
    );
  }

  if (queryStatus === 'error' || !customer) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const addresses = customer.addresses ?? [];

  return (
    <div>
      <button
        type="button"
        onClick={() => void navigate('/customers')}
        className="mb-3 inline-flex items-center gap-1 text-label text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="size-4" /> Back to Customers
      </button>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Text as="h1" variant="heading">
              {customer.name}
            </Text>
            <Badge className={customer.status === 'active' ? 'bg-feedback-success text-black' : undefined}>{customer.status}</Badge>
          </div>
          <Text variant="body" className="mt-1 text-text-secondary">
            {customer.email}
          </Text>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <RequirePermission anyOf={['customers.customers.view']} inline={null}>
            <Button variant="outline" onClick={() => void handleExport()} loading={exportMutation.isPending}>
              <Download className="size-4" /> Export
            </Button>
          </RequirePermission>
          <RequirePermission anyOf={['customers.customers.manage']} inline={null}>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
            {customer.status === 'active' && (
              <Button variant="outline" onClick={() => void handleArchive()}>
                <Archive className="size-4" /> Archive
              </Button>
            )}
            <ConfirmDialog
              trigger={
                <Button variant="outline" className="text-feedback-danger hover:text-feedback-danger">
                  <Trash2 className="size-4" /> Delete
                </Button>
              }
              title="Delete this customer?"
              description="This customer and their address book will be permanently deleted. Their past orders are unaffected and will still show this customer's name and email as they were at the time of purchase."
              confirmLabel="Delete"
              destructive
              onConfirm={async () => {
                await destroyMutation.mutateAsync({ id: customer.id, expectedVersion: customer.version });
                void navigate('/customers');
              }}
              getErrorMessage={customersErrorMessage}
            />
          </RequirePermission>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <OverviewField label="Name" value={<Text variant="body">{customer.name}</Text>} />
              <OverviewField label="Email" value={<Text variant="body">{customer.email}</Text>} />
              <OverviewField label="Phone" value={<Text variant="body">{customer.phone ?? '—'}</Text>} />
              <OverviewField
                label="Status"
                value={<Badge className={customer.status === 'active' ? 'bg-feedback-success text-black' : undefined}>{customer.status}</Badge>}
              />
              <OverviewField label="Created" value={<Text variant="body">{formatDate(customer.createdAt)}</Text>} />
              <OverviewField label="Updated" value={<Text variant="body">{formatDate(customer.updatedAt)}</Text>} />
              <OverviewField
                label="Customer ID"
                value={
                  <div className="flex items-center gap-1.5">
                    <Text variant="body" className="truncate font-mono text-caption">
                      {customer.id}
                    </Text>
                    <Button variant="ghost" size="sm" aria-label="Copy customer ID" onClick={() => void handleCopyId()}>
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Addresses</CardTitle>
            <RequirePermission anyOf={['customers.customers.manage']} inline={null}>
              <Button size="sm" onClick={openAddAddress}>
                <Plus className="size-4" /> Add address
              </Button>
            </RequirePermission>
          </CardHeader>
          <CardContent>
            {addresses.length === 0 ? (
              <Text variant="body" className="text-text-secondary">
                No addresses on file yet.
              </Text>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {addresses.map((address) => (
                  <div key={address.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Text variant="body-strong">{address.label || 'Address'}</Text>
                        {address.isDefaultShipping && (
                          <Badge className="gap-1 bg-feedback-info text-black">
                            <Star className="size-3" aria-hidden="true" /> Default shipping
                          </Badge>
                        )}
                        {address.isDefaultBilling && (
                          <Badge className="gap-1 bg-feedback-info text-black">
                            <Star className="size-3" aria-hidden="true" /> Default billing
                          </Badge>
                        )}
                      </div>
                      <Text variant="body" className="text-text-secondary">
                        {address.recipientName} · {formatAddressLines(address)}
                      </Text>
                      {address.phone && (
                        <Text variant="caption" className="text-text-secondary">
                          {address.phone}
                        </Text>
                      )}
                    </div>
                    <RequirePermission anyOf={['customers.customers.manage']} inline={null}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label={`Actions for ${address.label || 'address'} (${address.recipientName})`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openEditAddress(address)}>
                            <Pencil className="size-4" /> Edit
                          </DropdownMenuItem>
                          <ConfirmDialog
                            trigger={
                              <DropdownMenuItem destructive onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="size-4" /> Delete
                              </DropdownMenuItem>
                            }
                            title="Delete this address?"
                            description="This address will be permanently removed from the customer's address book. This cannot be undone."
                            confirmLabel="Delete"
                            destructive
                            onConfirm={() => deleteAddressMutation.mutateAsync({ addressId: address.id, expectedVersion: customer.version })}
                            getErrorMessage={customersErrorMessage}
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </RequirePermission>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <RequirePermission anyOf={['orders.orders.view']} inline={null}>
          <CustomerRecentOrdersCard customerId={customer.id} />
        </RequirePermission>

        <RequirePermission anyOf={['customers.audit_log.view']} inline={null}>
          <CustomerRecentActivityCard customer={customer} />
        </RequirePermission>
      </div>

      <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} />
      <CustomerAddressFormDialog open={addressFormOpen} onOpenChange={setAddressFormOpen} customer={customer} address={editingAddress} />
    </div>
  );
}
