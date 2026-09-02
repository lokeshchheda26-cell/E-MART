import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";
import { useToast } from "./ToastContext";
import {
  getEmcardSummary,
  reserveEmcardPoints,
} from "../services/emcardService";
import { getProductId } from "../utils/product";
import { MODE, isSaleActive, resolvePurchaseMode } from "../utils/purchaseMode";

/**
 * EmcardContext.jsx
 * ------------------------------------------------------------------
 * The eMCard (loyalty) state and every cart operation that has to stay in
 * step with a points reservation.
 *
 * WHY THIS FILE EXISTS - this is a move, not a rewrite. All of the logic
 * below previously lived inside the ~1300-line Home() component in
 * App.jsx, which meant:
 *   - the cart drawer could only ever be opened from the home page,
 *     because the handlers it needs were local variables in Home();
 *   - the points balance could only be shown in the home page's own
 *     header, so it vanished on every other route;
 *   - eight separate props had to be threaded down into every product
 *     card, the product detail page and the drawer.
 *
 * The BUSINESS RULES are unchanged and the comments explaining them are
 * carried over verbatim, because they document real bugs that were fixed
 * here. In particular: the checkbox is a purely local preference and only
 * addToCart() ever mutates the server-side reservation, and it does so
 * additively. The backend remains authoritative for every figure - this
 * module never computes an available balance itself.
 * ------------------------------------------------------------------
 */

const EmcardContext = createContext(null);

export function EmcardProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const {
    cartItems,
    addItem: addCartItem,
    updateQuantity: updateCartItemQuantity,
    refreshCart,
  } = useCart();
  const toast = useToast();

  // productIds (as strings) the shopper has ticked the eMCard box for.
  // This is the checkbox's LOCAL preference - "what will the next Add to
  // Cart click do" - not a mirror of the server's reservation. See the
  // long note on handleEmcardToggle below for why that distinction matters.
  const [emcardSelectedIds, setEmcardSelectedIds] = useState(() => new Set());
  const [emcardTotalPoints, setEmcardTotalPoints] = useState(0);

  // { productId, message } for the one control that most recently failed
  // validation, so its card can explain itself in place.
  const [emcardError, setEmcardError] = useState(null);

  // BUSINESS CONDITION 1: only an eMCard holder may actually redeem an
  // offer. Non-members are shown the terms (the backend sends them to
  // every viewer) but the control is disabled; enforcement itself stays
  // server-side in EmcardService regardless of what is rendered.
  const isEmcardMember = Boolean(user?.isEmcardMember);

  // ==================================================
  // APPLY SERVER STATUS
  // ==================================================
  // Every eMCard endpoint returns the freshly recalculated balance - the
  // frontend never computes "available points" itself, it just renders
  // whatever the server says right now.
  //
  // Deliberately does NOT touch emcardSelectedIds. If this overwrote the
  // selection from status.reservedProductIds on every reserve/release
  // call, ticking one product's box while another product's Add to Cart
  // click was in flight would silently untick the first one the moment
  // that unrelated response came back.
  const applyEmcardStatus = useCallback((status) => {
    if (!status) return;
    setEmcardTotalPoints(status.totalPoints ?? 0);
  }, []);

  // ==================================================
  // INITIAL LOAD / RESET ON LOGIN-LOGOUT
  // ==================================================
  // eMCard is a per-user, JWT-protected feature. For a guest, skip the
  // calls entirely and keep the balance at zero rather than firing a
  // request that is guaranteed to 401.
  useEffect(() => {
    if (!isAuthenticated()) {
      setEmcardSelectedIds(new Set());
      setEmcardTotalPoints(0);
      setEmcardError(null);
      return;
    }

    let cancelled = false;

    const initEmcard = async () => {
      try {
        // The cart is persisted server-side, so reservations tied to items
        // still sitting in it are legitimate rather than stale - a refresh
        // should keep showing them as applied.
        const response = await getEmcardSummary();
        if (cancelled) return;

        applyEmcardStatus(response.data);

        // Seed the checkbox preference ONCE from what is actually reserved
        // server-side, so a reload still shows a product's box pre-ticked
        // if it already has eMCard units in the cart. After this the set is
        // local-only (see applyEmcardStatus).
        setEmcardSelectedIds(
          new Set(
            (response.data?.reservedProductIds ?? []).map((id) => String(id))
          )
        );
      } catch (error) {
        console.error("Error initializing EMCard balance:", error);
      }
    };

    initEmcard();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ==================================================
  // RESYNC BALANCE ON TAB FOCUS
  // ==================================================
  // If another tab reserved/released points for this same account, coming
  // back here should show the up-to-date balance rather than a stale one.
  useEffect(() => {
    const resyncBalance = async () => {
      if (!isAuthenticated()) return;
      try {
        const response = await getEmcardSummary();
        setEmcardTotalPoints(response.data?.totalPoints ?? 0);
      } catch (error) {
        console.error("Error refreshing EMCard balance:", error);
      }
    };

    window.addEventListener("focus", resyncBalance);
    return () => window.removeEventListener("focus", resyncBalance);
  }, [isAuthenticated]);

  // ==================================================
  // CHECKBOX TOGGLE
  // ==================================================
  // This used to call reserve/release immediately on every click.
  // release() deletes the WHOLE reservation for that product, so
  // "tick -> Add to Cart -> untick -> Add to Cart" wiped the eMCard unit
  // added first, leaving both units priced as cash.
  //
  // The checkbox is now a PURELY LOCAL preference - "will the next Add to
  // Cart click add an eMCard-priced unit or a regular one" - with no
  // network call and nothing it can destroy. addToCart() below is the only
  // place that ever mutates the server-side reservation, and it does so
  // ADDITIVELY (current eMCard units + 1), so units already in the cart are
  // never touched by toggling.
  const handleEmcardToggle = useCallback(
    (product, isChecked) => {
      const productId = getProductId(product);
      const key = String(productId);

      if (!isAuthenticated()) {
        setEmcardError({
          productId: key,
          message: "Sign in to redeem EMCard points.",
        });
        return;
      }

      // ---- PURCHASE MODE GUARD (mirrors the server) ----
      // A product on an active sale is already discounted, and a sale never
      // stacks with an eMCard offer - it is priced cash-only.
      if (isChecked && isSaleActive(product)) {
        setEmcardError({
          productId: key,
          message:
            "This product is on sale, you cannot use e-Card points on it",
        });
        return;
      }

      // Resolved by the shared helper so this handler sees the same mode the
      // card and the product page render. It used to read `offerType` alone -
      // NULL on any row written before that column existed - and rejected a
      // valid cash+points product as "cash only" without ever calling the API.
      const mode = resolvePurchaseMode(product);

      if (isChecked && mode === MODE.CASH_ONLY) {
        setEmcardError({
          productId: key,
          message:
            "This product can only be purchased with cash. " +
            "EMCard points cannot be redeemed on it.",
        });
        return;
      }

      setEmcardError(null);

      setEmcardSelectedIds((previous) => {
        const next = new Set(previous);
        if (isChecked) {
          next.add(key);
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    [isAuthenticated]
  );

  // ==================================================
  // ADD TO CART (eMCard aware)
  // ==================================================
  // Cart mutations require a signed-in user (every /api/cart/** endpoint is
  // JWT-protected) - this mirrors the BRD's "one has to be a registered
  // member of site to purchase".
  //
  // If the product card's checkbox is ticked, the unit being added joins the
  // eMCard-priced portion of this line - ON TOP of whatever eMCard units are
  // already there, never replacing them. Unticked, the unit just adds to the
  // cart and the reservation is left completely alone. That is what makes
  // "add one eMCard unit, then add one normal unit" keep BOTH.
  const addToCart = useCallback(
    (product) => {
      const productId = getProductId(product);
      const key = String(productId);
      const wantsEmcard = emcardSelectedIds.has(key);

      return addCartItem(productId, 1)
        .then((updatedCart) => {
          if (!wantsEmcard) {
            toast.success("Added to your cart");
            return updatedCart;
          }

          const line = (updatedCart?.items ?? []).find(
            (item) => String(getProductId(item)) === key
          );
          const currentEmcardQty = Number(line?.emcardQuantity ?? 0);

          return reserveEmcardPoints(productId, currentEmcardQty + 1)
            .then((response) => {
              const status = response.data;
              applyEmcardStatus(status);

              if (!status.success) {
                setEmcardError({
                  productId: key,
                  message: status.message || "Insufficient EMCard Points",
                });
                toast.warning(
                  status.message ||
                    "Added to cart, but there aren't enough EMCard points for it."
                );
              } else {
                toast.loyalty("Added with your EMCard offer applied");
              }

              refreshCart();
              return updatedCart;
            })
            .catch((error) => {
              console.error(
                "Error reserving EMCard points for the added unit:",
                error
              );
              setEmcardError({
                productId: key,
                message:
                  "Added to cart, but couldn't apply EMCard points. Please try again.",
              });
              toast.warning(
                "Added to cart, but we couldn't apply your EMCard points."
              );
              return updatedCart;
            });
        })
        .catch((error) => {
          if (error?.message === "SIGN_IN_REQUIRED") {
            toast.info("Sign in to add items to your cart.", {
              title: "Almost there",
              action: { label: "Sign in", to: "/login" },
            });
          } else {
            console.error("Error adding to cart:", error);
            toast.error(
              "Unable to add that item to your cart. Please try again."
            );
          }
          throw error;
        });
    },
    [addCartItem, applyEmcardStatus, emcardSelectedIds, refreshCart, toast]
  );

  // ==================================================
  // PER-LINE QUANTITY SPLIT (cart drawer)
  // ==================================================
  // Lets the shopper treat one product's eMCard-redeemed units and its
  // normal-priced units as two INDEPENDENT lines - e.g. quantity 4 shown as
  // 2 redeemed + 2 paid in cash, adjusted separately. "Independent" means
  // adjusting one line changes the CART TOTAL, never the other line's count.

  const findCartLineByProductId = useCallback(
    (productId) => {
      const key = String(productId);
      return cartItems.find((item) => String(getProductId(item)) === key);
    },
    [cartItems]
  );

  const applyReserveResult = useCallback(
    (productId, response) => {
      const status = response.data;
      applyEmcardStatus(status);
      if (!status.success) {
        setEmcardError({
          productId: String(productId),
          message: status.message || "Insufficient EMCard Points",
        });
        toast.warning(status.message || "Insufficient EMCard points");
      }
      return status;
    },
    [applyEmcardStatus, toast]
  );

  const reportEmcardLineError = useCallback(
    (productId, message) => {
      console.error(message);
      setEmcardError({ productId: String(productId), message });
      toast.error(message);
    },
    [toast]
  );

  // eMCard line "+": add a brand-new unit to the cart and mark it redeemed.
  // The normal-priced units already in the line are untouched.
  const increaseEmcardLine = useCallback(
    async (productId) => {
      if (!isAuthenticated()) return;
      setEmcardError(null);

      const item = findCartLineByProductId(productId);
      const currentEmcardQty = Number(item?.emcardQuantity ?? 0);
      const currentTotal = Number(item?.quantity ?? 0);

      try {
        if (item) {
          await updateCartItemQuantity(item.cartItemId, currentTotal + 1);
        } else {
          await addCartItem(productId, 1);
        }

        const response = await reserveEmcardPoints(
          productId,
          currentEmcardQty + 1
        );
        applyReserveResult(productId, response);
        refreshCart();
      } catch {
        reportEmcardLineError(
          productId,
          "Unable to add an EMCard-redeemed unit. Please try again."
        );
      }
    },
    [
      addCartItem,
      applyReserveResult,
      findCartLineByProductId,
      isAuthenticated,
      refreshCart,
      reportEmcardLineError,
      updateCartItemQuantity,
    ]
  );

  // eMCard line "-": remove ONE redeemed unit from the cart entirely (the
  // cart's total quantity drops by 1). The normal-priced units are untouched -
  // the removed unit does not "become" one of them, it just leaves the cart.
  const decreaseEmcardLine = useCallback(
    async (productId) => {
      if (!isAuthenticated()) return;

      const item = findCartLineByProductId(productId);
      const currentEmcardQty = Number(item?.emcardQuantity ?? 0);
      if (!item || currentEmcardQty <= 0) return;

      setEmcardError(null);

      try {
        await reserveEmcardPoints(productId, currentEmcardQty - 1);
        await updateCartItemQuantity(item.cartItemId, item.quantity - 1);
        refreshCart();
      } catch {
        reportEmcardLineError(
          productId,
          "Unable to update EMCard selection. Please try again."
        );
      }
    },
    [
      findCartLineByProductId,
      isAuthenticated,
      refreshCart,
      reportEmcardLineError,
      updateCartItemQuantity,
    ]
  );

  // Drops the eMCard line to zero - only the redeemed units leave the cart;
  // any normal-priced units on the same product stay.
  const removeEmcardLine = useCallback(
    async (productId) => {
      if (!isAuthenticated()) return;

      const item = findCartLineByProductId(productId);
      const currentEmcardQty = Number(item?.emcardQuantity ?? 0);
      if (!item || currentEmcardQty <= 0) return;

      const normalQty = Number(
        item.normalQuantity ?? Math.max(0, item.quantity - currentEmcardQty)
      );

      setEmcardError(null);

      try {
        await reserveEmcardPoints(productId, 0);
        // Dropping quantity to (or below) 0 is the existing "remove this
        // line" behaviour when nothing normal is left.
        await updateCartItemQuantity(item.cartItemId, normalQty);
        refreshCart();
      } catch {
        reportEmcardLineError(
          productId,
          "Unable to remove the EMCard line. Please try again."
        );
      }
    },
    [
      findCartLineByProductId,
      isAuthenticated,
      refreshCart,
      reportEmcardLineError,
      updateCartItemQuantity,
    ]
  );

  // Normal line "-": plain cart-quantity decrease. The reservation is never
  // touched, so emcardQuantity (and therefore the eMCard line) stays exactly
  // as it was.
  const decreaseNormalLine = useCallback(
    (productId) => {
      const item = findCartLineByProductId(productId);
      if (!item) return;

      const normalQty = Number(
        item.normalQuantity ??
          Math.max(0, item.quantity - (item.emcardQuantity ?? 0))
      );
      if (normalQty <= 0) return;

      updateCartItemQuantity(item.cartItemId, item.quantity - 1).catch(() =>
        reportEmcardLineError(
          productId,
          "Unable to update your cart. Please try again."
        )
      );
    },
    [findCartLineByProductId, reportEmcardLineError, updateCartItemQuantity]
  );

  // Drops the normal line to zero, shrinking the cart's total quantity down
  // to just the eMCard-redeemed units - which stay untouched.
  const removeNormalLine = useCallback(
    (productId) => {
      const item = findCartLineByProductId(productId);
      if (!item) return;

      const emcardQty = Number(item.emcardQuantity ?? 0);

      updateCartItemQuantity(item.cartItemId, emcardQty).catch(() =>
        reportEmcardLineError(
          productId,
          "Unable to remove the normal line. Please try again."
        )
      );
    },
    [findCartLineByProductId, reportEmcardLineError, updateCartItemQuantity]
  );

  const value = useMemo(
    () => ({
      emcardSelectedIds,
      emcardTotalPoints,
      emcardError,
      isEmcardMember,
      clearEmcardError: () => setEmcardError(null),
      handleEmcardToggle,
      addToCart,
      increaseEmcardLine,
      decreaseEmcardLine,
      removeEmcardLine,
      decreaseNormalLine,
      removeNormalLine,
    }),
    [
      emcardSelectedIds,
      emcardTotalPoints,
      emcardError,
      isEmcardMember,
      handleEmcardToggle,
      addToCart,
      increaseEmcardLine,
      decreaseEmcardLine,
      removeEmcardLine,
      decreaseNormalLine,
      removeNormalLine,
    ]
  );

  return (
    <EmcardContext.Provider value={value}>{children}</EmcardContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEmcard() {
  const context = useContext(EmcardContext);
  if (!context) {
    throw new Error("useEmcard must be used within an EmcardProvider");
  }
  return context;
}
