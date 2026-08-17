/**
 * Promotions' decimal columns (`discount_value`, `get_y_discount_percentage`,
 * `numeric_value`) are `decimal:4`/`decimal:2` casts on the backend — real
 * fixed-precision strings like `"10.0000"` or `"50.0000"`, not the raw
 * merchant-entered figure. Trim trailing zeros (and a bare trailing `.`) for
 * display so a 10% promotion reads "10%", not "10.0000%" — mirrors Pricing's
 * own `formatCurrency` precedent of never showing a backend cast's raw
 * precision straight through to a merchant.
 */
export function formatDecimal(value: string): string {
  if (!value.includes('.')) return value;
  return value.replace(/0+$/, '').replace(/\.$/, '');
}
