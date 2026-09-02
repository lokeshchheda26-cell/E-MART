import { Link } from 'react-router-dom';

/**
 * AuthLayout.jsx
 * ------------------------------------------------------------------
 * NEW FILE - shared shell for Login / Register / ForgotPassword.
 *
 * Why this exists: all three pages asked for the same "split layout,
 * left illustration, right glass card" look. Rather than copy-pasting
 * that markup into three files (and the decorative CSS circles/gradient
 * with it), it lives here once. Each page just supplies its own form
 * as children plus a heading/subheading for the left panel.
 *
 * This component is purely presentational - it renders no API calls,
 * no auth logic, nothing that touches AuthContext. It only lays out
 * whatever is passed to it.
 * ------------------------------------------------------------------
 */
export default function AuthLayout({ heading, subheading, features, children, maxWidth = '480px' }) {
  return (
    <div className="em-auth-page">
      {/*
        Slim standalone header - replaces the full site Navbar/Topbar on
        auth pages (App.jsx skips those here). Always rendered so that on
        small screens - where the illustration panel below is hidden -
        there is still a logo and a way back to the store.
      */}
      <header className="em-auth-topbar">
        <Link to="/" className="em-auth-topbar-brand">
          <i className="bi bi-shop"></i>
          <span>E-Mart</span>
        </Link>
        <Link to="/" className="em-auth-topbar-back">
          <i className="bi bi-arrow-left"></i>
          <span>Back to store</span>
        </Link>
      </header>

      <div className="em-auth-shell">
        {/* Left panel: decorative only, hidden on small screens (see index.css) */}
        <div className="em-auth-illustration col-lg-5">
          <div className="em-auth-illustration-content">
            <h2 className="fw-bold mb-3">{heading}</h2>
            <p className="mb-0 opacity-75">{subheading}</p>

            {features && features.length > 0 && (
              <div className="mt-4">
                {features.map((feature) => (
                  <div className="em-auth-feature" key={feature.text}>
                    <i className={`bi ${feature.icon}`}></i>
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: the actual form, passed in as children */}
        <div className="em-auth-form-area col-lg-7">
          <div className="em-glass-card em-fade-in p-4 p-md-5" style={{ maxWidth }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
