import { Link } from "react-router-dom";

/**
 * Breadcrumbs.jsx
 * ------------------------------------------------------------------
 * Shows where the shopper is in the Category -> Brand -> Product drill-down
 * and, crucially, lets them step back up it.
 *
 * The previous breadcrumb was display-only text ("Home / Electronics /
 * Product Details") with nothing clickable, so the single "Back" button was
 * the only way up - two levels deep that meant two round trips.
 *
 * Each item is either { label, to } (a route), { label, onClick } (a step in
 * the home page's own view state) or just { label } for the current page.
 * ------------------------------------------------------------------
 */
export default function Breadcrumbs({ items = [], className = "" }) {
  if (!items.length) return null;

  return (
    <nav className={`breadcrumbs ${className}`} aria-label="Breadcrumb">
      <ol className="breadcrumbs" style={{ margin: 0, display: "contents" }}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li
              key={`${item.label}-${index}`}
              style={{ display: "contents" }}
            >
              {isLast || (!item.to && !item.onClick) ? (
                <span
                  className={isLast ? "breadcrumbs__current" : undefined}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : item.to ? (
                <Link to={item.to} className="breadcrumbs__link">
                  {item.label}
                </Link>
              ) : (
                <button
                  type="button"
                  className="breadcrumbs__link"
                  onClick={item.onClick}
                >
                  {item.label}
                </button>
              )}

              {!isLast && (
                <span className="breadcrumbs__sep" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
