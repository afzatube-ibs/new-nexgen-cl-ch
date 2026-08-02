<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Actions;

use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Domains\Platform\Media\Audit\AuditLogger;
use App\Domains\Platform\Media\Events\MediaUploaded;
use App\Domains\Platform\Media\Exceptions\UnsupportedMediaTypeException;
use App\Domains\Platform\Media\Models\MediaAsset;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * SECURITY:FILE_UPLOAD made concrete: the file's real content-derived MIME
 * type (never the client-supplied one) is checked against an allowlist,
 * and it is stored under a randomly generated path — never the caller's
 * original filename — so this module is never a path-traversal or
 * overwrite vector. Images outside that allowlist (SVG in particular,
 * which can embed executable script content) are deliberately rejected.
 */
final readonly class UploadMediaAction
{
    private const string DISK = 'public';

    private const array ALLOWED_MIME_TYPES = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
    ];

    private const int MAX_BYTES = 10 * 1024 * 1024;

    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(UploadedFile $file, ?string $altText, ?string $actorId): MediaAsset
    {
        $mimeType = (string) $file->getMimeType();

        if (! in_array($mimeType, self::ALLOWED_MIME_TYPES, true)) {
            throw new UnsupportedMediaTypeException("File type [{$mimeType}] is not permitted.");
        }

        if ($file->getSize() === false || $file->getSize() > self::MAX_BYTES) {
            throw new UnsupportedMediaTypeException('File exceeds the maximum allowed size of 10MB.');
        }

        [$width, $height] = $this->dimensions($file, $mimeType);

        $path = 'media/'.Str::uuid()->toString().'.'.$file->getClientOriginalExtension();
        Storage::disk(self::DISK)->putFileAs('', $file, $path);

        return DB::transaction(function () use ($file, $mimeType, $path, $width, $height, $altText, $actorId) {
            $asset = MediaAsset::query()->create([
                'disk' => self::DISK,
                'path' => $path,
                'filename' => $file->getClientOriginalName(),
                'mime_type' => $mimeType,
                'size' => $file->getSize(),
                'width' => $width,
                'height' => $height,
                'alt_text' => $altText,
                'uploaded_by' => $actorId,
            ]);

            $this->auditLogger->log(
                action: 'media.uploaded',
                actorId: $actorId,
                targetType: MediaAsset::class,
                targetId: $asset->id,
                after: $asset->only(['filename', 'mime_type', 'size']),
            );

            $this->eventBus->publish(new MediaUploaded(mediaId: $asset->id, mimeType: $asset->mime_type));

            return $asset;
        });
    }

    /**
     * @return array{0: int|null, 1: int|null}
     */
    private function dimensions(UploadedFile $file, string $mimeType): array
    {
        if (! str_starts_with($mimeType, 'image/')) {
            return [null, null];
        }

        $size = @getimagesize($file->getRealPath());

        return $size === false ? [null, null] : [$size[0], $size[1]];
    }
}
