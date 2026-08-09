import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Button, Input, Text, Alert } from '@nexgen/ui';
import type { OptionDTO } from '@nexgen/api-client';
import { ConfirmDialog } from '../../../framework/index.js';
import { useAddOptionValue, useUpdateOptionValue, useRemoveOptionValue } from './queries.js';

export interface OptionValuesManagerProps {
  /** The live Option, values eager-loaded (`OptionController::index` — `with('values')`). Sourced from the Options list query so its `version` stays fresh across mutations — never a stale snapshot. */
  option: OptionDTO;
  canManage: boolean;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

/**
 * Manages one Option's `OptionValue`s (Phase 2.2 — the variant-dimension
 * building block: e.g. Option "Color" -> Values "Red"/"Blue"). Values have
 * no `version` of their own — every write guards the *owning Option's*
 * `expected_option_version`, per `AddOptionValueRequest`/
 * `UpdateOptionValueRequest`/`RemoveOptionValueRequest` (apps/backend).
 */
export function OptionValuesManager({ option, canManage }: OptionValuesManagerProps) {
  const values = option.values ?? [];
  const addMutation = useAddOptionValue();
  const updateMutation = useUpdateOptionValue();
  const removeMutation = useRemoveOptionValue();

  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(): Promise<void> {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    setError(null);
    try {
      await addMutation.mutateAsync({ optionId: option.id, value: trimmed, expectedOptionVersion: option.version });
      setNewValue('');
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleSaveEdit(valueId: string): Promise<void> {
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    setError(null);
    try {
      await updateMutation.mutateAsync({ optionId: option.id, valueId, value: trimmed, expectedOptionVersion: option.version });
      setEditingId(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function handleRemove(valueId: string): Promise<void> {
    setError(null);
    try {
      await removeMutation.mutateAsync({ optionId: option.id, valueId, expectedOptionVersion: option.version });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Text variant="body-strong">Values</Text>
      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}
      <div className="flex flex-col gap-2">
        {values.length === 0 && (
          <Text variant="caption" className="text-text-secondary">
            No values yet.
          </Text>
        )}
        {values.map((value) => (
          <div key={value.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
            {editingId === value.id ? (
              <>
                <Input
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  aria-label={`Edit value ${value.value}`}
                  className="flex-1"
                />
                <Button variant="ghost" size="sm" aria-label="Save" onClick={() => void handleSaveEdit(value.id)} loading={updateMutation.isPending}>
                  <Check className="size-4" />
                </Button>
                <Button variant="ghost" size="sm" aria-label="Cancel" onClick={() => setEditingId(null)}>
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <Text variant="body" className="flex-1">
                  {value.value}
                </Text>
                {canManage && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Edit ${value.value}`}
                      onClick={() => {
                        setEditingId(value.id);
                        setEditingValue(value.value);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="sm" aria-label={`Remove ${value.value}`}>
                          <Trash2 className="size-4" />
                        </Button>
                      }
                      title="Remove this value?"
                      description={`"${value.value}" will be permanently removed from this option.`}
                      confirmLabel="Remove"
                      destructive
                      onConfirm={() => handleRemove(value.id)}
                    />
                  </>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {canManage && (
        <div className="flex items-center gap-2">
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="New value (e.g. Red)"
            aria-label="New option value"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleAdd();
              }
            }}
          />
          <Button type="button" variant="secondary" size="sm" onClick={() => void handleAdd()} loading={addMutation.isPending}>
            <Plus className="size-4" /> Add
          </Button>
        </div>
      )}
    </div>
  );
}
