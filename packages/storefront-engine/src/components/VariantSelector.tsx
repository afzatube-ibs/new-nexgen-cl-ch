'use client';

import { Text, cn } from '@nexgen/ui';

/**
 * Store Components library — Beta Milestone 2.6's own "Variant
 * Architecture" build item, read exactly as scoped: **Gateway-driven
 * only, no fake options**. `ProductDetail` (`gateway/types.ts`) has no
 * variant/attribute-value field at all today (Milestone 1's own scope:
 * General + SEO fields only) — no page in this codebase feeds this
 * component real data, and it renders nothing until one does.
 *
 * The contract below is deliberately shaped to be the real thing a
 * future Gateway variant-composition route would return, not a narrowed
 * placeholder: `VariantOption.type: 'color' | 'text'` covers every
 * option named in this milestone's own brief (Color as swatches; Size/
 * Material/Style/Pattern as button pills — all `'text'`), and `onChange`
 * is the real seam a future SKU/inventory/media/price switch would hang
 * off: the calling page owns `selectedValueIds` as real state, and reacts
 * to a change by re-resolving whichever real product data (price, media,
 * stock) belongs to the newly-selected combination — this component only
 * ever renders the selector itself, never invents a resulting SKU.
 */
export interface VariantOptionValue {
  id: string;
  label: string;
  /** A real hex/CSS color for `type: 'color'` options only. */
  swatch?: string;
  /** Real per-value availability (e.g. this size is out of stock for this color) — when omitted, the value is treated as available. */
  available?: boolean;
}

export interface VariantOption {
  id: string;
  /** e.g. "Color", "Size", "Material", "Style", "Pattern". */
  name: string;
  type: 'color' | 'text';
  values: VariantOptionValue[];
}

export interface VariantSelectorProps {
  options: VariantOption[];
  /** Real, caller-owned selection state — `{ [optionId]: valueId }`. */
  selectedValueIds: Record<string, string>;
  onChange: (optionId: string, valueId: string) => void;
  className?: string;
}

export function VariantSelector({ options, selectedValueIds, onChange, className }: VariantSelectorProps) {
  if (options.length === 0) return null;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {options.map((option) => (
        <div key={option.id} className="flex flex-col gap-2">
          <Text as="p" variant="body-strong">
            {option.name}
            {selectedValueIds[option.id] && (
              <span className="ml-1.5 font-normal text-text-secondary">{option.values.find((value) => value.id === selectedValueIds[option.id])?.label}</span>
            )}
          </Text>
          <div role="radiogroup" aria-label={option.name} className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const selected = selectedValueIds[option.id] === value.id;
              const available = value.available !== false;
              return option.type === 'color' ? (
                <button
                  key={value.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={value.label}
                  disabled={!available}
                  onClick={() => onChange(option.id, value.id)}
                  className={cn(
                    'relative h-9 w-9 rounded-full border-2 transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
                    selected ? 'border-brand' : 'border-border',
                    !available && 'cursor-not-allowed opacity-40',
                  )}
                  style={value.swatch ? { backgroundColor: value.swatch } : undefined}
                  title={available ? value.label : `${value.label} — unavailable`}
                />
              ) : (
                <button
                  key={value.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!available}
                  onClick={() => onChange(option.id, value.id)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-body transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
                    selected ? 'border-brand bg-brand text-white' : 'border-border text-text-primary hover:bg-surface-subtle',
                    !available && 'cursor-not-allowed opacity-40 line-through',
                  )}
                >
                  {value.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
