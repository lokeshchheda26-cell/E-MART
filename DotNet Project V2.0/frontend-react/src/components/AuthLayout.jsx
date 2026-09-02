import { Link } from "react-router-dom";

/**
 * AuthLayout.jsx
 * ------------------------------------------------------------------
 * The shared shell for Login / Register / Forgot password / Reset password.
 *
 * A split layout: brand and reassurance on the left, the form on the right.
 * The left panel is decorative and is dropped entirely below the large
 * breakpoint - on a phone, screen height belongs to the form, not to a
 * gradient. The slim top bar is always rendered so that even without the
 * panel there is still a logo and a way back to the shop.
 *
 * Purely presentational: no API calls, no auth logic, no context. It lays
 * out whatever it is passed.
 * ------------------------------------------------------------------
 */
export default function AuthLayout({
  heading,
  subheading,
  features,
  children,
  maxWidth = "460px",
}) {
  return (
    <div className="focus-shell">
      <header className="focus-shell__topbar">
        <Link to="/" className="brand" aria-label="E-Mart home">
          <span className="brand__mark" aria-hidden="true">
            E
          </span>
          <span className="brand__text">
            <span className="brand__name">
              <em>E</em>-Mart
            </span>
          </span>
        </Link>

        <Link to="/" className="focus-shell__back">
          <i className="bi bi-arrow-left" aria-hidden="true" />
          <span>Back to shop</span>
        </Link>
      </header>

      <div className="auth-layout">
        <aside className="auth-layout__aside" aria-hidden="true">
          <div className="auth-layout__aside-content">
            <h2 className="auth-layout__heading">{heading}</h2>
            <p className="auth-layout__sub">{subheading}</p>

            {features?.length > 0 && (
              <div className="auth-layout__features">
                {features.map((feature) => (
                  <div className="auth-layout__feature" key={feature.text}>
                    <i className={`bi ${feature.icon}`} />
                    <span>{feature.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="auth-layout__form-area">
          <div className="auth-card" style={{ maxWidth }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
