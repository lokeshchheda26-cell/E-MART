import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * ToastContext.jsx
 * ------------------------------------------------------------------
 * App-wide, non-blocking action feedback.
 *
 * Before this, confirmation and failure messages were handled ad hoc:
 * "Sign in to add items to your cart" was a bespoke absolutely-positioned
 * div hanging off the cart icon, cart errors were console.error'd and
 * never shown at all, and several successful actions gave no feedback
 * whatsoever. A shopper could click "Add to cart" and, if the request
 * failed, see literally nothing happen.
 *
 * One queue, one presentation, one place to change the behaviour. The
 * viewport is rendered once in App.jsx.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success("Added to cart");
 *   toast.error("Unable to add that item.", { title: "Something went wrong" });
 */

const ToastContext = createContext(null);

const DEFAULT_DURATION = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Timer handles are kept out of state - they are not rendered, and
  // storing them in state would re-render the tree on every schedule.
  const timers = useRef(new Map());
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (variant, message, options = {}) => {
      const id = ++nextId.current;
      const duration = options.duration ?? DEFAULT_DURATION;

      setToasts((current) => [
        // Cap the queue so a burst of failures cannot cover the screen.
        ...current.slice(-2),
        {
          id,
          variant,
          message,
          title: options.title ?? null,
          action: options.action ?? null,
        },
      ]);

      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration)
        );
      }

      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toasts,
      dismiss,
      show: push,
      success: (message, options) => push("success", message, options),
      error: (message, options) =>
        // Failures are worth a beat longer than confirmations - the reader
        // usually has to act on them.
        push("error", message, { duration: 6000, ...options }),
      info: (message, options) => push("info", message, options),
      warning: (message, options) => push("warning", message, options),
      loyalty: (message, options) => push("loyalty", message, options),
    }),
    [toasts, dismiss, push]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
