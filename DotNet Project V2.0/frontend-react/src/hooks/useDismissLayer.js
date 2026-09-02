import { useEffect, useRef } from "react";

/**
 * useDismissLayer
 * ------------------------------------------------------------------
 * Escape-to-close for overlay-backed surfaces (cart drawer, mobile nav,
 * confirmation dialog), with correct behaviour when several are stacked.
 *
 * WHY NOT A DOCUMENT-WIDE OUTSIDE-CLICK LISTENER
 * The previous approach listened for `mousedown` anywhere on the document
 * and closed the surface if the event target was not inside its panel.
 * That is subtly wrong the moment a second layer opens on top, because the
 * new layer is a SIBLING in the DOM, not a descendant:
 *
 *   <div class="ui-overlay">        <- drawer's backdrop
 *   <aside class="cart-drawer">     <- panelRef
 *   <ConfirmDialog>                 <- NOT inside panelRef
 *
 * so pressing the dialog's "Remove" button counted as a click outside the
 * drawer. The drawer closed on mousedown, React unmounted the whole subtree
 * including the dialog, and the button was gone before the `click` event
 * could fire - so the confirm handler never ran and the item was never
 * removed. Toasts sat outside the panel too and had the same effect.
 *
 * THE FIX, in two halves:
 *   1. Clicking "outside" is detected by the OVERLAY's own onClick. The
 *      overlay is, by definition, everything outside the panel - and any
 *      layer above renders its own overlay on top, so it captures its own
 *      clicks instead. No layer can dismiss another by accident.
 *      As a bonus, a click (rather than mousedown) means selecting text and
 *      dragging past the edge of a panel no longer closes it.
 *   2. Escape is handled here, against a shared stack, so only the TOPMOST
 *      layer responds. Escape with a dialog open over the drawer closes the
 *      dialog and leaves the drawer alone, which is what people expect.
 *
 * @param {boolean} active   register while this surface is open
 * @param {Function} onDismiss
 */

// Shared across every instance: the currently open layers, oldest first.
const layerStack = [];

export default function useDismissLayer(active, onDismiss) {
  const handlerRef = useRef(onDismiss);

  // Keep the newest callback without re-registering the listener (and so
  // without reshuffling this layer's position in the stack) on every render.
  handlerRef.current = onDismiss;

  useEffect(() => {
    if (!active) return undefined;

    const token = {};
    layerStack.push(token);

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      // Only the top of the stack reacts; everything below stays open.
      if (layerStack[layerStack.length - 1] !== token) return;
      event.stopPropagation();
      handlerRef.current?.();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const index = layerStack.indexOf(token);
      if (index !== -1) layerStack.splice(index, 1);
    };
  }, [active]);
}

/** True when this layer is the one on top - used to gate the backdrop. */
export function isTopLayer(token) {
  return layerStack[layerStack.length - 1] === token;
}
