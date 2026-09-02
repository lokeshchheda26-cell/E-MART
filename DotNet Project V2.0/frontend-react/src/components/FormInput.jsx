import { useId } from "react";

/**
 * FormInput.jsx
 * ------------------------------------------------------------------
 * A labelled text field with an optional leading icon and inline
 * validation message.
 *
 * It holds NO state and NO validation rules of its own - it renders
 * whatever value/onChange/error the parent passes. All validation stays in
 * each page's own validate() function, exactly where it was.
 *
 * Accessibility, which is the real reason this is a component rather than
 * repeated markup:
 *   - the label is always a real <label> tied to the input by id, and the id
 *     is generated with useId() so two forms on one page cannot collide;
 *   - aria-invalid marks the field as failed, so a screen reader says so
 *     rather than relying on the red border alone;
 *   - aria-describedby points at the error text, so the reason is announced
 *     with the field instead of being an unreachable line of red text.
 * ------------------------------------------------------------------
 */
export default function FormInput({
  icon,
  label,
  type = "text",
  name,
  value,
  onChange,
  error,
  hint,
  id: providedId,
  ...rest
}) {
  const generatedId = useId();
  const id = providedId || `${name}-${generatedId}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className="ui-field">
      {label && (
        <label htmlFor={id} className="ui-label">
          {label}
        </label>
      )}

      <div
        className={`ui-input-group ${error ? "ui-input-group--invalid" : ""}`}
      >
        {icon && (
          <span className="ui-input-group__icon" aria-hidden="true">
            <i className={`bi ${icon}`} />
          </span>
        )}

        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          className="ui-input"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={
            [error ? errorId : null, hint ? hintId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          {...rest}
        />
      </div>

      {hint && !error && (
        <span className="ui-field__hint" id={hintId}>
          {hint}
        </span>
      )}

      {error && (
        <span className="ui-field__error" id={errorId}>
          <i className="bi bi-exclamation-circle" aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  );
}
