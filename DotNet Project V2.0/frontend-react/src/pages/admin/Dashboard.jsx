import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as userApi from '../../api/userApi';
import { useToast } from '../../context/ToastContext';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Alert, EmptyState, LoadingBlock } from '../../components/ui/Feedback';
import '../../styles/account.css';

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
  const [pendingDelete, setPendingDelete] = useState(null);
  const toast = useToast();

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

  // The confirmation is unchanged in substance - deleting a user is still
  // gated behind an explicit yes - but it now uses the app's own dialog
  // instead of window.confirm, which blocks the browser thread and looks
  // like it came from a different site.
  async function handleDelete(userId) {
    setDeletingId(userId);
    try {
      await userApi.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.userId !== userId));
      toast.success('User deleted.');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to delete user.';
      setError(message);
      toast.error(message);
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  }

  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const memberCount = users.filter((u) => u.isEmcardMember).length;

  return (
    <div className="container-page page">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Admin' }]} />

      <div className="page__header">
        <h1 className="page__title">Admin dashboard</h1>
        <p className="page__subtitle">
          Signed in as {user?.firstName || 'Admin'}. Manage registered users below.
        </p>
      </div>

      {/* Counts derived from the list already loaded - no extra request, and
          nothing shown that the users endpoint does not actually return. */}
      <div className="admin-stats">
        <div className="admin-stat">
          <div className="admin-stat__label">Registered users</div>
          <div className="admin-stat__value">{users.length}</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__label">Administrators</div>
          <div className="admin-stat__value">{adminCount}</div>
        </div>
        <div className="admin-stat">
          <div className="admin-stat__label">e-Mcard members</div>
          <div className="admin-stat__value">{memberCount}</div>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <Alert variant="danger">{error}</Alert>
        </div>
      )}

      {loading ? (
        <LoadingBlock>Loading users...</LoadingBlock>
      ) : users.length === 0 ? (
        <EmptyState
          icon="bi-people"
          title="No users found"
          message="There are no registered users to show right now."
        />
      ) : (
        <div className="ui-card">
          <div className="admin-table-wrap scroll-area">
            <table className="admin-table">
              <caption className="sr-only">Registered users</caption>
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">User</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Role</th>
                  <th scope="col">e-Mcard</th>
                  <th scope="col"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.userId}>
                    <td>{u.userId}</td>
                    <td>
                      <div className="admin-user">
                        <span className="admin-user__avatar" aria-hidden="true">
                          {(u.firstName?.[0] || u.email?.[0] || 'U').toUpperCase()}
                        </span>
                        <div>
                          <div className="admin-user__name">
                            {u.firstName} {u.lastName}
                          </div>
                          <div className="admin-user__email">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <span
                        className={`ui-badge ${
                          u.role === 'ADMIN' ? 'ui-badge--primary' : 'ui-badge--neutral'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.isEmcardMember ? (
                        <span className="ui-badge ui-badge--loyalty">
                          {u.emcardPoints} pts
                        </span>
                      ) : (
                        <span className="text-muted-token">—</span>
                      )}
                    </td>
                    <td>
                      <Button
                        variant="danger-ghost"
                        size="sm"
                        icon="bi-trash3"
                        loading={deletingId === u.userId}
                        loadingText="Deleting..."
                        onClick={() =>
                          setPendingDelete({
                            userId: u.userId,
                            name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email,
                          })
                        }
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this user?"
        message={
          pendingDelete
            ? `${pendingDelete.name} will be permanently removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete user"
        loading={Boolean(deletingId)}
        onConfirm={() => handleDelete(pendingDelete.userId)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
