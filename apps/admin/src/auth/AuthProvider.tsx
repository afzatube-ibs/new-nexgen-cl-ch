import { useEffect, type ReactNode } from 'react';
import { me, UnauthenticatedError } from '@nexgen/api-client';
import { LoadingOverlay } from '@nexgen/ui';
import { useAuthStore } from './authStore.js';
import { apiClient } from '../lib/apiClient.js';

/**
 * Session Restore (docs/frontend/ADMIN_SHELL_ARCHITECTURE.md §7). Runs once
 * at application boot: if a token is present, validates it against
 * `GET /api/v1/auth/me` before anything authenticated renders — "there is
 * no flash of navigation the operator isn't permitted to see, since the
 * Sidebar never renders before the permission set is known."
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const token = useAuthStore((s) => s.token);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    let cancelled = false;

    async function restore(): Promise<void> {
      if (!token) {
        if (!cancelled) clearSession('logout');
        return;
      }
      try {
        const user = await me(apiClient);
        if (!cancelled) setSession(token, user);
      } catch (error) {
        if (!cancelled) {
          // A non-401 failure (e.g. the backend is unreachable) still ends
          // the restore attempt cleanly rather than hanging on the
          // full-screen loading state forever — treated the same as an
          // expired token, since the operator cannot proceed either way.
          clearSession(error instanceof UnauthenticatedError ? 'expired' : 'expired');
        }
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
    // Intentionally runs once per mount only — a live 401 mid-session is
    // handled by apiClient.ts's `onUnauthenticated` hook, not this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'restoring') {
    return <LoadingOverlay label="Restoring your session…" />;
  }

  return <>{children}</>;
}
