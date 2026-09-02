import { Link } from "react-router-dom";

/**
 * SectionHeader.jsx
 * ------------------------------------------------------------------
 * The heading block above every content band: optional eyebrow, a title, an
 * optional supporting line, and an optional action on the right.
 *
 * It always renders a real heading element (level configurable) so the page
 * keeps a sensible document outline for screen readers and for the browser's
 * own "jump to heading" navigation - the previous markup used styled <div>s
 * in several places, which left some pages with no headings at all.
 * ------------------------------------------------------------------
 */
export default function SectionHeader({
  eyebrow = null,
  title,
  subtitle = null,
  action = null,
  actionTo = null,
  actionLabel = null,
  as: Heading = "h2",
  className = "",
}) {
  return (
    <div className={`ui-section-head ${className}`}>
      <div>
        {eyebrow && <span className="ui-section-head__eyebrow">{eyebrow}</span>}
        <Heading className="ui-section-head__title">{title}</Heading>
        {subtitle && <p className="ui-section-head__subtitle">{subtitle}</p>}
      </div>

      {action ||
        (actionTo && actionLabel && (
          <Link to={actionTo} className="ui-btn ui-btn--ghost ui-btn--sm">
            <span>{actionLabel}</span>
            <i className="bi bi-arrow-right" aria-hidden="true" />
          </Link>
        ))}
    </div>
  );
}
