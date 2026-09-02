import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { joinEmcardMembership } from "../services/emcardService";
import { useAuth } from "../context/AuthContext";
import { useEmcard } from "../context/EmcardContext";
import { useToast } from "../context/ToastContext";
import { USER_KEY } from "../api/axiosConfig";
import * as userApi from "../api/userApi";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Button from "../components/ui/Button";
import FormInput from "../components/FormInput";
import { EmcardVisual } from "../components/ui/Loyalty";
import { Alert, LoadingBlock } from "../components/ui/Feedback";
import "../styles/emcard.css";

/**
 * JoinEmcard.jsx - the e-Mcard page
 * ------------------------------------------------------------------
 * Serves /emcard and /emcard/join, and adapts to who is looking:
 *
 *   GUEST       the programme explained, plus a route to sign up. /emcard
 *               is public on purpose - "how does this work" is a question
 *               someone should be able to answer BEFORE creating an account.
 *   NON-MEMBER  the same explanation plus the join form.
 *   MEMBER      their card, live balance, and how points are applied.
 *
 * JOINING IS UNCHANGED. There is no payment step: membership has no
 * monetary cost in this data model, it is an opt-in that grants a one-time
 * 100-point joining bonus, identical to ticking eMCard at signup. The form
 * still confirms phone and address first (membership benefits are only
 * useful with working contact details on file) and still saves them via
 * updateProfile before calling joinEmcardMembership, then merges the result
 * into the cached user exactly as before.
 *
 * WHAT CHANGED: the programme now looks like a programme. A real card with
 * the live balance, the four purchase modes explained in plain language, and
 * the benefits stated before the form rather than as a bullet list beneath
 * a heading. No business rule is touched - every number shown comes from the
 * existing summary endpoint.
 * ------------------------------------------------------------------
 */

const BENEFITS = [
  {
    icon: "bi-tag-fill",
    title: "Member pricing",
    text: "A lower cash price on eligible products. Tick the offer on the product and the price updates before you add it to your cart.",
  },
  {
    icon: "bi-coin",
    title: "Redeem your points",
    text: "Pay for eligible items partly or entirely with points. It is your choice, per item — never applied without you asking.",
  },
  {
    icon: "bi-arrow-repeat",
    title: "Earn as you shop",
    text: "Every eligible order credits points back to your balance at the current rate, ready for the next one.",
  },
  {
    icon: "bi-gift-fill",
    title: "100 points to start",
    text: "A one-time joining bonus lands in your balance the moment you join. Free, no card fee, no minimum spend.",
  },
];

// The four purchase modes, in the shopper's language rather than the
// backend's. The engine that decides which one applies is server-side; this
// is only an explanation of what each one means when you meet it.
const HOW_IT_WORKS = [
  {
    label: "Cash only",
    text: "No e-Mcard offer on this product. You pay the listed price, and still earn points on it.",
  },
  {
    label: "e-Mcard price",
    text: "A lower cash price for members. No points are spent — you simply pay less.",
  },
  {
    label: "Full redemption",
    text: "Pay for the item entirely with points. No cash for that line at all.",
  },
  {
    label: "Cash + points",
    text: "Part cash, part points. Both halves are shown before you commit.",
  },
];

export default function JoinEmcard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, isAuthenticated } = useAuth();
  const { emcardTotalPoints, isEmcardMember } = useEmcard();
  const toast = useToast();

  const signedIn = isAuthenticated();
  // /emcard/join goes straight to the form; /emcard leads with the pitch.
  const wantsToJoin = location.pathname.endsWith("/join");

  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({ phone: "", address: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(signedIn && !isEmcardMember);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!signedIn || isEmcardMember) {
      setLoading(false);
      return undefined;
    }

    let isMounted = true;

    async function fetchProfile() {
      try {
        const data = await userApi.getProfile();
        if (isMounted) {
          setProfile(data);
          setFormData({ phone: data.phone || "", address: data.address || "" });
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "Unable to load your details right now."
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [signedIn, isEmcardMember]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => ({ ...previous, [name]: "" }));
  };

  const validate = () => {
    const errors = {};
    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required.";
    } else if (!/^\d{10}$/.test(formData.phone.trim())) {
      errors.phone = "Phone number must be 10 digits.";
    }
    if (!formData.address.trim()) {
      errors.address = "Address is required.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!validate()) return;

    setSubmitting(true);
    try {
      // Save the confirmed contact details first - membership benefits
      // (delivery of eMCard-priced items, redemption notices) depend on
      // having a real phone and address on file.
      const updatedProfile = await userApi.updateProfile({
        ...profile,
        phone: formData.phone.trim(),
        address: formData.address.trim(),
      });

      await joinEmcardMembership();

      const existingUser = JSON.parse(localStorage.getItem(USER_KEY) || "{}");
      const mergedUser = {
        ...existingUser,
        phone: updatedProfile.phone,
        address: updatedProfile.address,
        isEmcardMember: true,
      };
      localStorage.setItem(USER_KEY, JSON.stringify(mergedUser));
      setUser(mergedUser);

      setJoined(true);
      toast.loyalty("Welcome to e-Mcard — 100 bonus points added.");
      setTimeout(() => navigate("/", { replace: true }), 1800);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to join e-Mcard right now. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const holderName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || undefined;

  /* ------------------------------------------------------------ RENDER */

  return (
    <div className="container-page page">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "e-Mcard" }]} />

      {/* ------------------------------------------------------- HERO */}
      <section className="emcard-hero">
        <div>
          <span className="ui-badge ui-badge--solid-loyalty">
            <i className="bi bi-gift-fill" aria-hidden="true" /> Loyalty programme
          </span>

          <h1 className="emcard-hero__title">
            {isEmcardMember
              ? "Your e-Mcard"
              : "e-Mcard — the card that pays you back"}
          </h1>

          <p className="emcard-hero__text">
            {isEmcardMember
              ? "Your points are applied at checkout on eligible products. Look for the violet offer badge while you browse — that is where your balance goes furthest."
              : "Free to join. Members get lower prices on eligible products, can redeem points against orders, and earn points back on everything they buy."}
          </p>

          {isEmcardMember && (
            <div className="emcard-hero__stats">
              <div className="emcard-stat">
                <div className="emcard-stat__value">
                  {emcardTotalPoints.toLocaleString("en-IN")}
                </div>
                <div className="emcard-stat__label">Points available</div>
              </div>
              <div className="emcard-stat">
                <div className="emcard-stat__value">Active</div>
                <div className="emcard-stat__label">Membership status</div>
              </div>
            </div>
          )}

          <div className="emcard-hero__actions">
            {isEmcardMember ? (
              <>
                <Button variant="loyalty" size="lg" to="/" icon="bi-bag">
                  Shop member offers
                </Button>
                <Button variant="outline" size="lg" to="/orders" icon="bi-clock-history">
                  Points history
                </Button>
              </>
            ) : signedIn ? (
              <Button
                variant="loyalty"
                size="lg"
                iconEnd="bi-arrow-down"
                onClick={() =>
                  document
                    .getElementById("join-form")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
              >
                Join now — it's free
              </Button>
            ) : (
              <>
                <Button variant="loyalty" size="lg" to="/register" icon="bi-person-plus">
                  Create an account
                </Button>
                <Button variant="outline" size="lg" to="/login">
                  I already have one
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="emcard-hero__card">
          <EmcardVisual
            points={emcardTotalPoints}
            isMember={isEmcardMember}
            holderName={holderName}
          />
        </div>
      </section>

      {/* --------------------------------------------------- BENEFITS */}
      <section className="emcard-section">
        <h2 className="ui-section-head__title">What you get</h2>
        <div className="emcard-benefits">
          {BENEFITS.map((benefit) => (
            <div className="emcard-benefit-card" key={benefit.title}>
              <span className="emcard-benefit-card__icon" aria-hidden="true">
                <i className={`bi ${benefit.icon}`} />
              </span>
              <h3 className="emcard-benefit-card__title">{benefit.title}</h3>
              <p className="emcard-benefit-card__text">{benefit.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ HOW IT WORKS */}
      <section className="emcard-section">
        <h2 className="ui-section-head__title">How pricing works</h2>
        <p className="page__subtitle" style={{ marginBottom: "var(--space-5)" }}>
          Every product is sold under one of four modes. The mode is shown on
          the product itself, so you always know what you are paying with
          before you add it to your cart.
        </p>

        <ol className="emcard-modes">
          {HOW_IT_WORKS.map((mode, index) => (
            <li className="emcard-mode" key={mode.label}>
              <span className="emcard-mode__num" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <h3 className="emcard-mode__label">{mode.label}</h3>
                <p className="emcard-mode__text">{mode.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <Alert variant="info" className="emcard-section__note">
          An offer is never applied automatically. You tick it on the product,
          and the price updates before anything reaches your cart. Products on
          a public sale are already discounted, so e-Mcard offers do not stack
          on top of them.
        </Alert>
      </section>

      {/* ------------------------------------------------------- JOIN */}
      {!isEmcardMember && (
        <section className="emcard-section" id="join-form">
          <div className="emcard-join">
            {joined ? (
              <Alert variant="success" title="You're in">
                100 bonus points have been added to your account. Taking you
                back to the shop...
              </Alert>
            ) : !signedIn ? (
              <div className="emcard-join__guest">
                <h2 className="ui-section-head__title">Ready to join?</h2>
                <p className="page__subtitle">
                  e-Mcard is tied to your E-Mart account. Create one — or sign
                  in — and you can join in a single step.
                </p>
                <div className="cluster" style={{ marginTop: "var(--space-5)" }}>
                  <Button variant="loyalty" size="lg" to="/register" icon="bi-person-plus">
                    Create an account
                  </Button>
                  <Button variant="outline" size="lg" to="/login">
                    Sign in
                  </Button>
                </div>
              </div>
            ) : loading ? (
              <LoadingBlock>Loading your details...</LoadingBlock>
            ) : (
              <>
                <h2 className="ui-section-head__title">Join e-Mcard</h2>
                <p className="page__subtitle" style={{ marginBottom: "var(--space-5)" }}>
                  Confirm the phone number and address we should use for your
                  membership. There is nothing to pay.
                </p>

                <form onSubmit={handleSubmit} noValidate>
                  <FormInput
                    icon="bi-telephone"
                    label="Phone number"
                    type="tel"
                    name="phone"
                    id="emcard-phone"
                    value={formData.phone}
                    onChange={handleChange}
                    error={fieldErrors.phone}
                    placeholder="10-digit mobile number"
                    autoComplete="tel"
                  />

                  <div className="ui-field">
                    <label className="ui-label" htmlFor="emcard-address">
                      Address
                    </label>
                    <textarea
                      className={`ui-textarea ${
                        fieldErrors.address ? "ui-textarea--invalid" : ""
                      }`}
                      id="emcard-address"
                      name="address"
                      rows={3}
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Delivery address"
                      aria-invalid={fieldErrors.address ? "true" : undefined}
                      aria-describedby={
                        fieldErrors.address ? "emcard-address-error" : undefined
                      }
                    />
                    {fieldErrors.address && (
                      <span className="ui-field__error" id="emcard-address-error">
                        <i className="bi bi-exclamation-circle" aria-hidden="true" />
                        {fieldErrors.address}
                      </span>
                    )}
                  </div>

                  {error && (
                    <div style={{ marginBottom: "var(--space-4)" }}>
                      <Alert variant="danger">{error}</Alert>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="loyalty"
                    size="lg"
                    block
                    loading={submitting}
                    loadingText="Joining..."
                    icon="bi-gift-fill"
                  >
                    Join e-Mcard — it's free
                  </Button>
                </form>
              </>
            )}
          </div>
        </section>
      )}

      {!wantsToJoin && (
        <div style={{ textAlign: "center", marginTop: "var(--space-4)" }}>
          <Button variant="ghost" icon="bi-arrow-left" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      )}
    </div>
  );
}
