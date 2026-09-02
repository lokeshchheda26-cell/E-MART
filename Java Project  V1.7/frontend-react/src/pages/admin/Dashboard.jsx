import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as userApi from '../../api/userApi';

/**
 * Dashboard.jsx (Admin)
 * ------------------------------------------------------------------
 * Lists every user via GET /api/users and allows deleting one via
 * DELETE /api/users/{id} - both are real endpoints in UserController.
 *
 * SECURITY NOTE: PrivateRoute's adminOnly flag keeps CUSTOMER accounts
 * from reaching this page in the UI, but that's client-side only.
 * SecurityConfig currently protects "/api/users/**" with just
 * .authenticated(), not .hasRole("ADMIN") - so a CUSTOMER's token
 * could call these same endpoints directly (e.g. via curl/Postman).
 * Tightening that in SecurityConfig is the real fix; this page can't
 * do it from the frontend.
 * ------------------------------------------------------------------
 */
export default function Dashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError('');
    try {
      const data = await userApi.getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(userId) {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    setDeletingId(userId);
    try {
      await userApi.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.userId !== userId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="container py-5">
      <h2 className="mb-4">Admin Dashboard</h2>
      <div className="alert alert-info">
        Welcome, {user?.firstName || 'Admin'}. Manage registered users below.
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>EMcard</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.userId}>
                    <td>{u.userId}</td>
                    <td>{u.firstName} {u.lastName}</td>
                    <td>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <span className={`badge ${u.role === 'ADMIN' ? 'bg-danger' : 'bg-secondary'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.isEmcardMember ? `Yes (${u.emcardPoints} pts)` : 'No'}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        disabled={deletingId === u.userId}
                        onClick={() => handleDelete(u.userId)}
                      >
                        {deletingId === u.userId ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted py-4">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
