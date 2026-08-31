/**
 * Production Completion Plan v2, Milestone 5 (Customer Accounts) — real
 * shapes returned by the Gateway's Category C surface, field-for-field
 * matched to the real backend's own `CustomerResource`/
 * `CustomerAddressResource`. Deliberately its own file, with no
 * `server-only` import — mirrors `order/types.ts`'s own precedent
 * exactly: a Client Component (`ProfileEditForm`, `AddressBookManager`)
 * needs these shapes but must never pull in `customerAuth.ts`'s own
 * runtime fetch code (which IS `server-only`) into its bundle.
 */
export interface CustomerProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  /** Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — see `Customer::PHONE_*` on the real backend. */
  phoneVerificationStatus: 'unverified' | 'verified' | 'blocked';
  phoneVerifiedAt: string | null;
  status: string;
  addresses: CustomerAddress[];
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CustomerAddress {
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
}

/** Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — `phone` required, `email` optional (was the inverse). */
export interface RegisterCustomerInput {
  name: string;
  phone: string;
  email?: string | null;
  password: string;
  passwordConfirmation: string;
}

/** Phase 4.0 Slice 4.1 (Mobile-First Customer Identity) — `email` may now be explicitly cleared to `null`; `phone` may be changed but never cleared, matching the real backend's own `UpdateMyProfileRequest`. */
export interface UpdateMyProfileInput {
  name?: string;
  email?: string | null;
  phone?: string;
  expectedVersion: number;
}

export interface AddressInput {
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
  expectedVersion: number;
}

/** The real backend's own list-mode `OrderResource` — no line items/addresses/timeline, only order-level totals (see `GuestOrderLookupForm`'s own docblock for why the same real shape applies there too). */
export interface MyOrderSummary {
  id: string;
  orderNumber: string;
  currencyCode: string;
  grandTotal: string;
  status: string;
  placedAt: string;
}
