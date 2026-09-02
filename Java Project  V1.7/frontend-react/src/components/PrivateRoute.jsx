import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * PrivateRoute.jsx
 * ------------------------------------------------------------------
 * Wraps any page that requires a logged-in user.
 *
 * Usage:
 *   <PrivateRoute><Profile /></PrivateRoute>
 *
 * For ADMIN-only pages (e.g. the Admin Dashboard), pass adminOnly:
 *   <PrivateRoute adminOnly><Dashboard /></PrivateRoute>
 *
 * - If there is no valid (non-expired) token -> redirect to /login.
 * - If adminOnly is set and the user isn't an ADMIN -> redirect to /
 *   (CUSTOMER accounts never see admin-only content).
 * - While AuthContext is still restoring the session on first load,
 *   we show a spinner instead of redirecting prematurely.
 * ------------------------------------------------------------------
 */
export default function PrivateRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "60vh" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return children;
}
