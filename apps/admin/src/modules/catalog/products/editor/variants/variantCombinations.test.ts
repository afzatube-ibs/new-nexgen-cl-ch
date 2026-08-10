import { describe, expect, it } from 'vitest';
import type { OptionValueDTO } from '@nexgen/api-client';
import { combinations, combinationKey } from './variantCombinations.js';

function value(id: string, val: string): OptionValueDTO {
  return { id, optionId: 'opt', value: val, slug: val.toLowerCase(), position: 0 };
}

describe('combinations', () => {
  it('returns a single empty combination when no option is selected', () => {
    expect(combinations([])).toEqual([[]]);
  });

  it('returns one combination per value for a single selected option', () => {
    const small = value('v1', 'Small');
    const large = value('v2', 'Large');
    expect(combinations([[small, large]])).toEqual([[small], [large]]);
  });

  it('computes the full cartesian product across two options, in stable order', () => {
    const s = value('v1', 'S');
    const m = value('v2', 'M');
    const red = value('v3', 'Red');
    const blue = value('v4', 'Blue');

    expect(combinations([[s, m], [red, blue]])).toEqual([
      [s, red],
      [s, blue],
      [m, red],
      [m, blue],
    ]);
  });

  it('produces no combinations if any selected option has zero values', () => {
    const s = value('v1', 'S');
    expect(combinations([[s], []])).toEqual([]);
  });

  it('scales to three options', () => {
    const sizes = [value('s1', 'S'), value('s2', 'M')];
    const colors = [value('c1', 'Red')];
    const materials = [value('m1', 'Cotton'), value('m2', 'Wool')];

    const result = combinations([sizes, colors, materials]);

    expect(result).toHaveLength(4);
    expect(result[0]).toEqual([sizes[0], colors[0], materials[0]]);
    expect(result.at(-1)).toEqual([sizes[1], colors[0], materials[1]]);
  });
});

describe('combinationKey', () => {
  it('is stable regardless of input order', () => {
    const a = value('v1', 'S');
    const b = value('v2', 'Red');
    expect(combinationKey([a, b])).toBe(combinationKey([b, a]));
  });

  it('differs for a different set of values', () => {
    const a = value('v1', 'S');
    const b = value('v2', 'Red');
    const c = value('v3', 'Blue');
    expect(combinationKey([a, b])).not.toBe(combinationKey([a, c]));
  });
});
