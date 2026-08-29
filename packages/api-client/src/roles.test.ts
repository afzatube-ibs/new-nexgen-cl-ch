import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from './client.js';
import { listRoles, getRole, createRole, updateRole, deleteRole } from './roles.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('roles', () => {
  const fetchMock = vi.fn();
  let client: ApiClient;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    client = new ApiClient({ baseUrl: 'https://api.test', getToken: () => null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const role = { id: 'r1', name: 'support', label: 'Support', permissions: [], version: 1, createdAt: null, updatedAt: null };

  it('lists roles with a bounded per_page', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [role] }));
    const result = await listRoles(client);
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/roles?per_page=100');
    expect(result.data).toEqual([role]);
  });

  it('gets a single role, unwrapping the envelope', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: role }));
    const result = await getRole(client, 'r1');
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.test/roles/r1');
    expect(result).toEqual(role);
  });

  it('creates a role with the real snake_case body the backend expects', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: role }, 201));
    await createRole(client, { name: 'support', label: 'Support', permissions: ['orders.orders.view'] });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ name: 'support', label: 'Support', permissions: ['orders.orders.view'] });
  });

  it('never sends `permissions` at all when updating only the label — never an implicit clear', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: role }));
    await updateRole(client, 'r1', { label: 'New Label', expectedVersion: 1 });
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({ expected_version: 1, label: 'New Label' });
    expect('permissions' in body).toBe(false);
  });

  it('deletes a role with its expected_version', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await deleteRole(client, 'r1', 3);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ expected_version: 3 });
  });
});
