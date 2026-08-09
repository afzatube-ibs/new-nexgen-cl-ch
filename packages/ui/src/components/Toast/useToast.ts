import { useSyncExternalStore } from 'react';
import { addToast, dismissToast, subscribe, type ToastItem } from './toast-store.js';

/** DESIGN_SYSTEM.md §2 — Toast. `toast(...)` enqueues; `<Toaster />` (rendered once, in the app root) renders the queue. */
export function useToast(): { toasts: ToastItem[]; toast: typeof addToast; dismiss: typeof dismissToast } {
  const toasts = useSyncExternalStore(subscribe, () => getSnapshot());
  return { toasts, toast: addToast, dismiss: dismissToast };
}

let snapshot: ToastItem[] = [];
subscribe((next) => {
  snapshot = next;
});
function getSnapshot(): ToastItem[] {
  return snapshot;
}
