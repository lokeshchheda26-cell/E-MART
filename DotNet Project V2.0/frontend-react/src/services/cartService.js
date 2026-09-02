import api from "../api/axiosConfig";
import { ENDPOINTS } from "../api/endpoints";

// Persisted, per-user cart - replaces the old React-state-only cart.
// Every call requires the caller to already be authenticated (the
// backend returns 401 otherwise); axiosConfig already attaches the
// JWT to every request.

export const getCart = () => api.get(ENDPOINTS.CART);

export const addCartItem = (productId, quantity = 1) =>
  api.post(`${ENDPOINTS.CART}/items`, { productId, quantity });

export const updateCartItemQuantity = (cartItemId, quantity) =>
  api.put(`${ENDPOINTS.CART}/items/${cartItemId}`, { quantity });

export const removeCartItem = (cartItemId) =>
  api.delete(`${ENDPOINTS.CART}/items/${cartItemId}`);

export const clearCart = () => api.delete(ENDPOINTS.CART);
