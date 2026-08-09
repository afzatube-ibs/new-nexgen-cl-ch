import type { FieldValues, UseFormSetError, Path } from 'react-hook-form';
import { ValidationApiError } from '@nexgen/api-client';

/**
 * Shared Framework — Validation (Phase 2.1 §6). Maps a real backend 422
 * (`ValidationApiError.fieldErrors`, Laravel's own field-keyed shape) onto
 * React Hook Form's `setError`, so every future module's form shows the
 * server's authoritative validation message next to the right field
 * without hand-writing this mapping per form — per ADR-0005's own "a
 * client-side validation failure and the equivalent server-side 422 should
 * always agree" requirement.
 */
export function applyServerValidationErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): boolean {
  if (!(error instanceof ValidationApiError)) return false;

  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if (messages?.[0]) {
      setError(field as Path<T>, { type: 'server', message: messages[0] });
    }
  }
  return true;
}
