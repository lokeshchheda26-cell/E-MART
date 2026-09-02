import api from "../api/axiosConfig";
import { ENDPOINTS } from "../api/endpoints";

export const getAllSubCategories = () => api.get(ENDPOINTS.SUBCATEGORY);

export const getSubCategoriesByCategory = (catmasterId) =>
  api.get(`${ENDPOINTS.SUBCATEGORY}/category/${catmasterId}`);
