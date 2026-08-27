import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button, Icon, Text, useToast } from '@nexgen/ui';
import type { MediaAssetDTO } from '@nexgen/api-client';
import { useUploadBrandAsset } from '../queries.js';

export interface BrandAssetUploadProps {
  label: string;
  hint: string;
  asset: MediaAssetDTO | null;
  onChange: (mediaId: string | null) => void;
  /** Square preview box size — logo reads larger than favicon in the real Branding screen. */
  previewSize?: 'sm' | 'md';
  accept?: string;
}

/**
 * Beta Experience Pack 1 — a real, minimal single-image upload slot (logo,
 * favicon) built directly on the real, existing Media module
 * (`uploadMedia`, `MODULE:MEDIA`) — no new upload endpoint, no fabricated
 * progress. Deliberately not the full multi-image `MediaManagerCard`
 * (Catalog's own Product Media tab): a brand logo/favicon is exactly one
 * asset, not a gallery.
 */
export function BrandAssetUpload({ label, hint, asset, onChange, previewSize = 'md', accept = 'image/png,image/jpeg,image/webp,image/gif' }: BrandAssetUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const uploadMutation = useUploadBrandAsset();
  const { toast } = useToast();

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadMutation.mutateAsync({ file, altText: label });
      onChange(uploaded.id);
    } catch {
      toast({ variant: 'danger', title: 'Upload failed', description: 'Could not upload this image. Please try again.' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const boxClass = previewSize === 'sm' ? 'h-16 w-16' : 'h-24 w-24';

  return (
    <div className="flex flex-col gap-2">
      <Text as="span" variant="label" className="text-text-primary">
        {label}
      </Text>
      <div className="flex items-center gap-4">
        <div className={`flex ${boxClass} shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-surface-subtle`}>
          {asset ? (
            <img src={asset.url} alt={asset.altText ?? label} className="h-full w-full object-contain" />
          ) : (
            <Icon icon={Upload} size="standalone" className="text-text-secondary" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" loading={uploading} onClick={() => inputRef.current?.click()}>
              {asset ? 'Replace' : 'Upload'}
            </Button>
            {asset && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
                <Icon icon={X} size="inline" />
                Remove
              </Button>
            )}
          </div>
          <Text as="p" variant="caption" className="text-text-secondary">
            {hint}
          </Text>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
        }}
      />
    </div>
  );
}
