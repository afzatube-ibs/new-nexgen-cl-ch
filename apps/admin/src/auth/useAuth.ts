import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin, logout as apiLogout, ApiError } from '@nexgen/api-client';
import { useAuthStore } from './authStore.js';
import { permissionSet, hasPermission as checkPermission } from './permissions.js';
import { apiClient } from '../lib/apiClient.js';
import { queryClient } from '../lib/queryClient.js';

export interface UseAuthResult {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  status: ReturnType<typeof useAuthStore.getState>['status'];
  endReason: ReturnType<typeof useAuthStore.getState>['endReason'];
  permissions: Set<string>;
  can: (permissionKey: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

/** Central auth hook — every screen needing the current operator, their permissions, or login/logout goes through this, never the store directly. */
export function useAuth(): UseAuthResult {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const endReason = useAuthStore((s) => s.endReason);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();

  const permissions = useMemo(() => permissionSet(user), [user]);
  const can = useCallback((key: string) => checkPermission(permissions, key), [permissions]);

  const login = useCallback(
    async (email: string, password: string) => {
      const deviceName = typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 255) : 'admin-web';
      const result = await apiLogin(apiClient, { email, password, deviceName });
      setSession(result.token, result.user);
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout(apiClient);
    } catch (error) {
      // AuthController::logout() only fails if the token is already gone —
      // proceed with a local session clear regardless (API:PHILOSOPHY: the
      // operator's own experience of "being logged out" must never hinge
      // on a network call succeeding).
      if (!(error instanceof ApiError)) throw error;
    } finally {
      clearSession('logout');
      queryClient.clear();
      void navigate('/login', { replace: true });
    }
  }, [clearSession, navigate]);

  return { user, status, endReason, permissions, can, login, logout };
}
