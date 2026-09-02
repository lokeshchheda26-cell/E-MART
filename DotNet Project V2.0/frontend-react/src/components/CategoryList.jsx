import ProductCard from "./ProductCard";
import ProductImage from "./ui/ProductImage";
import {
  EmptyState,
  ErrorState,
  ProductGridSkeleton,
  CategoryTilesSkeleton,
} from "./ui/Feedback";
import { getProductId } from "../utils/product";
import "./CategoryList.css";
import "./ProductList.css";

/**
 * CategoryList.jsx
 * ------------------------------------------------------------------
 * The listing surface, in two mutually exclusive modes chosen by the
 * parent - a shopper only ever sees ONE of "browse" or "results":
 *
 *   mode="categories"  a grid of navigation tiles.
 *       variant="category"  main-category tiles (image, name, item count)
 *       variant="brand"     the lighter "pick a brand" step
 *
 *   mode="products"    the product grid, with an optional brand/price
 *                      filter bar, used by BOTH category listings and
 *                      search results so there is exactly one product-grid
 *                      implementation in the app.
 *
 * WHAT CHANGED: the ~200 lines of product-card markup that used to be
 * inlined here now live in ProductCard.jsx, and the eight eMCard props that
 * were threaded through this component are gone - the card reads them from
 * EmcardContext directly. This component is back to doing one job: choosing
 * between loading, error, empty and content, and laying the results out.
 * ------------------------------------------------------------------
 */
function CategoryList({
  mode = "categories",

  // ---- categories mode ----
  variant = "category",
  categories = [],
  onCategoryClick,

  // ---- products mode ----
  products = [],
  loading = false,
  error = null,
  onRetry = null,
  onBack,
  backLabel = "Back",
  emptyTitle = "No products found",
  emptyMessage = "Try a different keyword or category.",
  onViewProduct,

  // Optional brand + price-range filter bar (BRD: "filter by brand and/or
  // price range, click Go"). Pass null to omit it - e.g. on search results,
  // where a category-scoped filter does not apply.
  // { brands, brand, priceRange, priceRangeOptions, onBrandChange,
  //   onPriceRangeChange, onApply, applying }
  filterBar = null,

  // Rendered above the grid - used for the results count / heading row.
  header = null,
}) {
  const isBrandVariant = variant === "brand";

  /* ===================================================================
     CATEGORIES / BRANDS
     =================================================================== */

  if (mode === "categories") {
    return (
      <div className="listing">
        {header}

        {loading && <CategoryTilesSkeleton count={isBrandVariant ? 8 : 6} />}

        {!loading && error && <ErrorState message={error} onRetry={onRetry} />}

        {!loading && !error && categories.length === 0 && (
          <EmptyState
            icon={isBrandVariant ? "bi-tags" : "bi-grid"}
            title={isBrandVariant ? "No brands yet" : "No categories yet"}
            message={
              isBrandVariant
                ? "There are no brands with active products in this category right now."
                : "The catalogue is empty at the moment. Please check back soon."
            }
            action={
              onBack ? (
                <button type="button" className="ui-btn ui-btn--outline" onClick={onBack}>
                  <i className="bi bi-arrow-left" aria-hidden="true" />
                  <span>{backLabel}</span>
                </button>
              ) : null
            }
          />
        )}

        {!loading && !error && categories.length > 0 && (
          <div className={isBrandVariant ? "brand-grid" : "cat-tiles"}>
            {categories.map((item, index) => {
              const id = item.catmasterId ?? item.catId ?? index;
              const name = item.catName ?? "Category";
              const image = item.catImagePath ?? null;

              if (isBrandVariant) {
                return (
                  <button
                    type="button"
                    key={`brand-${id}-${index}`}
                    className="brand-tile"
                    onClick={() => onCategoryClick?.(item)}
                  >
                    <span className="brand-tile__name">{name}</span>
                    <span className="brand-tile__hint">
                      View products{" "}
                      <i className="bi bi-arrow-right" aria-hidden="true" />
                    </span>
                  </button>
                );
              }

              return (
                <button
                  type="button"
                  key={`category-${id}-${index}`}
                  className="cat-tile"
                  onClick={() => onCategoryClick?.(item)}
                >
                  <span className="cat-tile__media">
                    <ProductImage src={image} icon="bi-basket" placeholderClassName="" />
                  </span>
                  <span className="cat-tile__name">{name}</span>
                  {item.count != null && (
                    <span className="cat-tile__count">
                      {item.count} {item.count === 1 ? "range" : "ranges"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ===================================================================
     PRODUCTS
     =================================================================== */

  return (
    <div className="listing">
      {header}

      {/* ---------------------------------------------- FILTER BAR ---- */}
      {filterBar && (
        <div className="filter-bar">
          <div className="filter-bar__field">
            <label className="filter-bar__label" htmlFor="filter-brand">
              Brand
            </label>
            <select
              id="filter-brand"
              className="ui-select"
              value={filterBar.brand || ""}
              onChange={(event) => filterBar.onBrandChange?.(event.target.value)}
            >
              <option value="">All brands</option>
              {(filterBar.brands || []).map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-bar__field">
            <label className="filter-bar__label" htmlFor="filter-price">
              Price range
            </label>
            <select
              id="filter-price"
              className="ui-select"
              value={filterBar.priceRange || ""}
              onChange={(event) =>
                filterBar.onPriceRangeChange?.(event.target.value)
              }
            >
              {(filterBar.priceRangeOptions || []).map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="ui-btn ui-btn--primary filter-bar__apply"
            onClick={() => filterBar.onApply?.()}
            disabled={filterBar.applying}
            aria-busy={filterBar.applying || undefined}
          >
            {filterBar.applying ? (
              <span className="ui-btn__spinner" aria-hidden="true" />
            ) : (
              <i className="bi bi-funnel" aria-hidden="true" />
            )}
            <span>{filterBar.applying ? "Applying..." : "Apply filters"}</span>
          </button>
        </div>
      )}

      {loading && <ProductGridSkeleton count={8} />}

      {!loading && error && <ErrorState message={error} onRetry={onRetry} />}

      {!loading && !error && products.length === 0 && (
        <EmptyState
          icon="bi-search"
          title={emptyTitle}
          message={emptyMessage}
          action={
            onBack ? (
              <button type="button" className="ui-btn ui-btn--primary" onClick={onBack}>
                <i className="bi bi-arrow-left" aria-hidden="true" />
                <span>{backLabel}</span>
              </button>
            ) : null
          }
        />
      )}

      {!loading && !error && products.length > 0 && (
        <div className="product-grid">
          {products.map((product, index) => (
            <ProductCard
              key={`product-${getProductId(product) ?? index}`}
              product={product}
              onView={onViewProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CategoryList;
