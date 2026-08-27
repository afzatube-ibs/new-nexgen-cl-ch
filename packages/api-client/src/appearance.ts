import type { ApiClient } from './client.js';
import type { DataEnvelope } from './types.js';
import type { MediaAssetDTO } from './media.js';

/**
 * `app/Domains/Platform/Appearance` — Beta Experience Pack 1's own new
 * backend module (`planning/architecture/APPEARANCE_WORKSPACE_
 * SPECIFICATION.md` §4.2(a)), consumed here for the first time. One row
 * per store, real optimistic locking (`version`/`expected_version`,
 * identical shape to every other versioned aggregate this client already
 * wraps), and a real, lightweight draft/published distinction —
 * `hasUnpublishedChanges`/`isPublished` are computed server-side from a
 * real `published_snapshot` comparison, never guessed client-side.
 */
export interface StoreAppearanceDTO {
  id: string;
  storeId: string;
  logo: MediaAssetDTO | null;
  favicon: MediaAssetDTO | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  typographyPreset: string;
  buttonStyle: 'solid' | 'outline' | 'soft';
  announcementEnabled: boolean;
  announcementText: string | null;
  social: {
    whatsappNumber: string | null;
    messengerUrl: string | null;
    facebookUrl: string | null;
    instagramUrl: string | null;
    tiktokUrl: string | null;
    youtubeUrl: string | null;
  };
  businessHours: BusinessHourEntry[] | null;
  isPublished: boolean;
  hasUnpublishedChanges: boolean;
  publishedAt: string | null;
  publishedBy: string | null;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface BusinessHourEntry {
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  open?: string | null;
  close?: string | null;
  closed?: boolean;
}

/** Every field a merchant can actually change in one Save — matches `UpdateStoreAppearanceRequest`'s own real validation rules exactly, snake_case at the wire boundary. */
export interface UpdateStoreAppearanceInput {
  logoMediaId?: string | null;
  faviconMediaId?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  borderRadius?: StoreAppearanceDTO['borderRadius'];
  typographyPreset?: string;
  buttonStyle?: StoreAppearanceDTO['buttonStyle'];
  announcementEnabled?: boolean;
  announcementText?: string | null;
  whatsappNumber?: string | null;
  messengerUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  tiktokUrl?: string | null;
  youtubeUrl?: string | null;
  businessHours?: BusinessHourEntry[] | null;
}

function toWirePayload(input: UpdateStoreAppearanceInput): Record<string, unknown> {
  return {
    logo_media_id: input.logoMediaId,
    favicon_media_id: input.faviconMediaId,
    primary_color: input.primaryColor,
    secondary_color: input.secondaryColor,
    accent_color: input.accentColor,
    border_radius: input.borderRadius,
    typography_preset: input.typographyPreset,
    button_style: input.buttonStyle,
    announcement_enabled: input.announcementEnabled,
    announcement_text: input.announcementText,
    whatsapp_number: input.whatsappNumber,
    messenger_url: input.messengerUrl,
    facebook_url: input.facebookUrl,
    instagram_url: input.instagramUrl,
    tiktok_url: input.tiktokUrl,
    youtube_url: input.youtubeUrl,
    business_hours: input.businessHours,
  };
}

/** `GET /stores/{storeId}/appearance` — `appearance.branding.view`. Auto-creates a real, default-valued row server-side on first access (`GetOrCreateStoreAppearanceAction`) — this call never 404s for a real store. */
export async function getStoreAppearance(client: ApiClient, storeId: string): Promise<StoreAppearanceDTO> {
  const response = await client.get<DataEnvelope<StoreAppearanceDTO>>(`/stores/${storeId}/appearance`);
  return response.data;
}

/** `PATCH /stores/{storeId}/appearance` — saves a real draft; never touches the published snapshot a real customer's Storefront would read. `appearance.branding.manage`. */
export async function updateStoreAppearance(
  client: ApiClient,
  storeId: string,
  changes: UpdateStoreAppearanceInput,
  expectedVersion: number,
): Promise<StoreAppearanceDTO> {
  const response = await client.patch<DataEnvelope<StoreAppearanceDTO>>(`/stores/${storeId}/appearance`, {
    ...toWirePayload(changes),
    expected_version: expectedVersion,
  });
  return response.data;
}

/** `POST /stores/{storeId}/appearance/publish` — snapshots the current draft as the new live version. `appearance.branding.manage`. */
export async function publishStoreAppearance(client: ApiClient, storeId: string, expectedVersion: number): Promise<StoreAppearanceDTO> {
  const response = await client.post<DataEnvelope<StoreAppearanceDTO>>(`/stores/${storeId}/appearance/publish`, { expected_version: expectedVersion });
  return response.data;
}

/** `POST /stores/{storeId}/appearance/reset` — discards the draft, restoring every field from the last published snapshot. Throws a real, server-reported error if the store has never been published. `appearance.branding.manage`. */
export async function resetStoreAppearance(client: ApiClient, storeId: string, expectedVersion: number): Promise<StoreAppearanceDTO> {
  const response = await client.post<DataEnvelope<StoreAppearanceDTO>>(`/stores/${storeId}/appearance/reset`, { expected_version: expectedVersion });
  return response.data;
}
