import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as userApi from "../api/userApi";
import AuthLayout from "../components/AuthLayout";
import FormInput from "../components/FormInput";
import LoadingButton from "../components/LoadingButton";

/**
 * ForgotPassword.jsx
 * ------------------------------------------------------------------
 * Step 1 of the forgot-password flow: collects the account email and
 * calls the real POST /api/auth/forgot-password endpoint, which emails
 * a 6-digit OTP to that address (see AuthController/AuthServiceImpl).
 *
 * On success, moves straight to /reset-password (step 2 - enter the
 * OTP + new password), passing the email along via router state so
 * the user doesn't have to retype it.
 * ------------------------------------------------------------------
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState(null); // null | 'success' | 'error'
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setEmail(e.target.value);
    setEmailError("");
  };

  const validate = () => {
    if (!email.trim()) {
      setEmailError("Email is required.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setOutcome(null);

    if (!validate()) return;

    setSubmitting(true);
    try {
      await userApi.forgotPassword(email);
      setOutcome("success");
      setMessage("An OTP has been sent to your email address.");

      // Give the success card a beat to render before moving on to
      // step 2 (entering the OTP + new password).
      setTimeout(() => {
        navigate("/reset-password", { state: { email } });
      }, 1200);
    } catch (err) {
      setOutcome("error");
      setMessage(
        err.response?.data?.message ||
          "We couldn't send the OTP. Please check the email and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      heading="Forgot your password?"
      subheading="No worries - enter your email and we'll help you get back in."
      features={[
        { icon: "bi-shield-lock", text: "Your account stays secure" },
        { icon: "bi-clock-history", text: "Reset in just a couple of minutes" },
      ]}
    >
      {outcome === "success" ? (
        <div className="text-center py-4 em-scale-in">
          <div className="em-success-circle mb-3">
            <i className="bi bi-envelope-check"></i>
          </div>
          <h4 className="fw-bold mb-2">Check your email</h4>
          <p className="text-muted mb-4">
            {message} Taking you to the reset screen...
          </p>
          <div
            className="spinner-border spinner-border-sm text-primary"
            role="status"
          >
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          <h3 className="fw-bold mb-1">Reset password</h3>
          <p className="text-muted mb-4">
            Enter the email linked to your account.
          </p>

          {outcome === "error" && (
            <div className="alert alert-danger py-2" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {message}
            </div>
          )}

          <div className="text-center mb-3">
            <Link to="/reset-password" className="small">
              Already have an OTP?
            </Link>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <FormInput
              icon="bi-envelope"
              label="Email"
              type="email"
              name="email"
              value={email}
              onChange={handleChange}
              error={emailError}
              autoComplete="username"
              placeholder="you@example.com"
            />

            <LoadingButton
              type="submit"
              loading={submitting}
              loadingText="Sending OTP..."
            >
              Send OTP
            </LoadingButton>
          </form>

          <div className="text-center mt-4">
            <Link to="/login" className="small">
              <i className="bi bi-arrow-left me-1"></i>Back to Login
            </Link>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
