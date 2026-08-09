import type { ReactNode } from 'react';
import { useAuth } from './useAuth.js';
import { ForbiddenPage } from '../pages/ForbiddenPage.js';

export interface RequirePermissionProps {
  /** At least one of these must be held — mirrors hasAnyPermission's "equally sufficient" semantics. Omit (or empty array) to require only authentication. */
  anyOf?: string[];
  children: ReactNode;
  /** Renders in place of the full-page 403 — for gating a single control (e.g. an "Edit" button) rather than an entire route. */
  inline?: ReactNode;
}

/**
 * Permission wrapper — shared framework (Phase 2.1 §6). Route-level use
 * renders the full `ForbiddenPage`; a `fallback` lets a single control
 * (e.g. one toolbar button) degrade gracefully instead. Mirrors the
 * Sidebar's own "hide, never disabled-but-shown" philosophy
 * (docs/frontend/ADMIN_SHELL_ARCHITECTURE.md §4) when no `inline` fallback
 * is supplied — the gated content simply doesn't render.
 */
export function RequirePermission({ anyOf = [], children, inline }: RequirePermissionProps) {
  const { permissions } = useAuth();
  const allowed = anyOf.length === 0 || anyOf.some((key) => permissions.has(key));

  if (allowed) return <>{children}</>;
  if (inline !== undefined) return <>{inline}</>;
  return <ForbiddenPage />;
}
