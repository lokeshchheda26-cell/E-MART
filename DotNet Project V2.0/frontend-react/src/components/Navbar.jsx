import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useCatalog } from "../context/CatalogContext";
import { useEmcard } from "../context/EmcardContext";
import { useTheme } from "../hooks/useTheme";
import useDismissable from "../hooks/useDismissable";
import MobileNav from "./MobileNav";
import { PointsPill } from "./ui/Loyalty";

/**
 * Navbar.jsx - the E-Mart site header
 * ------------------------------------------------------------------
 * ONE header for the whole application.
 *
 * The storefront previously had two completely different ones: the home
 * page rendered its own header, category strip, sidebar and footer inline
 * inside App.jsx, while every other route got a separate Bootstrap navbar
 * from this file. They had different logos, different search boxes,
 * different account menus and different type - so moving from the home page
 * to Orders felt like arriving at a different website. There is now a single
 * header, rendered on every route, and the home page has no chrome of its
 * own at all.
 *
 * Layout
 *   Row 1  brand · search · e-Mcard balance · account · cart
 *   Row 2  main-category navigation (desktop and large tablets only)
 *   Mobile hamburger opens a real navigation drawer (see MobileNav.jsx),
 *          not a squashed copy of the desktop bar.
 *
 * Behaviour preserved from the previous implementation:
 *   - submitting search navigates to /?search=<term>, which the home page
 *     reads and turns into the real GET /api/product/search request;
 *   - the account menu shows Profile / Orders / Admin exactly as before and
 *     logging out still routes to /login.
 * ------------------------------------------------------------------
 */
export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { cartCount, openCart } = useCart();
  const { categoryGroups } = useCatalog();
  const { emcardTotalPoints, isEmcardMember } = useEmcard();
  const { isDark, toggleTheme } = useTheme();

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const signedIn = isAuthenticated();

  // The search box is a controlled input seeded from the URL, so landing on
  // /?search=rice shows "rice" in the box instead of an empty field beside a
  // page full of results.
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get("search") || ""
  );
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const accountRef = useDismissable(accountOpen, () => setAccountOpen(false));

  const activeCategory = searchParams.get("category");
  const onHome = location.pathname === "/";

  // Keep the field in step when the query changes from somewhere else -
  // clearing a search on the home page, or using the browser Back button.
  useEffect(() => {
    setSearchTerm(searchParams.get("search") || "");
  }, [searchParams]);

  // Close transient surfaces on navigation, otherwise the account menu stays
  // hanging open over the page the shopper just moved to.
  useEffect(() => {
    setAccountOpen(false);
    setMobileNavOpen(false);
  }, [location.pathname, location.search]);

  // A subtle shadow once the page scrolls, so the sticky header reads as
  // floating above the content rather than welded to the top of it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmed = searchTerm.trim();
    navigate(trimmed ? `/?search=${encodeURIComponent(trimmed)}` : "/");
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    if (onHome) navigate("/");
  };

  const handleLogout = () => {
    setAccountOpen(false);
    logout();
    navigate("/login");
  };

  const displayName = user?.firstName || user?.email || "Account";
  const initial = (user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <>
      {/* ---------------------------------------------------- ANNOUNCEMENT */}
      <div className="announce-bar">
        <div className="container-page announce-bar__inner">
          <span className="announce-bar__item">
            <i className="bi bi-truck" aria-hidden="true" />
            Free delivery on orders above <strong>₹499</strong>
          </span>
          <span className="announce-bar__sep" aria-hidden="true">
            •
          </span>
          <span className="announce-bar__item announce-bar__item--secondary">
            <i className="bi bi-lightning-charge-fill" aria-hidden="true" />
            Same-day delivery available
          </span>
          <span className="announce-bar__sep" aria-hidden="true">
            •
          </span>
          <span className="announce-bar__item announce-bar__item--secondary">
            <i className="bi bi-gift-fill" aria-hidden="true" />
            Earn e-Mcard points on every order
          </span>
        </div>
      </div>

      {/* --------------------------------------------------------- HEADER */}
      <header
        className={`site-header ${scrolled ? "site-header--scrolled" : ""}`}
      >
        <div className="container-page site-header__bar">
          {/* Hamburger - phones and tablets only */}
          <button
            type="button"
            className="ui-icon-btn mobile-only"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileNavOpen}
          >
            <i className="bi bi-list" style={{ fontSize: "1.4rem" }} aria-hidden="true" />
          </button>

          <Link to="/" className="brand" aria-label="E-Mart home">
            <span className="brand__mark" aria-hidden="true">
              E
            </span>
            <span className="brand__text">
              <span className="brand__name">
                <em>E</em>-Mart
              </span>
              <span className="brand__tagline">Everyday low prices</span>
            </span>
          </Link>

          {/* ------------------------------------------------------ SEARCH */}
          <form
            className="header-search"
            role="search"
            onSubmit={handleSearchSubmit}
          >
            <span className="header-search__icon" aria-hidden="true">
              <i className="bi bi-search" />
            </span>

            <label htmlFor="site-search" className="sr-only">
              Search for products
            </label>
            <input
              id="site-search"
              type="search"
              className="header-search__input"
              placeholder="Search for products, brands and categories"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              autoComplete="off"
            />

            {searchTerm && (
              <button
                type="button"
                className="header-search__clear"
                onClick={handleClearSearch}
                aria-label="Clear search"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            )}

            <button type="submit" className="header-search__submit">
              <i className="bi bi-search" aria-hidden="true" />
              <span>Search</span>
            </button>
          </form>

          {/* ----------------------------------------------------- ACTIONS */}
          <div className="header-actions">
            <button
              type="button"
              className="ui-icon-btn desktop-only"
              onClick={toggleTheme}
              aria-pressed={isDark}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              title={isDark ? "Light mode" : "Dark mode"}
            >
              <i
                className={`bi ${isDark ? "bi-sun-fill" : "bi-moon-stars"}`}
                aria-hidden="true"
              />
            </button>

            {/* The loyalty balance is now visible on every route, not just
                the home page - it is the shopper's spendable currency. */}
            {signedIn && isEmcardMember && (
              <Link
                to="/emcard"
                className="desktop-only"
                aria-label={`e-Mcard balance: ${emcardTotalPoints} points`}
              >
                <PointsPill points={emcardTotalPoints} />
              </Link>
            )}

            {signedIn ? (
              <div className="account-menu" ref={accountRef}>
                <button
                  type="button"
                  className="header-action"
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                >
                  <span className="account-menu__avatar" aria-hidden="true">
                    {initial}
                  </span>
                  <span className="header-action__label">
                    <span className="header-action__label-top">Hello,</span>
                    <span>{displayName}</span>
                  </span>
                  <i className="bi bi-chevron-down desktop-only" aria-hidden="true" />
                </button>

                {accountOpen && (
                  <div className="account-menu__panel" role="menu">
                    <div className="account-menu__head">
                      <div className="account-menu__name">{displayName}</div>
                      <div className="account-menu__email">{user?.email}</div>
                      {isEmcardMember && (
                        <div style={{ marginTop: "0.5rem" }}>
                          <PointsPill points={emcardTotalPoints} />
                        </div>
                      )}
                    </div>

                    <Link className="account-menu__item" to="/profile" role="menuitem">
                      <i className="bi bi-person" aria-hidden="true" />
                      My profile
                    </Link>
                    <Link className="account-menu__item" to="/orders" role="menuitem">
                      <i className="bi bi-bag-check" aria-hidden="true" />
                      My orders
                    </Link>
                    <Link className="account-menu__item" to="/emcard" role="menuitem">
                      <i className="bi bi-gift" aria-hidden="true" />
                      e-Mcard &amp; rewards
                    </Link>
                    <Link
                      className="account-menu__item"
                      to="/edit-profile"
                      role="menuitem"
                    >
                      <i className="bi bi-pencil-square" aria-hidden="true" />
                      Edit profile
                    </Link>
                    <Link
                      className="account-menu__item"
                      to="/change-password"
                      role="menuitem"
                    >
                      <i className="bi bi-key" aria-hidden="true" />
                      Change password
                    </Link>

                    {isAdmin() && (
                      <>
                        <div className="account-menu__divider" />
                        <Link className="account-menu__item" to="/admin" role="menuitem">
                          <i className="bi bi-speedometer2" aria-hidden="true" />
                          Admin dashboard
                        </Link>
                      </>
                    )}

                    <div className="account-menu__divider" />
                    <button
                      type="button"
                      className="account-menu__item account-menu__item--danger"
                      onClick={handleLogout}
                      role="menuitem"
                    >
                      <i className="bi bi-box-arrow-right" aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="header-action">
                <i className="bi bi-person-circle header-action__icon" aria-hidden="true" />
                <span className="header-action__label">
                  <span className="header-action__label-top">Sign in</span>
                  <span>Account</span>
                </span>
              </Link>
            )}

            <button
              type="button"
              className="header-action header-cart"
              onClick={openCart}
              aria-label={`Open cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            >
              <i className="bi bi-cart3 header-action__icon" aria-hidden="true" />
              <span className="header-action__label">
                <span className="header-action__label-top">My</span>
                <span>Cart</span>
              </span>
              {cartCount > 0 && (
                <span className="header-cart__badge" aria-hidden="true">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ------------------------------------------- CATEGORY NAVIGATION */}
        <nav className="cat-nav" aria-label="Product categories">
          <div className="container-page cat-nav__inner scroll-area">
            <Link
              to="/"
              className={`cat-nav__item ${
                onHome && !activeCategory ? "cat-nav__item--active" : ""
              }`}
            >
              <i className="bi bi-grid-fill" aria-hidden="true" />
              All categories
            </Link>

            {categoryGroups.map((group) => (
              <Link
                key={group.catId}
                to={`/?category=${encodeURIComponent(group.catId)}`}
                className={`cat-nav__item ${
                  String(activeCategory) === String(group.catId)
                    ? "cat-nav__item--active"
                    : ""
                }`}
              >
                {group.catName}
              </Link>
            ))}

            <span className="cat-nav__spacer" />

            {!isEmcardMember && (
              <Link to="/emcard/join" className="cat-nav__item cat-nav__item--accent">
                <i className="bi bi-gift-fill" aria-hidden="true" />
                Join e-Mcard
              </Link>
            )}
            <Link to="/about" className="cat-nav__item">
              About us
            </Link>
            <Link to="/contact" className="cat-nav__item">
              Contact
            </Link>
          </div>
        </nav>
      </header>

      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        categoryGroups={categoryGroups}
        activeCategory={activeCategory}
        signedIn={signedIn}
        user={user}
        isAdmin={isAdmin()}
        isEmcardMember={isEmcardMember}
        emcardPoints={emcardTotalPoints}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
      />
    </>
  );
}
