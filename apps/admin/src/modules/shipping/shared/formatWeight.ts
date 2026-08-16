/** `ShippingRate.minWeightGrams`/`maxWeightGrams` and `Shipment.weightGrams` are always grams (integer) — displayed as kg for merchant readability when the value is large enough to matter, matching how weight is actually thought about on a shipping label. */
export function formatWeightGrams(grams: number | null): string {
  if (grams === null) return '—';
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${Number.isInteger(kg) ? kg : kg.toFixed(2)} kg`;
  }
  return `${grams} g`;
}

/** A weight band's display form, e.g. "0–500 g" or "1 kg+" — `maxWeightGrams: null` means unbounded above (`ShippingRate::coversWeight()`'s own `[min, max)` semantics). */
export function formatWeightBand(minGrams: number, maxGrams: number | null): string {
  if (maxGrams === null) return `${formatWeightGrams(minGrams)}+`;
  return `${formatWeightGrams(minGrams)}–${formatWeightGrams(maxGrams)}`;
}
