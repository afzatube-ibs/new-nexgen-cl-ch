import { create } from 'zustand';
import type { UserDTO } from '@nexgen/api-client';

const TOKEN_STORAGE_KEY = 'nexgen-admin-token';

export type SessionStatus = 'restoring' | 'authenticated' | 'unauthenticated';

export type SessionEndReason = 'logout' | 'expired';

interface AuthState {
  token: string | null;
  user: UserDTO | null;
  status: SessionStatus;
  /** Set only when the session ended involuntarily (§7's 401-during-restore or a live 401 mid-session) — LoginPage surfaces this so the operator understands why they're back here, per Phase 2.1's "401 Handling" requirement. */
  endReason: SessionEndReason | null;
  setSession: (token: string, user: UserDTO) => void;
  clearSession: (reason: SessionEndReason) => void;
  setRestoring: () => void;
}

/**
 * ADR-0005: Zustand for genuinely browser-local session state. The Sanctum
 * bearer token is persisted to `localStorage` directly (not via a Zustand
 * `persist` middleware wrapping the whole store) so `apiClient.ts`'s
 * `getToken()` and this module's own restore-on-boot logic both read the
 * exact same, single source, per docs/frontend/ADMIN_SHELL_ARCHITECTURE.md
 * §7.
 */
export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_STORAGE_KEY) : null,
  user: null,
  status: 'restoring',
  endReason: null,
  setSession: (token, user) => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    set({ token, user, status: 'authenticated', endReason: null });
  },
  clearSession: (reason) => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    set({ token: null, user: null, status: 'unauthenticated', endReason: reason });
  },
  setRestoring: () => set({ status: 'restoring' }),
}));
