/**
 * LoadingButton.jsx
 * ------------------------------------------------------------------
 * NEW FILE - a submit button that shows a Bootstrap spinner while
 * a `loading` prop is true, and disables itself so it can't be
 * clicked twice. Used by Login, Register, and ForgotPassword.
 *
 * This is a direct extraction of the exact spinner markup that
 * already existed inline in Login.jsx and Register.jsx - the
 * disabled/submitting behavior is unchanged, just reused.
 * ------------------------------------------------------------------
 */
export default function LoadingButton({
  loading,
  children,
  loadingText = 'Please wait...',
  className = 'btn btn-primary btn-lg w-100 em-btn-lift',
  ...rest
}) {
  return (
    <button className={className} disabled={loading} {...rest}>
      {loading ? (
        <>
          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
