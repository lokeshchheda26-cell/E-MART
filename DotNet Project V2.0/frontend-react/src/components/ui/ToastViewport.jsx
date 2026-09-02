import { Link } from "react-router-dom";
import { useToast } from "../../context/ToastContext";

const TOAST_ICONS = {
  success: "bi-check-circle-fill",
  error: "bi-exclamation-octagon-fill",
  warning: "bi-exclamation-triangle-fill",
  info: "bi-info-circle-fill",
  loyalty: "bi-gift-fill",
};

/**
 * ToastViewport.jsx
 * ------------------------------------------------------------------
 * Renders the toast queue. Mounted exactly once, at the app root.
 *
 * aria-live="polite" means a screen reader announces each message when it
 * reaches a natural pause, so confirmations are conveyed without cutting
 * across whatever the user is currently reading. The container is always in
 * the DOM (even when empty) because a live region has to exist BEFORE its
 * content changes for the change to be announced at all.
 * ------------------------------------------------------------------
 */
export default function ToastViewport() {
  const { toasts, dismiss } = useToast();

  return (
    <div
      className="ui-toast-viewport"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className={`ui-toast ui-toast--${toast.variant}`}>
          <i
            className={`bi ${TOAST_ICONS[toast.variant] || TOAST_ICONS.info} ui-toast__icon`}
            aria-hidden="true"
          />

          <div className="ui-toast__content">
            {toast.title && <div className="ui-toast__title">{toast.title}</div>}
            <div className={toast.title ? "ui-toast__message" : "ui-toast__title"}>
              {toast.message}
            </div>

            {toast.action?.to && (
              <Link
                to={toast.action.to}
                className="ui-toast__action"
                onClick={() => dismiss(toast.id)}
              >
                {toast.action.label} <i className="bi bi-arrow-right" />
              </Link>
            )}
          </div>

          <button
            type="button"
            className="ui-icon-btn ui-icon-btn--sm"
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
