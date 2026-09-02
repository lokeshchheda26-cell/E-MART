import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../api/endpoints";
import { Alert, LoadingBlock } from "../components/ui/Feedback";

/**
 * OAuth2Redirect.jsx
 * ------------------------------------------------------------------
 * Lands here after Google login succeeds on the backend.
 *
 * OAuth2AuthenticationSuccessHandler (backend) redirects the browser to:
 *   app.oauth2.redirect-uri = http://localhost:5173/oauth2/redirect
 *                             ?token=<jwt>&type=Bearer
 *
 * So this page's only job is:
 *   1. Read "token" off the URL.
 *   2. Hand it to loginWithToken(), which stores it and calls
 *      GET /api/auth/me to get the same {userId, firstName, lastName,
 *      email, role} shape normal email/password login() returns.
 *   3. Redirect ADMIN -> /admin, everyone else -> / (same rule Login.jsx
 *      uses), or back to /login with an error if the token was rejected.
 *
 * Google-only accounts are created server-side with Role.CUSTOMER
 * (see CustomOAuth2UserService), so in practice this will almost always
 * land on "/" - the ADMIN branch mainly matters if an existing ADMIN
 * account signs in with Google using the same email.
 * ------------------------------------------------------------------
 */
export default function OAuth2Redirect() {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const hasRun = useRef(false);

  useEffect(() => {
    // Effects run twice under React StrictMode in dev - guard so the
    // token exchange only ever fires once per redirect.
    if (hasRun.current) return;
    hasRun.current = true;

    const token = searchParams.get("token");
    const backendError = searchParams.get("error");

    if (backendError) {
      navigate(`/login?error=${encodeURIComponent(backendError)}`, { replace: true });
      return;
    }

    if (!token) {
      navigate("/login?error=Google sign-in did not return a token.", { replace: true });
      return;
    }

    loginWithToken(token)
      .then((loggedInUser) => {
        if (loggedInUser?.role === ROLES.ADMIN) {
          navigate("/admin", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      })
      .catch(() => {
        setError("Google sign-in failed. Please try again.");
        setTimeout(() => navigate("/login", { replace: true }), 1500);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="focus-shell">
      <header className="focus-shell__topbar">
        <span className="brand">
          <span className="brand__mark" aria-hidden="true">
            E
          </span>
          <span className="brand__text">
            <span className="brand__name">
              <em>E</em>-Mart
            </span>
          </span>
        </span>
      </header>

      <div
        className="container-narrow"
        style={{
          flex: "1 1 auto",
          display: "grid",
          placeItems: "center",
          padding: "var(--space-16) var(--container-pad)",
        }}
      >
        {error ? (
          <Alert variant="danger" title="Google sign-in failed">
            {error}
          </Alert>
        ) : (
          <LoadingBlock>Signing you in with Google...</LoadingBlock>
        )}
      </div>
    </div>
  );
}
