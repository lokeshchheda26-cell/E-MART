import { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import * as cartApi from "../services/cartService";

/**
 * CartContext.jsx
 * ------------------------------------------------------------------
 * Single source of truth for the shopping cart, now backed by the
 * persisted /api/cart/** endpoints instead of local-only React
 * state. Uses useReducer (WPT: "Redux or Reducer") rather than
 * pulling in Redux - there's exactly one piece of shared state (the
 * cart) and the app already has a working precedent for
 * Context+hooks in AuthContext.jsx, so this stays consistent with
 * the existing architecture instead of introducing a second, larger
 * state-management pattern for one screen's worth of state.
 *
 * The cart requires a signed-in user (mirrors the BRD: "one has to
 * be a register member of site to purchase"). A guest's addItem/
 * updateQuantity/removeItem/clearCart calls reject with a
 * SIGN_IN_REQUIRED error instead of hitting the network - callers
 * (e.g. the Add to Cart button) catch that and prompt sign-in, the
 * same pattern already used for guest EMCard attempts.
 * ------------------------------------------------------------------
 */

const CartContext = createContext(null);

const initialState = { cart: null, loading: false, error: null };

function cartReducer(state, action) {
  switch (action.type) {
    case "CART_LOADING":
      return { ...state, loading: true, error: null };
    case "CART_SUCCESS":
      return { cart: action.payload, loading: false, error: null };
    case "CART_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "CART_RESET":
      return initialState;
    default:
      return state;
  }
}

function extractErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export function CartProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const refreshCart = useCallback(() => {
    if (!isAuthenticated()) {
      dispatch({ type: "CART_RESET" });
      return Promise.resolve(null);
    }

    dispatch({ type: "CART_LOADING" });

    return cartApi
      .getCart()
      .then((response) => {
        dispatch({ type: "CART_SUCCESS", payload: response.data });
        return response.data;
      })
      .catch((err) => {
        console.error("Error loading cart:", err);
        dispatch({
          type: "CART_ERROR",
          payload: extractErrorMessage(err, "Unable to load your cart."),
        });
        return null;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Reload (or clear) the cart whenever who's logged in changes -
  // covers login, logout, and switching accounts in the same tab.
  useEffect(() => {
    refreshCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const addItem = useCallback(
    (productId, quantity = 1) => {
      if (!isAuthenticated()) {
        return Promise.reject(new Error("SIGN_IN_REQUIRED"));
      }

      dispatch({ type: "CART_LOADING" });

      return cartApi
        .addCartItem(productId, quantity)
        .then((response) => {
          dispatch({ type: "CART_SUCCESS", payload: response.data });
          return response.data;
        })
        .catch((err) => {
          dispatch({
            type: "CART_ERROR",
            payload: extractErrorMessage(err, "Unable to add item to cart."),
          });
          throw err;
        });
    },
    [isAuthenticated]
  );

  const updateQuantity = useCallback((cartItemId, quantity) => {
    dispatch({ type: "CART_LOADING" });

    return cartApi
      .updateCartItemQuantity(cartItemId, quantity)
      .then((response) => {
        dispatch({ type: "CART_SUCCESS", payload: response.data });
        return response.data;
      })
      .catch((err) => {
        dispatch({
          type: "CART_ERROR",
          payload: extractErrorMessage(err, "Unable to update your cart."),
        });
        throw err;
      });
  }, []);

  const removeItem = useCallback((cartItemId) => {
    dispatch({ type: "CART_LOADING" });

    return cartApi
      .removeCartItem(cartItemId)
      .then((response) => {
        dispatch({ type: "CART_SUCCESS", payload: response.data });
        return response.data;
      })
      .catch((err) => {
        dispatch({
          type: "CART_ERROR",
          payload: extractErrorMessage(err, "Unable to remove that item."),
        });
        throw err;
      });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CART_LOADING" });

    return cartApi
      .clearCart()
      .then((response) => {
        dispatch({ type: "CART_SUCCESS", payload: response.data });
        return response.data;
      })
      .catch((err) => {
        dispatch({
          type: "CART_ERROR",
          payload: extractErrorMessage(err, "Unable to clear your cart."),
        });
        throw err;
      });
  }, []);

  const cart = state.cart;

  const value = {
    cart,
    cartItems: cart?.items ?? [],
    cartCount: cart?.itemCount ?? 0,
    cartSubtotal: cart?.subtotal ?? 0,
    cartTotalSavings: cart?.totalSavings ?? 0,
    cartPayableTotal: cart?.payableTotal ?? 0,
    cartPointsToRedeem: cart?.totalPointsToRedeem ?? 0,
    // Purchase-mode driven figures, all computed once server-side by
    // PurchaseDecisionEngine so the cart, checkout summary and invoice
    // quote identical numbers.
    cartPointsBalanceOpening: cart?.pointsBalanceOpening ?? 0,
    cartPointsBalanceClosing: cart?.pointsBalanceClosing ?? 0,
    cartPointsEarned: cart?.pointsEarned ?? 0,
    cartEarnRatePercent: cart?.earnRatePercent ?? null,
    // False when a line cannot be bought right now (e.g. a points-only
    // product the balance no longer covers); blockingReason says why.
    cartPurchasable: cart?.purchasable ?? true,
    cartBlockingReason: cart?.blockingReason ?? null,
    loading: state.loading,
    error: state.error,
    refreshCart,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
