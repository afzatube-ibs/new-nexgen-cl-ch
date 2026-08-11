import { describe, expect, it, vi, afterEach } from 'vitest';
import { dayGroupLabel, shortTime } from './formatTimestamp.js';

// Built with the local `Date(year, monthIndex, day, ...)` constructor (not a
// fixed UTC ISO string) on both the "now" and the target sides, so this
// stays correct regardless of the test runner's own timezone — a fixed UTC
// string compared against a local calendar day is exactly the kind of
// off-by-one that would only surface outside UTC.
describe('dayGroupLabel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('labels today as "Today"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 12, 18, 0, 0));
    expect(dayGroupLabel(new Date(2026, 7, 12, 9, 30, 0).toISOString())).toBe('Today');
  });

  it('labels yesterday as "Yesterday"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 12, 18, 0, 0));
    expect(dayGroupLabel(new Date(2026, 7, 11, 9, 30, 0).toISOString())).toBe('Yesterday');
  });

  it('labels a day more than a week ago with a real date, not a weekday name', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 12, 18, 0, 0));
    const label = dayGroupLabel(new Date(2026, 6, 1, 9, 30, 0).toISOString());
    expect(label).not.toBe('Today');
    expect(label).not.toBe('Yesterday');
    expect(label).toMatch(/July/);
  });
});

describe('shortTime', () => {
  it('renders a compact hour:minute time', () => {
    const result = shortTime('2026-08-12T09:05:00Z');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});
