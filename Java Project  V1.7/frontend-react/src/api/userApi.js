import api from "./axiosConfig";
import { TOKEN_KEY, USER_KEY } from "./axiosConfig";
import { API_BASE_URL, ENDPOINTS } from "./endpoints";

const OAUTH_BASE_URL =
  import.meta.env.VITE_OAUTH_BASE_URL || API_BASE_URL || "http://localhost:8080";

function toUser(data) {
  return {
    userId: data.userId,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    role: data.role,
    phone: data.phone,
    address: data.address,
    gender: data.gender,
    dob: data.dob,
    isEmcardMember: data.isEmcardMember,
    emcardPoints: data.emcardPoints,
  };
}

function getCachedUserId() {
  const stored = localStorage.getItem(USER_KEY);
  if (!stored) throw new Error("No logged-in user found.");
  const user = JSON.parse(stored);
  if (!user.userId) throw new Error("User ID missing from session.");
  return user.userId;
}

export async function login(credentials) {
  const { data } = await api.post(ENDPOINTS.AUTH.LOGIN, credentials);
  return { token: data.token, user: toUser(data) };
}

export async function register(payload) {
  const { data } = await api.post(ENDPOINTS.AUTH.REGISTER, payload);
  return data;
}

export async function me() {
  const { data } = await api.get(ENDPOINTS.AUTH.ME);
  return toUser(data);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getGoogleLoginUrl() {
  return `${OAUTH_BASE_URL}/oauth2/authorization/google`;
}

export async function getProfile() {
  const userId = getCachedUserId();
  const { data } = await api.get(`${ENDPOINTS.USERS}/${userId}`);
  return data;
}

function toUserRequest(profileData) {
  const payload = {
    firstName: profileData.firstName,
    lastName: profileData.lastName,
    email: profileData.email,
    phone: profileData.phone,
    address: profileData.address,
    gender: profileData.gender,
    dob: profileData.dob,
    isEmcardMember: profileData.isEmcardMember ?? false,
  };
  if (profileData.password) {
    payload.password = profileData.password;
  }
  return payload;
}

export async function updateProfile(profileData) {
  const userId = getCachedUserId();
  const { data } = await api.put(
    `${ENDPOINTS.USERS}/${userId}`,
    toUserRequest(profileData),
  );
  return data;
}

export async function changePassword(newPassword) {
  const current = await getProfile();
  return updateProfile({ ...current, password: newPassword });
}

export async function getAllUsers() {
  const { data } = await api.get(ENDPOINTS.USERS);
  return data;
}

export async function deleteUser(userId) {
  const { data } = await api.delete(`${ENDPOINTS.USERS}/${userId}`);
  return data;
}

export async function forgotPassword(email) {
  const { data } = await api.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  return data;
}

export async function resetPassword({ email, otp, newPassword }) {
  const { data } = await api.post(ENDPOINTS.AUTH.RESET_PASSWORD, {
    email,
    otp,
    newPassword,
  });
  return data;
}
