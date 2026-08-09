/** API:RESPONSE_ENVELOPE — a single resource. */
export interface DataEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

/** API:RESPONSE_ENVELOPE — a paginated list (Laravel's `paginate()` resource shape). */
export interface ListEnvelope<T> {
  data: T[];
  meta?: {
    current_page?: number;
    per_page?: number;
    total?: number;
    last_page?: number;
    [key: string]: unknown;
  };
  links?: {
    first?: string | null;
    last?: string | null;
    prev?: string | null;
    next?: string | null;
  };
}

/** Permission key shape — `module.resource.action`, per API:AUTHENTICATION / SECURITY:ROLES_PERMISSIONS. */
export interface PermissionDTO {
  key: string;
  label: string;
  module: string;
}

export interface RoleDTO {
  id: string;
  name: string;
  label: string;
  permissions: PermissionDTO[];
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** `GET /api/v1/auth/me` — mirrors `UserResource` exactly (app/Domains/Platform/IdentityAccess/Http/Resources/UserResource.php). */
export interface UserDTO {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: RoleDTO[];
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/** `GET /api/v1/stores` item — used by the Admin Shell's workspace switcher (docs/frontend/ADMIN_SHELL_ARCHITECTURE.md §3). */
export interface StoreDTO {
  id: string;
  name: string;
  status: string;
  [key: string]: unknown;
}
