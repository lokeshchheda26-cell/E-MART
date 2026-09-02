import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as userApi from "../api/userApi";

/**
 * Profile.jsx
 * ------------------------------------------------------------------
 * Fetches GET /api/users/{userId} (your backend has no /me endpoint,
 * so userApi.getProfile() reads the userId cached from login and
 * calls the by-id endpoint directly). Fields shown match
 * UserResponseDTO exactly.
 * ------------------------------------------------------------------
 */
export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchProfile() {
      try {
        const data = await userApi.getProfile();
        if (isMounted) setProfile(data);
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "Unable to load your profile right now.",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5" style={{ maxWidth: "600px" }}>
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  const fields = [
    { label: "First Name", value: profile?.firstName },
    { label: "Last Name", value: profile?.lastName },
    { label: "Email", value: profile?.email },
    { label: "Phone", value: profile?.phone },
    { label: "Role", value: profile?.role },
    { label: "Gender", value: profile?.gender },
    { label: "Date of Birth", value: profile?.dob },
    { label: "Address", value: profile?.address },
    { label: "EMcard Member", value: profile?.isEmcardMember ? "Yes" : "No" },
    { label: "EMcard Points", value: profile?.emcardPoints },
  ];

  return (
    <div className="container py-5" style={{ maxWidth: "600px" }}>
      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          <h3 className="card-title mb-4">My Profile</h3>

          <dl className="row mb-0">
            {fields.map((field) => (
              <div className="col-12 col-sm-6 mb-3" key={field.label}>
                <dt className="text-muted small text-uppercase">
                  {field.label}
                </dt>
                <dd className="mb-0 fs-5">{field.value ?? "—"}</dd>
              </div>
            ))}
          </dl>

          <Link to="/edit-profile" className="btn btn-outline-primary mt-2">
            Edit Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
