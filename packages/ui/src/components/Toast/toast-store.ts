// A minimal, dependency-free pub/sub toast queue (the same shape shadcn/ui's
// own `use-toast` popularized) — packages/ui does not take a hard dependency
// on Zustand (that's ADR-0005's choice for apps/admin's own client state,
// not a requirement on every package). One queue, module-scoped, consumed
// by both `useToast()` and `<Toaster />`.
export type ToastVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  action?: ToastAction;
  /** ms before auto-dismiss; 0 disables auto-dismiss. */
  duration?: number;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) listener(toasts);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => listeners.delete(listener);
}

export function addToast(toast: Omit<ToastItem, 'id'>): string {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, duration: 5000, variant: 'default', ...toast }];
  emit();
  return id;
}

export function dismissToast(id: string): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}
