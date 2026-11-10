export type CatalogProductLike = Record<string, any>;

/** Resolve image URLs from all catalog payload shapes used by legacy and new APIs. */
export function getCatalogProductImage(product: CatalogProductLike | undefined, index = 0): string {
  if (!product) return '';
  const images = Array.isArray(product.images) ? product.images : [];
  const imageFromArray = images
    .map((image: any) =>
      typeof image === 'string' ? image : image?.url || image?.src || image?.imageUrl || ''
    )
    .find(Boolean);
  return String(
    product.imageUrl ||
      product.image_url ||
      product.image ||
      product.thumbnailUrl ||
      product.thumbnail ||
      product.photo ||
      imageFromArray ||
      (index > 0 ? images[index] : '') ||
      ''
  );
}

/** Resolve the human-readable category from old and new product payloads. */
export function getCatalogProductCategory(product: CatalogProductLike | undefined): string {
  if (!product) return '';
  const category = product.category;
  if (typeof category === 'string') return category.trim();
  if (category && typeof category === 'object') {
    return String(category.name || category.title || category.label || category.slug || '').trim();
  }
  return String(
    product.categoryName ||
      product.category_name ||
      product.categoryTitle ||
      product.groupName ||
      ''
  ).trim();
}

/** Make one stable product shape for builder preview and the published site. */
export function normalizeCatalogProduct(
  product: CatalogProductLike,
  index = 0
): CatalogProductLike {
  const image = getCatalogProductImage(product, index);
  const category = getCatalogProductCategory(product);
  const images = Array.isArray(product.images)
    ? product.images
        .map((item: any) =>
          typeof item === 'string' ? item : item?.url || item?.src || item?.imageUrl || ''
        )
        .filter(Boolean)
    : image
      ? [image]
      : [];
  return {
    ...product,
    id: product.id || product.productId,
    name: product.name || product.title || `منتج ${index + 1}`,
    title: product.title || product.name || `منتج ${index + 1}`,
    image,
    imageUrl: product.imageUrl || image,
    images,
    category,
    description: product.description || product.subtitle || '',
  };
}

/** Build tabs and a cover image for each category. Explicit overrides win. */
export function buildCatalogCategories(
  products: CatalogProductLike[],
  overrides: Record<string, string> = {}
): Array<{ key: string; label: string; image: string; count: number }> {
  const grouped = new Map<string, CatalogProductLike[]>();
  products.forEach((product, index) => {
    const normalized = normalizeCatalogProduct(product, index);
    const category = normalized.category || 'other';
    const list = grouped.get(category) || [];
    list.push(normalized);
    grouped.set(category, list);
  });
  return Array.from(grouped.entries()).map(([key, items]) => ({
    key,
    label: key === 'other' ? 'أخرى' : key,
    image: overrides[key] || getCatalogProductImage(items[0]),
    count: items.length,
  }));
}
