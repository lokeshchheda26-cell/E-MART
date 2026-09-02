export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "";

export const ENDPOINTS = {
  AUTH: {
    REGISTER: "/api/auth/register",
    LOGIN: "/api/auth/login",
    ME: "/api/auth/me",
    FORGOT_PASSWORD: "/api/auth/forgot-password",
    RESET_PASSWORD: "/api/auth/reset-password",
  },
  USERS: "/api/users",
  CATEGORY: "/api/category",
  SUBCATEGORY: "/api/subcategory",
  PRODUCT: "/api/product",
  EMCARD: "/api/emcard",
  CART: "/api/cart",
  ORDERS: "/api/orders",
};

export const ROLES = {
  ADMIN: "ADMIN",
  CUSTOMER: "CUSTOMER",
};

export const GENDERS = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
};
