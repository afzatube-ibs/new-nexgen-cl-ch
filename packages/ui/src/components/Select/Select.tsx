import { forwardRef, useId } from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/cn.js';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  name?: string;
}

/** DESIGN_SYSTEM.md §2 — Select, Radix `Select` primitive (single-select; the searchable variant is a documented, not-yet-built extension of this same component). */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { options, value, defaultValue, onValueChange, placeholder = 'Select…', disabled, label, error, name },
  ref,
) {
  // A generated fallback id, exactly like Input/Textarea/Checkbox already
  // do (Checkbox.tsx's own docblock records the live bug this pattern
  // fixes) — Radix's Trigger is `role="combobox"`, not a native `<select>`,
  // so a plain adjacent `<span>` gives it no accessible name at all. Found
  // live via this platform's own `@axe-core/playwright` a11y scan on the
  // Catalog module's Product form (Phase 2.2) — every prior page happened
  // to use Select without an axe scan exercising it.
  const generatedId = useId();
  const selectId = label ? generatedId : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-body-strong text-text-primary">
          {label}
        </label>
      )}
      <RadixSelect.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled} name={name}>
        <RadixSelect.Trigger
          ref={ref}
          id={selectId}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 text-body text-text-primary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'data-[placeholder]:text-text-secondary',
            error && 'border-feedback-danger',
          )}
          aria-invalid={Boolean(error) || undefined}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown className="size-4 text-text-secondary" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            className="z-50 overflow-hidden rounded-md border border-border bg-surface-overlay text-text-primary shadow-elevation-2 dark:shadow-elevation-2-dark"
            position="popper"
            sideOffset={4}
          >
            <RadixSelect.ScrollUpButton className="flex items-center justify-center py-1">
              <ChevronUp className="size-4" />
            </RadixSelect.ScrollUpButton>
            <RadixSelect.Viewport className="p-1">
              {options.length === 0 ? (
                <div className="px-3 py-2 text-caption text-text-secondary">No options</div>
              ) : (
                options.map((option) => (
                  <RadixSelect.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 pl-8 text-body',
                      'data-[highlighted]:bg-surface-subtle data-[highlighted]:outline-none',
                      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                    )}
                  >
                    <RadixSelect.ItemIndicator className="absolute left-2 flex items-center">
                      <Check className="size-4" />
                    </RadixSelect.ItemIndicator>
                    <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  </RadixSelect.Item>
                ))
              )}
            </RadixSelect.Viewport>
            <RadixSelect.ScrollDownButton className="flex items-center justify-center py-1">
              <ChevronDown className="size-4" />
            </RadixSelect.ScrollDownButton>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error && (
        <p className="text-caption text-feedback-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
