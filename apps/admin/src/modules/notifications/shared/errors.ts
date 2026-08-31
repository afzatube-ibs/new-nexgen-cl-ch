import { ConflictError, ForbiddenError, ApiError } from '@nexgen/api-client';

/** Notifications' own error mapper — mirrors every other module's own copy, duplicated per this codebase's established convention. */
export function notificationsErrorMessage(error: unknown): string {
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
