import { Link } from "react-router-dom";
import useBodyScrollLock from "../hooks/useBodyScrollLock";
import useDismissLayer from "../hooks/useDismissLayer";
import { PointsPill } from "./ui/Loyalty";

/**
 * MobileNav.jsx
 * ------------------------------------------------------------------
 * The phone and tablet navigation drawer.
 *
 * This is a genuinely different layout, not the desktop bar at a smaller
 * size. On a phone the important things are: who am I signed in as, what are
 * my points worth, which category do I want, and where are my orders - so
 * those are the four things the drawer leads with, in that order, at
 * comfortable 44px+ tap targets.
 *
 * The previous mobile experience relied on Bootstrap's collapse plugin to
 * expand the desktop navbar downwards, which produced a cramped stack of
 * small links and depended on the Bootstrap JS bundle being loaded. This
 * needs no JavaScript library at all.
 * ------------------------------------------------------------------
 */
export default function MobileNav({
  open,
  onClose,
  categoryGroups = [],
  activeCategory,
  signedIn,
  user,
  isAdmin,
  isEmcardMember,
  emcardPoints,
  isDark,
  onToggleTheme,
  onLogout,
}) {
  useDismissLayer(open, onClose);
  useBodyScrollLock(open);

  if (!open) return null;

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Guest";

  return (
    <>
      {/* Same rule as the cart drawer: the backdrop owns the outside-click. */}
      <div className="ui-overlay" onClick={onClose} aria-hidden="true" />

      <div
        className="mobile-nav"
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
      >
        <div className="mobile-nav__header">
          <span className="brand">
            <span className="brand__mark" aria-hidden="true">
              E
            </span>
            <span className="brand__text">
              <span className="brand__name">
                <em>E</em>-Mart
              </span>
            </span>
          </span>

          <button
            type="button"
            className="ui-icon-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        {/* Identity first: on a small screen this is the fastest way to
            answer "am I signed in, and what do I have to spend". */}
        {signedIn ? (
          <div className="mobile-nav__identity">
            <span className="account-menu__avatar" aria-hidden="true">
              {(user?.firstName?.[0] || user?.email?.[0] || "U").toUpperCase()}
            </span>
            <div>
              <div className="mobile-nav__identity-name">{displayName}</div>
              <div className="mobile-nav__identity-meta">
                {isEmcardMember
                  ? `${emcardPoints} e-Mcard points`
                  : "Not an e-Mcard member yet"}
              </div>
            </div>
          </div>
        ) : (
          <div className="mobile-nav__identity">
            <i className="bi bi-person-circle" style={{ fontSize: "2rem" }} aria-hidden="true" />
            <div>
              <div className="mobile-nav__identity-name">Welcome to E-Mart</div>
              <div className="mobile-nav__identity-meta">
                Sign in for faster checkout
              </div>
            </div>
          </div>
        )}

        <div className="mobile-nav__body scroll-area">
          <div className="mobile-nav__group-title">Shop by category</div>

          <Link
            to="/"
            className={`mobile-nav__link ${
              !activeCategory ? "mobile-nav__link--active" : ""
            }`}
            onClick={onClose}
          >
            <i className="bi bi-grid-fill" aria-hidden="true" />
            All categories
          </Link>

          {categoryGroups.map((group) => (
            <Link
              key={group.catId}
              to={`/?category=${encodeURIComponent(group.catId)}`}
              className={`mobile-nav__link ${
                String(activeCategory) === String(group.catId)
                  ? "mobile-nav__link--active"
                  : ""
              }`}
              onClick={onClose}
            >
              <i className="bi bi-tag" aria-hidden="true" />
              {group.catName}
              <span className="mobile-nav__count">{group.count}</span>
            </Link>
          ))}

          <div className="mobile-nav__group-title">My account</div>

          {signedIn ? (
            <>
              <Link to="/profile" className="mobile-nav__link" onClick={onClose}>
                <i className="bi bi-person" aria-hidden="true" />
                My profile
              </Link>
              <Link to="/orders" className="mobile-nav__link" onClick={onClose}>
                <i className="bi bi-bag-check" aria-hidden="true" />
                My orders
              </Link>
              <Link to="/emcard" className="mobile-nav__link" onClick={onClose}>
                <i className="bi bi-gift" aria-hidden="true" />
                e-Mcard &amp; rewards
                {isEmcardMember && (
                  <span className="mobile-nav__count">{emcardPoints} pts</span>
                )}
              </Link>
              <Link
                to="/change-password"
                className="mobile-nav__link"
                onClick={onClose}
              >
                <i className="bi bi-key" aria-hidden="true" />
                Change password
              </Link>
              {isAdmin && (
                <Link to="/admin" className="mobile-nav__link" onClick={onClose}>
                  <i className="bi bi-speedometer2" aria-hidden="true" />
                  Admin dashboard
                </Link>
              )}
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-nav__link" onClick={onClose}>
                <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
                Sign in
              </Link>
              <Link to="/register" className="mobile-nav__link" onClick={onClose}>
                <i className="bi bi-person-plus" aria-hidden="true" />
                Create an account
              </Link>
            </>
          )}

          <div className="mobile-nav__group-title">More</div>

          {!isEmcardMember && (
            <Link to="/emcard/join" className="mobile-nav__link" onClick={onClose}>
              <i className="bi bi-gift-fill" aria-hidden="true" />
              Join e-Mcard — it's free
            </Link>
          )}
          <Link to="/about" className="mobile-nav__link" onClick={onClose}>
            <i className="bi bi-info-circle" aria-hidden="true" />
            About us
          </Link>
          <Link to="/contact" className="mobile-nav__link" onClick={onClose}>
            <i className="bi bi-headset" aria-hidden="true" />
            Contact us
          </Link>

          <button
            type="button"
            className="mobile-nav__link"
            onClick={onToggleTheme}
            aria-pressed={isDark}
          >
            <i
              className={`bi ${isDark ? "bi-sun-fill" : "bi-moon-stars"}`}
              aria-hidden="true"
            />
            {isDark ? "Light mode" : "Dark mode"}
          </button>
        </div>

        <div className="mobile-nav__footer">
          {signedIn && isEmcardMember && <PointsPill points={emcardPoints} />}

          {signedIn ? (
            <button
              type="button"
              className="mobile-nav__link mobile-nav__link--danger"
              onClick={() => {
                onClose();
                onLogout();
              }}
            >
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
              Sign out
            </button>
          ) : (
            <Link
              to="/login"
              className="ui-btn ui-btn--primary ui-btn--block"
              onClick={onClose}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
