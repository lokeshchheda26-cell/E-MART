import api from "../api/axiosConfig";
import { ENDPOINTS } from "../api/endpoints";

// Checkout turns the current cart into a placed order. `deliveryOption`
// is "COURIER" or "PICKUP" (see backend DeliveryOption enum).
export const checkout = ({ deliveryOption, shippingAddress, storeLocation }) =>
  api.post(`${ENDPOINTS.ORDERS}/checkout`, {
    deliveryOption,
    shippingAddress,
    storeLocation,
  });

export const getOrderHistory = () => api.get(ENDPOINTS.ORDERS);

export const getOrder = (orderId) => api.get(`${ENDPOINTS.ORDERS}/${orderId}`);

// Downloads the PDF invoice as a Blob so the caller can trigger a
// browser download / open it in a new tab.
export const downloadInvoicePdf = (orderId) =>
  api.get(`${ENDPOINTS.ORDERS}/${orderId}/invoice/pdf`, {
    responseType: "blob",
  });
