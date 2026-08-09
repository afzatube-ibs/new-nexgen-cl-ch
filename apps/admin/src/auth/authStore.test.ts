import { describe, expect, it, beforeEach } from 'vitest';
import { useAuthStore } from './authStore.js';
import type { UserDTO } from '@nexgen/api-client';

const user: UserDTO = {
  id: '1',
  name: 'Operator',
  email: 'operator@example.com',
  status: 'active',
  roles: [],
  version: 1,
  createdAt: null,
  updatedAt: null,
};

describe('useAuthStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ token: null, user: null, status: 'restoring', endReason: null });
  });

  it('setSession persists the token and marks the session authenticated', () => {
    useAuthStore.getState().setSession('abc123', user);

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().token).toBe('abc123');
    expect(window.localStorage.getItem('nexgen-admin-token')).toBe('abc123');
  });

  it('clearSession removes the token and records the end reason', () => {
    useAuthStore.getState().setSession('abc123', user);
    useAuthStore.getState().clearSession('expired');

    expect(useAuthStore.getState().status).toBe('unauthenticated');
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().endReason).toBe('expired');
    expect(window.localStorage.getItem('nexgen-admin-token')).toBeNull();
  });
});
