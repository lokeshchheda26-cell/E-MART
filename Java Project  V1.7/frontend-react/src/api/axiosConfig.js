import { API_BASE_URL } from "./endpoints";

/**
 * axiosConfig.js
 * ------------------------------------------------------------------
 * NOTE: despite the filename (kept as-is so every existing
 * `import api from "../api/axiosConfig"` across the app keeps
 * working untouched), this is no longer axios - it's a small
 * fetch()-based client that mimics the same call shape
 * (api.get/post/put/delete -> Promise<{ data }>) and the same
 * axios-style error shape (err.response.status / err.response.data
 * / err.message) so every existing service/page that reads
 * err.response.data.message etc. keeps working without changes.
 *
 * Session handling: the JWT is stored in localStorage (survives a
 * full browser close/reopen, unlike sessionStorage). On any 401
 * from a protected endpoint, this client clears the stored
 * session and hard-redirects to /login so the app always asks the
 * person to sign back in instead of leaving them on a broken page.
 * ------------------------------------------------------------------
 */

export const TOKEN_KEY = "emart_token";
export const USER_KEY = "emart_user";

function buildUrl(url, params) {
  const full = /^https?:\/\//i.test(url) ? url : `${API_BASE_URL}${url}`;
  if (!params) return full;

  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });

  const queryString = query.toString();
  return queryString ? `${full}?${queryString}` : full;
}

function isPublicAuthUrl(url) {
  return (
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/register") ||
    url.includes("/api/auth/forgot-password") ||
    url.includes("/api/auth/reset-password")
  );
}

// Fires whenever a protected request comes back 401 - clears the
// stored session and sends the person to /login so they're always
// asked to sign in again rather than seeing a silently-broken page.
function handleSessionExpired() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

async function request(method, url, { data, params, responseType, headers } = {}) {
  const fullUrl = buildUrl(url, params);
  const token = localStorage.getItem(TOKEN_KEY);

  const fetchHeaders = { ...(headers || {}) };
  const hasBody = data !== undefined && data !== null;
  if (hasBody) fetchHeaders["Content-Type"] = "application/json";
  if (token) fetchHeaders.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(fullUrl, {
      method,
      headers: fetchHeaders,
      body: hasBody ? JSON.stringify(data) : undefined,
    });
  } catch (networkErr) {
    // fetch() only throws on network failure, never on HTTP error
    // status - mirror axios's error shape so existing catch blocks
    // (err.message) still work.
    throw { message: networkErr.message || "Network error", isNetworkError: true };
  }

  if (response.status === 401 && !isPublicAuthUrl(url)) {
    handleSessionExpired();
  }

  if (!response.ok) {
    let body = null;
    try {
      body = await response.json();
    } catch (_) {
      // Non-JSON error body (e.g. plain text/HTML) - leave body null.
    }
    // eslint-disable-next-line no-throw-literal
    throw {
      message: body?.message || response.statusText || "Request failed",
      response: { status: response.status, data: body },
      config: { url },
    };
  }

  if (responseType === "blob") {
    return { data: await response.blob(), status: response.status };
  }

  if (response.status === 204) {
    return { data: null, status: response.status };
  }

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;
  return { data: parsed, status: response.status };
}

const api = {
  get: (url, config) => request("GET", url, config),
  post: (url, data, config) => request("POST", url, { ...config, data }),
  put: (url, data, config) => request("PUT", url, { ...config, data }),
  delete: (url, config) => request("DELETE", url, config),
};

export default api;
