import type { Product } from './services';

/**
 * Option shapes the backend can attach to a product. The dashboard POS reads
 * exactly these fields (`menuVariants` / `menu_variants` / `sizes` / `colors`),
 * so the marketplace must recognise the same names or quick-add would silently
 * add a product that still needs the customer to pick a size or colour.
 */
const nonEmpty = (value: unknown): boolean => Array.isArray(value) && value.length > 0;

/** True when the product carries variants a customer must choose before adding. */
export function productHasOptions(product: Product): boolean {
  const p = product as Product & {
    menuVariants?: unknown;
    menu_variants?: unknown;
    sizes?: unknown;
    colors?: unknown;
  };
  return (
    nonEmpty(p.menuVariants) || nonEmpty(p.menu_variants) || nonEmpty(p.sizes) || nonEmpty(p.colors)
  );
}
