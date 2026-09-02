import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import * as userApi from "../api/userApi";
import { GENDERS } from "../api/endpoints";
import AuthLayout from "../components/AuthLayout";
import FormInput from "../components/FormInput";
import PasswordInput from "../components/PasswordInput";
import LoadingButton from "../components/LoadingButton";

/**
 * Register.jsx
 * ------------------------------------------------------------------
 * REDESIGNED UI ONLY. Fields, validate() rules, and handleSubmit()
 * are exactly what they were before - still matching
 * com.emart.dto.UserRequestDTO:
 *   firstName, lastName, email, password, phone, address, gender,
 *   dob, isEmcardMember
 *
 * confirmPassword remains frontend-only and is still stripped before
 * the request, exactly as before.
 *
 * ONE deliberate, called-out addition: an `agreedToTerms` checkbox.
 * The brief asked for a "Terms & Conditions checkbox" as a UI
 * element, but also said not to modify existing validation logic -
 * so this checkbox is included as UI state ONLY. It is NOT added to
 * validate()'s error checks and does NOT block submission, and it is
 * NOT sent to the backend (stripped alongside confirmPassword, since
 * UserRequestDTO has no such field). If you'd like it to actually be
 * required before the Register button works, that's a one-line
 * addition to validate() - just say the word.
 *
 * The password strength meter is purely visual (see PasswordInput.jsx)
 * and does not change the existing "min 6 characters" rule below.
 * ------------------------------------------------------------------
 */

const initialFormState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  address: "",
  gender: "",
  dob: "",
  isEmcardMember: false,
  agreedToTerms: false, // UI-only, see note above - not validated, not sent to backend
};

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormState);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errors = {};
    if (!formData.firstName.trim())
      errors.firstName = "First name is required.";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required.";

    if (!formData.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Enter a valid email address.";
    }

    if (!formData.password) {
      errors.password = "Password is required.";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (formData.confirmPassword !== formData.password) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (!formData.phone.trim()) {
      errors.phone = "Phone number is required.";
    } else if (!/^\d{10}$/.test(formData.phone.trim())) {
      errors.phone = "Phone number must be 10 digits.";
    }

    if (!formData.address.trim()) errors.address = "Address is required.";
    if (!formData.gender) errors.gender = "Please select a gender.";
    if (!formData.dob) errors.dob = "Date of birth is required.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setSuccessMessage("");

    if (!validate()) return;

    setSubmitting(true);
    try {
      // eslint-disable-next-line no-unused-vars
      const { confirmPassword, agreedToTerms, ...payload } = formData;
      await userApi.register(payload);
      setSuccessMessage("Registration successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      // NOTE: your backend has no @ControllerAdvice / global exception
      // handler, so thrown RuntimeExceptions (e.g. "Email already
      // exists.") come back as a generic Spring Boot 500 error body.
      // Depending on your application.properties, the real message
      // may or may not be included (server.error.include-message must
      // be set to "always" for err.response.data.message to be
      // populated - otherwise Spring returns a generic message).
      const backendMessage =
        err.response?.data?.message ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        "Registration failed. The email or phone number may already be in use.";
      setServerError(backendMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Once registration succeeds, swap the form out for a success card
  // instead of leaving the (now stale) form on screen during the
  // 1.2s redirect delay.
  if (successMessage) {
    return (
      <AuthLayout
        heading="You're almost there"
        subheading="Just one step away from a faster checkout experience."
        features={[
          { icon: "bi-gift", text: "Bonus points on EMcard sign-up" },
          { icon: "bi-truck", text: "Fast, reliable delivery" },
          { icon: "bi-shield-check", text: "Secure checkout, every time" },
        ]}
        maxWidth="480px"
      >
        <div className="text-center py-4 em-scale-in">
          <div className="em-success-circle mb-3">
            <i className="bi bi-check-lg"></i>
          </div>
          <h4 className="fw-bold mb-2">Account created!</h4>
          <p className="text-muted mb-0">{successMessage}</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      heading="Join E-Mart today"
      subheading="Create an account to enjoy faster checkout, order tracking and member-only offers."
      features={[
        { icon: "bi-gift", text: "Bonus points on EMcard sign-up" },
        { icon: "bi-truck", text: "Fast, reliable delivery" },
        { icon: "bi-arrow-repeat", text: "Easy returns on eligible items" },
      ]}
      maxWidth="640px"
    >
      <h3 className="fw-bold mb-1">Create an account</h3>
      <p className="text-muted mb-4">It only takes a minute</p>

      {serverError && (
        <div className="alert alert-danger py-2" role="alert">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="row">
          <div className="col-md-6">
            <FormInput
              icon="bi-person"
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              error={fieldErrors.firstName}
            />
          </div>
          <div className="col-md-6">
            <FormInput
              icon="bi-person"
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              error={fieldErrors.lastName}
            />
          </div>
        </div>

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

        <div className="row">
          <div className="col-md-6">
            <PasswordInput
              label="Password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              error={fieldErrors.password}
              autoComplete="new-password"
              showStrength
            />
          </div>
          <div className="col-md-6">
            <PasswordInput
              label="Confirm Password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={fieldErrors.confirmPassword}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="row">
          <div className="col-md-6">
            <FormInput
              icon="bi-telephone"
              label="Phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              error={fieldErrors.phone}
              placeholder="10-digit mobile number"
            />
          </div>
          <div className="col-md-6">
            <FormInput
              icon="bi-calendar3"
              label="Date of Birth"
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              error={fieldErrors.dob}
            />
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="gender" className="form-label fw-semibold">
            Gender
          </label>
          <select
            className={`form-select ${fieldErrors.gender ? "is-invalid" : ""}`}
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
          >
            <option value="">Select gender</option>
            <option value={GENDERS.MALE}>Male</option>
            <option value={GENDERS.FEMALE}>Female</option>
            <option value={GENDERS.OTHER}>Other</option>
          </select>
          {fieldErrors.gender && (
            <div className="invalid-feedback">{fieldErrors.gender}</div>
          )}
        </div>

        <div className="mb-3">
          <label htmlFor="address" className="form-label fw-semibold">
            Address
          </label>
          <textarea
            className={`form-control ${fieldErrors.address ? "is-invalid" : ""}`}
            id="address"
            name="address"
            rows={2}
            value={formData.address}
            onChange={handleChange}
          />
          {fieldErrors.address && (
            <div className="invalid-feedback">{fieldErrors.address}</div>
          )}
        </div>

        <div className="mb-2 form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id="isEmcardMember"
            name="isEmcardMember"
            checked={formData.isEmcardMember}
            onChange={handleChange}
          />
          <label className="form-check-label" htmlFor="isEmcardMember">
            Sign me up for an EMcard membership (100 bonus points on join)
          </label>
        </div>

        {/*
          UI-only checkbox, see file header note: not validated, not
          sent to the backend. Purely satisfies the requested layout.
        */}
        <div className="mb-4 form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id="agreedToTerms"
            name="agreedToTerms"
            checked={formData.agreedToTerms}
            onChange={handleChange}
          />
          <label className="form-check-label" htmlFor="agreedToTerms">
            I agree to the <a href="#!">Terms &amp; Conditions</a> and{" "}
            <a href="#!">Privacy Policy</a>
          </label>
        </div>

        <LoadingButton
          type="submit"
          loading={submitting}
          loadingText="Registering..."
        >
          Register
        </LoadingButton>
      </form>

      <p className="text-center mt-4 mb-0 small">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </AuthLayout>
  );
}
