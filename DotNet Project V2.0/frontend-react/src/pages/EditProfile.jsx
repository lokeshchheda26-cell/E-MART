import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as userApi from "../api/userApi";
import { useAuth } from "../context/AuthContext";
import { USER_KEY } from "../api/axiosConfig";
import { GENDERS } from "../api/endpoints";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Button from "../components/ui/Button";
import FormInput from "../components/FormInput";
import { Alert, LoadingBlock } from "../components/ui/Feedback";
import "../styles/account.css";

/**
 * EditProfile.jsx
 * ------------------------------------------------------------------
 * Pre-fills from GET /api/users/{id}, then PUTs the full object back.
 *
 * !! READ THIS BEFORE USING IN PRODUCTION !!
 * Your UserServiceImpl.updateUser() overwrites EVERY field on every
 * save, including password - and it sets the password RAW, without
 * re-encoding it with BCryptPasswordEncoder like registration does.
 * UserResponseDTO never returns the password hash, so this form can't
 * "just leave it unchanged" - there is nothing to leave unchanged with.
 *
 * The only way to avoid the DB's NOT NULL constraint blowing up (or,
 * worse, silently corrupting the stored password into an unusable
 * plaintext value) is to make the user re-enter their CURRENT password
 * here and send it straight through. That still doesn't fully protect
 * you: this call always re-writes the password column as plaintext, so
 * after this save, the user's password is no longer BCrypt-hashed and
 * their next login attempt will likely fail (passwordEncoder.matches()
 * expects the stored value to already look like a bcrypt hash).
 *
 * This is a backend bug, not something fixable from the frontend alone.
 * A minimal backend fix (in UserServiceImpl.updateUser) would be:
 *
 *   if (userRequestDTO.getPassword() != null && !userRequestDTO.getPassword().isBlank()) {
 *       user.setPassword(passwordEncoder.encode(userRequestDTO.getPassword()));
 *   }
 *   // else: don't touch user.getPassword() at all
 *
 * I have NOT applied this to your backend since you asked me not to
 * touch it - flagging it here so you can decide. Until it's fixed,
 * treat "Edit Profile" and "Change Password" in this app as something
 * that may require re-login afterward.
 * ------------------------------------------------------------------
 */
export default function EditProfile() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [formData, setFormData] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
      try {
        const data = await userApi.getProfile();
        if (isMounted) {
          setFormData({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            gender: data.gender || "",
            dob: data.dob || "",
          });
        }
      } catch (err) {
        if (isMounted) {
          setServerError(
            err.response?.data?.message || "Unable to load your profile.",
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const errors = {};
    if (!formData.firstName.trim())
      errors.firstName = "First name is required.";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required.";
    if (!formData.email.trim()) errors.email = "Email is required.";
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
      const updated = await userApi.updateProfile(formData);

      const existingUser = JSON.parse(localStorage.getItem(USER_KEY) || "{}");
      const mergedUser = { ...existingUser, ...updated };
      localStorage.setItem(USER_KEY, JSON.stringify(mergedUser));
      setUser(mergedUser);

      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => navigate("/profile"), 1000);
    } catch (err) {
      setServerError(
        err.response?.data?.message ||
          "Failed to update profile. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !formData) {
    return (
      <div className="container-page page">
        <LoadingBlock>Loading your profile...</LoadingBlock>
      </div>
    );
  }

  return (
    <div className="container-page page">
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "My profile", to: "/profile" },
          { label: "Edit" },
        ]}
      />

      <div className="account-form">
        <div className="page__header">
          <h1 className="page__title">Edit profile</h1>
          <p className="page__subtitle">
            Keep your contact details current so deliveries reach you.
          </p>
        </div>

        {serverError && (
          <div className="account-form__note">
            <Alert variant="danger">{serverError}</Alert>
          </div>
        )}

        {successMessage && (
          <div className="account-form__note">
            <Alert variant="success">{successMessage}</Alert>
          </div>
        )}

        <div className="ui-card">
          <div className="ui-card__body">
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-row">
                <FormInput
                  icon="bi-person"
                  label="First name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  error={fieldErrors.firstName}
                  autoComplete="given-name"
                />
                <FormInput
                  icon="bi-person"
                  label="Last name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  error={fieldErrors.lastName}
                  autoComplete="family-name"
                />
              </div>

              <FormInput
                icon="bi-envelope"
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                error={fieldErrors.email}
                autoComplete="email"
                hint="Changing your email invalidates your current session token (it is signed for the old address), so you will need to sign in again afterwards."
              />

              <div className="form-row">
                <FormInput
                  icon="bi-telephone"
                  label="Phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  error={fieldErrors.phone}
                  autoComplete="tel"
                />
                <FormInput
                  icon="bi-calendar3"
                  label="Date of birth"
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  error={fieldErrors.dob}
                />
              </div>

              <div className="ui-field">
                <label htmlFor="gender" className="ui-label">
                  Gender
                </label>
                <select
                  className={`ui-select ${fieldErrors.gender ? "ui-select--invalid" : ""}`}
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  aria-invalid={fieldErrors.gender ? "true" : undefined}
                  aria-describedby={fieldErrors.gender ? "gender-error" : undefined}
                >
                  <option value="">Select gender</option>
                  <option value={GENDERS.MALE}>Male</option>
                  <option value={GENDERS.FEMALE}>Female</option>
                  <option value={GENDERS.OTHER}>Other</option>
                </select>
                {fieldErrors.gender && (
                  <span className="ui-field__error" id="gender-error">
                    <i className="bi bi-exclamation-circle" aria-hidden="true" />
                    {fieldErrors.gender}
                  </span>
                )}
              </div>

              <div className="ui-field">
                <label htmlFor="address" className="ui-label">
                  Address
                </label>
                <textarea
                  className={`ui-textarea ${fieldErrors.address ? "ui-textarea--invalid" : ""}`}
                  id="address"
                  name="address"
                  rows={3}
                  value={formData.address}
                  onChange={handleChange}
                  autoComplete="street-address"
                  aria-invalid={fieldErrors.address ? "true" : undefined}
                  aria-describedby={fieldErrors.address ? "address-error" : undefined}
                />
                {fieldErrors.address && (
                  <span className="ui-field__error" id="address-error">
                    <i className="bi bi-exclamation-circle" aria-hidden="true" />
                    {fieldErrors.address}
                  </span>
                )}
              </div>

              <div className="account-form__actions">
                <Button variant="ghost" to="/profile">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={submitting}
                  loadingText="Saving..."
                  icon="bi-check-lg"
                >
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
