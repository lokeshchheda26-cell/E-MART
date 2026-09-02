import api from "../api/axiosConfig";
import { ENDPOINTS } from "../api/endpoints";

export const getAllCategories = () => api.get(ENDPOINTS.CATEGORY);

export const getCategoryById = (id) => api.get(`${ENDPOINTS.CATEGORY}/${id}`);

export const createCategory = (category) => api.post(ENDPOINTS.CATEGORY, category);

export const updateCategory = (id, category) =>
  api.put(`${ENDPOINTS.CATEGORY}/${id}`, category);

export const deleteCategory = (id) => api.delete(`${ENDPOINTS.CATEGORY}/${id}`);
