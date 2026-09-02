import { useId, useState } from "react";

/**
 * PasswordInput.jsx
 * ------------------------------------------------------------------
 * A password field with a show/hide toggle and an optional strength meter.
 *
 * The toggle is local UI state only - it never touches the password value,
 * AuthContext or the request payload. It defaults to hidden, and the toggle
 * is tabIndex={-1} so tabbing through the form never lands on "reveal my
 * password" by accident.
 *
 * The strength meter is a HINT, not a rule. It does not change or replace
 * the "minimum 6 characters" validation in Register/ResetPassword - that
 * still decides whether the form can submit. aria-hidden on the meter keeps
 * a screen reader from reading a colour bar; the textual label carries the
 * same information.
 * ------------------------------------------------------------------
 */

const STRENGTH_LEVELS = [
  { label: "Very weak", modifier: "weak" },
  { label: "Weak", modifier: "weak" },
  { label: "Fair", modifier: "fair" },
  { label: "Good", modifier: "good" },
  { label: "Strong", modifier: "strong" },
  { label: "Very strong", modifier: "strong" },
];

function scorePassword(password) {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score; // 0 - 5
}

export default function PasswordInput({
  label,
  name,
  value,
  onChange,
  error,
  autoComplete,
  placeholder,
  showStrength = false,
  id: providedId,
}) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const id = providedId || `${name}-${generatedId}`;
  const errorId = `${id}-error`;
  const strengthId = `${id}-strength`;

  const score = showStrength ? scorePassword(value || "") : 0;
  const level = STRENGTH_LEVELS[score];

  return (
    <div className="ui-field">
      {label && (
        <label htmlFor={id} className="ui-label">
          {label}
        </label>
      )}

      <div className={`ui-input-group ${error ? "ui-input-group--invalid" : ""}`}>
        <span className="ui-input-group__icon" aria-hidden="true">
          <i className="bi bi-lock" />
        </span>

        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          className="ui-input"
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            [error ? errorId : null, showStrength && value ? strengthId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />

        <button
          type="button"
          className="ui-input-group__action"
          onClick={() => setVisible((previous) => !previous)}
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          <i
            className={`bi ${visible ? "bi-eye-slash" : "bi-eye"}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {error && (
        <span className="ui-field__error" id={errorId}>
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          {error}
        </span>
      )}

      {showStrength && value && (
        <div className="ui-strength" id={strengthId}>
          <div className="ui-strength__track" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((index) => (
              <span
                key={index}
                className={`ui-strength__segment ${
                  index < score ? `ui-strength__segment--${level.modifier}` : ""
                }`}
              />
            ))}
          </div>
          <span className="ui-strength__label">
            Password strength: {level.label}
          </span>
        </div>
      )}
    </div>
  );
}
