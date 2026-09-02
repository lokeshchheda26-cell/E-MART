/**
 * AboutUs.jsx
 * ------------------------------------------------------------------
 * Static "About Us" page - what the project is, and who built it.
 *
 * Built from the shared design system (cards, buttons, breadcrumbs,
 * account layout) rather than raw Bootstrap utilities, so it reads as part
 * of the same application as the storefront. The content is static because
 * there is no CMS behind it - nothing here pretends to be dynamic.
 * ------------------------------------------------------------------
 */

const TEAM_MEMBERS = [
  "Nikhil Deokar",
  "Rishikesh Darunte",
  "Shubham Shahu",
  "Tanay Bangale",
  "Pratik Shedge",
  "Anand Tripathi",
  "Kunal Bhoriya",
  "Akshada Shenkar",
  "Lokesh Cheeda",
];

import Breadcrumbs from "../components/ui/Breadcrumbs";
import Button from "../components/ui/Button";
import "../styles/account.css";

function initialsFor(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function AboutUs() {
  return (
    <div className="container-page page">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "About us" }]} />

      <section className="content-hero">
        <span className="ui-badge ui-badge--accent">About E-Mart</span>
        <h1 className="content-hero__title" style={{ marginTop: "var(--space-4)" }}>
          A full shopping experience, built end to end
        </h1>
        <p className="content-hero__text">
          E-Mart is a full-stack e-commerce storefront: browsing categories and
          products, an e-Mcard loyalty and points programme, cart and checkout
          with real payments, order history and account management — all backed
          by a live API and database rather than static mock data.
        </p>
      </section>

      <div className="account-layout">
        <div className="account-main">
          <section className="ui-card">
            <div className="ui-card__body">
              <h2 className="ui-card__title" style={{ marginBottom: "var(--space-3)" }}>
                What we built
              </h2>
              <p className="pdp-panel__text">
                The frontend is a React and Vite single-page application with a
                shared design system, route-level code splitting and a service
                layer that keeps every API call in one place. The storefront
                covers the whole customer journey: search and category
                drill-down, product detail, a persisted cart, a four-mode
                loyalty pricing engine, Razorpay checkout, and printable
                invoices.
              </p>
            </div>
          </section>

          <section className="ui-card">
            <div className="ui-card__body">
              <h2 className="ui-card__title" style={{ marginBottom: "var(--space-4)" }}>
                Development team
              </h2>
              <div className="team-grid">
                {TEAM_MEMBERS.map((name) => (
                  <div className="team-card" key={name}>
                    <span className="team-card__avatar" aria-hidden="true">
                      {initialsFor(name)}
                    </span>
                    <div>
                      <div className="team-card__name">{name}</div>
                      <div className="cat-tile__count">Team member</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="account-aside">
          <div className="ui-card">
            <div className="ui-card__body">
              <h2 className="ui-card__title" style={{ marginBottom: "var(--space-3)" }}>
                What makes it different
              </h2>
              <div className="account-links">
                <span className="account-link">
                  <i className="bi bi-gift" aria-hidden="true" />
                  A real loyalty programme, not a points counter
                </span>
                <span className="account-link">
                  <i className="bi bi-shield-check" aria-hidden="true" />
                  Server-authoritative pricing on every screen
                </span>
                <span className="account-link">
                  <i className="bi bi-phone" aria-hidden="true" />
                  Designed for phones, not just shrunk for them
                </span>
              </div>
            </div>
          </div>

          <Button variant="accent" block to="/" icon="bi-bag">
            Start shopping
          </Button>
          <Button variant="outline" block to="/contact" icon="bi-headset">
            Contact us
          </Button>
        </aside>
      </div>
    </div>
  );
}
