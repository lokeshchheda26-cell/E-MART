import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as userApi from '../api/userApi';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import Button from '../components/ui/Button';
import PasswordInput from '../components/PasswordInput';
import { Alert } from '../components/ui/Feedback';
import '../styles/account.css';

/**
 * ChangePassword.jsx
 * ------------------------------------------------------------------
 * There is no dedicated change-password endpoint in your backend, so
 * this reuses PUT /api/users/{id} (see userApi.changePassword, which
 * fetches the current profile first so other fields aren't wiped).
 *
 * Two real limitations, both backend-side, not fixable from here:
 *  - "Old Password" is NOT verified against the database. Nothing in
 *    AuthController/UserController checks it - it's collected purely
 *    as a UX confirmation step on this screen.
 *  - The new password is stored as plaintext rather than a fresh
 *    BCrypt hash (see the long comment in userApi.js / EditProfile.jsx).
 *    That means logging in with the new password afterward may fail
 *    until UserServiceImpl.updateUser is patched to re-encode it.
 * ------------------------------------------------------------------
 */
export default function ChangePassword() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errors = {};
    if (!formData.oldPassword) errors.oldPassword = 'Current password is required.';
    if (!formData.newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (formData.newPassword.length < 6) {
      errors.newPassword = 'New password must be at least 6 characters.';
    }
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password.';
    } else if (formData.confirmPassword !== formData.newPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');

    if (!validate()) return;

    setSubmitting(true);
    try {
      await userApi.changePassword(formData.newPassword);
      setSuccessMessage('Password updated. You may need to log in again.');
      setFormData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => navigate('/profile'), 1500);
    } catch (err) {
      setServerError(
        err.response?.data?.message || 'Failed to change password. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page page">
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "My profile", to: "/profile" },
          { label: "Change password" },
        ]}
      />

      <div className="account-form" style={{ maxWidth: "520px" }}>
        <div className="page__header">
          <h1 className="page__title">Change password</h1>
          <p className="page__subtitle">
            Choose a new password for your E-Mart account.
          </p>
        </div>

        {/* Stated plainly rather than hidden: the current password is
            collected as a confirmation step on this screen only - the
            backend has no endpoint that verifies it. See the file header. */}
        <div className="account-form__note">
          <Alert variant="warning" title="Before you continue">
            Your current password is asked for as a confirmation step on this
            screen. After changing it you may need to sign in again.
          </Alert>
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
              <PasswordInput
                label="Current password"
                name="oldPassword"
                value={formData.oldPassword}
                onChange={handleChange}
                error={fieldErrors.oldPassword}
                autoComplete="current-password"
              />

              <PasswordInput
                label="New password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                error={fieldErrors.newPassword}
                autoComplete="new-password"
                showStrength
              />

              <PasswordInput
                label="Confirm new password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={fieldErrors.confirmPassword}
                autoComplete="new-password"
              />

              <div className="account-form__actions">
                <Button variant="ghost" to="/profile">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={submitting}
                  loadingText="Updating..."
                  icon="bi-shield-check"
                >
                  Change password
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
