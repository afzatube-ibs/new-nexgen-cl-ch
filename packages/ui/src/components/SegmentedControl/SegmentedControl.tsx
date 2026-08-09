import type { ComponentType } from 'react';
import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import { cn } from '../../lib/cn.js';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedControlOption<T>[];
  ariaLabel: string;
}

/**
 * An icon-only, single-select control (the Admin Shell's own Theme Toggle
 * is its first consumer) built directly on Radix `RadioGroup` — not a
 * hand-rolled `role="radio"` div, per UI:ACCESSIBILITY's "components with a
 * natural directional model... additionally support arrow-key navigation."
 * A hand-rolled version of exactly this pattern was tried first and found,
 * live, to only support `Tab`-per-option rather than the correct
 * roving-tabindex/arrow-key radiogroup behavior — this component exists so
 * that mistake has one fix, not one per future consumer.
 */
export function SegmentedControl<T extends string>({ value, onValueChange, options, ariaLabel }: SegmentedControlProps<T>) {
  return (
    <RadixRadioGroup.Root
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      aria-label={ariaLabel}
      className="flex items-center rounded-md border border-border p-0.5"
    >
      {options.map((option) => (
        <RadixRadioGroup.Item
          key={option.value}
          value={option.value}
          aria-label={option.label}
          className={cn(
            'flex size-7 items-center justify-center rounded-sm text-text-secondary transition-colors duration-fast',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
            'data-[state=checked]:bg-surface-subtle data-[state=checked]:text-text-primary',
          )}
        >
          <option.icon className="size-4" />
        </RadixRadioGroup.Item>
      ))}
    </RadixRadioGroup.Root>
  );
}
