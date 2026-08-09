import * as RadixToast from '@radix-ui/react-toast';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { useToast } from './useToast.js';
import type { ToastVariant } from './toast-store.js';

const VARIANT_ICON: Record<ToastVariant, typeof Info> = {
  default: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertCircle,
  info: Info,
};

const VARIANT_CLASS: Record<ToastVariant, string> = {
  default: 'border-border text-text-primary',
  success: 'border-feedback-success/30 text-feedback-success',
  warning: 'border-feedback-warning/30 text-feedback-warning',
  danger: 'border-feedback-danger/30 text-feedback-danger',
  info: 'border-feedback-info/30 text-feedback-info',
};

/** Renders once at the app root (docs/frontend/ADMIN_SHELL_ARCHITECTURE.md's shell owns this). Elevation 4 — "always above everything else," per DESIGN_SYSTEM.md §1.4. */
export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <RadixToast.Provider swipeDirection="right">
      {toasts.map((toast) => {
        const VariantIcon = VARIANT_ICON[toast.variant ?? 'default'];
        return (
          <RadixToast.Root
            key={toast.id}
            duration={toast.duration}
            onOpenChange={(open) => {
              if (!open) dismiss(toast.id);
            }}
            className={cn(
              'flex items-start gap-3 rounded-md border bg-surface-overlay p-4 shadow-elevation-4 dark:shadow-elevation-4-dark',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-full',
              VARIANT_CLASS[toast.variant ?? 'default'],
            )}
          >
            <VariantIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="flex flex-1 flex-col gap-1">
              <RadixToast.Title className="text-body-strong text-text-primary">{toast.title}</RadixToast.Title>
              {toast.description && (
                <RadixToast.Description className="text-body text-text-secondary">
                  {toast.description}
                </RadixToast.Description>
              )}
              {toast.action && (
                <RadixToast.Action asChild altText={toast.action.label}>
                  <button
                    onClick={toast.action.onClick}
                    className="mt-1 self-start text-body-strong text-brand hover:text-brand-hover"
                  >
                    {toast.action.label}
                  </button>
                </RadixToast.Action>
              )}
            </div>
            <RadixToast.Close aria-label="Dismiss" className="text-text-secondary hover:text-text-primary">
              <X className="size-4" />
            </RadixToast.Close>
          </RadixToast.Root>
        );
      })}
      <RadixToast.Viewport className="fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-6 outline-none" />
    </RadixToast.Provider>
  );
}
