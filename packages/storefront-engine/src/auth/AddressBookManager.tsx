'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Card, CardContent, EmptyState, Icon, Input, Text } from '@nexgen/ui';
import type { CustomerAddress } from '../gateway/customerTypes.js';

export interface AddressBookManagerProps {
  addresses: CustomerAddress[];
  /** The owning Customer's own aggregate version — every address mutation here versions the Customer, not the address row (see the real backend's own customer_addresses migration docblock). */
  customerVersion: number;
}

interface AddressFormState {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
}

const emptyForm: AddressFormState = {
  recipientName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  countryCode: '',
};

/** Production Completion Plan v2, Milestone 5 (Customer Accounts) — real self-service address book: list, add, delete, backed by `/api/account/addresses*`. */
export function AddressBookManager({ addresses, customerVersion }: AddressBookManagerProps) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AddressFormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof AddressFormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!form.recipientName.trim() || !form.addressLine1.trim() || !form.city.trim() || form.countryCode.trim().length !== 2) {
      setError('Recipient name, address, city, and a 2-letter country code are required.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/account/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: form.recipientName,
          phone: form.phone || null,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2 || null,
          city: form.city,
          region: form.region || null,
          postalCode: form.postalCode || null,
          countryCode: form.countryCode.toUpperCase(),
          expectedVersion: customerVersion,
        }),
      });
      const json = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(json.message ?? 'Something went wrong saving that address.');
      setForm(emptyForm);
      setAdding(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong saving that address.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(address: CustomerAddress) {
    if (!window.confirm(`Remove the address for ${address.recipientName}?`)) return;
    setError(null);
    try {
      const response = await fetch(`/api/account/addresses/${address.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: customerVersion }),
      });
      const json = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(json.message ?? 'Something went wrong removing that address.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong removing that address.');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}

      {addresses.length === 0 && !adding && (
        <EmptyState title="No addresses yet" description="Add an address to speed up checkout next time." />
      )}

      {addresses.map((address) => (
        <Card key={address.id}>
          <CardContent className="flex items-start justify-between gap-4 pt-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Text as="span" variant="body-strong" className="text-text-primary">
                  {address.recipientName}
                </Text>
                {address.isDefaultShipping && <Badge variant="outline">Default shipping</Badge>}
                {address.isDefaultBilling && <Badge variant="outline">Default billing</Badge>}
              </div>
              <Text as="p" variant="body" className="text-text-secondary">
                {address.addressLine1}
                {address.addressLine2 ? `, ${address.addressLine2}` : ''}
                <br />
                {address.city}
                {address.region ? `, ${address.region}` : ''} {address.postalCode ?? ''}
                <br />
                {address.countryCode}
                {address.phone ? ` · ${address.phone}` : ''}
              </Text>
            </div>
            <button
              type="button"
              aria-label={`Remove address for ${address.recipientName}`}
              onClick={() => handleDelete(address)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary hover:bg-surface-subtle hover:text-feedback-danger"
            >
              <Icon icon={Trash2} size="inline" />
            </button>
          </CardContent>
        </Card>
      ))}

      {adding ? (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleAdd} noValidate className="flex flex-col gap-4">
              <Input label="Recipient name" value={form.recipientName} onChange={(e) => updateField('recipientName', e.target.value)} />
              <Input label="Phone" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
              <Input label="Address line 1" value={form.addressLine1} onChange={(e) => updateField('addressLine1', e.target.value)} />
              <Input label="Address line 2 (optional)" value={form.addressLine2} onChange={(e) => updateField('addressLine2', e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City" value={form.city} onChange={(e) => updateField('city', e.target.value)} />
                <Input label="Region (optional)" value={form.region} onChange={(e) => updateField('region', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Postal code (optional)" value={form.postalCode} onChange={(e) => updateField('postalCode', e.target.value)} />
                <Input label="Country code (e.g. BD)" value={form.countryCode} maxLength={2} onChange={(e) => updateField('countryCode', e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" loading={loading} disabled={loading}>
                  Save address
                </Button>
                <Button type="button" variant="secondary" onClick={() => setAdding(false)} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setAdding(true)} className="self-start">
          <Icon icon={Plus} size="inline" />
          Add address
        </Button>
      )}
    </div>
  );
}
