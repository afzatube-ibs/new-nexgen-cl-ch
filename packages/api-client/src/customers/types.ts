/**
 * Phase 2.5 — Customers, Slice 1. Every shape here is the exact camelCase
 * mirror of `CustomerResource`/`CustomerAddressResource`
 * (apps/backend/app/Domains/Commerce/Customers/Http/Resources/*.php),
 * confirmed by reading both directly — nothing here is speculative.
 */

export type CustomerStatus = 'active' | 'archived';

export interface CustomerAddressDTO {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

/** Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — see `Customer::PHONE_*` on the real backend. */
export type CustomerPhoneVerificationStatus = 'unverified' | 'verified' | 'blocked';

export interface CustomerDTO {
  id: string;
  name: string;
  /** Nullable as of Phase 4.0 Slice 4.1 — a customer may register with phone only. */
  email: string | null;
  phone: string | null;
  phoneVerificationStatus: CustomerPhoneVerificationStatus;
  phoneVerifiedAt: string | null;
  status: CustomerStatus;
  /** Only present when the response embeds it — `CustomerController::show`/`store`/`update`/`archive` (`$customer->load('addresses')` on `show` only; the collection endpoint never loads it). Absent (`undefined`), never an empty array, when not loaded — see `customers.ts`'s own docblock. */
  addresses?: CustomerAddressDTO[];
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * `RegisterCustomerRequest` (apps/backend) — `password`/`passwordConfirmation`
 * are required at create only; `Customer` has no self-service login yet
 * (see the architecture doc's own §3), so this is a staff-set credential,
 * not a "send a reset link" flow this slice does not build.
 *
 * Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — `phone` is now
 * required, `email` optional (was the inverse); staff-side creation
 * reuses this exact same real backend request, per `CustomerController::
 * store()`, confirmed by reading it directly.
 */
export interface CreateCustomerInput {
  name: string;
  phone: string;
  email?: string | null;
  password: string;
  passwordConfirmation: string;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string | null;
  /** May be changed but never cleared — the real backend's own `UpdateCustomerProfileRequest` disallows a null phone. */
  phone?: string;
  expectedVersion: number;
}

/** `CustomerController::index` — genuinely server-side `q` (name/email/phone LIKE), `status`, `sort` (`name`|`email`|`created_at`), `direction`, `page`, `per_page` — confirmed by reading the controller directly. Never client-side-filtered. */
export interface ListCustomersQuery {
  q?: string;
  status?: CustomerStatus;
  sort?: 'name' | 'email' | 'created_at';
  direction?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

export interface CreateCustomerAddressInput {
  label?: string | null;
  recipientName: string;
  phone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  region?: string | null;
  postalCode?: string | null;
  countryCode: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
  /** The owning Customer's own version, not the address's — addresses carry no `lock_version` of their own (Customer + its address book is one aggregate). See `AddCustomerAddressAction`'s own docblock. */
  expectedVersion: number;
}

/**
 * `AuditLogController::index` (Customers' own — apps/backend) — real
 * server-side `actor_id`/`target_type` filters only, confirmed by reading
 * the controller directly. No `target_id` filter exists at all, so this
 * endpoint can never be asked for "just this one customer's own history"
 * server-side — see `apps/admin/src/modules/customers/activity/`'s own
 * docblock for how the frontend handles that real constraint honestly.
 */
export interface CustomerAuditLogDTO {
  id: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  correlationId: string | null;
  createdAt: string;
}

export interface ListCustomerAuditLogsQuery {
  actorId?: string;
  targetType?: string;
  page?: number;
  perPage?: number;
}

export interface UpdateCustomerAddressInput {
  label?: string | null;
  recipientName?: string;
  phone?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  region?: string | null;
  postalCode?: string | null;
  countryCode?: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
  expectedVersion: number;
}
