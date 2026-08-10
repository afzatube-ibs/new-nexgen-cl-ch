import { useState } from 'react';
import { Image as ImageIcon, Star, Trash2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, EmptyState, Alert, Skeleton, Text } from '@nexgen/ui';
import type { MediaAssetDTO, ProductImageDTO } from '@nexgen/api-client';
import { ConfirmDialog } from '../../../../../framework/index.js';
import { catalogErrorMessage } from '../../../shared/errors.js';
import { useProductImages, useAddProductImage, useUpdateProductImage, useRemoveProductImage } from './mediaQueries.js';
import { MediaLibraryDialog } from './MediaLibraryDialog.js';

export interface MediaManagerCardProps {
  productId: string | undefined;
  canManage: boolean;
}

/**
 * Replaces the Slice-1/2.2A "Media — Not available yet" placeholder now
 * that a real Media Library exists to attach from. Reordering is native
 * HTML5 drag & drop (no new dependency, matching the precedent set by
 * Categories' own tree reordering in the discarded Slice-1-parallel build)
 * plus explicit Left/Right buttons as the keyboard/screen-reader-operable
 * equivalent — drag alone is never sufficient on its own
 * (`UI:ACCESSIBILITY`).
 */
export function MediaManagerCard({ productId, canManage }: MediaManagerCardProps) {
  const { data, isLoading, isError, refetch } = useProductImages(productId);
  const addMutation = useAddProductImage(productId ?? '');
  const updateMutation = useUpdateProductImage(productId ?? '');
  const removeMutation = useRemoveProductImage(productId ?? '');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const images = [...(data?.data ?? [])].sort((a, b) => a.position - b.position);
  const mutationError = addMutation.error ?? updateMutation.error ?? removeMutation.error;

  function reorder(next: ProductImageDTO[]): void {
    next.forEach((image, index) => {
      if (image.position !== index) {
        updateMutation.mutate({ imageId: image.id, input: { position: index } });
      }
    });
  }

  function moveTo(imageId: string, newIndex: number): void {
    const current = images.findIndex((i) => i.id === imageId);
    if (current === -1 || newIndex < 0 || newIndex >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(current, 1);
    if (moved) next.splice(newIndex, 0, moved);
    reorder(next);
  }

  function handleSelectFromLibrary(asset: MediaAssetDTO): void {
    addMutation.mutate({ mediaId: asset.id, position: images.length, isPrimary: images.length === 0 });
  }

  if (!productId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Media</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={<ImageIcon className="size-8" aria-hidden="true" />} title="Save the product first" description="Images can be attached once this product has been created." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Media</CardTitle>
        {canManage && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setLibraryOpen(true)}>
            <Plus className="size-4" />
            Add images
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {mutationError && (
          <Alert variant="danger" className="mb-4" role="alert">
            {catalogErrorMessage(mutationError)}
          </Alert>
        )}
        {isError && (
          <Alert variant="danger" role="alert">
            {"Couldn't load this product's images."}
            <Button type="button" variant="ghost" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </Alert>
        )}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key -- skeleton placeholders have no stable identity
              <Skeleton key={i} shape="block" className="aspect-square w-full" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <EmptyState
            icon={<ImageIcon className="size-8" aria-hidden="true" />}
            title="No images yet"
            description={canManage ? 'Add images from the shared media library.' : 'No images have been added.'}
          />
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="group relative aspect-square overflow-hidden rounded-md border border-border"
                draggable={canManage}
                onDragStart={() => setDraggedId(image.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!draggedId || draggedId === image.id) return;
                  const from = images.findIndex((i) => i.id === draggedId);
                  const to = images.findIndex((i) => i.id === image.id);
                  if (from === -1 || to === -1) return;
                  const next = [...images];
                  const [moved] = next.splice(from, 1);
                  if (moved) next.splice(to, 0, moved);
                  reorder(next);
                  setDraggedId(null);
                }}
              >
                {image.url ? (
                  <img src={image.url} alt={image.altText ?? ''} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center bg-surface-secondary text-caption text-text-secondary">No preview</div>
                )}
                {image.isPrimary && (
                  <Badge variant="success" className="absolute left-1 top-1">
                    Primary
                  </Badge>
                )}
                {canManage && (
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <div className="flex">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-6 p-0 text-white hover:text-white"
                        disabled={index === 0}
                        onClick={() => moveTo(image.id, index - 1)}
                        aria-label="Move earlier"
                      >
                        <ChevronLeft className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-6 p-0 text-white hover:text-white"
                        disabled={index === images.length - 1}
                        onClick={() => moveTo(image.id, index + 1)}
                        aria-label="Move later"
                      >
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                    <div className="flex">
                      {!image.isPrimary && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="size-6 p-0 text-white hover:text-white"
                          onClick={() => updateMutation.mutate({ imageId: image.id, input: { isPrimary: true } })}
                          aria-label="Set as primary image"
                        >
                          <Star className="size-3.5" />
                        </Button>
                      )}
                      <ConfirmDialog
                        trigger={
                          <Button type="button" variant="ghost" size="sm" className="size-6 p-0 text-white hover:text-white" aria-label="Remove image">
                            <Trash2 className="size-3.5" />
                          </Button>
                        }
                        title="Remove this image?"
                        description="It will no longer appear on this product."
                        confirmLabel="Remove"
                        destructive
                        onConfirm={() => removeMutation.mutateAsync(image.id)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <Text variant="caption" className="mt-3 block text-text-secondary">
          Storage is disk-agnostic on the backend already (Cloudflare R2 is a configuration change, not a code change) — no
          server-side image optimization pipeline exists yet.
        </Text>
      </CardContent>

      {libraryOpen && <MediaLibraryDialog open={libraryOpen} onOpenChange={setLibraryOpen} onSelect={handleSelectFromLibrary} />}
    </Card>
  );
}
