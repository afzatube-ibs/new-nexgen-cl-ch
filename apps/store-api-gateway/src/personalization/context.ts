/**
 * Personalization Context — this slice's own required scope: one
 * normalized context every downstream system (flags, recommendations,
 * caching, future AI) consumes, built once per request. Composes what
 * Slice 1 already resolves (guest identity, store/locale/currency) with
 * new-this-slice attribution/device signals — never a second, competing
 * source of truth for anything Slice 1 already owns.
 *
 * Every "future" field is present, typed, and explicitly `null` today —
 * CDP_ARCHITECTURE.md §3.1's own Customer-Identity-tier gap
 * (STORE_FRONTEND_ARCHITECTURE.md §3.3) applies here identically: the
 * shape is ready, the backend capability is not, and this is stated
 * inline rather than silently omitted.
 */
import type { GuestIdentity } from '../context/guestSession.js';
import type { StoreContext } from '../context/localization.js';
import type { UtmParameters } from './attribution.js';
import type { DeviceInfo } from './device.js';

export interface PersonalizationContext {
  // --- real today (Slice 1) ---
  visitor: {
    /** True only when a returning guest cookie (Slice 1's own durable nx_did) was presented, not newly minted this request — CDP_ARCHITECTURE.md §3.1's "Anonymous vs Guest" distinction, made concrete. */
    isReturning: boolean;
    deviceId: string;
  };
  store: StoreContext; // storeId, locale, currency — Slice 1

  // --- real, new this slice ---
  attribution: UtmParameters;
  referrer: string | null;
  device: DeviceInfo;
  channel: 'direct' | 'organic' | 'paid' | 'social' | 'email' | 'referral' | 'unknown';

  // --- future — typed now, populated once the named backend/CDP capability exists ---
  future: {
    customerId: string | null; // blocked on STORE_FRONTEND_ARCHITECTURE.md §3.3's customer-auth-guard gap
    segmentIds: string[] | null; // blocked on Growth-domain CRM (04_MODULE_ARCHITECTURE.md §7, designed-for-not-built)
    loyaltyTier: string | null; // blocked on a Loyalty capability — named as a Promotions extension point, not built (Slice 1 report §"Promotion docblock")
    aiProfile: Record<string, unknown> | null; // blocked on any real AI/ML capability — VISION:NON_GOALS' "additive, never load-bearing" AI posture
  };
}

export function buildPersonalizationContext(input: {
  guestIdentity: GuestIdentity;
  store: StoreContext;
  attribution: UtmParameters;
  referrer: string | null;
  device: DeviceInfo;
}): PersonalizationContext {
  return {
    visitor: { isReturning: !input.guestIdentity.isNew, deviceId: input.guestIdentity.deviceId },
    store: input.store,
    attribution: input.attribution,
    referrer: input.referrer,
    device: input.device,
    channel: deriveChannel(input.attribution, input.referrer),
    future: { customerId: null, segmentIds: null, loyaltyTier: null, aiProfile: null },
  };
}

function deriveChannel(attribution: UtmParameters, referrer: string | null): PersonalizationContext['channel'] {
  if (attribution.utmMedium === 'cpc' || attribution.utmMedium === 'paid' || attribution.gclid || attribution.fbclid || attribution.ttclid) return 'paid';
  if (attribution.utmMedium === 'social') return 'social';
  if (attribution.utmMedium === 'email') return 'email';
  if (attribution.utmSource) return 'organic';
  if (!referrer) return 'direct';
  return 'referral';
}
