import type { FieldValues, UseFormSetError, Path } from 'react-hook-form';
import { ValidationApiError } from '@nexgen/api-client';

/**
 * `ValidationApiError.fieldErrors` is Laravel's own raw, snake_case
 * field-keyed error map (`country_code`, `tax_zone_id`, `currency_code`,
 * `base_price`, ...) — confirmed by reading `errors.ts`'s own docblock and
 * `bootstrap/app.php`'s `ValidationException` handler (`$e->errors()`,
 * verbatim, no key transform) directly. Every form in this app names its
 * React Hook Form fields in camelCase, matching every DTO/Input type this
 * codebase uses everywhere else. Converts one to the other so `setError`
 * actually lands on the field that's rendering it.
 */
function toCamelCase(field: string): string {
  return field.replace(/_([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}

/**
 * Shared Framework — Validation (Phase 2.1 §6). Maps a real backend 422
 * (`ValidationApiError.fieldErrors`, Laravel's own field-keyed shape) onto
 * React Hook Form's `setError`, so every future module's form shows the
 * server's authoritative validation message next to the right field
 * without hand-writing this mapping per form — per ADR-0005's own "a
 * client-side validation failure and the equivalent server-side 422 should
 * always agree" requirement.
 *
 * Found live while wiring Tax Zone's cross-field (country_code, region)
 * uniqueness check (Phase 2.4 Slice 3): this function returned `true`
 * (“handled”) for every 422 regardless of whether `setError`'s raw
 * snake_case key actually matched any registered RHF field — for any
 * multi-word field name (`country_code` vs. the form's own `countryCode`,
 * `tax_zone_id` vs. `taxZoneId`, and, retroactively, every other module's
 * own multi-word fields: `currency_code`, `base_price`, `sale_starts_at`,
 * ...) the server's real, correct error was silently swallowed — no field
 * message, and no generic fallback either, since the caller's own
 * `if (applyServerValidationErrors(...)) return;` had already treated it
 * as fully handled. Single-word fields (`name`, `sku`, `rate`) were never
 * affected, which is why this had never surfaced in an prior slice's own
 * manual verification pass. Fixed at the source, not per-form, since this
 * helper is what every module's forms already share.
 */
export function applyServerValidationErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): boolean {
  if (!(error instanceof ValidationApiError)) return false;

  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if (messages?.[0]) {
      setError(toCamelCase(field) as Path<T>, { type: 'server', message: messages[0] });
    }
  }
  return true;
}
