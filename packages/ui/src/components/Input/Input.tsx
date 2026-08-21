import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn.js';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Paired inline error text (DESIGN_SYSTEM.md §2 Input "invalid" state) — sets `aria-invalid`/`aria-describedby` automatically. */
  error?: string;
  label?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, label, hint, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-label text-text-primary">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-9 w-full rounded-md border border-border bg-surface px-3 text-body text-text-primary',
          'placeholder:text-text-secondary',
          'transition-colors duration-fast',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-subtle',
          'read-only:bg-surface-subtle',
          error && 'border-feedback-danger focus-visible:ring-feedback-danger',
          className,
        )}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={cn(hintId, errorId) || undefined}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-caption text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-caption text-feedback-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
