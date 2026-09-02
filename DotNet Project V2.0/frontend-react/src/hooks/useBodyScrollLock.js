import { useEffect } from "react";

/**
 * Freezes background scrolling while an overlay (cart drawer, mobile nav,
 * confirmation dialog) owns the screen.
 *
 * Without this, scrolling inside an open drawer on a phone "leaks" into the
 * page behind it, so closing the drawer leaves the shopper somewhere they
 * never meant to go.
 *
 * The counter matters: two overlays can legitimately be open at once (a
 * confirmation dialog raised from inside the cart drawer). Naively removing
 * the class when the dialog closes would unlock the page while the drawer is
 * still up, so instead each active lock increments a shared count and the
 * class is only removed when the last one releases.
 */

let lockCount = 0;

export default function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;

    lockCount += 1;
    document.body.classList.add("is-scroll-locked");

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.classList.remove("is-scroll-locked");
      }
    };
  }, [active]);
}
