import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin, logout as apiLogout, me as apiMe, ApiError } from '@nexgen/api-client';
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
      // AuthController::login() (apps/backend) does not eager-load `roles`
      // the way GET /api/v1/auth/me does, so result.user.roles is absent
      // entirely — found live, via a real post-login crash in
      // permissionSet(), not assumed. Re-fetching /auth/me immediately
      // (now that the token is known) both fixes that and ensures the
      // Sidebar's permission-aware rendering has the real permission set
      // from the first authenticated render, not just after a later
      // page refresh re-triggers AuthProvider's own restore flow.
      setSession(result.token, result.user);
      const fullUser = await apiMe(apiClient);
      setSession(result.token, fullUser);
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
