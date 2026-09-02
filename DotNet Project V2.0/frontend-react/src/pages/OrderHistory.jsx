import { useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { getOrderHistory } from "../services/orderService";
import { getAllProducts } from "../services/productService";
import { formatCurrency, formatDate } from "../utils/format";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Button from "../components/ui/Button";
import ProductImage from "../components/ui/ProductImage";
import { EmptyState, ErrorState, LoadingBlock } from "../components/ui/Feedback";
import "../styles/checkout.css";

/**
 * OrderHistory.jsx
 * ------------------------------------------------------------------
 * Every past order for the signed-in user, newest first (the backend
 * already sorts by orderDate descending), with each order's line items
 * shown inline.
 *
 * Order items only carry a productId reference - OrderItemResponseDTO has no
 * image path - so this also fetches the product catalogue once to resolve
 * each item's image by id, falling back to a placeholder for anything that
 * no longer matches. That behaviour is unchanged.
 *
 * WHAT CHANGED: presentation. Payment status is a badge rather than plain
 * text, points redeemed and earned are called out per order instead of being
 * buried in a footer sentence, and the empty and error states now offer a
 * way onwards instead of ending the page.
 * ------------------------------------------------------------------
 */
export default function OrderHistory() {
  const fetchHistory = useCallback(() => getOrderHistory(), []);
  const {
    data: orders,
    loading,
    error,
    refetch,
  } = useApi(fetchHistory, [], { initialData: [] });

  const fetchProducts = useCallback(() => getAllProducts(), []);
  const { data: products } = useApi(fetchProducts, [], { initialData: [] });

  const productImageById = useMemo(() => {
    const map = new Map();
    (products || []).forEach((product) => {
      const id = product.productId ?? product.prodId;
      if (id != null) map.set(id, product.productImagePath);
    });
    return map;
  }, [products]);

  if (loading) {
    return (
      <div className="container-page page">
        <LoadingBlock>Loading your orders...</LoadingBlock>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-narrow page">
        <ErrorState
          title="We couldn't load your orders"
          message={error}
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="container-narrow page">
        <EmptyState
          icon="bi-receipt"
          title="No orders yet"
          message="Once you place an order it will appear here, along with its invoice."
          action={
            <Button variant="accent" to="/" icon="bi-bag">
              Start shopping
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page page">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "My orders" }]} />

      <div className="page__header">
        <h1 className="page__title">My orders</h1>
        <p className="page__subtitle">
          {orders.length} order{orders.length === 1 ? "" : "s"} · newest first
        </p>
      </div>

      <div className="order-list">
        {orders.map((order) => (
          <article className="ui-card" key={order.orderId}>
            <header className="order-card__head">
              <div>
                <div className="order-card__id">Order #{order.orderId}</div>
                <div className="order-card__meta">
                  <span>
                    <i className="bi bi-calendar3" aria-hidden="true" />{" "}
                    {formatDate(order.orderDate)}
                  </span>
                  <span>
                    <i
                      className={`bi ${
                        order.deliveryOption === "PICKUP"
                          ? "bi-shop"
                          : "bi-truck"
                      }`}
                      aria-hidden="true"
                    />{" "}
                    {order.deliveryOption === "PICKUP"
                      ? "Store pickup"
                      : "Home delivery"}
                  </span>
                </div>
              </div>

              <div className="order-card__actions">
                <span
                  className={`ui-badge ${
                    order.paymentStatus === "PAID"
                      ? "ui-badge--success"
                      : "ui-badge--warning"
                  }`}
                >
                  <i
                    className={`bi ${
                      order.paymentStatus === "PAID"
                        ? "bi-check-circle-fill"
                        : "bi-hourglass-split"
                    }`}
                    aria-hidden="true"
                  />
                  {order.paymentStatus}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  to={`/orders/${order.orderId}`}
                  icon="bi-receipt"
                >
                  View invoice
                </Button>
              </div>
            </header>

            <div className="order-items">
              {(order.items || []).map((item) => {
                const image = productImageById.get(item.productId);

                return (
                  <div className="order-item" key={item.orderItemId}>
                    <div className="order-item__media">
                      <ProductImage src={image} placeholderClassName="" />
                    </div>

                    <div className="order-item__info">
                      <div className="order-item__name">{item.productName}</div>
                      <div className="order-item__qty">
                        Qty {item.quantity} &times;{" "}
                        {formatCurrency(item.unitPrice)}
                        {item.pointsRedeemed > 0 && (
                          <>
                            {" · "}
                            <span className="text-loyalty-token">
                              {item.pointsRedeemed} pts redeemed
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="order-item__total">
                      {formatCurrency(item.lineTotal)}
                    </div>
                  </div>
                );
              })}
            </div>

            <footer className="order-card__foot">
              <div className="cluster">
                <span className="text-muted-token" style={{ fontSize: "var(--text-xs)" }}>
                  {order.items?.length ?? 0} item
                  {order.items?.length === 1 ? "" : "s"}
                </span>

                {order.pointsRedeemed > 0 && (
                  <span className="ui-badge ui-badge--loyalty">
                    − {order.pointsRedeemed} pts
                  </span>
                )}
                {order.pointsEarned > 0 && (
                  <span className="ui-badge ui-badge--success">
                    + {order.pointsEarned} pts earned
                  </span>
                )}
              </div>

              <div className="order-card__total">
                Total {formatCurrency(order.payableTotal)}
              </div>
            </footer>
          </article>
        ))}
      </div>

      <div style={{ marginTop: "var(--space-8)", textAlign: "center" }}>
        <Link to="/" className="ui-btn ui-btn--ghost">
          <i className="bi bi-arrow-left" aria-hidden="true" />
          <span>Continue shopping</span>
        </Link>
      </div>
    </div>
  );
}
