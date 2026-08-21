import { forwardRef, type ElementType, type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn.js';
import type { tokens } from '@nexgen/tokens';

export type TextStyle = keyof typeof tokens.typography.textStyles;

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  variant?: TextStyle;
}

const VARIANT_CLASS: Record<TextStyle, string> = {
  display: 'text-display',
  heading: 'text-heading',
  section: 'text-section',
  subheading: 'text-subheading',
  stat: 'text-stat',
  body: 'text-body',
  'body-strong': 'text-body-strong',
  label: 'text-label',
  caption: 'text-caption',
  code: 'text-code font-mono',
};

/** Typography primitive over docs/frontend/DESIGN_SYSTEM.md §1.2's text styles — no component hardcodes a raw font-size utility outside this. */
export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  { as: Component = 'p', variant = 'body', className, ...props },
  ref,
) {
  return <Component ref={ref} className={cn(VARIANT_CLASS[variant], 'text-text-primary', className)} {...props} />;
});
