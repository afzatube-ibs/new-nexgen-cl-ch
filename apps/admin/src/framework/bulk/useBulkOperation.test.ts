import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useBulkOperation, type BulkItem } from './useBulkOperation.js';

function items(ids: string[]): BulkItem[] {
  return ids.map((id) => ({ id, label: id }));
}

describe('useBulkOperation', () => {
  it('reports success for every item when the operation always resolves', async () => {
    const operation = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useBulkOperation());

    await act(async () => {
      await result.current.run(items(['a', 'b', 'c']), operation);
    });

    expect(result.current.state.status).toBe('done');
    expect(result.current.state.total).toBe(3);
    expect(result.current.state.completed).toBe(3);
    expect(result.current.state.results.every((r) => r.status === 'success')).toBe(true);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('records a per-item failure without aborting the rest of the batch', async () => {
    const operation = vi.fn((item: BulkItem) => (item.id === 'b' ? Promise.reject(new Error('boom')) : Promise.resolve()));
    const { result } = renderHook(() => useBulkOperation());

    await act(async () => {
      await result.current.run(items(['a', 'b', 'c']), operation);
    });

    expect(result.current.state.status).toBe('done');
    expect(result.current.state.results).toHaveLength(3);
    const failed = result.current.state.results.filter((r) => r.status === 'error');
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ id: 'b', error: 'boom' });
    const succeeded = result.current.state.results.filter((r) => r.status === 'success');
    expect(succeeded).toHaveLength(2);
  });

  it('retryFailed re-runs only the failed items, leaving prior successes untouched', async () => {
    let bFails = true;
    const operation = vi.fn((item: BulkItem) => (item.id === 'b' && bFails ? Promise.reject(new Error('boom')) : Promise.resolve()));
    const { result } = renderHook(() => useBulkOperation());

    await act(async () => {
      await result.current.run(items(['a', 'b', 'c']), operation);
    });
    expect(result.current.state.results.filter((r) => r.status === 'error')).toHaveLength(1);

    bFails = false;
    await act(async () => {
      await result.current.retryFailed();
    });

    expect(result.current.state.status).toBe('done');
    expect(result.current.state.total).toBe(3);
    expect(result.current.state.results).toHaveLength(3);
    expect(result.current.state.results.every((r) => r.status === 'success')).toBe(true);
    // 3 initial attempts + 1 retry of the one failed item.
    expect(operation).toHaveBeenCalledTimes(4);
  });

  it('retryFailed is a no-op when nothing failed', async () => {
    const operation = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useBulkOperation());

    await act(async () => {
      await result.current.run(items(['a', 'b']), operation);
    });
    await act(async () => {
      await result.current.retryFailed();
    });

    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('cancel skips items still queued behind the concurrency limit', async () => {
    // Internal concurrency is bounded (3) — with 4 items, the first 3 start
    // immediately and the 4th sits queued behind them. Cancelling while all
    // 3 are still in flight, then letting them resolve, proves the queued
    // 4th item is never attempted, while the 3 already-in-flight ones still
    // complete normally (cancellation doesn't abort in-flight work, only
    // work not yet started).
    const pending = new Map<string, () => void>();
    const started: string[] = [];
    const operation = vi.fn(
      (item: BulkItem) =>
        new Promise<void>((resolve) => {
          started.push(item.id);
          pending.set(item.id, resolve);
        }),
    );
    const { result } = renderHook(() => useBulkOperation());

    let runPromise!: Promise<void>;
    act(() => {
      runPromise = result.current.run(items(['a', 'b', 'c', 'd']), operation);
    });

    await waitFor(() => expect(started).toEqual(['a', 'b', 'c']));
    act(() => {
      result.current.cancel();
    });
    act(() => {
      pending.get('a')?.();
      pending.get('b')?.();
      pending.get('c')?.();
    });
    await act(async () => {
      await runPromise;
    });

    expect(result.current.state.status).toBe('cancelled');
    expect(started).not.toContain('d');
    expect(result.current.state.results).toHaveLength(3);
    expect(result.current.state.results.every((r) => r.status === 'success')).toBe(true);
  });

  it('reset returns to idle with no results', async () => {
    const operation = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useBulkOperation());

    await act(async () => {
      await result.current.run(items(['a']), operation);
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toEqual({ status: 'idle', total: 0, completed: 0, results: [] });
  });
});
