import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as userApi from '../api/userApi';

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
    <div className="container py-5" style={{ maxWidth: '480px' }}>
      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          <h3 className="card-title mb-3 text-center">Change Password</h3>

          <div className="alert alert-warning small py-2 mb-3">
            Use Change Password from your profile menu to update your password.
          </div>

          {serverError && <div className="alert alert-danger py-2">{serverError}</div>}
          {successMessage && <div className="alert alert-success py-2">{successMessage}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="oldPassword" className="form-label">Old Password</label>
              <input
                type="password"
                className={`form-control ${fieldErrors.oldPassword ? 'is-invalid' : ''}`}
                id="oldPassword"
                name="oldPassword"
                value={formData.oldPassword}
                onChange={handleChange}
                autoComplete="current-password"
              />
              {fieldErrors.oldPassword && <div className="invalid-feedback">{fieldErrors.oldPassword}</div>}
            </div>

            <div className="mb-3">
              <label htmlFor="newPassword" className="form-label">New Password</label>
              <input
                type="password"
                className={`form-control ${fieldErrors.newPassword ? 'is-invalid' : ''}`}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />
              {fieldErrors.newPassword && <div className="invalid-feedback">{fieldErrors.newPassword}</div>}
            </div>

            <div className="mb-4">
              <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
              <input
                type="password"
                className={`form-control ${fieldErrors.confirmPassword ? 'is-invalid' : ''}`}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />
              {fieldErrors.confirmPassword && (
                <div className="invalid-feedback">{fieldErrors.confirmPassword}</div>
              )}
            </div>

            <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  Updating...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
