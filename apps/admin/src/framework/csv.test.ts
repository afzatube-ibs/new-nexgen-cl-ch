import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from './csv.js';

describe('csv', () => {
  it('parses a simple CSV into headers + rows', () => {
    const { headers, rows } = parseCsv('name,sku\nWidget,W-1\nGadget,G-1\n');
    expect(headers).toEqual(['name', 'sku']);
    expect(rows).toEqual([
      { name: 'Widget', sku: 'W-1' },
      { name: 'Gadget', sku: 'G-1' },
    ]);
  });

  it('handles quoted fields containing commas and embedded newlines', () => {
    const { rows } = parseCsv('name,description\n"Widget, Deluxe","Line one\nLine two"\n');
    expect(rows[0]?.name).toBe('Widget, Deluxe');
    expect(rows[0]?.description).toBe('Line one\nLine two');
  });

  it('unescapes doubled quotes inside a quoted field', () => {
    const { rows } = parseCsv('name\n"Say ""hello"""\n');
    expect(rows[0]?.name).toBe('Say "hello"');
  });

  it('round-trips toCsv -> parseCsv for a value containing a comma', () => {
    const csv = toCsv([{ name: 'Widget, Deluxe' }], ['name']);
    const { rows } = parseCsv(csv);
    expect(rows[0]?.name).toBe('Widget, Deluxe');
  });
});
