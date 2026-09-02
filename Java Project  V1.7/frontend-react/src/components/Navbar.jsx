import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Navbar.jsx
 * ------------------------------------------------------------------
 * Single-tier storefront nav bar: logo, nav links (Home / Pages /
 * About Us / Contact Us / Admin Dashboard for admins), a search box,
 * and Sign In/Register or the account dropdown.
 *
 * The old 3-tier layout (a decorative top utility bar with
 * email/phone/currency/language, plus a separate logo+search+
 * wishlist/cart bar) was removed per request - the topbar's
 * decorative currency/language toggles and the non-wired wishlist/
 * cart icon buttons are gone, and the still-functional pieces
 * (logo, search, Sign In/Register / account dropdown) were folded
 * into this one bar so none of the real functionality was lost.
 * SHOP and BLOG were also removed from the nav links (dead labels -
 * no matching routes exist).
 *
 * NOT changed: useAuth(), handleLogout(), any real route path, or
 * the conditions under which links/dropdown items appear.
 *
 * Search bar: this Navbar only renders on non-"/" routes (Home
 * renders its own header+search on "/" - see App.jsx). Submitting
 * here navigates to "/?search=<term>", which Home reads on mount and
 * uses to kick off the real GET /api/product/search request.
 *
 * Still UI-only / not wired up:
 *   - Pages / About Us: plain text, NOT <Link> components, because
 *     no matching routes exist yet. Swap for real <Link to="..."> once
 *     those pages are built.
 * ------------------------------------------------------------------
 */
export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();

    const trimmed = searchTerm.trim();

    navigate(
      trimmed ? `/?search=${encodeURIComponent(trimmed)}` : "/"
    );
  };

  return (
    <header className="em-header">
      <nav className="em-navbar navbar navbar-expand-lg bg-white border-bottom">
        <div className="container d-flex align-items-center flex-wrap gap-3 py-2">
          <Link
            className="navbar-brand d-flex align-items-center gap-2 fw-bold fs-4 mb-0"
            to="/"
          >
            <i className="bi bi-shop text-warning"></i>
            <span>E-Mart</span>
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarContent"
            aria-controls="navbarContent"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarContent">
            <ul className="navbar-nav align-items-lg-center me-3">
              <li className="nav-item">
                <Link className="nav-link fw-semibold" to="/">
                  HOME
                </Link>
              </li>

              {/*
                No routes exist yet for these - kept as static labels
                instead of <Link> to avoid dead links / 404s. Replace
                with <Link to="/pages"> etc. once those pages exist.
              */}
              <li className="nav-item">
                <span className="nav-link fw-semibold">PAGES</span>
              </li>
              <li className="nav-item">
                <span className="nav-link fw-semibold">ABOUT US</span>
              </li>
              <li className="nav-item">
                <Link className="nav-link fw-semibold" to="/contact">
                  CONTACT US
                </Link>
              </li>

              {isAuthenticated() && isAdmin() && (
                <li className="nav-item">
                  <Link className="nav-link fw-semibold" to="/admin">
                    ADMIN DASHBOARD
                  </Link>
                </li>
              )}
            </ul>

            <form
              className="em-search-form d-flex flex-grow-1 me-3"
              role="search"
              onSubmit={handleSearchSubmit}
            >
              <input
                type="search"
                className="form-control"
                placeholder="Enter your search key ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search"
              />
              <button
                className="btn btn-warning fw-semibold px-3"
                type="submit"
                aria-label="Search"
              >
                <i className="bi bi-search me-1"></i>
                Search
              </button>
            </form>

            <div className="d-flex align-items-center gap-3 ms-lg-auto">
              {!isAuthenticated() ? (
                <Link to="/login" className="fw-semibold text-decoration-none">
                  Sign In / Register
                </Link>
              ) : (
                <div className="dropdown">
                  <button
                    className="btn btn-sm btn-link text-decoration-none dropdown-toggle p-0 fw-semibold"
                    type="button"
                    id="userMenu"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    Hi, {user?.firstName || user?.email}
                  </button>
                  <ul
                    className="dropdown-menu dropdown-menu-end shadow-sm"
                    aria-labelledby="userMenu"
                  >
                    <li>
                      <Link className="dropdown-item" to="/profile">
                        <i className="bi bi-person me-2"></i>Profile
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/edit-profile">
                        <i className="bi bi-pencil-square me-2"></i>Edit Profile
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/change-password">
                        <i className="bi bi-key me-2"></i>Change Password
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/orders">
                        <i className="bi bi-receipt me-2"></i>My Orders
                      </Link>
                    </li>
                    {isAdmin() && (
                      <li>
                        <Link className="dropdown-item" to="/admin">
                          <i className="bi bi-speedometer2 me-2"></i>Admin
                          Dashboard
                        </Link>
                      </li>
                    )}
                    <li>
                      <hr className="dropdown-divider" />
                    </li>
                    <li>
                      <button
                        className="dropdown-item text-danger"
                        onClick={handleLogout}
                      >
                        <i className="bi bi-box-arrow-right me-2"></i>Logout
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
