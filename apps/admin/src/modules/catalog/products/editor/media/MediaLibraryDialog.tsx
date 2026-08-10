import { useRef, useState } from 'react';
import { UploadCloud, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button, Alert, Skeleton, Text } from '@nexgen/ui';
import type { MediaAssetDTO } from '@nexgen/api-client';
import { catalogErrorMessage } from '../../../shared/errors.js';
import { useMediaLibrary, useUploadMedia } from './mediaQueries.js';

export interface MediaLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired once per asset the operator wants attached — for an upload, once it finishes; for an existing asset, on click. Dialog stays open so several can be picked in one visit. */
  onSelect: (asset: MediaAssetDTO) => void;
}

interface InFlightUpload {
  key: string;
  filename: string;
  percent: number;
  error?: string;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

/**
 * The shared Media Library browse-and-upload surface — real drag & drop
 * (native HTML5 DnD, no new dependency) plus a button-triggered file input
 * as the keyboard/screen-reader-accessible equivalent (drag & drop alone
 * is never operable that way). Upload progress is real, per file
 * (`ApiClient.uploadFile`'s own `XMLHttpRequest`-based progress, not
 * simulated) — see `mediaQueries.ts`.
 */
export function MediaLibraryDialog({ open, onOpenChange, onSelect }: MediaLibraryDialogProps) {
  const { data, isLoading, isError, refetch } = useMediaLibrary({ perPage: 60 });
  const uploadMutation = useUploadMedia();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploads, setUploads] = useState<InFlightUpload[]>([]);

  function uploadFiles(files: FileList | File[]): void {
    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploads((prev) => [...prev, { key: `${file.name}-${Date.now()}`, filename: file.name, percent: 0, error: 'Unsupported file type.' }]);
        continue;
      }

      const key = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setUploads((prev) => [...prev, { key, filename: file.name, percent: 0 }]);

      uploadMutation.mutate(
        {
          file,
          onProgress: (percent) => setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, percent } : u))),
        },
        {
          onSuccess: (asset) => {
            setUploads((prev) => prev.filter((u) => u.key !== key));
            onSelect(asset);
          },
          onError: (error) => {
            setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, error: catalogErrorMessage(error) } : u)));
          },
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
          <DialogDescription>Upload a new file, or pick an existing one to attach.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div
            className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors ${
              isDraggingOver ? 'border-brand bg-brand/5' : 'border-border'
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDraggingOver(false);
              if (event.dataTransfer.files.length > 0) uploadFiles(event.dataTransfer.files);
            }}
          >
            <UploadCloud className="size-8 text-text-secondary" aria-hidden="true" />
            <Text variant="body-strong">Drag files here</Text>
            <Text variant="caption" className="text-text-secondary">
              JPG, PNG, GIF, WebP, or PDF — up to 10 MB each.
            </Text>
            <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              Browse files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              aria-label="Choose files to upload"
              accept={ACCEPTED_TYPES.join(',')}
              className="sr-only"
              onChange={(event) => {
                if (event.target.files && event.target.files.length > 0) uploadFiles(event.target.files);
                event.target.value = '';
              }}
            />
          </div>

          {uploads.length > 0 && (
            <div className="flex flex-col gap-2">
              {uploads.map((upload) => (
                <div key={upload.key} className="flex flex-col gap-1 rounded-md border border-border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <Text variant="caption" className="truncate">
                      {upload.filename}
                    </Text>
                    <Text variant="caption" className="text-text-secondary">
                      {upload.error ? 'Failed' : `${upload.percent}%`}
                    </Text>
                  </div>
                  {upload.error ? (
                    <Text variant="caption" className="text-feedback-danger">
                      {upload.error}
                    </Text>
                  ) : (
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary" role="progressbar" aria-valuenow={upload.percent} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${upload.percent}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-4">
            <Text variant="body-strong" className="mb-2">
              Existing files
            </Text>
            {isError && (
              <Alert variant="danger" role="alert">
                {"Couldn't load the media library."}
                <Button type="button" variant="ghost" size="sm" onClick={() => void refetch()}>
                  Retry
                </Button>
              </Alert>
            )}
            {isLoading ? (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  // eslint-disable-next-line react/no-array-index-key -- skeleton placeholders have no stable identity
                  <Skeleton key={i} shape="block" className="aspect-square w-full" />
                ))}
              </div>
            ) : (data?.data.length ?? 0) === 0 ? (
              <Text variant="caption" className="text-text-secondary">
                No files uploaded yet.
              </Text>
            ) : (
              <div className="grid max-h-80 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
                {data?.data.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className="group relative aspect-square overflow-hidden rounded-md border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    onClick={() => onSelect(asset)}
                    aria-label={`Attach ${asset.filename}`}
                  >
                    {asset.mimeType.startsWith('image/') ? (
                      <img src={asset.url} alt={asset.altText ?? ''} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-surface-secondary text-caption text-text-secondary">
                        {asset.filename.split('.').pop()?.toUpperCase()}
                      </div>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <Check className="size-6 text-white" aria-hidden="true" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
