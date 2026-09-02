/**
 * Product field accessors - ONE copy of the "which field name is it this
 * time" logic.
 *
 * The API returns product-shaped objects from several different endpoints
 * (catalogue listing, search, product details, cart lines, sale banner) and
 * they do not all agree on field names: a product id is `productId` in most
 * responses but `prodId` in others, a name is `productName` or `prodName`,
 * and so on. That fallback chain was previously copy-pasted into
 * CategoryList, ProductCard, CartDrawer, SaleBanner and App.jsx - five
 * places that had already started to drift apart from each other.
 *
 * Centralising it means a new response shape is handled in one edit, and
 * every surface of the app resolves the same product to the same id.
 */

/** Stable identifier for a product, cart line or order item. */
export const getProductId = (product) =>
  product?.productId ?? product?.prodId ?? null;

/** Same as getProductId but always a string - safe as a Set/Map key. */
export const getProductKey = (product) => String(getProductId(product));

export const getProductName = (product) =>
  product?.productName ?? product?.prodName ?? "Product";

export const getProductImage = (product) =>
  product?.productImagePath ?? product?.prodImagePath ?? null;

export const getProductDescription = (product) =>
  product?.shortDescription ??
  product?.prodShortDesc ??
  product?.productShortDesc ??
  "";

export const getProductBrand = (product) => product?.brand ?? null;

/**
 * Stock is optional in several responses. `null` stock means "not tracked",
 * which the storefront treats as available rather than as out of stock -
 * matching the behaviour the product details page already had.
 */
export function getStockInfo(product) {
  const stock = product?.stock;
  const known = stock !== null && stock !== undefined;
  return {
    known,
    quantity: known ? Number(stock) : null,
    inStock: !known || Number(stock) > 0,
    lowStock: known && Number(stock) > 0 && Number(stock) <= 5,
  };
}

/**
 * Ratings are only present on some product payloads. Returning null (rather
 * than a fabricated default) lets the UI omit the rating entirely instead of
 * inventing "0 stars" for a product the backend has no rating data for.
 */
export function getRating(product) {
  const value = product?.rating ?? product?.averageRating ?? null;
  if (value == null) return null;

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  return {
    value: numeric,
    count: Number(product?.ratingCount ?? product?.reviewCount ?? 0) || null,
  };
}
