import { ConflictError, ForbiddenError, ValidationApiError, ApiError } from '@nexgen/api-client';

/**
 * Localization's own error mapper — mirrors every other module's own copy,
 * duplicated per this codebase's established convention. `ConflictError`
 * (409) is a genuinely stale `expected_version`. The real business rule
 * that blocks archiving/deleting the base currency or default locale
 * (`CannotRemoveBaseCurrencyException`/`CannotRemoveDefaultLocaleException`,
 * confirmed by reading both directly) is mapped to HTTP 422 on the real
 * backend — a plain domain `RuntimeException`, not a real `ValidationException`
 * (`details`-less), which `ApiClient`'s own status-code-only dispatch (see
 * `errors.ts`) still surfaces as `ValidationApiError` regardless of its own
 * `type` string — checked here by its own real message text, not assumed.
 */
export function localizationErrorMessage(error: unknown): string {
  if (error instanceof ValidationApiError) {
    if (/base currency/i.test(error.message)) {
      return "This is the base currency and can't be archived or deleted — promote a different currency to base first.";
    }
    if (/default locale/i.test(error.message)) {
      return "This is the default locale and can't be archived or deleted — promote a different locale to default first.";
    }
    return error.message || 'Something went wrong. Please try again.';
  }
  if (error instanceof ConflictError) {
    return 'This was changed elsewhere since it loaded — reload the page to see the latest version before trying again.';
  }
  if (error instanceof ForbiddenError) {
    return "You don't have permission to perform this action.";
  }
  if (error instanceof ApiError) {
    return error.message || 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
