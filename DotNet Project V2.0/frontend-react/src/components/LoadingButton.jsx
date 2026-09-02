import Button from "./ui/Button";

/**
 * LoadingButton.jsx
 * ------------------------------------------------------------------
 * Kept as a thin alias over the shared Button so the four pages already
 * importing it (Login, Register, ForgotPassword, ResetPassword) keep working
 * untouched, while there is still only ONE button implementation in the app.
 *
 * Behaviour is unchanged: while `loading` is true it shows a spinner and
 * disables itself, which is what prevents a double submission.
 * ------------------------------------------------------------------
 */
export default function LoadingButton({
  loading,
  children,
  loadingText = "Please wait...",
  variant = "primary",
  size = "lg",
  block = true,
  className = "",
  ...rest
}) {
  return (
    <Button
      variant={variant}
      size={size}
      block={block}
      loading={loading}
      loadingText={loadingText}
      className={className}
      {...rest}
    >
      {children}
    </Button>
  );
}
