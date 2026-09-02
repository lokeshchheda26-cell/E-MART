import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useCatalog } from "../context/CatalogContext";
import { useEmcard } from "../context/EmcardContext";
import { useApi } from "../hooks/useApi";

import CategoryList from "../components/CategoryList";
import ProductCard from "../components/ProductCard";
import ProductDetails from "../components/ProductDetails";
import SaleBanner from "../components/SaleBanner";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Button from "../components/ui/Button";
import SectionHeader from "../components/ui/SectionHeader";
import { EmcardVisual } from "../components/ui/Loyalty";
import {
  CategoryTilesSkeleton,
  ErrorState,
  ProductGridSkeleton,
} from "../components/ui/Feedback";

import {
  getAllProducts,
  searchProducts,
  getBrandsByCategoryGroup,
  getProductsByCategoryGroupAndBrand,
  filterProductsByCategoryGroup,
} from "../services/productService";
import { getProductId } from "../utils/product";
import { getMrp, getRegularPrice, isSaleActive } from "../utils/purchaseMode";

/**
 * Home.jsx
 * ------------------------------------------------------------------
 * The storefront landing page.
 *
 * This was previously a ~1300-line Home() function living inside App.jsx,
 * which also carried its own header, category strip, sidebar, footer, the
 * whole eMCard reservation layer and the cart drawer. Those have all moved
 * to where they belong (the shared site chrome, EmcardContext, and a
 * globally-mounted CartDrawer), leaving this file to do one job: decide
 * what the shopper is looking at, and lay it out.
 *
 * TWO MODES, never both at once:
 *
 *   STOREFRONT - hero, categories, deals, product rails, the eMCard pitch.
 *                What a visitor arriving at "/" should see.
 *
 *   BROWSE     - the results region. Shown the moment there is a search, a
 *                selected category, or an open product. Marketing bands are
 *                hidden entirely, so nobody scrolls past promotional
 *                content to reach the products they asked for.
 *
 * URL AS STATE - `?search=`, `?category=` and `?product=` now drive the
 * view. That is what makes the browser Back button work (previously it did
 * nothing on a product page), makes a category or a product shareable, and
 * lets the header's category navigation work from any route by simply
 * linking to "/?category=XYZ".
 *
 * The catalogue/search/filter API calls and their behaviour are unchanged.
 * ------------------------------------------------------------------
 */

// Preset price bands for the listing filter (BRD: "filter by brand and/or
// price range, click Go"). A dropdown of ranges rather than free-text
// min/max inputs keeps refining a result a single click. `undefined` means
// "no bound" - matching filterProductsByCategoryGroup's optional params.
const PRICE_RANGES = [
  { value: "", label: "All prices", min: undefined, max: undefined },
  { value: "0-500", label: "Under ₹500", min: undefined, max: 500 },
  { value: "500-1000", label: "₹500 – ₹1,000", min: 500, max: 1000 },
  { value: "1000-2000", label: "₹1,000 – ₹2,000", min: 1000, max: 2000 },
  { value: "2000-5000", label: "₹2,000 – ₹5,000", min: 2000, max: 5000 },
  { value: "5000+", label: "Above ₹5,000", min: 5000, max: undefined },
];

const RAIL_SIZE = 8;

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const { openCart } = useCart();
  const {
    categoryGroups,
    findGroup,
    loading: catalogLoading,
    error: catalogError,
    reload: reloadCatalog,
  } = useCatalog();
  const { emcardTotalPoints, isEmcardMember } = useEmcard();

  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get("search") || "";
  const categoryParam = searchParams.get("category") || "";
  const selectedProductId = searchParams.get("product") || null;

  /* =====================================================================
     CATALOGUE FOR THE HOME RAILS
     One fetch, shared with the hero deal card below - the sale banner used
     to make its own identical request on every visit.
     ===================================================================== */

  const fetchProducts = useCallback(() => getAllProducts(), []);
  const { data: allProducts, loading: productsLoading } = useApi(
    fetchProducts,
    [],
    { initialData: [] }
  );

  /* =====================================================================
     BROWSE STATE
     ===================================================================== */

  // null = no category open. Otherwise:
  //   { type: "brands",         categoryId, categoryName }
  //   { type: "brand-products", categoryId, categoryName, brand }
  const [categoryView, setCategoryView] = useState(null);

  const [brands, setBrands] = useState([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsError, setBrandsError] = useState(null);

  const [categoryProducts, setCategoryProducts] = useState([]);
  const [categoryProductsLoading, setCategoryProductsLoading] = useState(false);
  const [categoryProductsError, setCategoryProductsError] = useState(null);

  const [filterBrand, setFilterBrand] = useState("");
  const [filterPriceRange, setFilterPriceRange] = useState("");

  // null = no search active. An array (even empty) = a search completed.
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  /* =====================================================================
     SEARCH
     Only ever runs for an explicit query in the URL - typing in the header
     search box does not touch the network until it is submitted.
     ===================================================================== */

  const runSearch = useCallback((rawQuery) => {
    const trimmed = (rawQuery ?? "").trim();

    if (!trimmed) {
      setSearchResults(null);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    searchProducts(trimmed)
      .then((response) => setSearchResults(response.data || []))
      .catch((error) => {
        console.error("Error searching products:", error);
        setSearchResults([]);
        setSearchError(
          "We couldn't complete your search. Please check your connection and try again."
        );
      })
      .finally(() => setSearchLoading(false));
  }, []);

  useEffect(() => {
    runSearch(searchQuery);
  }, [searchQuery, runSearch]);

  /* =====================================================================
     CATEGORY -> BRANDS
     ===================================================================== */

  const openCategoryGroup = useCallback((group) => {
    const catId = group.catId;
    const categoryName = group.catName || catId;

    setCategoryView({ type: "brands", categoryId: catId, categoryName });

    // A fresh main category means the previous filter selection no longer
    // applies.
    setFilterBrand("");
    setFilterPriceRange("");
    setCategoryProducts([]);
    setCategoryProductsError(null);

    setBrands([]);
    setBrandsLoading(true);
    setBrandsError(null);

    getBrandsByCategoryGroup(catId)
      .then((response) => setBrands(response.data || []))
      .catch((error) => {
        console.error("Error loading brands:", error);
        setBrands([]);
        setBrandsError(
          "We couldn't load brands for this category. Please try again."
        );
      })
      .finally(() => setBrandsLoading(false));
  }, []);

  // Opens whatever category the URL asks for. Guarded so drilling from
  // brands into brand-products (which keeps the same categoryId) does not
  // re-trigger the brand fetch.
  const openedCategoryRef = useRef(null);

  useEffect(() => {
    if (!categoryParam) {
      openedCategoryRef.current = null;
      setCategoryView(null);
      setBrands([]);
      setBrandsError(null);
      setCategoryProducts([]);
      setCategoryProductsError(null);
      return;
    }

    if (catalogLoading) return;
    if (openedCategoryRef.current === categoryParam) return;

    const group = findGroup(categoryParam);
    if (!group) return;

    openedCategoryRef.current = categoryParam;
    openCategoryGroup(group);
  }, [categoryParam, catalogLoading, findGroup, openCategoryGroup]);

  /* =====================================================================
     BRAND -> PRODUCTS
     ===================================================================== */

  const handleBrandClick = (brand) => {
    if (!categoryView || categoryView.type !== "brands") return;

    const { categoryId, categoryName } = categoryView;

    setCategoryView({
      type: "brand-products",
      categoryId,
      categoryName,
      brand,
    });

    // Seed the filter bar to match the brand just clicked - the filter is a
    // refinement on top of this listing, not a separate flow.
    setFilterBrand(brand || "");
    setFilterPriceRange("");

    setCategoryProducts([]);
    setCategoryProductsLoading(true);
    setCategoryProductsError(null);

    getProductsByCategoryGroupAndBrand(categoryId, brand)
      .then((response) => setCategoryProducts(response.data || []))
      .catch((error) => {
        console.error("Error loading brand products:", error);
        setCategoryProducts([]);
        setCategoryProductsError(
          "We couldn't load products for this brand. Please try again."
        );
      })
      .finally(() => setCategoryProductsLoading(false));
  };

  /* =====================================================================
     APPLY BRAND / PRICE FILTER
     Combines both selections against the open category via the single
     filter endpoint. Either can be left at its "All" default.
     ===================================================================== */

  const handleApplyFilter = () => {
    if (!categoryView || categoryView.type !== "brand-products") return;

    const { categoryId, categoryName } = categoryView;
    const range =
      PRICE_RANGES.find((r) => r.value === filterPriceRange) || PRICE_RANGES[0];

    setCategoryView({
      type: "brand-products",
      categoryId,
      categoryName,
      brand: filterBrand || null,
    });

    setCategoryProducts([]);
    setCategoryProductsLoading(true);
    setCategoryProductsError(null);

    filterProductsByCategoryGroup(categoryId, {
      brand: filterBrand || undefined,
      minPrice: range.min,
      maxPrice: range.max,
    })
      .then((response) => setCategoryProducts(response.data || []))
      .catch((error) => {
        console.error("Error filtering products:", error);
        setCategoryProducts([]);
        setCategoryProductsError("We couldn't apply that filter. Please try again.");
      })
      .finally(() => setCategoryProductsLoading(false));
  };

  /* =====================================================================
     NAVIGATION HELPERS
     Every one of these writes to the URL rather than to local state, so the
     Back button retraces the shopper's actual path.
     ===================================================================== */

  const updateParams = (mutate) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        mutate(next);
        return next;
      },
      { replace: false }
    );
  };

  const goToCategory = (group) =>
    updateParams((params) => {
      params.set("category", group.catId);
      params.delete("product");
      params.delete("search");
    });

  const goToAllCategories = () =>
    updateParams((params) => {
      params.delete("category");
      params.delete("product");
      params.delete("search");
    });

  const handleViewProduct = (product) =>
    updateParams((params) => params.set("product", String(getProductId(product))));

  const handleBackFromDetails = () =>
    updateParams((params) => params.delete("product"));

  const handleBackToBrands = () => {
    if (!categoryView) return;
    const { categoryId, categoryName } = categoryView;
    setCategoryView({ type: "brands", categoryId, categoryName });
    setCategoryProducts([]);
    setCategoryProductsError(null);
  };

  const handleClearSearch = () =>
    updateParams((params) => params.delete("search"));

  // "Buy now" adds the item (handled inside ProductDetails) and then brings
  // the cart forward, so the next step is obvious.
  const handleBuyNow = () => {
    handleBackFromDetails();
    openCart();
  };

  /* =====================================================================
     DERIVED CONTENT FOR THE STOREFRONT RAILS
     All of it from real catalogue data - nothing invented. There is no
     popularity or bestseller field on the API, so the rails are framed as
     what they actually are: biggest savings, and newest additions.
     ===================================================================== */

  const products = useMemo(() => allProducts || [], [allProducts]);

  const dealProducts = useMemo(
    () =>
      products
        .filter((product) => isSaleActive(product))
        .sort((a, b) => {
          const discount = (p) => {
            const mrp = getMrp(p);
            return mrp > 0 ? (mrp - getRegularPrice(p)) / mrp : 0;
          };
          return discount(b) - discount(a);
        })
        .slice(0, RAIL_SIZE),
    [products]
  );

  const savingsProducts = useMemo(
    () =>
      products
        .filter((product) => {
          const mrp = getMrp(product);
          const cash = Number(
            product.cardholderPrice ?? product.cardholdersPrice ?? mrp
          );
          return mrp > 0 && cash > 0 && cash < mrp && !isSaleActive(product);
        })
        .sort((a, b) => {
          const saving = (p) =>
            getMrp(p) -
            Number(p.cardholderPrice ?? p.cardholdersPrice ?? getMrp(p));
          return saving(b) - saving(a);
        })
        .slice(0, RAIL_SIZE),
    [products]
  );

  const newestProducts = useMemo(
    () =>
      [...products]
        .sort((a, b) => Number(getProductId(b)) - Number(getProductId(a)))
        .slice(0, RAIL_SIZE),
    [products]
  );

  /* =====================================================================
     WHICH MODE ARE WE IN?
     ===================================================================== */

  const isSearching = searchResults !== null || Boolean(searchQuery);
  const isBrowsing =
    Boolean(selectedProductId) || Boolean(categoryView) || isSearching;

  /* =====================================================================
     BREADCRUMBS
     ===================================================================== */

  const breadcrumbs = useMemo(() => {
    const trail = [{ label: "Home", onClick: goToAllCategories }];

    if (isSearching) {
      trail.push({ label: `Search: "${searchQuery}"` });
    } else if (categoryView) {
      if (categoryView.type === "brand-products") {
        trail.push({
          label: categoryView.categoryName,
          onClick: handleBackToBrands,
        });
        trail.push({ label: categoryView.brand || "All brands" });
      } else {
        trail.push({ label: categoryView.categoryName });
      }
    }

    if (selectedProductId) trail.push({ label: "Product" });

    return trail;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching, searchQuery, categoryView, selectedProductId]);

  /* =====================================================================
     RENDER - BROWSE MODE
     ===================================================================== */

  if (isBrowsing) {
    return (
      <div className="container-page browse">
        <Breadcrumbs items={breadcrumbs} />

        {/* ---------------------------------------------- PRODUCT PAGE */}
        {selectedProductId ? (
          <ProductDetails
            productId={selectedProductId}
            onBack={handleBackFromDetails}
            onBuyNow={handleBuyNow}
          />
        ) : isSearching ? (
          /* ------------------------------------------ SEARCH RESULTS */
          <CategoryList
            mode="products"
            products={searchResults || []}
            loading={searchLoading}
            error={searchError}
            onRetry={() => runSearch(searchQuery)}
            onViewProduct={handleViewProduct}
            onBack={handleClearSearch}
            backLabel="Clear search"
            emptyTitle={`No results for "${searchQuery}"`}
            emptyMessage="Check the spelling, try a more general word, or browse the categories instead."
            header={
              <div className="browse__head">
                <div>
                  <h1 className="browse__title">Search results</h1>
                  <p className="browse__meta">
                    {searchLoading
                      ? "Searching..."
                      : `${(searchResults || []).length} ${
                          (searchResults || []).length === 1
                            ? "product"
                            : "products"
                        } matching "${searchQuery}"`}
                  </p>
                </div>
                <Button variant="ghost" icon="bi-x-lg" onClick={handleClearSearch}>
                  Clear search
                </Button>
              </div>
            }
          />
        ) : categoryView?.type === "brands" ? (
          /* -------------------------------------------- BRAND PICKER */
          <CategoryList
            mode="categories"
            variant="brand"
            categories={brands.map((brand) => ({ catName: brand }))}
            loading={brandsLoading}
            error={brandsError}
            onCategoryClick={(item) => handleBrandClick(item.catName)}
            onBack={goToAllCategories}
            backLabel="All categories"
            header={
              <div className="browse__head">
                <div>
                  <h1 className="browse__title">{categoryView.categoryName}</h1>
                  <p className="browse__meta">
                    {brandsLoading
                      ? "Loading brands..."
                      : `Choose from ${brands.length} ${
                          brands.length === 1 ? "brand" : "brands"
                        }`}
                  </p>
                </div>
                <Button variant="ghost" icon="bi-arrow-left" onClick={goToAllCategories}>
                  All categories
                </Button>
              </div>
            }
          />
        ) : (
          /* ------------------------------------------ BRAND PRODUCTS */
          <CategoryList
            mode="products"
            products={categoryProducts}
            loading={categoryProductsLoading}
            error={categoryProductsError}
            onRetry={handleApplyFilter}
            onViewProduct={handleViewProduct}
            onBack={handleBackToBrands}
            backLabel="Back to brands"
            emptyTitle="Nothing matches that filter"
            emptyMessage={
              categoryView?.brand
                ? `There are no active ${categoryView.brand} products in ${categoryView.categoryName} right now.`
                : `No products match that filter in ${categoryView?.categoryName} yet.`
            }
            filterBar={{
              brands,
              brand: filterBrand,
              priceRange: filterPriceRange,
              priceRangeOptions: PRICE_RANGES,
              onBrandChange: setFilterBrand,
              onPriceRangeChange: setFilterPriceRange,
              onApply: handleApplyFilter,
              applying: categoryProductsLoading,
            }}
            header={
              <div className="browse__head">
                <div>
                  <h1 className="browse__title">
                    {categoryView?.categoryName}
                    {categoryView?.brand ? ` · ${categoryView.brand}` : ""}
                  </h1>
                  <p className="browse__meta">
                    {categoryProductsLoading
                      ? "Loading products..."
                      : `${categoryProducts.length} ${
                          categoryProducts.length === 1 ? "product" : "products"
                        } available`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  icon="bi-arrow-left"
                  onClick={handleBackToBrands}
                >
                  Back to brands
                </Button>
              </div>
            }
          />
        )}
      </div>
    );
  }

  /* =====================================================================
     RENDER - STOREFRONT MODE
     ===================================================================== */

  return (
    <>
      {/* ---------------------------------------------------------- HERO */}
      <section className="hero">
        <div className="container-page hero__inner">
          <div>
            <span className="hero__eyebrow">
              <i className="bi bi-lightning-charge-fill" aria-hidden="true" />
              Fast delivery · Everyday low prices
            </span>

            <h1 className="hero__title">
              Everything you need, <em>at a price that adds up</em>
            </h1>

            <p className="hero__text">
              Groceries, electronics, beverages and daily essentials — with an
              e-Mcard loyalty programme that pays you back on every eligible
              order.
            </p>

            <div className="hero__actions">
              <Button
                variant="accent"
                size="lg"
                iconEnd="bi-arrow-right"
                onClick={() =>
                  document
                    .getElementById("shop-categories")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                Start shopping
              </Button>

              {!isEmcardMember && (
                <Button variant="outline" size="lg" icon="bi-gift" to="/emcard/join">
                  Join e-Mcard free
                </Button>
              )}
            </div>

            <div className="hero__stats">
              <div>
                <div className="hero__stat-value">
                  {catalogLoading ? "—" : categoryGroups.length}
                </div>
                <div className="hero__stat-label">Categories</div>
              </div>
              <div>
                <div className="hero__stat-value">
                  {productsLoading ? "—" : products.length}
                </div>
                <div className="hero__stat-label">Products in stock</div>
              </div>
              <div>
                <div className="hero__stat-value">₹499</div>
                <div className="hero__stat-label">Free delivery over</div>
              </div>
            </div>
          </div>

          <SaleBanner
            onViewProduct={handleViewProduct}
            products={products}
            productsLoading={productsLoading}
          />
        </div>
      </section>

      {/* ---------------------------------------------------- CATEGORIES */}
      <section className="home-section" id="shop-categories">
        <div className="container-page">
          <SectionHeader
            eyebrow="Browse"
            title="Shop by category"
            subtitle="Pick a category, then narrow down by brand and price."
            as="h2"
          />

          {catalogLoading ? (
            <CategoryTilesSkeleton />
          ) : catalogError ? (
            <ErrorState
              title="We couldn't load the catalogue"
              message={catalogError}
              onRetry={reloadCatalog}
            />
          ) : (
            <CategoryList
              mode="categories"
              categories={categoryGroups}
              onCategoryClick={goToCategory}
            />
          )}
        </div>
      </section>

      {/* --------------------------------------------------- FLASH DEALS */}
      {dealProducts.length > 0 && (
        <section className="home-section home-section--sunken">
          <div className="container-page">
            <SectionHeader
              eyebrow="Limited time"
              title="Deals ending soon"
              subtitle="Live discounts, straight from the catalogue."
              as="h2"
            />
            <div className="product-rail scroll-area">
              {dealProducts.map((product) => (
                <ProductCard
                  key={`deal-${getProductId(product)}`}
                  product={product}
                  onView={handleViewProduct}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- e-MCARD */}
      <section className="emcard-band">
        <div className="container-page emcard-band__inner">
          <div>
            <span className="ui-badge ui-badge--solid-loyalty">
              <i className="bi bi-gift-fill" aria-hidden="true" /> e-Mcard
            </span>

            <h2 className="emcard-band__title" style={{ marginTop: "1rem" }}>
              {isEmcardMember
                ? "Your e-Mcard is working for you"
                : "Join e-Mcard — it's free"}
            </h2>

            <p className="emcard-band__text">
              {isEmcardMember
                ? "Points are applied at checkout on eligible products. Look for the violet offer badge while you browse — that is where your balance goes furthest."
                : "Members unlock lower prices on eligible products, redeem points against orders, and earn points back on everything they buy. There is no fee and no catch."}
            </p>

            <div className="emcard-band__benefits">
              <div className="emcard-benefit">
                <span className="emcard-benefit__icon" aria-hidden="true">
                  <i className="bi bi-tag-fill" />
                </span>
                <div>
                  <div className="emcard-benefit__title">Member pricing</div>
                  <div className="emcard-benefit__text">
                    A lower cash price on eligible products, applied when you
                    tick the offer.
                  </div>
                </div>
              </div>

              <div className="emcard-benefit">
                <span className="emcard-benefit__icon" aria-hidden="true">
                  <i className="bi bi-coin" />
                </span>
                <div>
                  <div className="emcard-benefit__title">Redeem your points</div>
                  <div className="emcard-benefit__text">
                    Pay for eligible items partly or entirely with points —
                    your choice, per item.
                  </div>
                </div>
              </div>

              <div className="emcard-benefit">
                <span className="emcard-benefit__icon" aria-hidden="true">
                  <i className="bi bi-arrow-repeat" />
                </span>
                <div>
                  <div className="emcard-benefit__title">Earn as you shop</div>
                  <div className="emcard-benefit__text">
                    Every eligible order credits points back to your balance
                    at the current rate.
                  </div>
                </div>
              </div>
            </div>

            <div className="emcard-band__actions">
              {isEmcardMember ? (
                <Button variant="loyalty" size="lg" to="/emcard" iconEnd="bi-arrow-right">
                  View my e-Mcard
                </Button>
              ) : (
                <Button
                  variant="loyalty"
                  size="lg"
                  to={isAuthenticated() ? "/emcard/join" : "/register"}
                  iconEnd="bi-arrow-right"
                >
                  {isAuthenticated() ? "Join now" : "Create an account"}
                </Button>
              )}
              <Button variant="outline" size="lg" to="/emcard">
                How it works
              </Button>
            </div>
          </div>

          <div className="emcard-band__card-slot">
            <EmcardVisual
              points={emcardTotalPoints}
              isMember={isEmcardMember}
              holderName={
                [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
                undefined
              }
            />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- MEMBER PRICES */}
      {savingsProducts.length > 0 && (
        <section className="home-section">
          <div className="container-page">
            <SectionHeader
              eyebrow="e-Mcard"
              title="Biggest member savings"
              subtitle="Products where an e-Mcard offer saves the most against MRP."
              as="h2"
            />
            <div className="product-rail scroll-area">
              {savingsProducts.map((product) => (
                <ProductCard
                  key={`saving-${getProductId(product)}`}
                  product={product}
                  onView={handleViewProduct}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------- PROMOS */}
      <section className="home-section home-section--tight">
        <div className="container-page promo-grid">
          <div className="promo-tile promo-tile--accent">
            <i className="bi bi-truck promo-tile__glyph" aria-hidden="true" />
            <div>
              <div className="promo-tile__eyebrow">Delivery</div>
              <h3 className="promo-tile__title">Free over ₹499</h3>
              <p className="promo-tile__text">
                Same-day delivery available in serviced areas, or collect from
                a store near you.
              </p>
            </div>
            <Link to="/?category=GRO" className="promo-tile__link">
              Shop groceries <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>

          <div className="promo-tile promo-tile--brand">
            <i className="bi bi-cpu promo-tile__glyph" aria-hidden="true" />
            <div>
              <div className="promo-tile__eyebrow">Electronics</div>
              <h3 className="promo-tile__title">Big-ticket, small prices</h3>
              <p className="promo-tile__text">
                Phones, cameras and home appliances — with member pricing on
                eligible models.
              </p>
            </div>
            <Link to="/?category=ELE" className="promo-tile__link">
              Shop electronics <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>

          <div className="promo-tile promo-tile--success">
            <i className="bi bi-cup-straw promo-tile__glyph" aria-hidden="true" />
            <div>
              <div className="promo-tile__eyebrow">Beverages</div>
              <h3 className="promo-tile__title">Stock up and save</h3>
              <p className="promo-tile__text">
                Teas, coffees, juices and energy drinks for the whole week.
              </p>
            </div>
            <Link to="/?category=BEV" className="promo-tile__link">
              Shop beverages <i className="bi bi-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- NEW ARRIVALS */}
      <section className="home-section home-section--sunken">
        <div className="container-page">
          <SectionHeader
            eyebrow="Just in"
            title="New in the catalogue"
            subtitle="The most recently added products across every category."
            as="h2"
          />

          {productsLoading ? (
            <ProductGridSkeleton count={4} />
          ) : (
            <div className="product-rail scroll-area">
              {newestProducts.map((product) => (
                <ProductCard
                  key={`new-${getProductId(product)}`}
                  product={product}
                  onView={handleViewProduct}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
