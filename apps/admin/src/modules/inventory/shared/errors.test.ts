import { describe, expect, it } from 'vitest';
import { ConflictError, ForbiddenError } from '@nexgen/api-client';
import { inventoryErrorMessage } from './errors.js';

describe('inventoryErrorMessage', () => {
  it('renders InsufficientStockException as an actionable, specific message', () => {
    const error = new ConflictError({ type: 'conflict', message: 'Stock item [abc-123] has only 4 available, but 10 were requested.' });
    expect(inventoryErrorMessage(error)).toBe("Only 4 available — can't remove 10.");
  });

  it('renders DependentRecordsExistException (warehouse delete blocked) verbatim', () => {
    const error = new ConflictError({
      type: 'conflict',
      message: 'App\\Domains\\Commerce\\Inventory\\Models\\Warehouse [w1] cannot be deleted: it still has stock items recorded against it.',
    });
    expect(inventoryErrorMessage(error)).toBe("This can't be deleted: it still has stock items recorded against it.");
  });

  it('renders InvalidReservationStateException/InvalidTransferStateException as a reload prompt', () => {
    const error = new ConflictError({ type: 'conflict', message: 'Reservation [r1] is already [released] and cannot be changed.' });
    expect(inventoryErrorMessage(error)).toBe('This is already released — reload the page to see its current state.');
  });

  it('falls back to the optimistic-lock message for an unrecognized 409 shape', () => {
    const error = new ConflictError({
      type: 'conflict',
      message: 'App\\Domains\\Commerce\\Inventory\\Models\\Warehouse [w1] has changed since it was last read: expected version 1, found 2.',
    });
    expect(inventoryErrorMessage(error)).toBe(
      'This was changed elsewhere since it loaded — reload the page to see the latest version before trying again.',
    );
  });

  it('renders a permission-denied message for ForbiddenError', () => {
    const error = new ForbiddenError({ type: 'authorization_denied', message: 'Forbidden.' });
    expect(inventoryErrorMessage(error)).toBe("You don't have permission to perform this action.");
  });

  it('falls back to a generic message for a non-ApiError', () => {
    expect(inventoryErrorMessage(new Error('network down'))).toBe('Something went wrong. Please try again.');
  });
});
