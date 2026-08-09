/**
 * Client-side slug **preview** only — a UX convenience, not a new backend
 * capability. `CreateProductRequest`/`UpdateProductRequest` already treat
 * `slug` as optional (apps/backend auto-generates one from `name` when it's
 * omitted); this function exists purely so a merchant sees, live, roughly
 * what URL they'll get, before ever saving. The value actually persisted
 * always comes from the server when the field is left on "auto" — this
 * preview is never sent as if it were the server's own algorithm.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritical marks NFKD produces (e.g. "é" -> "e" + mark)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255);
}
