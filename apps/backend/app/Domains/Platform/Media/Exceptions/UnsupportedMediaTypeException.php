<?php

declare(strict_types=1);

namespace App\Domains\Platform\Media\Exceptions;

use RuntimeException;

/**
 * SECURITY:FILE_UPLOAD's "validated against contract" made concrete: raised
 * when an uploaded file's true content does not match an allowed media
 * type, even if its client-supplied extension/MIME header claimed
 * otherwise. Mapped to HTTP 422 in bootstrap/app.php.
 */
final class UnsupportedMediaTypeException extends RuntimeException {}
