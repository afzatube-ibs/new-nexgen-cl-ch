import { describe, expect, it } from 'vitest';
import { safeRelativePath } from './safeRedirect.js';

describe('safeRelativePath', () => {
  it('accepts an ordinary in-app path', () => {
    expect(safeRelativePath('/settings')).toBe('/settings');
    expect(safeRelativePath('/catalog/products?page=2')).toBe('/catalog/products?page=2');
  });

  it('falls back to / for null or a path not starting with /', () => {
    expect(safeRelativePath(null)).toBe('/');
    expect(safeRelativePath('settings')).toBe('/');
  });

  it('rejects a protocol-relative external URL (//evil.example)', () => {
    expect(safeRelativePath('//evil.example.com')).toBe('/');
  });

  it('rejects the backslash variant browsers also treat as protocol-relative (/\\evil.example)', () => {
    expect(safeRelativePath('/\\evil.example.com')).toBe('/');
  });

  it('rejects an absolute URL smuggled in as a path', () => {
    expect(safeRelativePath('/redirect?to=https://evil.example.com')).toBe('/');
  });
});
