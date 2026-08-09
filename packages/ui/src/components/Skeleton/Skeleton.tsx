import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn.js';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  shape?: 'text' | 'block' | 'avatar';
}

/** DESIGN_SYSTEM.md §2 — Skeleton: text-line / block / avatar shapes, composed to match the real content's own layout. Respects `prefers-reduced-motion` via `motion-reduce:animate-none`. */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { className, shape = 'block', ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'animate-pulse bg-surface-subtle motion-reduce:animate-none',
        shape === 'text' && 'h-3.5 rounded-sm',
        shape === 'block' && 'rounded-md',
        shape === 'avatar' && 'rounded-full',
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
});
