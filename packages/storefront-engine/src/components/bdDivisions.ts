/**
 * Store Components library — Beta Milestone 2.6's own "Bangladesh
 * Commerce Layer" build item: real, accurate reference data for
 * Bangladesh's own 8 administrative Divisions — public administrative
 * fact, not a merchant claim or fabricated business data, so listing
 * them fully and confidently is honest in a way inventing e.g. a fake
 * discount never could be.
 *
 * **Deliberately stops at Division level.** Bangladesh has 64 Districts
 * and roughly 495 Upazilas beneath them — hand-transcribing that full
 * hierarchy from memory carries a real, meaningful risk of a wrong or
 * outdated entry silently degrading a shopper's own delivery address,
 * which is worse than an honest gap: a wrong-but-confident-looking
 * dataset gives no signal that anything is wrong. `AddressSelector.tsx`'s
 * own `districts`/`upazilas` props are real, working, and ready — the
 * calling application supplies that data (from a vetted static dataset
 * or a future real backend endpoint) rather than this package silently
 * asserting one.
 */
export interface BangladeshDivision {
  id: string;
  name: string;
}

export const BANGLADESH_DIVISIONS: BangladeshDivision[] = [
  { id: 'dhaka', name: 'Dhaka' },
  { id: 'chattogram', name: 'Chattogram' },
  { id: 'rajshahi', name: 'Rajshahi' },
  { id: 'khulna', name: 'Khulna' },
  { id: 'barishal', name: 'Barishal' },
  { id: 'sylhet', name: 'Sylhet' },
  { id: 'rangpur', name: 'Rangpur' },
  { id: 'mymensingh', name: 'Mymensingh' },
];
