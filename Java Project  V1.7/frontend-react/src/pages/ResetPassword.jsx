import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import * as userApi from "../api/userApi";
import AuthLayout from "../components/AuthLayout";
import FormInput from "../components/FormInput";
import PasswordInput from "../components/PasswordInput";
import LoadingButton from "../components/LoadingButton";

/**
 * ResetPassword.jsx
 * ------------------------------------------------------------------
 * Step 2 of the forgot-password flow: the user enters the OTP that
 * was emailed to them plus a new password, and this calls the real
 * POST /api/auth/reset-password endpoint (see AuthController /
 * AuthServiceImpl). The email is pre-filled from router state if the
 * user arrived here via ForgotPassword's redirect, but stays editable
 * so a direct visit to this page (or a page refresh) still works.
 * ------------------------------------------------------------------
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillEmail = location.state?.email || "";

  const [formData, setFormData] = useState({
    email: prefillEmail,
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errors = {};
    if (!formData.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Enter a valid email address.";
    }
    if (!formData.otp.trim()) {
      errors.otp = "OTP is required.";
    } else if (!/^\d{6}$/.test(formData.otp.trim())) {
      errors.otp = "OTP must be the 6-digit code from your email.";
    }
    if (!formData.newPassword) {
      errors.newPassword = "New password is required.";
    } else if (formData.newPassword.length < 6) {
      errors.newPassword = "New password must be at least 6 characters.";
    }
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your new password.";
    } else if (formData.confirmPassword !== formData.newPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setResendMessage("");

    if (!validate()) return;

    setSubmitting(true);
    try {
      await userApi.resetPassword({
        email: formData.email.trim(),
        otp: formData.otp.trim(),
        newPassword: formData.newPassword,
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      setServerError(
        err.response?.data?.message ||
          "We couldn't reset your password. Please check the OTP and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setServerError("");
    setResendMessage("");

    if (!formData.email.trim()) {
      setFieldErrors((prev) => ({
        ...prev,
        email: "Enter your email first.",
      }));
      return;
    }

    setResending(true);
    try {
      await userApi.forgotPassword(formData.email.trim());
      setResendMessage("A new OTP has been sent to your email address.");
    } catch (err) {
      setServerError(
        err.response?.data?.message ||
          "We couldn't resend the OTP. Please try again.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      heading="Almost there"
      subheading="Enter the OTP we emailed you along with your new password."
      features={[
        { icon: "bi-shield-lock", text: "Your account stays secure" },
        { icon: "bi-clock-history", text: "OTP is valid for 10 minutes" },
      ]}
    >
      {success ? (
        <div className="text-center py-4 em-scale-in">
          <div className="em-success-circle mb-3">
            <i className="bi bi-check-circle"></i>
          </div>
          <h4 className="fw-bold mb-2">Password reset</h4>
          <p className="text-muted mb-4">
            Your password has been reset successfully. Taking you to login...
          </p>
        </div>
      ) : (
        <>
          <h3 className="fw-bold mb-1">Reset password</h3>
          <p className="text-muted mb-4">
            Enter the OTP sent to your email and choose a new password.
          </p>

          {serverError && (
            <div className="alert alert-danger py-2" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {serverError}
            </div>
          )}

          {resendMessage && (
            <div className="alert alert-success py-2" role="alert">
              <i className="bi bi-envelope-check me-2"></i>
              {resendMessage}
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
              placeholder="you@example.com"
            />

            <FormInput
              icon="bi-shield-lock"
              label="OTP"
              type="text"
              name="otp"
              value={formData.otp}
              onChange={handleChange}
              error={fieldErrors.otp}
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
            />

            <PasswordInput
              label="New Password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              error={fieldErrors.newPassword}
              autoComplete="new-password"
              showStrength
            />

            <PasswordInput
              label="Confirm New Password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={fieldErrors.confirmPassword}
              autoComplete="new-password"
            />

            <LoadingButton
              type="submit"
              loading={submitting}
              loadingText="Resetting..."
            >
              Reset Password
            </LoadingButton>
          </form>

          <div className="text-center mt-3">
            <button
              type="button"
              className="btn btn-link small p-0"
              onClick={handleResend}
              disabled={resending}
            >
              {resending ? "Resending..." : "Didn't get a code? Resend OTP"}
            </button>
          </div>

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
