import { useState } from "react";
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
    <div className="container py-5">
      <div className="row g-5">
        {/* Left: Contact Info */}
        <div className="col-md-4">
          <h2 className="h3 fw-bold mb-4">Contact Us</h2>

          <div className="d-flex gap-3 mb-3">
            <i className="bi bi-house-door fs-3 text-secondary"></i>
            <div>
              <h6 className="fw-semibold mb-1">Address</h6>
              <p className="text-muted mb-0">
                123 Main Street, Anytown, CA 12345 – USA
              </p>
            </div>
          </div>
          <hr />

          <div className="d-flex gap-3 mb-3">
            <i className="bi bi-telephone fs-3 text-secondary"></i>
            <div>
              <h6 className="fw-semibold mb-1">Phone</h6>
              <p className="text-muted mb-0">Mobile: (08) 123 456 789</p>
              <p className="text-muted mb-0">Hotline: 1009 678 456</p>
            </div>
          </div>
          <hr />

          <div className="d-flex gap-3 mb-3">
            <i className="bi bi-envelope fs-3 text-secondary"></i>
            <div>
              <h6 className="fw-semibold mb-1">Email</h6>
              <p className="text-muted mb-0">contact@domain.com</p>
              <p className="text-muted mb-0">support@domain.com</p>
            </div>
          </div>
        </div>

        {/* Right: Message Form */}
        <div className="col-md-8">
          <h2 className="h3 fw-bold mb-4">Tell Us Your Message</h2>

          {submitted && (
            <div className="alert alert-success" role="alert">
              Thanks! Your message has been noted. (Note: this is a demo —
              nothing is actually emailed yet since the backend isn't ready.)
            </div>
          )}

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <input
                  type="text"
                  name="firstName"
                  className="form-control"
                  placeholder="First Name*"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <input
                  type="text"
                  name="lastName"
                  className="form-control"
                  placeholder="Last Name*"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  placeholder="Email*"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="col-md-6">
                <input
                  type="text"
                  name="website"
                  className="form-control"
                  placeholder="Website"
                  value={form.website}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="mb-3">
              <input
                type="text"
                name="subject"
                className="form-control"
                placeholder="Subject*"
                value={form.subject}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-4">
              <textarea
                name="message"
                className="form-control"
                placeholder="Message*"
                rows={6}
                value={form.message}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-warning fw-bold px-4 py-2"
              disabled={submitting}
            >
              {submitting ? "Sending..." : "SEND EMAIL"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
