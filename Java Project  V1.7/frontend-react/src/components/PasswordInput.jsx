import { useState } from 'react';

/**
 * PasswordInput.jsx
 * ------------------------------------------------------------------
 * NEW FILE - password field with a show/hide toggle, used by both
 * Login (password) and Register (password + confirm password).
 *
 * The show/hide toggle is local UI state only (useState here) - it
 * never touches the actual password value, AuthContext, or the API
 * payload. It's the same "type toggle" trick the original Login.jsx
 * already had, just pulled into a reusable component with an icon.
 *
 * The optional strength meter (showStrength) is a purely visual aid
 * for Register - it does NOT change or replace the existing
 * validate() rule (password.length < 6) in Register.jsx. That rule
 * still decides whether the form can submit; this just gives the
 * user a hint as they type.
 * ------------------------------------------------------------------
 */
export default function PasswordInput({
  label,
  name,
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
  showStrength = false,
}) {
  const [visible, setVisible] = useState(false);

  const getStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score; // 0 - 5
  };

  const strengthMeta = [
    { label: 'Very weak', color: 'bg-danger' },
    { label: 'Weak', color: 'bg-danger' },
    { label: 'Fair', color: 'bg-warning' },
    { label: 'Good', color: 'bg-info' },
    { label: 'Strong', color: 'bg-success' },
    { label: 'Very strong', color: 'bg-success' },
  ];

  const strength = showStrength ? getStrength(value || '') : 0;

  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={name} className="form-label fw-semibold">
          {label}
        </label>
      )}
      <div className={`input-group em-input-group ${error ? 'border border-danger' : ''}`}>
        <span className="input-group-text bg-white">
          <i className="bi bi-lock"></i>
        </span>
        <input
          type={visible ? 'text' : 'password'}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className={`form-control ${error ? 'is-invalid' : ''}`}
          autoComplete={autoComplete}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setVisible((prev) => !prev)}
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <i className={`bi ${visible ? 'bi-eye-slash' : 'bi-eye'}`}></i>
        </button>
      </div>
      {error && <div className="invalid-feedback d-block">{error}</div>}

      {showStrength && value && (
        <div className="mt-2">
          <div className="progress" style={{ height: '5px' }}>
            <div
              className={`progress-bar ${strengthMeta[strength].color}`}
              style={{ width: `${(strength / 5) * 100}%` }}
            ></div>
          </div>
          <small className="text-muted">{strengthMeta[strength].label}</small>
        </div>
      )}
    </div>
  );
}
