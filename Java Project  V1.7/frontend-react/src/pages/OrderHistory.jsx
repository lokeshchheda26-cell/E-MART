import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { getOrderHistory } from "../services/orderService";
import { formatCurrency, formatDate } from "../utils/format";

/**
 * OrderHistory.jsx
 * ------------------------------------------------------------------
 * Lists every past order for the signed-in user (BRD: Order
 * Management / My Orders), newest first (backend already sorts by
 * orderDate desc). Each row reopens its full invoice.
 * ------------------------------------------------------------------
 */
export default function OrderHistory() {
  const fetchHistory = useCallback(() => getOrderHistory(), []);
  const { data: orders, loading, error } = useApi(fetchHistory, [], {
    initialData: [],
  });

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

  if (!orders || orders.length === 0) {
    return (
      <div className="container py-5 text-center" style={{ maxWidth: "500px" }}>
        <i className="bi bi-receipt display-4 text-muted"></i>
        <h4 className="mt-3">No orders yet</h4>
        <p className="text-muted">Your placed orders will show up here.</p>
        <Link to="/" className="btn btn-warning fw-semibold">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h3 className="mb-4">My Orders</h3>

      <div className="card shadow-sm border-0">
        <div className="table-responsive">
          <table className="table mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Items</th>
                <th>Delivery</th>
                <th>Status</th>
                <th className="text-end">Total</th>
                <th className="text-end">EMCard Points</th>
                <th className="text-end">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId}>
                  <td className="fw-semibold">#{order.orderId}</td>
                  <td className="small text-muted">{formatDate(order.orderDate)}</td>
                  <td>{order.items?.length ?? 0}</td>
                  <td>
                    {order.deliveryOption === "PICKUP"
                      ? "Store Pickup"
                      : "Home Delivery"}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        order.paymentStatus === "PAID"
                          ? "bg-success"
                          : "bg-secondary"
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="text-end fw-semibold">
                    {formatCurrency(order.payableTotal)}
                  </td>

                  {/* What this order did to the balance: points spent on
                      it and the credit earned on the cash paid. Both are
                      snapshots stored on the order, so they stay correct
                      for old orders. */}
                  <td className="text-end small">
                    {order.pointsRedeemed > 0 && (
                      <div className="text-danger">
                        − {order.pointsRedeemed} pts
                      </div>
                    )}
                    {order.pointsEarned > 0 ? (
                      <div className="text-success fw-semibold">
                        + {order.pointsEarned} pts earned
                      </div>
                    ) : (
                      !order.pointsRedeemed && (
                        <span className="text-muted">—</span>
                      )
                    )}
                  </td>

                  <td className="text-end">
                    <Link
                      to={`/orders/${order.orderId}`}
                      className="btn btn-sm btn-outline-secondary"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
