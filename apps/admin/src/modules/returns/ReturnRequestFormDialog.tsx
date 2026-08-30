import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Input, Textarea, Select, Alert, Text, useToast } from '@nexgen/ui';
import type { ReturnRequestReason, ReturnRequestType } from '@nexgen/api-client';
import { applyServerValidationErrors } from '../../framework/index.js';
import { returnsErrorMessage } from './shared/errors.js';
import { useCreateReturnRequest } from './shared/queries.js';

const schema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  reasonDetails: z.string().max(2000).optional(),
});

interface FormValues {
  orderId: string;
  customerId: string;
  reasonDetails?: string;
}

interface ItemRow {
  key: number;
  sku: string;
  quantity: string;
}

let nextItemKey = 0;
function emptyItemRow(): ItemRow {
  nextItemKey += 1;
  return { key: nextItemKey, sku: '', quantity: '1' };
}

const EMPTY_VALUES: FormValues = { orderId: '', customerId: '', reasonDetails: '' };

export interface ReturnRequestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Create a return request on a customer's behalf — `returns.requests.manage`.
 * There is no edit dialog: `ReturnRequestController` has no `update()`
 * route at all (confirmed via `routes.php` directly) — every field after
 * creation only ever changes through the real workflow transitions
 * (`ReturnWorkflowActions`), never a raw field edit, matching this
 * platform's own honest "only real endpoints get a UI" discipline.
 *
 * Items are a required array (`CreateReturnRequestRequest`'s own
 * `items` rule), managed here as plain component state rather than a
 * `useFieldArray` — this codebase has no existing dynamic-row-array form
 * precedent to mirror, and a plain array keeps this dialog's one, simple
 * validation rule (at least one row, every row a non-empty SKU and a
 * quantity of at least 1) easy to read directly rather than routed through
 * react-hook-form's own array API for a single, small use case.
 */
export function ReturnRequestFormDialog({ open, onOpenChange }: ReturnRequestFormDialogProps) {
  const createMutation = useCreateReturnRequest();
  const { toast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [items, setItems] = useState<ItemRow[]>([emptyItemRow()]);
  const [type, setType] = useState<ReturnRequestType>('return');
  const [reason, setReason] = useState<ReturnRequestReason>('damaged');

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_VALUES });

  useEffect(() => {
    if (open) {
      reset(EMPTY_VALUES);
      setItems([emptyItemRow()]);
      setType('return');
      setReason('damaged');
    }
    setFormError(null);
  }, [open, reset]);

  function updateItem(index: number, patch: Partial<ItemRow>): void {
    setItems((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeItem(index: number): void {
    setItems((rows) => rows.filter((_, i) => i !== index));
  }

  async function onSubmit(values: FormValues): Promise<void> {
    setFormError(null);

    const validItems = items.filter((row) => row.sku.trim());
    if (validItems.length === 0) {
      setFormError('At least one item with a SKU is required.');
      return;
    }
    if (validItems.some((row) => !Number.isInteger(Number(row.quantity)) || Number(row.quantity) < 1)) {
      setFormError('Every item needs a quantity of at least 1.');
      return;
    }

    try {
      await createMutation.mutateAsync({
        orderId: values.orderId.trim(),
        customerId: values.customerId.trim(),
        type,
        reason,
        reasonDetails: values.reasonDetails?.trim() || undefined,
        items: validItems.map((row) => ({ sku: row.sku.trim(), quantity: Number(row.quantity) })),
      });
      toast({ variant: 'success', title: 'Return request created' });
      onOpenChange(false);
    } catch (error) {
      if (applyServerValidationErrors(error, setError)) return;
      setFormError(returnsErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New return request</DialogTitle>
          <DialogDescription>Create a return or exchange request on a customer&rsquo;s behalf.</DialogDescription>
        </DialogHeader>
        {formError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {formError}
          </Alert>
        )}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Order ID" hint="The order this return is against." error={errors.orderId?.message} {...register('orderId')} />
            <Input label="Customer ID" error={errors.customerId?.message} {...register('customerId')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={type}
              onValueChange={(v) => setType(v as ReturnRequestType)}
              options={[
                { value: 'return', label: 'Return' },
                { value: 'exchange', label: 'Exchange' },
              ]}
            />
            <Select
              label="Reason"
              value={reason}
              onValueChange={(v) => setReason(v as ReturnRequestReason)}
              options={[
                { value: 'damaged', label: 'Damaged' },
                { value: 'wrong_item', label: 'Wrong item' },
                { value: 'courier_damage', label: 'Courier damage' },
                { value: 'delivery_refused', label: 'Delivery refused' },
                { value: 'changed_mind', label: 'Changed mind' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </div>
          <Textarea label="Reason details (optional)" maxLength={2000} {...register('reasonDetails')} />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Text variant="body-strong">Items</Text>
              <Button type="button" variant="outline" size="sm" onClick={() => setItems((rows) => [...rows, emptyItemRow()])}>
                <Plus className="size-4" /> Add item
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((row, index) => (
                <div key={row.key} className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input label={index === 0 ? 'SKU' : undefined} placeholder="SKU" value={row.sku} onChange={(e) => updateItem(index, { sku: e.target.value })} />
                  </div>
                  <div className="w-24">
                    <Input
                      label={index === 0 ? 'Qty' : undefined}
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => updateItem(index, { quantity: e.target.value })}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="sm" aria-label="Remove item" disabled={items.length === 1} onClick={() => removeItem(index)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting || createMutation.isPending}>
              Create return request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
