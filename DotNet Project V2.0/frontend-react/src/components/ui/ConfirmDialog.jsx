import { useEffect, useRef } from "react";
import Button from "./Button";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useDismissLayer from "../../hooks/useDismissLayer";

/**
 * ConfirmDialog.jsx
 * ------------------------------------------------------------------
 * Confirmation for destructive actions, replacing window.confirm().
 *
 * window.confirm is not just visually off-brand: it blocks the whole
 * browser thread, cannot be styled or translated, and on mobile it is
 * rendered as a system alert that looks like it came from somewhere other
 * than the site the shopper is on - which is exactly the wrong signal right
 * before "delete this permanently".
 *
 * Accessibility: role="dialog" + aria-modal, focus moves to the confirming
 * button on open and returns to the trigger on close, and Escape cancels.
 * ------------------------------------------------------------------
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);
  const previouslyFocused = useRef(null);

  useBodyScrollLock(open);

  // Escape closes THIS dialog and stops there. Because the layer stack only
  // lets the topmost surface react, a dialog raised from inside the cart
  // drawer no longer takes the drawer down with it.
  useDismissLayer(open && !loading, onCancel);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    confirmRef.current?.focus();

    return () => {
      // Returning focus to whatever opened the dialog is what keeps
      // keyboard users from being dumped back at the top of the document.
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Sits ABOVE the cart drawer (see --z-modal-overlay), so the dialog
          dims everything behind it and owns every click outside its panel -
          including clicks that land on the drawer. */}
      <div
        className="ui-overlay ui-overlay--modal"
        onClick={loading ? undefined : onCancel}
      />

      <div className="ui-modal">
        <div
          className="ui-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby={message ? "confirm-dialog-message" : undefined}
        >
          <div className="ui-modal__body">
            <span
              className={`ui-modal__icon ${
                variant === "danger" ? "" : "ui-modal__icon--info"
              }`}
              aria-hidden="true"
            >
              <i
                className={`bi ${
                  variant === "danger"
                    ? "bi-exclamation-triangle-fill"
                    : "bi-question-circle-fill"
                }`}
              />
            </span>

            <div>
              <h2 className="ui-modal__title" id="confirm-dialog-title">
                {title}
              </h2>
              {message && (
                <p className="ui-modal__message" id="confirm-dialog-message">
                  {message}
                </p>
              )}
            </div>
          </div>

          <div className="ui-modal__footer">
            <Button variant="ghost" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button
              ref={confirmRef}
              variant={variant === "danger" ? "danger" : "primary"}
              onClick={onConfirm}
              loading={loading}
              loadingText="Working..."
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
