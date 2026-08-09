import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './authStore.js';

/**
 * Protected Routes (Phase 2.1's own "Authentication" requirement). A
 * signed-out operator is sent to `/login`, carrying the originally-requested
 * URL as a `returnTo` query parameter — docs/frontend/ADMIN_SHELL_ARCHITECTURE.md
 * §7's "a bookmarked deep link survives a re-login."
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (status !== 'authenticated') {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  return <>{children}</>;
}
