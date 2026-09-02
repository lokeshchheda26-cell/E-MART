import { useState, useEffect } from "react";
import * as userApi from "../api/userApi";
import { useEmcard } from "../context/EmcardContext";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Button from "../components/ui/Button";
import { EmcardVisual } from "../components/ui/Loyalty";
import { ErrorState, LoadingBlock } from "../components/ui/Feedback";
import "../styles/account.css";

/**
 * Profile.jsx
 * ------------------------------------------------------------------
 * The account overview.
 *
 * DATA SOURCE UNCHANGED: the backend has no /me endpoint, so
 * userApi.getProfile() still reads the userId cached at login and calls
 * GET /api/users/{userId}. The fields shown match UserResponseDTO exactly -
 * nothing is displayed that the API does not return.
 *
 * WHAT CHANGED: the flat definition list is now an identity header plus
 * grouped detail cards, and the loyalty fields ("EMcard Member: Yes",
 * "EMcard Points: 240") are rendered as the actual card instead of two rows
 * of text - the same card component used on the home page and the e-Mcard
 * page, so a member sees one consistent object across the whole app.
 * ------------------------------------------------------------------
 */

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  return value;
}

export default function Profile() {
  const { emcardTotalPoints } = useEmcard();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchProfile() {
      try {
        const data = await userApi.getProfile();
        if (isMounted) setProfile(data);
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "Unable to load your profile right now."
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
  }, []);

  if (loading) {
    return (
      <div className="container-page page">
        <LoadingBlock>Loading your profile...</LoadingBlock>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-narrow page">
        <ErrorState
          title="We couldn't load your profile"
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const fullName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    profile?.email;

  const initials = (profile?.firstName?.[0] || profile?.email?.[0] || "U")
    .toUpperCase();

  const isMember = Boolean(profile?.isEmcardMember);

  const personal = [
    { label: "First name", value: profile?.firstName },
    { label: "Last name", value: profile?.lastName },
    { label: "Date of birth", value: profile?.dob },
    { label: "Gender", value: profile?.gender },
  ];

  const contact = [
    { label: "Email", value: profile?.email },
    { label: "Phone", value: profile?.phone },
    { label: "Address", value: profile?.address, wide: true },
  ];

  return (
    <div className="container-page page">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "My profile" }]} />

      {/* ---------------------------------------------------- IDENTITY */}
      <header className="account-header">
        <span className="account-header__avatar" aria-hidden="true">
          {initials}
        </span>

        <div className="account-header__info">
          <h1 className="account-header__name">{fullName}</h1>
          <p className="account-header__meta">{profile?.email}</p>

          <div className="cluster" style={{ marginTop: "var(--space-2)" }}>
            <span className="ui-chip">
              <i className="bi bi-person-badge" aria-hidden="true" />
              {formatValue(profile?.role)}
            </span>
            {isMember ? (
              <span className="ui-badge ui-badge--loyalty">
                <i className="bi bi-gift-fill" aria-hidden="true" /> e-Mcard member
              </span>
            ) : (
              <span className="ui-badge ui-badge--neutral">Standard account</span>
            )}
          </div>
        </div>

        <div className="account-header__actions">
          <Button variant="primary" to="/edit-profile" icon="bi-pencil-square">
            Edit profile
          </Button>
          <Button variant="outline" to="/change-password" icon="bi-key">
            Change password
          </Button>
        </div>
      </header>

      <div className="account-layout">
        <div className="account-main">
          <section className="ui-card">
            <header className="ui-card__header">
              <h2 className="ui-card__title">Personal details</h2>
            </header>
            <div className="ui-card__body">
              <dl className="account-facts">
                {personal.map((field) => (
                  <div key={field.label}>
                    <dt>{field.label}</dt>
                    <dd>{formatValue(field.value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section className="ui-card">
            <header className="ui-card__header">
              <h2 className="ui-card__title">Contact &amp; delivery</h2>
            </header>
            <div className="ui-card__body">
              <dl className="account-facts">
                {contact.map((field) => (
                  <div
                    key={field.label}
                    className={field.wide ? "account-facts__wide" : undefined}
                  >
                    <dt>{field.label}</dt>
                    <dd>{formatValue(field.value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        </div>

        {/* ------------------------------------------------------ ASIDE */}
        <aside className="account-aside">
          <EmcardVisual
            points={isMember ? (profile?.emcardPoints ?? emcardTotalPoints) : 0}
            isMember={isMember}
            holderName={fullName}
          />

          {isMember ? (
            <div className="account-aside__note">
              <p>
                Your points are applied at checkout on eligible products. Look
                for the violet offer badge while browsing.
              </p>
              <Button variant="loyalty" block to="/emcard" iconEnd="bi-arrow-right">
                View e-Mcard
              </Button>
            </div>
          ) : (
            <div className="account-aside__note">
              <p>
                You're not an e-Mcard member yet. Joining is free and comes with
                100 bonus points.
              </p>
              <Button variant="loyalty" block to="/emcard/join" icon="bi-gift-fill">
                Join e-Mcard
              </Button>
            </div>
          )}

          <div className="ui-card">
            <div className="ui-card__body">
              <h2 className="ui-card__title" style={{ marginBottom: "var(--space-3)" }}>
                Quick links
              </h2>
              <div className="account-links">
                <a href="/orders" className="account-link">
                  <i className="bi bi-bag-check" aria-hidden="true" />
                  My orders &amp; invoices
                  <i className="bi bi-chevron-right account-link__chevron" aria-hidden="true" />
                </a>
                <a href="/edit-profile" className="account-link">
                  <i className="bi bi-pencil-square" aria-hidden="true" />
                  Edit my details
                  <i className="bi bi-chevron-right account-link__chevron" aria-hidden="true" />
                </a>
                <a href="/change-password" className="account-link">
                  <i className="bi bi-key" aria-hidden="true" />
                  Change password
                  <i className="bi bi-chevron-right account-link__chevron" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
