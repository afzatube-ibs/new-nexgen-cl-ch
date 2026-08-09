import { forwardRef, useId } from 'react';
import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import { cn } from '../../lib/cn.js';

export interface RadioGroupProps extends RadixRadioGroup.RadioGroupProps {
  orientation?: 'horizontal' | 'vertical';
}

/** DESIGN_SYSTEM.md §2 — Radio (Group), Radix `RadioGroup` primitive. */
export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
  { className, orientation = 'vertical', ...props },
  ref,
) {
  return (
    <RadixRadioGroup.Root
      ref={ref}
      className={cn('flex gap-3', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap', className)}
      {...props}
    />
  );
});

export interface RadioItemProps extends RadixRadioGroup.RadioGroupItemProps {
  label: string;
}

export const RadioItem = forwardRef<HTMLButtonElement, RadioItemProps>(function RadioItem(
  { className, label, id, ...props },
  ref,
) {
  // Same fallback-id fix as Checkbox — see that component's docblock.
  const generatedId = useId();
  const itemId = id ?? generatedId;

  return (
    <div className="flex items-center gap-2">
      <RadixRadioGroup.Item
        ref={ref}
        id={itemId}
        className={cn(
          'size-4 shrink-0 rounded-full border border-border bg-surface',
          'data-[state=checked]:border-brand',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        <RadixRadioGroup.Indicator className="flex items-center justify-center after:block after:size-2 after:rounded-full after:bg-brand" />
      </RadixRadioGroup.Item>
      <label htmlFor={itemId} className="text-body text-text-primary">
        {label}
      </label>
    </div>
  );
});
