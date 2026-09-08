import { describe, expect, it, vi } from 'vitest';
import { fetchComposedAvailability } from '../../src/composition/availability.js';
import type { BackendClient } from '../../src/backend/client.js';

describe('composition/availability', () => {
  it('makes exactly one Inventory call for many SKUs and passes through Inventory-owned availability', async () => {
    const getList = vi.fn().mockResolvedValue({
      data: [
        { sku: 'SKU-1', totalAvailable: 4, isAvailable: true },
        { sku: 'SKU-2', totalAvailable: 0, isAvailable: false },
      ],
    });
    const backend = { getList } as unknown as BackendClient;

    const result = await fetchComposedAvailability(backend, ['SKU-1', 'SKU-2'], 'corr-1');

    expect(getList).toHaveBeenCalledTimes(1);
    expect(result.get('SKU-1')).toEqual({ isAvailable: true });
    expect(result.get('SKU-2')).toEqual({ isAvailable: false });
  });

  it('dedupes SKU case variants before the backend call', async () => {
    const getList = vi.fn().mockResolvedValue({ data: [] });
    const backend = { getList } as unknown as BackendClient;

    await fetchComposedAvailability(backend, ['SKU-1', 'sku-1', 'SKU-2'], 'corr-1');

    const call = getList.mock.calls[0]?.[0] as { module: string; path: string; query: { skus: string } };
    expect(call.module).toBe('inventory');
    expect(call.path).toBe('inventory/availability-many');
    expect(call.query.skus).toBe('SKU-1,SKU-2');
  });

  it('does not call Inventory for an empty SKU list', async () => {
    const getList = vi.fn();
    const backend = { getList } as unknown as BackendClient;

    const result = await fetchComposedAvailability(backend, [], 'corr-1');

    expect(getList).not.toHaveBeenCalled();
    expect(result.size).toBe(0);
  });

  it('fails open to unknown availability instead of fabricating in-stock state', async () => {
    const getList = vi.fn().mockRejectedValue(new Error('inventory unavailable'));
    const backend = { getList } as unknown as BackendClient;
    const warn = vi.fn();

    const result = await fetchComposedAvailability(backend, ['SKU-1'], 'corr-1', { warn } as never);

    expect(result.size).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
