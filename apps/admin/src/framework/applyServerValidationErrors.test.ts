import { describe, expect, it, vi } from 'vitest';
import { ValidationApiError } from '@nexgen/api-client';
import { applyServerValidationErrors } from './applyServerValidationErrors.js';

function makeValidationError(details: Record<string, string[]>): ValidationApiError {
  return new ValidationApiError({ type: 'validation_failed', message: 'The given data was invalid.', details });
}

describe('applyServerValidationErrors', () => {
  it('returns false and calls setError for anything that is not a ValidationApiError', () => {
    const setError = vi.fn();
    const result = applyServerValidationErrors(new Error('boom'), setError);
    expect(result).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });

  it('converts a snake_case server field key to the camelCase RHF field it actually maps to', () => {
    const setError = vi.fn();
    const error = makeValidationError({ country_code: ['A tax zone for this country and region already exists.'] });

    const result = applyServerValidationErrors(error, setError);

    expect(result).toBe(true);
    expect(setError).toHaveBeenCalledWith('countryCode', {
      type: 'server',
      message: 'A tax zone for this country and region already exists.',
    });
  });

  it('converts multi-segment snake_case keys correctly (tax_zone_id -> taxZoneId)', () => {
    const setError = vi.fn();
    const error = makeValidationError({ tax_zone_id: ['The tax zone id has already been taken.'] });

    applyServerValidationErrors(error, setError);

    expect(setError).toHaveBeenCalledWith('taxZoneId', expect.objectContaining({ message: 'The tax zone id has already been taken.' }));
  });

  it('leaves an already-single-word field name unchanged', () => {
    const setError = vi.fn();
    const error = makeValidationError({ name: ['The name has already been taken.'] });

    applyServerValidationErrors(error, setError);

    expect(setError).toHaveBeenCalledWith('name', expect.objectContaining({ message: 'The name has already been taken.' }));
  });

  it('applies every field in a multi-field error response', () => {
    const setError = vi.fn();
    const error = makeValidationError({
      base_price: ['The base price must be a number.'],
      compare_at_price: ['The compare at price must be greater than 0.'],
    });

    applyServerValidationErrors(error, setError);

    expect(setError).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenCalledWith('basePrice', expect.anything());
    expect(setError).toHaveBeenCalledWith('compareAtPrice', expect.anything());
  });
});
