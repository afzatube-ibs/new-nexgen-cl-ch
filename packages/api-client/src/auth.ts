import type { ApiClient } from './client.js';
import type { DataEnvelope, UserDTO } from './types.js';

export interface LoginResult {
  user: UserDTO;
  token: string;
}

/**
 * `POST /api/v1/auth/login` — mirrors AuthController::login() exactly: a
 * `UserResource` plus `meta.token` (the Sanctum plain-text token), never a
 * cookie (config/cors.php's `supports_credentials: false` — this backend is
 * bearer-token-only, per Phase 1.1's own hardening pass).
 */
export async function login(
  client: ApiClient,
  credentials: { email: string; password: string; deviceName: string },
): Promise<LoginResult> {
  const response = await client.post<DataEnvelope<UserDTO> & { meta: { token: string } }>('/auth/login', {
    email: credentials.email,
    password: credentials.password,
    device_name: credentials.deviceName,
  });
  return { user: response.data, token: response.meta.token };
}

/** `POST /api/v1/auth/logout` — revokes only the token making this request (AuthController::logout()). Returns 204, no body. */
export async function logout(client: ApiClient): Promise<void> {
  await client.post<void>('/auth/logout');
}

/**
 * `GET /api/v1/auth/me` — validates the stored token is still live and
 * returns the operator's own roles/permissions for session restore
 * (docs/frontend/ADMIN_SHELL_ARCHITECTURE.md §7).
 */
export async function me(client: ApiClient): Promise<UserDTO> {
  const response = await client.get<DataEnvelope<UserDTO>>('/auth/me');
  return response.data;
}
