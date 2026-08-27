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

/**
 * `GET /api/v1/stores` item — real, full shape, matching `StoreResource`
 * (apps/backend) field-for-field. Originally a minimal `{id, name,
 * status}` (all the Admin Shell's own workspace switcher ever needed);
 * expanded here for Beta Experience Pack 1's own Appearance Branding
 * screen, the first real consumer of the identity/contact/address fields
 * `StoreResource` already returned but nothing ever read.
 */
export interface StoreDTO {
  id: string;
  name: string;
  legalName: string | null;
  currencyCode: string;
  locale: string;
  timezone: string;
  contactEmail: string;
  contactPhone: string | null;
  address: {
    line1: string;
    line2: string | null;
    city: string;
    region: string | null;
    postalCode: string | null;
    countryCode: string;
  };
  status: string;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}
