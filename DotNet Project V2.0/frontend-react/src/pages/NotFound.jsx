import Button from "../components/ui/Button";

/**
 * NotFound.jsx
 * ------------------------------------------------------------------
 * A real 404 page.
 *
 * The catch-all route previously rendered the home page for any unknown
 * URL. That silently hides broken links - a typo'd or stale address shows a
 * perfectly normal shop, so nobody ever reports it and the analytics never
 * flag it. Saying "this page doesn't exist" is both more honest and more
 * useful, provided it offers a way onwards, which is what the two actions
 * below are for.
 * ------------------------------------------------------------------
 */
export default function NotFound() {
  return (
    <div className="container-narrow page">
      <div className="ui-state" style={{ borderStyle: "solid" }}>
        <span className="ui-state__icon" aria-hidden="true">
          <i className="bi bi-compass" />
        </span>

        <p className="overline">Error 404</p>
        <h1 className="ui-state__title">We couldn't find that page</h1>
        <p className="ui-state__message">
          The link may be out of date, or the page may have moved. Everything
          else in the shop is still where you left it.
        </p>

        <div className="ui-state__actions">
          <Button variant="primary" to="/" icon="bi-house">
            Back to the shop
          </Button>
          <Button variant="outline" to="/orders" icon="bi-bag-check">
            My orders
          </Button>
        </div>
      </div>
    </div>
  );
}
