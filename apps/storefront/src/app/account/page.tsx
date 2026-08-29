import type { Metadata } from 'next';
import { getMyProfile } from '@nexgen/storefront-engine';
import { ProfileEditForm } from '@nexgen/storefront-engine/client';
import { requireCustomerToken } from '@/lib/customerSession';

export const metadata: Metadata = { title: 'My profile' };

export default async function AccountProfilePage() {
  const token = await requireCustomerToken('/account');
  const profile = await getMyProfile(token);

  return <ProfileEditForm profile={profile} />;
}
