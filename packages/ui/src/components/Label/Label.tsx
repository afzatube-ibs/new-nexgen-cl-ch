import { forwardRef } from 'react';
import * as RadixLabel from '@radix-ui/react-label';
import { cn } from '../../lib/cn.js';

/** Thin styled wrapper over Radix `Label` — used where a form control needs an explicit, clickable label outside Input/Textarea/Select's own built-in `label` prop (e.g. labeling a Checkbox group as a whole). */
export const Label = forwardRef<HTMLLabelElement, RadixLabel.LabelProps>(function Label({ className, ...props }, ref) {
  return <RadixLabel.Root ref={ref} className={cn('text-label text-text-primary', className)} {...props} />;
});
