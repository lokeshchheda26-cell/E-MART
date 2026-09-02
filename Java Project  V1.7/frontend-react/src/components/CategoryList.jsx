import "./CategoryList.css";
import "./ProductList.css";
// One shared copy of the purchase-mode rule, also used by App.jsx's
// eMCard checkbox handler - so a card can never show an offer the
// handler then refuses (or hide one it would have accepted).
import {
    MODE,
    getEmcardCash,
    getPointsRequired,
    getRegularPrice,
    resolvePurchaseMode
} from "../utils/purchaseMode";

/**
 * CategoryList.jsx
 * ------------------------------------------------------------------
 * Two independent render modes, chosen by the parent (Home in
 * App.jsx) - never mixed together, so a user only ever sees ONE of
 * "browse categories" or "look at a product listing" at a time:
 *
 *   mode="categories" (default) - a grid of clickable category
 *   tiles (pure navigation, no pricing/EMCard on the tile itself).
 *   Used for the top-level "All Categories" view.
 *
 *   mode="products" - a flat product grid with full pricing/EMCard/
 *   Add to Cart, plus loading/error/empty states and an optional
 *   "Back to Categories" button. Used for BOTH a selected category's
 *   product listing and search results, so there is exactly one
 *   product-grid implementation in the app instead of two slightly
 *   different copies.
 * ------------------------------------------------------------------
 */
function CategoryList({
    mode = "categories",

    // ---- categories mode ----
    // variant "category" (default) renders the normal image/code/
    // status tile used for main categories. variant "brand" renders
    // a lighter tile (just the brand name, no image/status badge) -
    // used for the "pick a brand" step under a category.
    variant = "category",
    categories = [],
    categoryLabel = "All Categories",
    onCategoryClick,

    // ---- products mode ----
    products = [],
    loading = false,
    error = null,
    title = "Products",
    onBack,
    emptyTitle = "No products found",
    emptyMessage = "Try a different keyword or category.",

    // ---- shared (products mode) ----
    onAddToCart,
    onViewProduct,
    emcardSelectedIds = new Set(),
    emcardError = null,
    onEmcardToggle,
    // NOTE: an `isEmcardMember` prop is still passed by App.jsx and
    // harmlessly ignored. BUSINESS CONDITION 1 (a non-member sees the
    // MRP and nothing else) is enforced SERVER-side:
    // ProductVisibilityAdvice flattens offer_type to NORMAL and zeroes
    // cash_required/points_required for anyone who is not a signed-in
    // eMCard holder, so a non-member's products simply arrive as
    // cash-only. Gating on the client flag as well used to hide the
    // eMcard row here whenever the cached user object was stale, while
    // the Product Details page still showed it.

    // Optional brand + price-range filter bar (BRD: "filter by
    // brand and/or price range, click Go"), shown above the product
    // grid in products mode. Pass null/undefined to omit it (e.g.
    // search results, where a category-scoped filter doesn't apply).
    // Shape: { brands, brand, priceRange, priceRangeOptions,
    //   onBrandChange, onPriceRangeChange, onApply, applying }
    filterBar = null
}) {

    // =====================================================
    // CATEGORY HELPERS
    // =====================================================

    const getCardId = (item, index) =>
        item.catmasterId ??
        item.catId ??
        index;

    const getCardCode = (item) =>
        item.catId ?? "";

    const getCardName = (item) =>
        item.catName ?? "Category";

    const getCardImage = (item) =>
        item.catImagePath ?? null;


    // =====================================================
    // PRODUCT HELPERS
    // =====================================================

    const getProductId = (product, index) =>
        product.productId ??
        product.prodId ??
        index;

    const getProductName = (product) =>
        product.productName ??
        product.prodName ??
        "Product";

    const getProductDescription = (product) =>
        product.shortDescription ??
        product.prodShortDesc ??
        product.productShortDesc ??
        "";

    const getProductImage = (product) =>
        product.productImagePath ??
        product.prodImagePath ??
        null;

    // Regular Price, eMcard cash and points all come from the shared
    // purchase-mode helper (see the import above), which is the same rule
    // the Sale Banner, Product Details, Cart and Checkout follow: the
    // active sale price if a sale is running, otherwise MRP.

    // Plain numeric value only - no currency symbol, no decimals,
    // no percentage-off (per the product listing page spec).
    const formatPlainPrice = (value) =>
        Math.round(Number(value ?? 0)).toLocaleString("en-IN");

    // ---------------------------------------------------------------
    // PURCHASE MODE (Mode 1..4) - what this card is allowed to show.
    //
    // The mode comes from the BACKEND (offer_type, already flattened to
    // cash-only for non-members by ProductVisibilityAdvice):
    //
    //   CASH_ONLY          -> Regular Price only, no checkbox
    //   EMCARD_DISCOUNT    -> Regular Price + "eMcard: X" + CHECKBOX
    //   FULL_REDEMPTION    -> Regular Price + "Redeem N e-Points" + CHECKBOX
    //   PARTIAL_REDEMPTION -> Regular Price + "cash + N e-Points" + CHECKBOX
    //
    // Every mode with an offer is the shopper's choice: the card always
    // shows the Regular Price, and an un-ticked box means "pay it, spend
    // no points". Mode 1 has no offer, so no row is rendered and the
    // backend rejects a reserve call for it.
    // ---------------------------------------------------------------
    // Mode, cash and points all come from the ONE shared helper
    // (utils/purchaseMode.js), which is also what the eMCard checkbox
    // handler in App.jsx uses - so a card can never offer something the
    // handler then refuses.
    const getPurchaseMode = (product) => resolvePurchaseMode(product);

    /**
     * The eMcard offer row for a card, or null when the mode has no
     * offer to show. `optional` decides checkbox vs read-only badge.
     */
    const getEmcardInfo = (product) => {

        const mode = getPurchaseMode(product);
        const regular = Number(getRegularPrice(product));
        const cash = getEmcardCash(product);
        const points = getPointsRequired(product);

        switch (mode) {
            case MODE.EMCARD_DISCOUNT: {
                if (!(cash > 0 && cash < regular)) return null;
                return {
                    mode,
                    optional: true,
                    label: `eMcard: ${formatPlainPrice(cash)}`,
                    savings: regular - cash
                };
            }
            case MODE.FULL_REDEMPTION: {
                if (points <= 0) return null;
                // Optional, like modes 2 and 4: the card shows the
                // Regular Price until the box is ticked, then the line is
                // paid entirely in points.
                return {
                    mode,
                    optional: true,
                    label: `Redeem ${points} e-Points`
                };
            }
            case MODE.PARTIAL_REDEMPTION: {
                if (points <= 0 || cash <= 0) return null;
                // Optional, like mode 2: the card shows the Regular Price
                // until the box is ticked, then the line is charged
                // "cash + points" instead.
                return {
                    mode,
                    optional: true,
                    label: `eMcard: ${formatPlainPrice(cash)} + ${points} e-Points`,
                    savings: regular - cash
                };
            }
            default:
                // MODE 1 - cash only. No eMcard row at all.
                return null;
        }
    };


    // =====================================================
    // RENDER: CATEGORIES MODE
    // =====================================================

    if (mode === "categories") {

        const isBrandVariant = variant === "brand";

        return (
            <div className="category-section">

                <div className="category-heading">
                    <div>
                        <h2>{categoryLabel}</h2>
                        <p>
                            {loading
                                ? "Loading..."
                                : `${categories.length} ${isBrandVariant ? "brands" : "categories"} available`}
                        </p>
                    </div>

                    {onBack && (
                        <button
                            type="button"
                            className="back-to-categories-btn"
                            onClick={onBack}
                        >
                            ← Back to Categories
                        </button>
                    )}
                </div>


                {/* LOADING */}

                {loading && (
                    <div className="search-status search-status-loading">
                        <span className="spinner" aria-hidden="true" />
                        {isBrandVariant ? "Loading brands..." : "Loading categories..."}
                    </div>
                )}


                {/* ERROR */}

                {!loading && error && (
                    <div className="search-status search-status-empty">
                        <span className="search-status-icon" aria-hidden="true">⚠</span>
                        <h3>Something went wrong</h3>
                        <p>{error}</p>
                    </div>
                )}


                {/* EMPTY */}

                {!loading && !error && categories.length === 0 && (
                    <div className="empty-categories">
                        {isBrandVariant
                            ? "No brands are available in this category yet."
                            : "No categories found."}
                    </div>
                )}


                {/* GRID */}

                {!loading && !error && categories.length > 0 && (

                    <div className="category-grid">

                        {categories.map((item, index) => {

                            const cardId = getCardId(item, index);
                            const cardCode = getCardCode(item);
                            const cardName = getCardName(item);
                            const cardImage = getCardImage(item);

                            return (
                                <div
                                    className={`category-card category-card-clickable${
                                        isBrandVariant ? " brand-card" : ""
                                    }`}
                                    key={`category-${cardId}-${cardCode}-${index}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                        onCategoryClick && onCategoryClick(item)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            onCategoryClick && onCategoryClick(item);
                                        }
                                    }}
                                >

                                    {isBrandVariant ? (

                                        <div className="brand-card-inner">
                                            <span className="brand-card-icon" aria-hidden="true">
                                                🏷
                                            </span>
                                            <h3>{cardName}</h3>
                                            <span className="brand-card-hint">View products →</span>
                                        </div>

                                    ) : (

                                        <>
                                            <div className="category-image">
                                                {cardImage ? (
                                                    <img src={cardImage} alt={cardName} />
                                                ) : (
                                                    <div className="no-image">No image</div>
                                                )}
                                            </div>

                                            <div className="category-details">

                                                {cardCode && (
                                                    <span className="category-code">
                                                        {cardCode}
                                                    </span>
                                                )}

                                                <h3>{cardName}</h3>

                                                <div className="category-status">
                                                    <span
                                                        className={
                                                            item.flag !== false
                                                                ? "active-status"
                                                                : "inactive-status"
                                                        }
                                                    >
                                                        {item.flag !== false ? "Active" : "Inactive"}
                                                    </span>
                                                </div>

                                            </div>
                                        </>

                                    )}

                                </div>
                            );
                        })}

                    </div>

                )}

            </div>
        );
    }


    // =====================================================
    // RENDER: PRODUCTS MODE
    // =====================================================

    return (
        <div className="category-section">

            <div className="category-heading">

                <div>
                    <h2>{title}</h2>
                    <p>
                        {loading
                            ? "Loading..."
                            : `${products.length} products available`}
                    </p>
                </div>

                {onBack && (
                    <button
                        type="button"
                        className="back-to-categories-btn"
                        onClick={onBack}
                    >
                        ← Back to Categories
                    </button>
                )}

            </div>


            {/* BRAND + PRICE-RANGE FILTER BAR */}

            {filterBar && (
                <div className="product-filter-bar">

                    <div className="product-filter-field">
                        <label htmlFor="filter-brand">Brand</label>
                        <select
                            id="filter-brand"
                            value={filterBar.brand || ""}
                            onChange={(e) =>
                                filterBar.onBrandChange &&
                                filterBar.onBrandChange(e.target.value)
                            }
                        >
                            <option value="">All Brands</option>
                            {(filterBar.brands || []).map((b) => (
                                <option key={b} value={b}>
                                    {b}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="product-filter-field">
                        <label htmlFor="filter-price">Price Range</label>
                        <select
                            id="filter-price"
                            value={filterBar.priceRange || ""}
                            onChange={(e) =>
                                filterBar.onPriceRangeChange &&
                                filterBar.onPriceRangeChange(e.target.value)
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
                        className="product-filter-go-btn"
                        onClick={() => filterBar.onApply && filterBar.onApply()}
                        disabled={filterBar.applying}
                    >
                        {filterBar.applying ? "Applying..." : "Go"}
                    </button>

                </div>
            )}


            {/* LOADING */}

            {loading && (
                <div className="search-status search-status-loading">
                    <span className="spinner" aria-hidden="true" />
                    Loading products...
                </div>
            )}


            {/* ERROR */}

            {!loading && error && (
                <div className="search-status search-status-empty">
                    <span className="search-status-icon" aria-hidden="true">⚠</span>
                    <h3>Something went wrong</h3>
                    <p>{error}</p>
                </div>
            )}


            {/* EMPTY */}

            {!loading && !error && products.length === 0 && (
                <div className="search-status search-status-empty">
                    <span className="search-status-icon" aria-hidden="true">🔍</span>
                    <h3>{emptyTitle}</h3>
                    <p>{emptyMessage}</p>
                </div>
            )}


            {/* PRODUCT GRID */}

            {!loading && !error && products.length > 0 && (

                <div className="products-section">

                    <div className="product-grid">

                        {products.map((product, index) => {

                            const productId = getProductId(product, index);
                            const productName = getProductName(product);
                            const image = getProductImage(product);
                            const description = getProductDescription(product);
                            const regularPrice = getRegularPrice(product);
                            const emcardInfo = getEmcardInfo(product);
                            const isEmcardSelected = emcardSelectedIds.has(String(productId));

                            return (

                                <div
                                    className="product-card product-card-clickable"
                                    key={`product-${productId}`}
                                    onClick={() =>
                                        onViewProduct && onViewProduct(product)
                                    }
                                >

                                    <div className="product-image">
                                        {image ? (
                                            <img src={image} alt={productName} />
                                        ) : (
                                            <div className="product-placeholder">📦</div>
                                        )}
                                    </div>

                                    <div className="product-info">

                                        <div className="product-name-box">
                                            <h3>{productName}</h3>
                                        </div>

                                        <p>{description}</p>

                                        <div className="regular-price-row">
                                            <span className="regular-price-label">
                                                Regular Price
                                            </span>
                                            <span className="regular-price-value">
                                                {formatPlainPrice(regularPrice)}
                                            </span>
                                        </div>

                                        {emcardInfo && (
                                            <div
                                                className="emcard-price-row"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {/* Every offer mode is the
                                                    shopper's choice, so the card
                                                    carries the same checkbox the
                                                    Product Details page does. The
                                                    badge below is only a fallback
                                                    for a non-optional offer. */}
                                                {emcardInfo.optional ? (
                                                    <>
                                                        <label className="emcard-price-label">
                                                            <input
                                                                type="checkbox"
                                                                checked={isEmcardSelected}
                                                                onChange={(e) =>
                                                                    onEmcardToggle &&
                                                                    onEmcardToggle(
                                                                        product,
                                                                        e.target.checked
                                                                    )
                                                                }
                                                            />
                                                            <span>{emcardInfo.label}</span>
                                                        </label>

                                                        {emcardInfo.savings > 0 && (
                                                            <span className="emcard-savings-note">
                                                                {isEmcardSelected
                                                                    ? "You save "
                                                                    : "Save "}
                                                                {formatPlainPrice(
                                                                    emcardInfo.savings
                                                                )}
                                                                {" with EMCard"}
                                                            </span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="emcard-mode-badge">
                                                        <span className="emcard-mode-value">
                                                            {emcardInfo.label}
                                                        </span>
                                                        {emcardInfo.note && (
                                                            <span className="emcard-mode-note">
                                                                {emcardInfo.note}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {emcardError?.productId ===
                                                    String(productId) && (
                                                    <div className="emcard-error">
                                                        ⚠ {emcardError.message}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <button
                                            className="add-cart-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddToCart && onAddToCart(product);
                                            }}
                                        >
                                            Add to Cart
                                        </button>

                                    </div>

                                </div>
                            );
                        })}

                    </div>

                </div>

            )}

        </div>
    );
}

export default CategoryList;
