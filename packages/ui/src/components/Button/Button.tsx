import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn.js';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium',
    'transition-colors duration-fast',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white hover:bg-brand-hover active:bg-brand-active',
        secondary:
          'bg-surface-subtle text-text-primary border border-border hover:bg-surface-subtle/80',
        outline: 'border border-border bg-transparent text-text-primary hover:bg-surface-subtle',
        ghost: 'bg-transparent text-text-primary hover:bg-surface-subtle',
        destructive: 'bg-feedback-danger text-white hover:opacity-90 active:opacity-80',
      },
      size: {
        sm: 'h-8 px-3 text-caption',
        md: 'h-9 px-4 text-body',
        lg: 'h-11 px-6 text-body-strong',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Renders the child element instead of a `<button>`, forwarding all props (Radix `asChild` pattern) — e.g. for a `<Link>` styled as a Button. */
  asChild?: boolean;
  /** Replaces the label with a spinner while preserving the button's width, per DESIGN_SYSTEM.md §2's Button "loading" state. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading</span>
          <span aria-hidden="true">{children}</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
});
