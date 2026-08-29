import type { Metadata } from 'next';
import { getMyProfile } from '@nexgen/storefront-engine';
import { AddressBookManager } from '@nexgen/storefront-engine/client';
import { requireCustomerToken } from '@/lib/customerSession';

export const metadata: Metadata = { title: 'My addresses' };

export default async function AccountAddressesPage() {
  const token = await requireCustomerToken('/account/addresses');
  // Reuses the same real profile call the Profile page makes — `addresses`
  // is already eager-loaded on it (`CustomerAuthController::me()`) — no
  // separate round trip needed just to also get the aggregate's own
  // `version`, which every address mutation requires.
  const profile = await getMyProfile(token);

  return <AddressBookManager addresses={profile.addresses} customerVersion={profile.version} />;
}
