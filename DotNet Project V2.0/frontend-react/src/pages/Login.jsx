import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../api/endpoints";
import { getGoogleLoginUrl } from "../api/userApi";
import AuthLayout from "../components/AuthLayout";
import { Alert } from "../components/ui/Feedback";
import FormInput from "../components/FormInput";
import PasswordInput from "../components/PasswordInput";
import LoadingButton from "../components/LoadingButton";

/**
 * Login.jsx
 * ------------------------------------------------------------------
 * REDESIGNED UI ONLY. All logic below is byte-for-byte the same as
 * before:
 *   - Client-side validation (email + password required).
 *   - "Remember me" pre-fills the email field on next visit (stored
 *     separately from the JWT, since it's just a UX convenience, not
 *     an auth token).
 *   - "Show password" toggles the input type (now inside
 *     PasswordInput, same behavior).
 *   - Displays backend validation/auth errors verbatim.
 *   - On success: redirects ADMIN -> /admin, CUSTOMER -> /
 *
 * Nothing was added to formData, validate(), or handleSubmit() beyond
 * what already existed.
 *
 * "Continue with Google" now does a real full-page redirect to the
 * backend's Google OAuth2 endpoint (GET /oauth2/authorization/google -
 * this is Spring Security's own endpoint, not a custom one). Google
 * then redirects back to the backend, which redirects the browser to
 * /oauth2/redirect?token=...&type=Bearer - handled by
 * OAuth2Redirect.jsx, not by this component.
 * ------------------------------------------------------------------
 */

const REMEMBER_EMAIL_KEY = "emart_remember_email";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill remembered email on mount.
  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (rememberedEmail) {
      setFormData((prev) => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }

    const oauthError = searchParams.get("error");
    if (oauthError) {
      setServerError(decodeURIComponent(oauthError));
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errors = {};
    if (!formData.email.trim()) errors.email = "Email is required.";
    if (!formData.password) errors.password = "Password is required.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    setSubmitting(true);
    try {
      const loggedInUser = await login(formData);

      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, formData.email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      // Role-based redirect.
      if (loggedInUser?.role === ROLES.ADMIN) {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      // Surface backend error messages exactly as returned.
      const backendMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        "Login failed. Please check your credentials and try again.";
      setServerError(backendMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    // Real full-page navigation, not an API call - Spring Security's
    // oauth2Login() needs to intercept this request itself and redirect
    // to Google's own login page.
    window.location.href = getGoogleLoginUrl();
  };

  return (
    <AuthLayout
      heading="Shop smarter with E-Mart"
      subheading="Sign in to track orders, manage your profile and check out faster."
      features={[
        { icon: "bi-truck", text: "Fast, reliable delivery" },
        { icon: "bi-shield-check", text: "Secure checkout, every time" },
        { icon: "bi-arrow-repeat", text: "Easy returns on eligible items" },
      ]}
    >
      <h1 className="auth-card__title">Welcome back</h1>
      <p className="auth-card__subtitle">
        Sign in to track orders, use your e-Mcard points and check out faster.
      </p>

      {serverError && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <Alert variant="danger">{serverError}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <FormInput
          icon="bi-envelope"
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          error={fieldErrors.email}
          autoComplete="username"
        />

        <PasswordInput
          label="Password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          error={fieldErrors.password}
          autoComplete="current-password"
        />

        <div className="spread" style={{ marginBottom: "var(--space-5)" }}>
          <label className="ui-check" htmlFor="rememberMe">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember me</span>
          </label>

          <Link to="/forgot-password" style={{ fontSize: "var(--text-sm)" }}>
            Forgot password?
          </Link>
        </div>

        <LoadingButton
          type="submit"
          loading={submitting}
          loadingText="Signing in..."
        >
          Sign in
        </LoadingButton>
      </form>

      <div className="auth-divider">OR</div>

      <button type="button" className="auth-google" onClick={handleGoogleLogin}>
        <i className="bi bi-google" aria-hidden="true"></i>
        Continue with Google
      </button>

      <p className="auth-foot">
        Don&apos;t have an account? <Link to="/register">Create one</Link>
      </p>
    </AuthLayout>
  );
}
