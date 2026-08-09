import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn.js';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover/focus-visible affordance for a clickable card — DESIGN_SYSTEM.md §2 Card "interactive variant." */
  interactive?: boolean;
}

/** DESIGN_SYSTEM.md §2 — Card, with/without header/footer via composition (`CardHeader`/`CardTitle`/`CardContent`/`CardFooter`). */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card({ className, interactive, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border bg-surface shadow-elevation-1 dark:shadow-elevation-1-dark',
        interactive &&
          'cursor-pointer transition-shadow duration-fast hover:shadow-elevation-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 dark:hover:shadow-elevation-2-dark',
        className,
      )}
      {...props}
    />
  );
});

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardHeader(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn('flex flex-col gap-1 p-4', className)} {...props} />;
});

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(function CardTitle(
  { className, ...props },
  ref,
) {
  // eslint-disable-next-line jsx-a11y/heading-has-content -- content arrives via the spread `...props.children`, not a static JSX child the rule can see; every real call site supplies a title string.
  return <h3 ref={ref} className={cn('text-subheading text-text-primary', className)} {...props} />;
});

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function CardDescription({ className, ...props }, ref) {
    return <p ref={ref} className={cn('text-body text-text-secondary', className)} {...props} />;
  },
);

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardContent(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn('p-4 pt-0', className)} {...props} />;
});

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function CardFooter(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn('flex items-center gap-2 p-4 pt-0', className)} {...props} />;
});
