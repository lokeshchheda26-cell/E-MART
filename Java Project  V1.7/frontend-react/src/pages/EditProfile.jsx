import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as userApi from "../api/userApi";
import { useAuth } from "../context/AuthContext";
import { USER_KEY } from "../api/axiosConfig";
import { GENDERS } from "../api/endpoints";

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
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ maxWidth: "600px" }}>
      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          <h3 className="card-title mb-3">Edit Profile</h3>

          {serverError && (
            <div className="alert alert-danger py-2">{serverError}</div>
          )}
          {successMessage && (
            <div className="alert alert-success py-2">{successMessage}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="firstName" className="form-label">
                  First Name
                </label>
                <input
                  type="text"
                  className={`form-control ${fieldErrors.firstName ? "is-invalid" : ""}`}
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                />
                {fieldErrors.firstName && (
                  <div className="invalid-feedback">
                    {fieldErrors.firstName}
                  </div>
                )}
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="lastName" className="form-label">
                  Last Name
                </label>
                <input
                  type="text"
                  className={`form-control ${fieldErrors.lastName ? "is-invalid" : ""}`}
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                />
                {fieldErrors.lastName && (
                  <div className="invalid-feedback">{fieldErrors.lastName}</div>
                )}
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                type="email"
                className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
              {fieldErrors.email && (
                <div className="invalid-feedback">{fieldErrors.email}</div>
              )}
              <div className="form-text">
                Changing your email invalidates your current session token (it's
                signed for the old email) - you'll need to log in again
                afterward.
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="phone" className="form-label">
                  Phone
                </label>
                <input
                  type="tel"
                  className={`form-control ${fieldErrors.phone ? "is-invalid" : ""}`}
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                />
                {fieldErrors.phone && (
                  <div className="invalid-feedback">{fieldErrors.phone}</div>
                )}
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="dob" className="form-label">
                  Date of Birth
                </label>
                <input
                  type="date"
                  className={`form-control ${fieldErrors.dob ? "is-invalid" : ""}`}
                  id="dob"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                />
                {fieldErrors.dob && (
                  <div className="invalid-feedback">{fieldErrors.dob}</div>
                )}
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="gender" className="form-label">
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
              <label htmlFor="address" className="form-label">
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

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
