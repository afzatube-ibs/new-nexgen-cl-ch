/**
 * Beta Sprint 3 — Checkout Engine. Field-for-field matched to the real
 * backend's own `CheckoutSession.billing_address`/`shipping_address`
 * shape (`Checkout\Actions\StartCheckoutAction::defaultAddressSnapshot`,
 * re-verified from source in `COMMERCE_ENGINE_ARCHITECTURE_REVIEW.md`
 * §1.1) — `recipient_name`, `phone`, `address_line1`, `address_line2`,
 * `city`, `region`, `postal_code`, `country_code`. **Not** the same
 * shape as `AddressSelector`'s own Division/District/Upazila output —
 * the real backend contract has no dedicated Bangladesh-administrative
 * fields, only generic `city`/`region` — so this page's own form maps a
 * selected Division into `region` and a selected District into `city`
 * (Upazila, when selected, is appended to `address_line2`) rather than
 * inventing a richer backend contract that doesn't exist. The day a real
 * Bangladesh-aware address contract ships on the backend, this mapping
 * is the one place that changes.
 */
export interface CheckoutAddress {
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
}

export function emptyCheckoutAddress(): CheckoutAddress {
  return {
    recipientName: '',
    phone: '',
    addressLine1: '',
    addressLine2: null,
    city: '',
    region: null,
    postalCode: null,
    countryCode: 'BD',
  };
}
