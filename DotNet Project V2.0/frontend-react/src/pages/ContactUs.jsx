import { useState } from "react";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Button from "../components/ui/Button";
import FormInput from "../components/FormInput";
import { Alert } from "../components/ui/Feedback";
import "../styles/account.css";
// TODO: wire up with fetch() once backend/contact endpoint is ready

/**
 * ContactUs.jsx
 * ------------------------------------------------------------------
 * Static contact page: address/phone/email info on the left,
 * a "Tell Us Your Message" form on the right.
 *
 * NOTE: There is no contact/email-sending endpoint in the backend
 * yet. handleSubmit currently just prevents page reload and shows
 * a local "submitted" state - nothing is sent anywhere. Swap in the
 * real axios call (commented below) once that endpoint exists.
 * ------------------------------------------------------------------
 */
export default function ContactUs() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    website: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    // ---- TEMPORARY: no backend endpoint yet ----
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        website: "",
        subject: "",
        message: "",
      });
    }, 500);

    // ---- REAL API CALL (uncomment when backend is ready) ----
    // setSubmitting(true);
    // try {
    //   await axios.post(`${import.meta.env.VITE_API_URL}/api/contact`, form);
    //   setSubmitted(true);
    //   setForm({
    //     firstName: "",
    //     lastName: "",
    //     email: "",
    //     website: "",
    //     subject: "",
    //     message: "",
    //   });
    // } catch (err) {
    //   console.error("Failed to send message:", err);
    //   setError("Something went wrong sending your message. Please try again.");
    // } finally {
    //   setSubmitting(false);
    // }
  };

  return (
    <div className="container-page page">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Contact us" }]} />

      <div className="page__header">
        <h1 className="page__title">Contact us</h1>
        <p className="page__subtitle">
          Questions about an order, a product or your e-Mcard? Send us a note.
        </p>
      </div>

      <div className="contact-layout">
        {/* ------------------------------------------------- DETAILS -- */}
        <aside className="ui-card">
          <div className="ui-card__body">
            <h2 className="ui-card__title">Reach us</h2>

            <div className="contact-detail">
              <span className="contact-detail__icon" aria-hidden="true">
                <i className="bi bi-geo-alt" />
              </span>
              <div>
                <div className="contact-detail__label">Address</div>
                <div className="contact-detail__value">
                  123 Main Street, Anytown, CA 12345
                </div>
              </div>
            </div>

            <div className="contact-detail">
              <span className="contact-detail__icon" aria-hidden="true">
                <i className="bi bi-telephone" />
              </span>
              <div>
                <div className="contact-detail__label">Phone</div>
                <div className="contact-detail__value">Mobile: (08) 123 456 789</div>
                <div className="contact-detail__value">Hotline: 1009 678 456</div>
              </div>
            </div>

            <div className="contact-detail">
              <span className="contact-detail__icon" aria-hidden="true">
                <i className="bi bi-envelope" />
              </span>
              <div>
                <div className="contact-detail__label">Email</div>
                <div className="contact-detail__value">contact@domain.com</div>
                <div className="contact-detail__value">support@domain.com</div>
              </div>
            </div>

            <div className="contact-detail">
              <span className="contact-detail__icon" aria-hidden="true">
                <i className="bi bi-clock" />
              </span>
              <div>
                <div className="contact-detail__label">Hours</div>
                <div className="contact-detail__value">Mon – Sat, 9am – 8pm</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ---------------------------------------------------- FORM -- */}
        <div className="ui-card">
          <div className="ui-card__body">
            <h2 className="ui-card__title" style={{ marginBottom: "var(--space-4)" }}>
              Send us a message
            </h2>

            {/* Said out loud rather than implied: there is no contact
                endpoint on the backend yet, so this form confirms locally
                and sends nothing. See the note in handleSubmit. */}
            <div style={{ marginBottom: "var(--space-5)" }}>
              <Alert variant="info">
                This form is not wired to a backend yet — there is no contact
                endpoint to send it to. For anything urgent, please use the
                phone or email details listed here.
              </Alert>
            </div>

            {submitted && (
              <div style={{ marginBottom: "var(--space-4)" }}>
                <Alert variant="success" title="Message noted">
                  Thanks — your message was captured in the browser. Nothing has
                  been emailed, since the contact endpoint does not exist yet.
                </Alert>
              </div>
            )}

            {error && (
              <div style={{ marginBottom: "var(--space-4)" }}>
                <Alert variant="danger">{error}</Alert>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <FormInput
                  icon="bi-person"
                  label="First name"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                  autoComplete="given-name"
                />
                <FormInput
                  icon="bi-person"
                  label="Last name"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  autoComplete="family-name"
                />
              </div>

              <div className="form-row">
                <FormInput
                  icon="bi-envelope"
                  label="Email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
                <FormInput
                  icon="bi-globe"
                  label="Website"
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </div>

              <FormInput
                icon="bi-chat-left-text"
                label="Subject"
                name="subject"
                value={form.subject}
                onChange={handleChange}
                required
              />

              <div className="ui-field">
                <label htmlFor="contact-message" className="ui-label">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  className="ui-textarea"
                  rows={6}
                  value={form.message}
                  onChange={handleChange}
                  required
                  placeholder="How can we help?"
                />
              </div>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                loading={submitting}
                loadingText="Sending..."
                icon="bi-send"
              >
                Send message
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
