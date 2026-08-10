import type { OptionValueDTO } from '@nexgen/api-client';

/**
 * Cartesian product of each selected option's own values — e.g. Size[S,M] ×
 * Color[Red,Blue] → [S/Red, S/Blue, M/Red, M/Blue]. Pure and dependency-free
 * so the Variant Matrix/Generator can be unit-tested directly.
 */
export function combinations(valueLists: OptionValueDTO[][]): OptionValueDTO[][] {
  return valueLists.reduce<OptionValueDTO[][]>(
    (acc, values) => acc.flatMap((combo) => values.map((value) => [...combo, value])),
    [[]],
  );
}

/** A stable, order-independent key for a combination — used to tell which possible combinations already have a variant. */
export function combinationKey(values: OptionValueDTO[]): string {
  return [...values]
    .map((v) => v.id)
    .sort()
    .join('|');
}
