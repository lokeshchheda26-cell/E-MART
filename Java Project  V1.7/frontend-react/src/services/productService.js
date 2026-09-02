import api from "../api/axiosConfig";
import { ENDPOINTS } from "../api/endpoints";

export const getAllProducts = () => api.get(ENDPOINTS.PRODUCT);

export const getProductsBySubCategory = (subcatMasterId) =>
  api.get(`${ENDPOINTS.PRODUCT}/subcategory/${subcatMasterId}`);

// Active-only products directly under a main category - powers the
// "click a category, see a clean product listing" flow.
export const getProductsByCategory = (catmasterId) =>
  api.get(`${ENDPOINTS.PRODUCT}/category/${catmasterId}`);

// Distinct active brand names under a main category - powers the
// "Category -> Brand" drill-down step.
export const getBrandsByCategory = (catmasterId) =>
  api.get(`${ENDPOINTS.PRODUCT}/category/${catmasterId}/brands`);

// Active-only products for a main category + brand combination -
// powers the "Brand -> Products" step. `brand` is sent as a query
// param (axios encodes it), so brand names with spaces/special
// characters (e.g. "One Plus") are handled safely.
export const getProductsByCategoryAndBrand = (catmasterId, brand) =>
  api.get(`${ENDPOINTS.PRODUCT}/category/${catmasterId}/brand`, {
    params: { brand }
  });

// The database has no dedicated "main category" table - the real
// main category is the group of Category rows sharing the same
// catId code (e.g. "ELE"). These two hit the group-based endpoints
// so "Main Category -> Brand -> Products" works against that real
// grouping key instead of one leaf Category row at a time.
export const getBrandsByCategoryGroup = (catId) =>
  api.get(`${ENDPOINTS.PRODUCT}/category-group/${catId}/brands`);

export const getProductsByCategoryGroupAndBrand = (catId, brand) =>
  api.get(`${ENDPOINTS.PRODUCT}/category-group/${catId}/brand`, {
    params: { brand }
  });

// Combined brand + price-range filter within a main-category group,
// per the BRD's "filter by brand and/or price range, click Go".
// Every param is optional except catId - pass undefined/null to
// leave a filter off.
export const filterProductsByCategoryGroup = (catId, { brand, minPrice, maxPrice } = {}) =>
  api.get(`${ENDPOINTS.PRODUCT}/category-group/${catId}/filter`, {
    params: { brand, minPrice, maxPrice }
  });

export const getProductDetails = (productId) =>
  api.get(`${ENDPOINTS.PRODUCT}/${productId}/details`);

// Case-insensitive, partial-match search across product name,
// description, brand, category and subcategory. `q` is sent as a
// query param (axios encodes it), never concatenated into the URL,
// so special characters are handled safely.
export const searchProducts = (q) =>
  api.get(`${ENDPOINTS.PRODUCT}/search`, { params: { q } });

// Homepage Sale Banner: one random, currently-active on-sale product,
// picked server-side (DB-level ORDER BY RAND() LIMIT 1 - see
// ProductRepository.findRandomActiveSaleProduct) so no product list
// is ever fetched just to be randomized/discarded client-side.
// Resolves with `data: null` (204 No Content) when nothing is on
// sale right now - callers should treat that as "hide the banner",
// not as an error.
export const getRandomSaleProduct = () =>
  api.get(`${ENDPOINTS.PRODUCT}/sale-random`);
