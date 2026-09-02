/**
 * FormInput.jsx
 * ------------------------------------------------------------------
 * NEW FILE - a small wrapper around Bootstrap's input-group pattern
 * (icon + input + inline validation message) so Login/Register/
 * ForgotPassword don't each repeat the same six lines of markup.
 *
 * This component holds NO state and NO validation rules of its own -
 * it just renders whatever value/onChange/error props the parent
 * page passes in. All validation logic stays exactly where it already
 * lived, in each page's own validate() function.
 * ------------------------------------------------------------------
 */
export default function FormInput({
  icon,
  label,
  type = 'text',
  name,
  value,
  onChange,
  error,
  ...rest
}) {
  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={name} className="form-label fw-semibold">
          {label}
        </label>
      )}
      <div className={`input-group em-input-group ${error ? 'border border-danger' : ''}`}>
        {icon && (
          <span className="input-group-text bg-white">
            <i className={`bi ${icon}`}></i>
          </span>
        )}
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className={`form-control ${error ? 'is-invalid' : ''}`}
          {...rest}
        />
      </div>
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
}
