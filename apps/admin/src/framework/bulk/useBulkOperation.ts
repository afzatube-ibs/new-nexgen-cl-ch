import { useCallback, useRef, useState } from 'react';

/**
 * Bulk orchestration layer (Phase 2.2 §2) — the backend has no batch
 * endpoints for any Catalog resource, only single-record archive/destroy/
 * restore/publish routes. Every "Bulk Archive"/"Bulk Delete" action in the
 * UI is implemented by looping those existing endpoints here, never by
 * inventing a new backend contract.
 *
 * This hook knows nothing about Catalog, permissions, or any specific
 * entity — it orchestrates a caller-supplied `operation(item) => Promise<void>`
 * across a list of items with bounded concurrency, cancellation, and
 * retry-failed-only. When a real batch endpoint exists for some resource in
 * the future, only the `operation` function a resource's own list page
 * passes to `run()` changes — this hook and `BulkOperationDialog` do not.
 *
 * `operation` is a `run()` argument, not a hook constructor argument — a
 * real bug (found live via this module's own Playwright e2e pass, not
 * assumed) in an earlier version bound it at hook-creation time instead,
 * which meant a caller building the closure from component state right
 * before calling `run()` (`setBulkAction(action); bulk.run(items)`) silently
 * operated on the *previous* render's state — React state updates aren't
 * applied synchronously, so `run()` fired before the new state existed.
 * Every call site now builds its `operation` closure from a plain local
 * variable/parameter, never from state read inside the callback itself.
 */

export interface BulkItem<T = unknown> {
  id: string;
  /** Human-readable label for the per-item result list (e.g. the record's name/SKU). */
  label: string;
  data?: T;
}

export interface BulkItemResult {
  id: string;
  label: string;
  status: 'success' | 'error';
  error?: string;
}

export type BulkOperationStatus = 'idle' | 'running' | 'cancelled' | 'done';

export interface BulkOperationState {
  status: BulkOperationStatus;
  total: number;
  completed: number;
  results: BulkItemResult[];
}

export type BulkOperationFn<T> = (item: BulkItem<T>) => Promise<void>;

export interface UseBulkOperationResult<T> {
  state: BulkOperationState;
  run: (items: BulkItem<T>[], operation: BulkOperationFn<T>) => Promise<void>;
  cancel: () => void;
  retryFailed: () => Promise<void>;
  reset: () => void;
}

const CONCURRENCY = 3;
const IDLE_STATE: BulkOperationState = { status: 'idle', total: 0, completed: 0, results: [] };

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'An unknown error occurred.';
}

export function useBulkOperation<T = unknown>(): UseBulkOperationResult<T> {
  const [state, setState] = useState<BulkOperationState>(IDLE_STATE);
  const cancelledRef = useRef(false);
  const allItemsRef = useRef<Map<string, BulkItem<T>>>(new Map());
  const resultsRef = useRef<Map<string, BulkItemResult>>(new Map());
  const operationRef = useRef<BulkOperationFn<T> | null>(null);

  const execute = useCallback(async (items: BulkItem<T>[]) => {
    const operation = operationRef.current;
    if (!operation) return;
    cancelledRef.current = false;
    let cursor = 0;

    async function worker(): Promise<void> {
      while (cursor < items.length) {
        if (cancelledRef.current) return;
        const item = items[cursor++]!;
        try {
          await operation!(item);
          resultsRef.current.set(item.id, { id: item.id, label: item.label, status: 'success' });
        } catch (error) {
          resultsRef.current.set(item.id, { id: item.id, label: item.label, status: 'error', error: errorMessage(error) });
        }
        setState((prev) => ({ ...prev, completed: resultsRef.current.size, results: [...resultsRef.current.values()] }));
      }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker()));

    setState((prev) => ({
      ...prev,
      status: cancelledRef.current ? 'cancelled' : 'done',
      results: [...resultsRef.current.values()],
    }));
  }, []);

  const run = useCallback(
    async (items: BulkItem<T>[], operation: BulkOperationFn<T>) => {
      operationRef.current = operation;
      allItemsRef.current = new Map(items.map((item) => [item.id, item]));
      resultsRef.current = new Map();
      setState({ status: 'running', total: items.length, completed: 0, results: [] });
      await execute(items);
    },
    [execute],
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const retryFailed = useCallback(async () => {
    const failedIds = [...resultsRef.current.values()].filter((r) => r.status === 'error').map((r) => r.id);
    const retryItems = failedIds
      .map((id) => allItemsRef.current.get(id))
      .filter((item): item is BulkItem<T> => item !== undefined);
    if (retryItems.length === 0) return;
    setState((prev) => ({ ...prev, status: 'running' }));
    await execute(retryItems);
  }, [execute]);

  const reset = useCallback(() => {
    cancelledRef.current = false;
    allItemsRef.current = new Map();
    resultsRef.current = new Map();
    operationRef.current = null;
    setState(IDLE_STATE);
  }, []);

  return { state, run, cancel, retryFailed, reset };
}
