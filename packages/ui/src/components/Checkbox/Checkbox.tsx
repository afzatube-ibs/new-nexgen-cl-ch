import { forwardRef, useId } from 'react';
import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../lib/cn.js';

export interface CheckboxProps extends RadixCheckbox.CheckboxProps {
  label?: string;
}

/** DESIGN_SYSTEM.md §2 — single / indeterminate (table "select all" headers), Radix `Checkbox` primitive. */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { className, label, id, ...props },
  ref,
) {
  // A generated fallback id, exactly like Input/Textarea already do — a
  // `label`/`htmlFor` pair with no id is not just inconvenient, it is
  // genuinely broken: the label click-to-toggle and the accessible name
  // both silently fail with `id={undefined}`, found live by this
  // component's own test (getByRole('checkbox', { name: ... }) returned no
  // match) rather than assumed correct.
  const generatedId = useId();
  const checkboxId = id ?? (label ? generatedId : undefined);

  const checkbox = (
    <RadixCheckbox.Root
      ref={ref}
      id={checkboxId}
      className={cn(
        'peer size-4 shrink-0 rounded-sm border border-border bg-surface',
        'data-[state=checked]:bg-brand data-[state=checked]:border-brand data-[state=checked]:text-white',
        'data-[state=indeterminate]:bg-brand data-[state=indeterminate]:border-brand data-[state=indeterminate]:text-white',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadixCheckbox.Indicator className="flex items-center justify-center text-current">
        {props.checked === 'indeterminate' ? <Minus className="size-3" /> : <Check className="size-3" />}
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );

  if (!label) return checkbox;

  return (
    <div className="flex items-center gap-2">
      {checkbox}
      <label htmlFor={checkboxId} className="text-body text-text-primary peer-disabled:opacity-50">
        {label}
      </label>
    </div>
  );
});
