/**
 * Footer.jsx
 * ------------------------------------------------------------------
 * Shared site footer for every route EXCEPT "/", which already
 * renders its own inline footer inside App.jsx's Home() component
 * (same markup/classes, so the two look identical). Rendered by
 * AppRoutes alongside <Navbar/> - see the `showNavbar` check in
 * App.jsx.
 * ------------------------------------------------------------------
 */
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span>E</span>MART
        </div>

        <div className="footer-copy">
          Copyright 2026 eMart. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
