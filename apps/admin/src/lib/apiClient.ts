import { ApiClient } from '@nexgen/api-client';
import { useAuthStore } from '../auth/authStore.js';

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

/**
 * The one ApiClient instance for the whole app — token is read live from
 * the auth store (never captured at construction time, since it changes
 * across login/logout), and a 401 clears the session globally
 * (docs/frontend/ADMIN_SHELL_ARCHITECTURE.md §7's "failed check clears the
 * stored token and redirects to login").
 */
export const apiClient = new ApiClient({
  baseUrl,
  getToken: () => useAuthStore.getState().token,
  onUnauthenticated: () => {
    useAuthStore.getState().clearSession('expired');
  },
});
