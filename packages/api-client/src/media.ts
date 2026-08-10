import type { ApiClient } from './client.js';
import type { DataEnvelope, ListEnvelope } from './types.js';

/**
 * `app/Domains/Platform/Media` — `MODULE:MEDIA`, a real Phase 1 module,
 * consumed here for the first time by Catalog (Slice 2's Product Media
 * Manager, and Brand's logo picker before it). `MediaAsset.url()`
 * (apps/backend) resolves through Laravel's `Storage::disk()` abstraction —
 * storage-agnostic by construction, so a future move to Cloudflare R2 is a
 * backend disk-config change only, nothing this client needs to know about
 * or prepare for. No server-side image-optimization pipeline exists yet
 * (only whatever `width`/`height` the uploaded file itself reports) — a
 * named future extension point, not something faked here.
 */
export interface MediaAssetDTO {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  uploadedBy: string | null;
  version: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ListMediaQuery {
  mimeType?: string;
  trashed?: boolean;
  page?: number;
  perPage?: number;
}

/** `GET /media` — `MediaController::index`, `media.assets.view`. */
export function listMedia(client: ApiClient, query?: ListMediaQuery): Promise<ListEnvelope<MediaAssetDTO>> {
  return client.get<ListEnvelope<MediaAssetDTO>>('/media', {
    query: query && { mime_type: query.mimeType, trashed: query.trashed, page: query.page, per_page: query.perPage },
  });
}

export async function getMedia(client: ApiClient, id: string): Promise<MediaAssetDTO> {
  const response = await client.get<DataEnvelope<MediaAssetDTO>>(`/media/${id}`);
  return response.data;
}

/**
 * `POST /media` — `UploadMediaRequest` accepts `jpg/jpeg/png/gif/webp/pdf`
 * up to 10 MB (`media.assets.manage`). Built on `ApiClient.uploadFile()`
 * specifically so `onProgress` reflects a real `XMLHttpRequest` upload
 * progress event, not a simulated one — see that method's own docblock.
 */
export async function uploadMedia(
  client: ApiClient,
  file: File,
  options?: { altText?: string; onProgress?: (percent: number) => void; signal?: AbortSignal },
): Promise<MediaAssetDTO> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.altText) formData.append('alt_text', options.altText);

  const response = await client.uploadFile<DataEnvelope<MediaAssetDTO>>('/media', formData, {
    onProgress: options?.onProgress,
    signal: options?.signal,
  });
  return response.data;
}

export async function updateMediaAltText(client: ApiClient, id: string, altText: string | null, expectedVersion: number): Promise<MediaAssetDTO> {
  const response = await client.patch<DataEnvelope<MediaAssetDTO>>(`/media/${id}`, { alt_text: altText, expected_version: expectedVersion });
  return response.data;
}

export function deleteMedia(client: ApiClient, id: string, expectedVersion: number): Promise<void> {
  return client.delete<void>(`/media/${id}`, { expected_version: expectedVersion });
}

export async function restoreMedia(client: ApiClient, id: string): Promise<MediaAssetDTO> {
  const response = await client.post<DataEnvelope<MediaAssetDTO>>(`/media/${id}/restore`);
  return response.data;
}
