import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import * as userApi from '../api/userApi';
import { TOKEN_KEY, USER_KEY } from '../api/axiosConfig';
import { ROLES } from '../api/endpoints';

/**
 * AuthContext.jsx
 * ------------------------------------------------------------------
 * Single source of truth for "who is logged in" across the app.
 *
 * - Persists the JWT under localStorage key "emart_token" and the
 *   logged-in user object under "emart_user".
 * - Decodes the JWT (jwt-decode) to read its "exp" claim.
 * - On every page refresh, checks whether the stored token has
 *   already expired; if so it logs the user out immediately instead
 *   of trusting stale localStorage data.
 * - Exposes login(), logout(), isAuthenticated(), isAdmin() to the
 *   rest of the app via useAuth().
 * ------------------------------------------------------------------
 */

const AuthContext = createContext(null);

// Returns true if a JWT's "exp" claim (seconds since epoch) is in the past.
function isTokenExpired(token) {
  try {
    const decoded = jwtDecode(token);
    if (!decoded.exp) return false; // no exp claim -> treat as non-expiring
    const nowInSeconds = Date.now() / 1000;
    return decoded.exp < nowInSeconds;
  } catch (err) {
    // Malformed token -> treat as expired/invalid.
    return true;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Clears storage + in-memory state. Wrapped in useCallback so it can
  // safely be used inside the expiry-check effect below.
  const logout = useCallback(() => {
    userApi.logout(); // clears emart_token / emart_user from localStorage
    setUser(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const { token, user: loggedInUser } = await userApi.login(credentials);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  // Used by the Google OAuth2 redirect handler. That flow lands back on
  // /oauth2/redirect?token=...&type=Bearer - a JWT, but no profile fields.
  // So: store the token first (userApi.me() needs it on the Authorization
  // header), then call GET /api/auth/me to get the same flat user shape
  // normal login() returns.
  const loginWithToken = useCallback(async (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    try {
      const loggedInUser = await userApi.me();
      localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      return loggedInUser;
    } catch (err) {
      // Bad/expired token from the redirect - don't leave a dead one stored.
      localStorage.removeItem(TOKEN_KEY);
      throw err;
    }
  }, []);

  const isAuthenticated = useCallback(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    return Boolean(token) && !isTokenExpired(token);
  }, []);

  const isAdmin = useCallback(() => {
    return user?.role === ROLES.ADMIN;
  }, [user]);

  // On mount (including full page refresh): restore session from
  // localStorage, but only if the token hasn't already expired.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (token && storedUser) {
      if (isTokenExpired(token)) {
        logout();
      } else {
        try {
          setUser(JSON.parse(storedUser));
        } catch (err) {
          logout();
        }
      }
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Passive background check: if the token expires while the tab is
  // open (not just on refresh), log the user out automatically.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return undefined;

    const intervalId = setInterval(() => {
      const currentToken = localStorage.getItem(TOKEN_KEY);
      if (currentToken && isTokenExpired(currentToken)) {
        logout();
      }
    }, 30000); // check every 30s

    return () => clearInterval(intervalId);
  }, [user, logout]);

  const value = {
    user,
    loading,
    login,
    loginWithToken,
    logout,
    isAuthenticated,
    isAdmin,
    setUser, // exposed so EditProfile can refresh the cached user after a save
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
