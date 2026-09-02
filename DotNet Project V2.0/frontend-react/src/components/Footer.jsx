import { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../context/ToastContext";

/**
 * Footer.jsx
 * ------------------------------------------------------------------
 * The shared site footer, rendered on every route that has site chrome.
 *
 * It replaces two things: a one-line "Copyright 2026 eMart" bar, and a
 * duplicate copy of that same markup that was inlined separately in
 * App.jsx's home page. There is now exactly one footer component.
 *
 * Three bands:
 *   1. trust signals - delivery, returns, secure payment, support. These
 *      are the reassurances that decide whether a first-time visitor is
 *      willing to enter card details at all.
 *   2. navigation + brand.
 *   3. legal, payment methods.
 *
 * HONESTY NOTE: the newsletter form is front-end only - there is no
 * subscription endpoint in the backend. Rather than pretend otherwise, it
 * confirms locally and says so, and the comment below flags it as the one
 * place that needs an API when someone builds one. It sends nothing
 * anywhere and stores nothing.
 * ------------------------------------------------------------------
 */

const TRUST_SIGNALS = [
  {
    icon: "bi-truck",
    title: "Free delivery over ₹499",
    text: "Same-day delivery available in serviced areas",
  },
  {
    icon: "bi-shield-check",
    title: "Secure payments",
    text: "Cards, UPI, netbanking and wallets via Razorpay",
  },
  {
    icon: "bi-gift",
    title: "e-Mcard rewards",
    text: "Earn points on every eligible order",
  },
  {
    icon: "bi-headset",
    title: "Help when you need it",
    text: "Reach our team through the contact page",
  },
];

export default function Footer() {
  const toast = useToast();
  const [email, setEmail] = useState("");

  const handleSubscribe = (event) => {
    event.preventDefault();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.warning("Please enter a valid email address.");
      return;
    }

    // TODO: no subscription endpoint exists on the backend yet. When one is
    // added, call it here. Until then this deliberately does not claim the
    // address was stored anywhere.
    toast.success("Thanks! We'll be in touch once subscriptions go live.");
    setEmail("");
  };

  return (
    <>
      {/* --------------------------------------------------- NEWSLETTER */}
      <section className="newsletter" aria-labelledby="newsletter-title">
        <div className="container-page newsletter__inner">
          <div>
            <h2 className="newsletter__title" id="newsletter-title">
              Never miss a deal
            </h2>
            <p className="newsletter__text">
              Get early access to flash sales and e-Mcard member offers,
              straight to your inbox.
            </p>
          </div>

          <div>
            <form className="newsletter__form" onSubmit={handleSubscribe}>
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                className="newsletter__input"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
              <button type="submit" className="ui-btn ui-btn--accent ui-btn--lg">
                Subscribe
              </button>
            </form>
            <p className="newsletter__note">
              No spam. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- FOOTER */}
      <footer className="site-footer">
        <div className="site-footer__trust">
          <div className="container-page site-footer__trust-grid">
            {TRUST_SIGNALS.map((signal) => (
              <div className="trust-item" key={signal.title}>
                <span className="trust-item__icon" aria-hidden="true">
                  <i className={`bi ${signal.icon}`} />
                </span>
                <div>
                  <div className="trust-item__title">{signal.title}</div>
                  <div className="trust-item__text">{signal.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="container-page site-footer__main">
          <div className="site-footer__about">
            <span className="brand">
              <span className="brand__mark" aria-hidden="true">
                E
              </span>
              <span className="brand__text">
                <span className="brand__name">
                  <em>E</em>-Mart
                </span>
                <span className="brand__tagline">Everyday low prices</span>
              </span>
            </span>

            <p className="site-footer__blurb">
              Groceries, electronics, beverages and everyday essentials at
              honest prices — with an e-Mcard loyalty programme that pays you
              back on every order.
            </p>

            <div className="site-footer__social">
              <a href="#!" aria-label="E-Mart on Facebook">
                <i className="bi bi-facebook" aria-hidden="true" />
              </a>
              <a href="#!" aria-label="E-Mart on Instagram">
                <i className="bi bi-instagram" aria-hidden="true" />
              </a>
              <a href="#!" aria-label="E-Mart on X">
                <i className="bi bi-twitter-x" aria-hidden="true" />
              </a>
              <a href="#!" aria-label="E-Mart on YouTube">
                <i className="bi bi-youtube" aria-hidden="true" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="site-footer__col-title">Shop</h3>
            <div className="site-footer__links">
              <Link to="/">All categories</Link>
              <Link to="/?category=GRO">Grocery</Link>
              <Link to="/?category=ELE">Electronics</Link>
              <Link to="/?category=BEV">Beverages</Link>
            </div>
          </div>

          <div>
            <h3 className="site-footer__col-title">My account</h3>
            <div className="site-footer__links">
              <Link to="/profile">Profile</Link>
              <Link to="/orders">Orders &amp; invoices</Link>
              <Link to="/emcard">e-Mcard &amp; rewards</Link>
              <Link to="/checkout">Cart</Link>
            </div>
          </div>

          <div>
            <h3 className="site-footer__col-title">Company</h3>
            <div className="site-footer__links">
              <Link to="/about">About us</Link>
              <Link to="/contact">Contact us</Link>
              <Link to="/emcard/join">Join e-Mcard</Link>
            </div>
          </div>
        </div>

        <div className="site-footer__bottom">
          <div className="container-page site-footer__bottom-inner">
            <span>© {new Date().getFullYear()} E-Mart. All rights reserved.</span>

            <span className="site-footer__payments" aria-label="Accepted payment methods">
              <i className="bi bi-credit-card-2-front" aria-hidden="true" />
              <i className="bi bi-phone" aria-hidden="true" />
              <i className="bi bi-bank" aria-hidden="true" />
              <i className="bi bi-wallet2" aria-hidden="true" />
              <i className="bi bi-cash-stack" aria-hidden="true" />
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
