import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider, useCart } from "./context/CartContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import PrivateRoute from "./components/PrivateRoute";

import CategoryList from "./components/CategoryList";
import ProductDetails from "./components/ProductDetails";
import CartDrawer from "./components/CartDrawer";
import SaleBanner from "./components/SaleBanner";

// Route-level code splitting (WPT: Lazy Loading). Home stays a
// regular import - it's the landing page and is defined further
// down in this same file, so there's nothing to split out of the
// initial bundle for it. Every other page is only fetched once its
// route is actually visited.
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const OAuth2Redirect = lazy(() => import("./pages/OAuth2Redirect"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Payment = lazy(() => import("./pages/Payment"));
const Invoice = lazy(() => import("./pages/Invoice"));
const OrderHistory = lazy(() => import("./pages/OrderHistory"));

import { getAllCategories } from "./services/categoryService";
import {
    searchProducts,
    getBrandsByCategoryGroup,
    getProductsByCategoryGroupAndBrand,
    filterProductsByCategoryGroup
} from "./services/productService";
import {
    getEmcardSummary,
    reserveEmcardPoints,
    releaseEmcardPoints
} from "./services/emcardService";
import { buildCategoryGroups } from "./constants/categoryGroups";
// One shared copy of the purchase-mode rule, used by the eMCard
// checkbox handler here and by the product cards in CategoryList.
import {
    MODE,
    isSaleActive,
    resolvePurchaseMode
} from "./utils/purchaseMode";

import "./App.css";
// Visual polish layer - imported LAST on purpose. Every component and
// its stylesheet is imported above, so this lands last in the bundled
// CSS and wins on cascade order alone: no !important arms race, no
// heavier selectors. Presentation only - remove this one line and the UI
// returns to its previous look without touching any component.
import "./styles/theme-polish.css";


// Preset price bands for the category listing's price-range filter
// (BRD: "filter by brand and/or price range, click Go"). A dropdown
// of ranges rather than free-text min/max inputs, to keep the filter
// a single quick click for shoppers. `min`/`max` of `undefined` means
// "no lower/upper bound" - matches filterProductsByCategoryGroup's
// optional minPrice/maxPrice params exactly.
const PRICE_RANGES = [
    { value: "", label: "All Prices", min: undefined, max: undefined },
    { value: "0-500", label: "Under Rs. 500", min: undefined, max: 500 },
    { value: "500-1000", label: "Rs. 500 - 1,000", min: 500, max: 1000 },
    { value: "1000-2000", label: "Rs. 1,000 - 2,000", min: 1000, max: 2000 },
    { value: "2000-5000", label: "Rs. 2,000 - 5,000", min: 2000, max: 5000 },
    { value: "5000+", label: "Above Rs. 5,000", min: 5000, max: undefined }
];


// ======================================================
// HOME / EMART SHOPPING COMPONENT
// ======================================================

function Home() {

    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const {
        cartItems,
        cartCount,
        cartPayableTotal,
        cartPointsToRedeem,
        cartPurchasable,
        cartBlockingReason,
        addItem: addCartItem,
        updateQuantity: updateCartItemQuantity,
        removeItem: removeCartItemLine
    } = useCart();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Raw Category rows as returned by GET /api/category. The DB has
    // no dedicated "main category" table - each row here is a leaf
    // entry (e.g. "I-phone", "SLR Camera") that shares a `catId` code
    // (e.g. "ELE") with several sibling rows. The real, user-facing
    // Main Category is that catId group, built dynamically below via
    // buildCategoryGroups() - never hardcoded, always derived from
    // whatever is actually in the database.
    const [categories, setCategories] = useState([]);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [catalogError, setCatalogError] = useState(null);

    // Holds a main-category group's catId code ("all" = browse mode).
    const [selectedCategory, setSelectedCategory] = useState("all");

    // Set once a main category or brand is selected. Drives every
    // non-browse view: category cards are hidden, the page title
    // changes, and a Back control appears. null means "browse mode"
    // (main category cards visible). `type` is one of:
    //   "brands"         - showing the brand list for a main category
    //   "brand-products" - showing products for category + brand
    const [categoryView, setCategoryView] = useState(null);

    const [brands, setBrands] = useState([]);
    const [brandsLoading, setBrandsLoading] = useState(false);
    const [brandsError, setBrandsError] = useState(null);

    const [categoryProducts, setCategoryProducts] = useState([]);
    const [categoryProductsLoading, setCategoryProductsLoading] = useState(false);
    const [categoryProductsError, setCategoryProductsError] = useState(null);

    // Brand + price-range filter controls shown on the brand-products
    // listing (BRD: "filter by brand and/or price range, click Go").
    // filterBrand === "" means "All Brands" - both are optional and
    // combine with whichever main category is currently open.
    const [filterBrand, setFilterBrand] = useState("");
    const [filterPriceRange, setFilterPriceRange] = useState("");

    const [searchText, setSearchText] = useState(
        () => searchParams.get("search") || ""
    );

    // Server-side search results. `null` means "no search active" -
    // in that state the category cards / category view render
    // normally. An array (even an empty one) means a search has
    // completed and these are its results. Search is only ever
    // triggered explicitly (Search button click or Enter), never on
    // every keystroke.
    const [searchResults, setSearchResults] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);

    const [selectedProductId, setSelectedProductId] = useState(null);
    // { message } for the most recent failed cart action (currently
    // just "guest tried to add to cart"), surfaced as a lightweight
    // inline banner rather than blocking navigation.
    const [cartActionError, setCartActionError] = useState(null);

    const [isCartOpen, setIsCartOpen] = useState(false);


    // ==================================================
    // EMCARD (LOYALTY POINTS) STATE
    // ==================================================

    // productIds (as strings) the server currently has EMCard
    // points reserved for. This is the single source of truth for
    // every checkbox's checked state - the checkbox never manages
    // its own local state, so it can't drift out of sync with the
    // server-side reservation.
    const [emcardSelectedIds, setEmcardSelectedIds] = useState(new Set());
    const [emcardTotalPoints, setEmcardTotalPoints] = useState(0);
    const [emcardAvailablePoints, setEmcardAvailablePoints] = useState(0);

    // BUSINESS CONDITION 1: only an eMCard holder may be shown the
    // eMCard price / point offer. A guest or an ordinary registered
    // member sees MRP only. The backend already strips the offer out
    // of every product response; this drives the UI so the controls
    // aren't rendered at all.
    const isEmcardMember = Boolean(user?.isEmcardMember);
    // { productId, message } for the one checkbox that most
    // recently failed validation, so its card can show why.
    const [emcardError, setEmcardError] = useState(null);


    // ==================================================
    // LOAD ALL DATA
    // ==================================================

    useEffect(() => {

        const loadData = async () => {

            setCatalogLoading(true);
            setCatalogError(null);

            try {

                const cat = await getAllCategories();

                setCategories(cat.data || []);

            } catch (error) {

                console.error(
                    "Error loading data:",
                    error
                );

                setCatalogError(
                    "We couldn't load the catalog. Please check your connection and try again."
                );

            } finally {

                setCatalogLoading(false);

            }

        };

        loadData();

    }, []);


    // ==================================================
    // EMCARD: APPLY SERVER STATUS
    // ==================================================

    // Every EMCard endpoint returns the freshly recalculated
    // balance - the frontend never computes "available points"
    // itself, it just renders whatever the server says right now.
    const applyEmcardStatus = (status) => {
        if (!status) return;

        setEmcardTotalPoints(status.totalPoints ?? 0);
        setEmcardAvailablePoints(status.availablePoints ?? 0);
        setEmcardSelectedIds(
            new Set(
                (status.reservedProductIds ?? []).map((id) => String(id))
            )
        );
    };


    // ==================================================
    // EMCARD: INITIAL LOAD / RESET ON LOGIN-LOGOUT
    // ==================================================

    // EMCard is a per-user, JWT-protected feature. It only makes
    // sense to talk to /api/emcard/** once someone is signed in -
    // for a guest, skip the calls entirely and keep the balance at
    // zero rather than hitting a guaranteed 401.
    useEffect(() => {

        if (!isAuthenticated()) {
            setEmcardSelectedIds(new Set());
            setEmcardTotalPoints(0);
            setEmcardAvailablePoints(0);
            setEmcardError(null);
            return;
        }

        const initEmcard = async () => {
            try {
                // The cart is now persisted server-side (CartContext,
                // backed by /api/cart/**), so EMCard reservations tied
                // to items still sitting in that cart are legitimate,
                // not stale - a page refresh should keep showing them
                // as applied. Just load the current status instead of
                // wiping every reservation on mount.
                const response = await getEmcardSummary();
                applyEmcardStatus(response.data);
            } catch (error) {
                console.error(
                    "Error initializing EMCard balance:",
                    error
                );
            }
        };

        initEmcard();

    }, [user]);


    // ==================================================
    // EMCARD: RESYNC BALANCE ON TAB FOCUS
    // ==================================================

    // If another tab reserved/released points for this same
    // account, coming back to this tab should show the up to date
    // available balance rather than a stale number.
    useEffect(() => {

        const resyncBalance = async () => {
            if (!isAuthenticated()) return;

            try {
                const response = await getEmcardSummary();
                setEmcardTotalPoints(response.data.totalPoints ?? 0);
                setEmcardAvailablePoints(
                    response.data.availablePoints ?? 0
                );
            } catch (error) {
                console.error(
                    "Error refreshing EMCard balance:",
                    error
                );
            }
        };

        window.addEventListener("focus", resyncBalance);
        return () =>
            window.removeEventListener("focus", resyncBalance);

    }, []);


    // ==================================================
    // EMCARD: CHECKBOX TOGGLE
    // ==================================================

    const handleEmcardToggle = async (product, isChecked) => {
        const productId = getProductId(product);

        if (!isAuthenticated()) {
            setEmcardError({
                productId: String(productId),
                message: "Sign in to redeem EMCard points."
            });
            return;
        }

        // ---- PURCHASE MODE GUARD (mirrors the server) ----
        // This checkbox means "take this product's eMCard offer". Modes
        // 2, 3 and 4 all have one; MODE 1 does not, and is refused with
        // the same wording EmcardServiceImpl.reserve() uses, so the
        // message is identical whether it was caught here or over the
        // wire.
        //
        // A product on an active sale is already discounted, and a sale
        // never stacks with an eMCard offer - it is priced cash-only.
        if (isChecked && isSaleActive(product)) {
            setEmcardError({
                productId: String(productId),
                message:
                    "This product is on sale, you cannot use e-Card points on it"
            });
            return;
        }

        // Resolved by the shared helper, so this handler sees the same
        // mode the card and the product page render. It used to read
        // `offerType` alone - NULL on any row written before that column
        // existed - and rejected a valid cash+points product as
        // "cash only" without ever calling the API.
        const mode = resolvePurchaseMode(product);

        if (isChecked && mode === MODE.CASH_ONLY) {
            setEmcardError({
                productId: String(productId),
                message:
                    "This product can only be purchased with cash. " +
                    "EMCard points cannot be redeemed on it."
            });
            return;
        }


        setEmcardError(null);

        try {
            const response = isChecked
                ? await reserveEmcardPoints(productId)
                : await releaseEmcardPoints(productId);

            const status = response.data;
            applyEmcardStatus(status);

            if (isChecked && !status.success) {
                setEmcardError({
                    productId: String(productId),
                    message:
                        status.message ||
                        "Insufficient EMCard Points"
                });
            }
        } catch (error) {
            console.error(
                "Error updating EMCard selection:",
                error
            );
            setEmcardError({
                productId: String(productId),
                message:
                    "Unable to update EMCard selection. Please try again."
            });
        }
    };


    // ==================================================
    // SEARCH: EXPLICIT SUBMIT (Search button / Enter)
    // ==================================================

    // Runs the real GET /api/product/search?q= call. Only fires on
    // an explicit submit (Search button click or Enter in the box),
    // never on every keystroke - typing alone never touches the
    // network or the category cards.
    const performSearch = (rawQuery) => {

        const trimmed = (rawQuery ?? "").trim();

        if (!trimmed) {
            // Clearing the box always returns to the category
            // listing page, regardless of whatever was being
            // browsed before.
            setSearchResults(null);
            setSearchLoading(false);
            setSearchError(null);
            setSelectedCategory("all");
            setCategoryView(null);
            return;
        }

        setSearchLoading(true);
        setSearchError(null);

        searchProducts(trimmed)
            .then((response) => {
                setSearchResults(response.data || []);
            })
            .catch((error) => {
                console.error("Error searching products:", error);
                setSearchResults(null);
                setSearchError(
                    "We couldn't complete your search. Please check your connection and try again."
                );
            })
            .finally(() => {
                setSearchLoading(false);
            });
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        performSearch(searchText);
    };

    const handleSearchChange = (value) => {
        setSearchText(value);

        // An empty box should snap straight back to the category
        // listing without waiting for a submit.
        if (!value.trim() && searchResults !== null) {
            setSearchResults(null);
            setSearchError(null);
        }

        if (selectedProductId) {
            setSelectedProductId(null);
        }
    };

    const handleClearSearch = () => {
        setSearchText("");
        setSearchResults(null);
        setSearchError(null);
        setSearchLoading(false);
    };

    // If the page was opened with ?search=... (e.g. from the
    // Navbar on another route), run that search once on mount.
    useEffect(() => {
        const initial = searchParams.get("search");
        if (initial && initial.trim()) {
            performSearch(initial);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    // ==================================================
    // MAIN CATEGORY GROUPS - the DB has no dedicated main
    // category table, so this derives the real groups from
    // whatever Category rows actually exist, grouped by the
    // shared `catId` code (e.g. "ELE"). Nothing here is
    // hardcoded: the set of groups, their counts, and which
    // codes exist all come straight from the database - only
    // the friendly display label for a handful of known codes
    // is a small lookup (unknown codes still show using their
    // raw code, never hidden).
    // ==================================================

    const activeCategories = useMemo(
        () => categories.filter((c) => c.flag !== false),
        [categories]
    );

    const categoryGroupsList = useMemo(() => {

        const groups = buildCategoryGroups(activeCategories)
            .filter((group) => group.value !== "all");

        // Attach a representative image to each group (the first
        // active leaf category in that group that actually has
        // one) so the tiles aren't blank, without hardcoding any
        // image path.
        return groups.map((group) => {
            const withImage = activeCategories.find(
                (c) => c.catId === group.catId && c.catImagePath
            );

            return {
                catId: group.catId,
                catName: group.label,
                catImagePath: withImage?.catImagePath || null,
                flag: true,
                count: group.count
            };
        });

    }, [activeCategories]);


    // ==================================================
    // MAIN CATEGORY CLICK - fetches the brands available
    // under this category group and switches into the "pick
    // a brand" view (category cards hidden, title = category
    // name, Back control shown). Products only appear one
    // step later, once a brand is picked.
    // ==================================================

    const handleCategoryClick = (group) => {

        const catId = group.catId;
        const categoryName = group.catName || catId;

        setSelectedCategory(catId);
        setSearchResults(null);
        setSearchError(null);

        setCategoryView({
            type: "brands",
            categoryId: catId,
            categoryName
        });

        // A fresh main category means the previous filter selection
        // (brand + price range) no longer applies.
        setFilterBrand("");
        setFilterPriceRange("");

        setBrands([]);
        setBrandsLoading(true);
        setBrandsError(null);

        getBrandsByCategoryGroup(catId)
            .then((response) => {
                setBrands(response.data || []);
            })
            .catch((error) => {
                console.error("Error loading brands:", error);
                setBrands([]);
                setBrandsError(
                    "We couldn't load brands for this category. Please try again."
                );
            })
            .finally(() => {
                setBrandsLoading(false);
            });
    };


    // ==================================================
    // BRAND CLICK - fetches this category + brand's active
    // products and switches into the "clean product
    // listing" view.
    // ==================================================

    const handleBrandClick = (brand) => {

        if (!categoryView || categoryView.type !== "brands") return;

        const { categoryId, categoryName } = categoryView;

        setCategoryView({
            type: "brand-products",
            categoryId,
            categoryName,
            brand
        });

        // Seed the filter bar to match the brand just clicked, with
        // no price range applied yet - the filter bar is an
        // alternative/refinement on top of this listing, not a
        // separate flow.
        setFilterBrand(brand || "");
        setFilterPriceRange("");

        setCategoryProducts([]);
        setCategoryProductsLoading(true);
        setCategoryProductsError(null);

        getProductsByCategoryGroupAndBrand(categoryId, brand)
            .then((response) => {
                setCategoryProducts(response.data || []);
            })
            .catch((error) => {
                console.error("Error loading brand products:", error);
                setCategoryProducts([]);
                setCategoryProductsError(
                    "We couldn't load products for this brand. Please try again."
                );
            })
            .finally(() => {
                setCategoryProductsLoading(false);
            });
    };


    // ==================================================
    // APPLY BRAND / PRICE-RANGE FILTER (Go button) - combines
    // the current filterBrand + filterPriceRange selections against
    // the open main category via the single filterByCategoryGroup
    // endpoint. Either filter can be left at its "All" default.
    // ==================================================

    const handleApplyFilter = () => {
        if (!categoryView || categoryView.type !== "brand-products") return;

        const { categoryId, categoryName } = categoryView;
        const range =
            PRICE_RANGES.find((r) => r.value === filterPriceRange) ||
            PRICE_RANGES[0];

        setCategoryView({
            type: "brand-products",
            categoryId,
            categoryName,
            brand: filterBrand || null
        });

        setCategoryProducts([]);
        setCategoryProductsLoading(true);
        setCategoryProductsError(null);

        filterProductsByCategoryGroup(categoryId, {
            brand: filterBrand || undefined,
            minPrice: range.min,
            maxPrice: range.max
        })
            .then((response) => {
                setCategoryProducts(response.data || []);
            })
            .catch((error) => {
                console.error("Error filtering products:", error);
                setCategoryProducts([]);
                setCategoryProductsError(
                    "We couldn't apply that filter. Please try again."
                );
            })
            .finally(() => {
                setCategoryProductsLoading(false);
            });
    };


    // ==================================================
    // BACK TO BRAND LISTING (from a brand's products)
    // ==================================================

    const handleBackToBrands = () => {
        if (!categoryView) return;

        const { categoryId, categoryName } = categoryView;

        setCategoryView({
            type: "brands",
            categoryId,
            categoryName
        });

        setCategoryProducts([]);
        setCategoryProductsError(null);
    };


    // ==================================================
    // BACK TO MAIN CATEGORY LISTING
    // ==================================================

    const handleBackToCategories = () => {
        setSelectedCategory("all");
        setCategoryView(null);
        setCategoryProducts([]);
        setCategoryProductsError(null);
        setBrands([]);
        setBrandsError(null);
    };


    // ==================================================
    // CART
    // The cart itself now lives in CartContext, backed by the
    // persisted /api/cart/** endpoints (see src/context/CartContext.jsx).
    // Home() only wires UI events to it and keeps the small bits of
    // local UI state (which product's details are open, the cart
    // drawer's open/closed flag). cartCount / cartPayableTotal /
    // cartItems come straight from useCart() above - the EMCard
    // redemption status is already folded into each line's
    // unitPrice/lineTotal server-side, so there's no client-side
    // total math to duplicate here anymore.
    // ==================================================

    const getProductId = (
        product
    ) => {

        return (
            product.productId ??
            product.prodId
        );

    };


    // Cart mutations require a signed-in user (every /api/cart/**
    // endpoint is JWT-protected) - this mirrors the BRD's "one has
    // to be a register member of site to purchase". A guest gets a
    // brief inline message instead of a silent 401.
    const addToCart = (
        product
    ) => {

        const productId = getProductId(product);

        setCartActionError(null);

        addCartItem(productId, 1).catch((error) => {
            if (error?.message === "SIGN_IN_REQUIRED") {
                setCartActionError(
                    "Sign in to add items to your cart."
                );
            } else {
                console.error("Error adding to cart:", error);
                setCartActionError(
                    "Unable to add that item to your cart. Please try again."
                );
            }
        });

    };


    // ==================================================
    // INCREASE / DECREASE / REMOVE
    // All three key off cartItemId (unique per cart line, as
    // returned by the backend) rather than productId. Decreasing to
    // zero and removing both go through the same backend endpoint,
    // which also releases any EMCard points reserved for that line -
    // no separate client-side release call needed anymore.
    // ==================================================

    const increaseQuantity = (cartItemId) => {
        const currentItem = cartItems.find(
            (item) => item.cartItemId === cartItemId
        );
        if (!currentItem) return;

        updateCartItemQuantity(cartItemId, currentItem.quantity + 1).catch(
            (error) => console.error("Error updating cart quantity:", error)
        );
    };


    const decreaseQuantity = (cartItemId) => {
        const currentItem = cartItems.find(
            (item) => item.cartItemId === cartItemId
        );
        if (!currentItem) return;

        updateCartItemQuantity(cartItemId, currentItem.quantity - 1).catch(
            (error) => console.error("Error updating cart quantity:", error)
        );
    };


    const removeFromCart = (cartItemId) => {
        removeCartItemLine(cartItemId).catch((error) =>
            console.error("Error removing cart item:", error)
        );
    };


    // ==================================================
    // PRODUCT DETAILS
    // ==================================================

    const handleViewProduct = (
        product
    ) => {

        const productId =
            getProductId(product);


        setSelectedProductId(
            productId
        );

    };


    const handleBackFromDetails = () => {

        setSelectedProductId(
            null
        );

    };


    const handleBuyNow = (
        product
    ) => {

        addToCart(
            product
        );

        setSelectedProductId(
            null
        );

        // Take the user straight to checkout (the cart drawer)
        // instead of just dropping them back on the listing page.
        setIsCartOpen(
            true
        );

    };


    // ==================================================
    // SELECTED CATEGORY NAME
    // ==================================================

    const selectedCategoryName =

        categoryView?.type === "brand-products"
            ? `${categoryView.categoryName}${
                  categoryView.brand ? ` — ${categoryView.brand}` : " — All Brands"
              }`
            :

        categoryView?.categoryName ||

        (selectedCategory === "all"

            ? "All Categories"

            :

            categoryGroupsList.find(
                (group) =>
                    String(group.catId) ===
                    String(selectedCategory)

            )?.catName

            ||

            "Category");


    // ==================================================
    // RENDER
    // ==================================================

    return (

        <div className="app">


            {/* PROMO BAR */}

            <div className="promo-bar">

                Free delivery on orders above{" "}

                <strong>
                    Rs. 499
                </strong>

                {" | "}

                Same day delivery available

            </div>


            {/* HEADER */}

            <header className="top-header">


                {/* LOGO */}

                <div className="logo">

                    <div className="logo-main">

                        <span>
                            E
                        </span>

                        MART

                    </div>


                    <div className="logo-tagline">

                        Everyday Low Prices

                    </div>

                </div>


                {/* SEARCH */}

                <form
                    className="search-box"
                    role="search"
                    onSubmit={handleSearchSubmit}
                >

                    <input

                        type="search"

                        placeholder="Search for products by name..."

                        aria-label="Search for products by name"

                        value={
                            searchText
                        }

                        onChange={(e) => handleSearchChange(e.target.value)}

                    />


                    {searchText && (

                        <button
                            type="button"
                            className="search-clear-btn"
                            aria-label="Clear search"
                            onClick={handleClearSearch}
                        >
                            ✕
                        </button>

                    )}


                    <button type="submit" aria-label="Search">

                        SEARCH

                    </button>

                </form>


                {/* HEADER ACTIONS */}

                <div className="header-actions">


                    {isAuthenticated() && (
                        <div className="emcard-balance">
                            🎫 EMCard:{" "}
                            <strong>
                                {emcardAvailablePoints}
                            </strong>
                            {" "}pts
                        </div>
                    )}


                    {isAuthenticated() ? (
                        <div className="user">
                            <div className="user-icon">
                                {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                            </div>
                            <div className="user-details">
                                <span className="user-name">
                                    Hi, {user?.firstName || user?.email}
                                </span>
                                <div className="user-menu">
                                    <Link to="/profile">Profile</Link>
                                    {isAdmin() && (
                                        <Link to="/admin">Admin</Link>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            logout();
                                            navigate("/login");
                                        }}
                                    >
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Link to="/login" className="user text-decoration-none text-dark">
                            <div className="user-icon">U</div>
                            <strong>Sign In / Register</strong>
                        </Link>
                    )}


                    <div className="cart-action-wrap">

                        <div

                            className="cart"

                            onClick={() =>
                                setIsCartOpen(
                                    true
                                )
                            }

                        >

                            <span className="cart-icon">

                                🛒 CART

                            </span>


                            <span
                                className="cart-badge"
                                aria-label={`${cartCount} items in cart`}
                            >

                                {cartCount}

                            </span>

                        </div>

                        {cartActionError && (
                            <div
                                className="cart-action-error"
                                role="alert"
                            >
                                {cartActionError}
                                {cartActionError.startsWith("Sign in") && (
                                    <>
                                        {" "}
                                        <Link to="/login">Sign in</Link>
                                    </>
                                )}
                            </div>
                        )}

                    </div>


                </div>


            </header>


            {/* TOP NAVIGATION */}

            <nav className="navigation">


                <button

                    className={`nav-item ${
                        selectedCategory ===
                        "all" && !categoryView
                            ? "active"
                            : ""
                    }`}

                    onClick={() => {
                        handleBackToCategories();
                        handleClearSearch();
                    }}

                >

                    All Categories

                </button>


                {categoryGroupsList.map(
                    (group) => (

                        <button

                            key={
                                group.catId
                            }

                            className={`nav-item ${
                                String(selectedCategory) ===
                                String(group.catId)
                                    ? "active"
                                    : ""
                            }`}

                            onClick={() =>
                                handleCategoryClick(group)
                            }

                        >

                            {
                                group.catName
                            }

                        </button>

                    )
                )}

            </nav>


            {/* SALE BANNER - directly below the top navigation,
                above the main content, so it never pushes/overlaps
                the sidebar or category listing below it. */}

            <SaleBanner onViewProduct={handleViewProduct} />


            {/* MAIN */}

            <main className="main-container">


                {/* SIDEBAR */}

                <aside className="sidebar">


                    <h3>
                        Categories
                    </h3>


                    <button

                        className={`sidebar-item ${
                            selectedCategory ===
                            "all" && !categoryView
                                ? "active"
                                : ""
                        }`}

                        onClick={() => {
                            handleBackToCategories();
                            handleClearSearch();
                        }}

                    >

                        All Categories

                    </button>


                    {categoryGroupsList.map(
                        (group) => (

                            <button

                                key={
                                    group.catId
                                }

                                className={`sidebar-item ${
                                    String(selectedCategory) ===
                                    String(group.catId)
                                        ? "active"
                                        : ""
                                }`}

                                onClick={() =>
                                    handleCategoryClick(group)
                                }

                            >

                                {
                                    group.catName
                                }

                            </button>

                        )
                    )}

                </aside>


                {/* CONTENT */}

                <section className="content">


                    <div className="breadcrumb">

                        Home /

                        {" "}

                        <span>
                            {
                                selectedCategoryName
                            }
                        </span>


                        {selectedProductId && (

                            <>

                                {" / "}

                                <span>
                                    Product Details
                                </span>

                            </>

                        )}

                    </div>


                    {catalogLoading ? (

                        <div className="page-loading">
                            <span className="spinner spinner-lg" aria-hidden="true" />
                            Loading the catalog...
                        </div>

                    ) : catalogError ? (

                        <div className="empty-state">
                            <span className="empty-state-icon" aria-hidden="true">
                                ⚠️
                            </span>
                            <h3>Something went wrong</h3>
                            <p>{catalogError}</p>
                        </div>

                    ) : selectedProductId ? (

                        <ProductDetails

                            productId={
                                selectedProductId
                            }

                            onBack={
                                handleBackFromDetails
                            }

                            onAddToCart={
                                addToCart
                            }

                            onBuyNow={
                                handleBuyNow
                            }

                            emcardSelectedIds={
                                emcardSelectedIds
                            }

                            emcardError={
                                emcardError
                            }

                            onEmcardToggle={
                                handleEmcardToggle
                            }

                            isEmcardMember={
                                isEmcardMember
                            }

                        />

                    ) : searchResults !== null ? (

                        // ==================================
                        // SEARCH RESULTS
                        // Category cards are hidden the entire
                        // time a search is active.
                        // ==================================

                        <>

                            <div className="page-title">
                                <h1>Search Results</h1>
                                <p>
                                    Showing matches for "{searchText}"
                                </p>
                            </div>

                            <CategoryList
                                mode="products"
                                title={`Search results for "${searchText}"`}
                                products={searchResults}
                                loading={searchLoading}
                                error={searchError}
                                emptyTitle="No products found"
                                emptyMessage={`We couldn't find anything for "${searchText}". Try a different keyword.`}
                                onBack={handleClearSearch}
                                onAddToCart={addToCart}
                                onViewProduct={handleViewProduct}
                                emcardSelectedIds={emcardSelectedIds}
                                emcardError={emcardError}
                                onEmcardToggle={handleEmcardToggle}
                                isEmcardMember={isEmcardMember}
                            />

                        </>

                    ) : categoryView?.type === "brands" ? (

                        // ==================================
                        // BRAND LIST FOR A CATEGORY
                        // Category cards are hidden while
                        // picking a brand.
                        // ==================================

                        <>

                            <div className="page-title">
                                <h1>{categoryView.categoryName}</h1>
                                <p>Choose a brand</p>
                            </div>

                            <CategoryList
                                mode="categories"
                                variant="brand"
                                categoryLabel={categoryView.categoryName}
                                categories={brands.map((b) => ({ catName: b }))}
                                loading={brandsLoading}
                                error={brandsError}
                                onCategoryClick={(item) => handleBrandClick(item.catName)}
                                onBack={handleBackToCategories}
                            />

                        </>

                    ) : categoryView?.type === "brand-products" ? (

                        // ==================================
                        // PRODUCTS FOR CATEGORY + BRAND
                        // ==================================

                        <>

                            <div className="page-title">
                                <h1>
                                    {categoryView.categoryName}
                                    {categoryView.brand ? ` — ${categoryView.brand}` : " — All Brands"}
                                </h1>
                                <p>
                                    Browse {categoryView.brand || "all"} products
                                    {categoryView.brand ? "" : ` in ${categoryView.categoryName}`}
                                </p>
                            </div>

                            <CategoryList
                                mode="products"
                                title={`${categoryView.categoryName}${
                                    categoryView.brand ? ` — ${categoryView.brand}` : " — All Brands"
                                }`}
                                products={categoryProducts}
                                loading={categoryProductsLoading}
                                error={categoryProductsError}
                                emptyTitle="No products found"
                                emptyMessage={
                                    categoryView.brand
                                        ? `There are no active ${categoryView.brand} products in ${categoryView.categoryName} yet.`
                                        : `No products match that filter in ${categoryView.categoryName} yet.`
                                }
                                onBack={handleBackToBrands}
                                onAddToCart={addToCart}
                                onViewProduct={handleViewProduct}
                                emcardSelectedIds={emcardSelectedIds}
                                emcardError={emcardError}
                                onEmcardToggle={handleEmcardToggle}
                                isEmcardMember={isEmcardMember}
                                filterBar={{

                                    brands,
                                    brand: filterBrand,
                                    priceRange: filterPriceRange,
                                    priceRangeOptions: PRICE_RANGES,
                                    onBrandChange: setFilterBrand,
                                    onPriceRangeChange: setFilterPriceRange,
                                    onApply: handleApplyFilter,
                                    applying: categoryProductsLoading
                                }}
                            />

                        </>

                    ) : (

                        // ==================================
                        // BROWSE MODE - main category cards
                        // (no products, no brands - just the
                        // real Main Category groups)
                        // ==================================

                        <>

                            <div className="page-title">

                                <h1>
                                    {
                                        selectedCategoryName
                                    }
                                </h1>


                                <p>

                                    Browse products and categories

                                </p>

                            </div>


                            <CategoryList
                                mode="categories"
                                categories={categoryGroupsList}
                                categoryLabel="All Categories"
                                onCategoryClick={handleCategoryClick}
                            />

                        </>

                    )}

                </section>

            </main>


            {/* FOOTER */}

            <footer className="site-footer">

                <div className="footer-inner">


                    <div className="footer-brand">

                        <span>
                            E
                        </span>

                        MART

                    </div>


                    <div className="footer-copy">

                        Copyright 2026 eMart.
                        All rights reserved.

                    </div>


                </div>

            </footer>


            {/* CART DRAWER */}

            <CartDrawer

                isOpen={
                    isCartOpen
                }

                cart={
                    cartItems
                }

                cartTotal={
                    cartPayableTotal
                }

                totalPoints={
                    cartPointsToRedeem
                }

                purchasable={
                    cartPurchasable
                }

                blockingReason={
                    cartBlockingReason
                }

                emcardSelectedIds={
                    emcardSelectedIds
                }

                onClose={() =>
                    setIsCartOpen(
                        false
                    )
                }

                onIncrease={
                    increaseQuantity
                }

                onDecrease={
                    decreaseQuantity
                }

                onRemove={
                    removeFromCart
                }

                onCheckout={() => {
                    setIsCartOpen(false);
                    navigate("/checkout");
                }}

            />

        </div>

    );

}


// ======================================================
// MAIN APP WITH ROUTING
// ======================================================

// Lightweight fallback shown while a lazy-loaded route's chunk is
// still being fetched - same spinner markup PrivateRoute already
// uses, so a lazy page and an auth check look identical while
// either one is loading.
function RouteFallback() {
    return (
        <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: "60vh" }}
        >
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
        </div>
    );
}

// Auth pages (Login/Register/ForgotPassword) and the Payment step
// render without the full site chrome - the site header/footer would
// just duplicate navigation, crowd out the form, and (for Payment
// especially) give people an easy way to wander off mid-payment.
const NO_CHROME_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/payment"];

function AppRoutes() {
    const location = useLocation();
    const showNavbar =
        location.pathname !== "/" &&
        !NO_CHROME_ROUTES.includes(location.pathname);

    return (
        <>
            {showNavbar && <Navbar />}

            <Suspense fallback={<RouteFallback />}>
            <Routes>


                    {/* PUBLIC ROUTES */}

                    <Route
                        path="/"
                        element={
                            <Home />
                        }
                    />


                    <Route
                        path="/login"
                        element={
                            <Login />
                        }
                    />


                    <Route
                        path="/register"
                        element={
                            <Register />
                        }
                    />


                    <Route
                        path="/forgot-password"
                        element={
                            <ForgotPassword />
                        }
                    />


                    <Route
                        path="/reset-password"
                        element={
                            <ResetPassword />
                        }
                    />


                    <Route
                        path="/contact"
                        element={
                            <ContactUs />
                        }
                    />


                    <Route
                        path="/oauth2/redirect"
                        element={
                            <OAuth2Redirect />
                        }
                    />


                    {/* PRIVATE ROUTES */}

                    <Route

                        path="/profile"

                        element={

                            <PrivateRoute>

                                <Profile />

                            </PrivateRoute>

                        }

                    />


                    <Route

                        path="/edit-profile"

                        element={

                            <PrivateRoute>

                                <EditProfile />

                            </PrivateRoute>

                        }

                    />


                    <Route

                        path="/change-password"

                        element={

                            <PrivateRoute>

                                <ChangePassword />

                            </PrivateRoute>

                        }

                    />


                    {/* CHECKOUT -> PAYMENT -> INVOICE -> ORDER HISTORY */}

                    <Route
                        path="/checkout"
                        element={
                            <PrivateRoute>
                                <Checkout />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/payment"
                        element={
                            <PrivateRoute>
                                <Payment />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/orders"
                        element={
                            <PrivateRoute>
                                <OrderHistory />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/orders/:orderId"
                        element={
                            <PrivateRoute>
                                <Invoice />
                            </PrivateRoute>
                        }
                    />


                    {/* ADMIN */}

                    <Route

                        path="/admin"

                        element={

                            <PrivateRoute adminOnly>

                                <Dashboard />

                            </PrivateRoute>

                        }

                    />


                    {/* FALLBACK */}

                    <Route

                        path="*"

                        element={
                            <Home />
                        }

                    />

            </Routes>
            </Suspense>

            {showNavbar && <Footer />}
        </>
    );
}

function App() {

    return (

        <AuthProvider>

            <CartProvider>

                <BrowserRouter>

                    <AppRoutes />

                </BrowserRouter>

            </CartProvider>

        </AuthProvider>

    );

}


export default App;
