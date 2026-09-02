import { useEffect, useRef } from "react";

/**
 * Closes a transient surface (dropdown, drawer, dialog) when the user clicks
 * outside it or presses Escape.
 *
 * Both behaviours are expected of every popup layer, and both were
 * previously either re-implemented per component or simply missing - the
 * account dropdown handled outside clicks but not Escape, and the cart
 * drawer handled neither.
 *
 * `mousedown` rather than `click`: it fires before focus moves, so the panel
 * is already closing by the time the click lands on whatever is underneath.
 *
 * @param {boolean} active  only listen while the surface is open
 * @param {Function} onDismiss
 * @returns {React.RefObject} attach to the element that should NOT dismiss
 */
export default function useDismissable(active, onDismiss) {
  const ref = useRef(null);
  const handlerRef = useRef(onDismiss);

  // Keep the latest callback without re-binding the listeners on every
  // render of the parent.
  handlerRef.current = onDismiss;

  useEffect(() => {
    if (!active) return undefined;

    const handlePointerDown = (event) => {
      if (!ref.current?.contains(event.target)) {
        handlerRef.current?.();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        handlerRef.current?.();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [active]);

  return ref;
}
