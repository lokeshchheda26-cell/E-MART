import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { getOrder, downloadInvoicePdf } from "../services/orderService";
import { formatCurrency, formatDate } from "../utils/format";
import Breadcrumbs from "../components/ui/Breadcrumbs";
import Button from "../components/ui/Button";
import CheckoutSteps from "../components/CheckoutSteps";
import { Alert, ErrorState, LoadingBlock } from "../components/ui/Feedback";
import "../styles/checkout.css";

/**
 * Invoice.jsx
 * ------------------------------------------------------------------
 * The confirmation and invoice view for one order. Reached either straight
 * after a successful payment, or from Order History.
 *
 * Two jobs, and the order of them matters. Arriving here from Payment, the
 * first thing a shopper needs is reassurance that the money went somewhere
 * real - so the page opens with a confirmation panel (order number, payment
 * status, what happens next) before the invoice document itself. Arriving
 * from Order History, that same panel doubles as the order's summary.
 *
 * UNCHANGED: Print uses the browser's native window.print(); PDF uses the
 * backend's own OpenPDF file via a Blob download, so the exported PDF and
 * the on-screen invoice are guaranteed to show the same numbers (both come
 * from the same OrderResponseDTO). Every eMCard figure shown is the one
 * settlement actually wrote to the account - order.pointsEarned,
 * pointsBalanceBefore/After - never a recalculation, and all of it stays
 * gated on the viewer's real membership status.
 *
 * The print rules used to be injected as an inline <style> block from this
 * component, which meant they only existed while this page was mounted.
 * They now live in src/App.css alongside the rest of the app-level styles.
 * ------------------------------------------------------------------
 */
export default function Invoice() {
  const { orderId } = useParams();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const fetchOrder = useCallback(() => getOrder(orderId), [orderId]);
  const { data: order, loading, error, refetch } = useApi(fetchOrder, [orderId]);

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    setDownloadError("");
    setDownloading(true);
    try {
      const response = await downloadInvoicePdf(orderId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading invoice PDF:", err);
      setDownloadError("Unable to download the PDF right now. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="container-page page">
        <LoadingBlock>Loading your order...</LoadingBlock>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container-narrow page">
        <ErrorState
          title="We couldn't find that order"
          message={error || "It may belong to a different account, or have been removed."}
          onRetry={refetch}
        />
        <div style={{ marginTop: "var(--space-4)", textAlign: "center" }}>
          <Button variant="ghost" to="/orders" icon="bi-arrow-left">
            Back to my orders
          </Button>
        </div>
      </div>
    );
  }

  const paid = order.paymentStatus === "PAID";

  return (
    <div className="container-page page">
      <div className="no-print">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/" },
            { label: "My orders", to: "/orders" },
            { label: `Order #${order.orderId}` },
          ]}
        />
        <CheckoutSteps current="confirm" />
      </div>

      <div className="invoice">
        {/* ------------------------------------------------ CONFIRMATION
            Arriving from Payment, this is the reassurance the shopper is
            actually looking for - the invoice table below is the receipt. */}
        <section className="order-confirm no-print">
          <span className="order-confirm__icon" aria-hidden="true">
            <i className={`bi ${paid ? "bi-check-lg" : "bi-hourglass-split"}`} />
          </span>

          <h1 className="order-confirm__title">
            {paid ? "Thank you — your order is confirmed" : "Order placed"}
          </h1>

          <p className="order-confirm__text">
            {paid
              ? "We've received your payment and started preparing your order."
              : "Your order has been placed. Payment is still pending."}
          </p>

          <dl className="order-confirm__facts">
            <div>
              <dt>Order number</dt>
              <dd>#{order.orderId}</dd>
            </div>
            <div>
              <dt>Placed on</dt>
              <dd>{formatDate(order.orderDate)}</dd>
            </div>
            <div>
              <dt>Payment</dt>
              <dd>
                <span
                  className={`ui-badge ${
                    paid ? "ui-badge--success" : "ui-badge--warning"
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </dd>
            </div>
            <div>
              <dt>{order.deliveryOption === "PICKUP" ? "Collect from" : "Delivering to"}</dt>
              <dd>
                {order.deliveryOption === "PICKUP"
                  ? order.storeLocation || "Store pickup"
                  : order.shippingAddress}
              </dd>
            </div>
          </dl>

          {/* The credit this order earned, called out where it cannot be
              missed. Gated on the viewer's CURRENT membership status, not on
              points being non-zero - a non-member must never see eMCard text. */}
          {order.isEmcardMember && order.pointsEarned > 0 && (
            <div className="order-confirm__points">
              <i className="bi bi-gift-fill" aria-hidden="true" />
              <span>
                You earned <strong>{order.pointsEarned} e-Mcard points</strong>
                {order.earnRatePercent
                  ? ` (${order.earnRatePercent}% of the amount paid)`
                  : ""}
                {(order.pointsBalanceAfter ?? order.emcardBalanceAfter) != null && (
                  <>
                    {" · new balance "}
                    <strong>
                      {order.pointsBalanceAfter ?? order.emcardBalanceAfter} pts
                    </strong>
                  </>
                )}
              </span>
            </div>
          )}

          <div className="order-confirm__actions">
            <Button variant="primary" to="/" icon="bi-bag">
              Continue shopping
            </Button>
            <Button variant="outline" to="/orders" icon="bi-clock-history">
              My orders
            </Button>
          </div>
        </section>

        {/* --------------------------------------------------- TOOLBAR */}
        <div className="invoice__toolbar no-print">
          <h2 className="ui-section-head__title">Invoice</h2>

          <div className="invoice__actions">
            <Button variant="outline" size="sm" icon="bi-printer" onClick={handlePrint}>
              Print
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon="bi-file-earmark-pdf"
              loading={downloading}
              loadingText="Preparing..."
              onClick={handleDownloadPdf}
            >
              Download PDF
            </Button>
          </div>
        </div>

        {downloadError && (
          <div className="no-print" style={{ marginBottom: "var(--space-4)" }}>
            <Alert variant="danger">{downloadError}</Alert>
          </div>
        )}

        {/* ------------------------------------------------- DOCUMENT */}
        <div className="invoice-doc print-area">
          <header className="invoice-doc__head">
            <div className="brand">
              <span className="brand__mark" aria-hidden="true">
                E
              </span>
              <span className="brand__text">
                <span className="brand__name">
                  <em>E</em>-Mart
                </span>
                <span className="brand__tagline">Everyday low prices</span>
              </span>
            </div>

            <div style={{ textAlign: "right" }}>
              <div className="invoice-doc__number">Invoice #{order.orderId}</div>
              <div className="invoice-doc__party-detail">
                {formatDate(order.orderDate)}
              </div>
              <span
                className={`ui-badge ${paid ? "ui-badge--success" : "ui-badge--warning"}`}
                style={{ marginTop: "var(--space-2)" }}
              >
                {order.paymentStatus}
              </span>
            </div>
          </header>

          <div className="invoice-doc__parties">
            <div>
              <div className="invoice-doc__party-label">Billed to</div>
              <div className="invoice-doc__party-value">{order.customerName}</div>
              <div className="invoice-doc__party-detail">{order.customerEmail}</div>
            </div>

            <div>
              <div className="invoice-doc__party-label">Delivery</div>
              {order.deliveryOption === "PICKUP" ? (
                <>
                  <div className="invoice-doc__party-value">Store pickup</div>
                  {order.storeLocation && (
                    <div className="invoice-doc__party-detail">
                      {order.storeLocation}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="invoice-doc__party-value">Home delivery</div>
                  <div className="invoice-doc__party-detail">
                    {order.shippingAddress}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mode-driven line items: one invoice has to explain a cash-only
              line, an eMCard-priced line, a points-only line and a
              cash+points line. purchaseMode comes off the order_item
              snapshot, so an old invoice keeps printing what it was actually
              billed with. */}
          <div className="invoice-table-wrap">
            <table className="invoice-table">
              <caption className="sr-only">
                Items on order {order.orderId}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Purchase mode</th>
                  <th scope="col" className="num">Qty</th>
                  <th scope="col" className="num">MRP</th>
                  <th scope="col" className="num">Cash paid</th>
                  <th scope="col" className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => {
                  const points = item.pointsRedeemed ?? 0;
                  const cashless = points > 0 && Number(item.lineTotal) === 0;

                  return (
                    <tr key={item.orderItemId}>
                      <td>
                        <div className="invoice-doc__party-value">
                          {item.productName}
                        </div>
                        {item.brand && (
                          <div className="invoice-doc__party-detail">
                            {item.brand}
                          </div>
                        )}
                        {points > 0 && (
                          <span
                            className="ui-badge ui-badge--loyalty"
                            style={{ marginTop: "var(--space-1)" }}
                          >
                            {points} e-Points redeemed
                          </span>
                        )}
                      </td>
                      <td className="invoice-doc__party-detail">
                        {item.purchaseModeLabel || "—"}
                      </td>
                      <td className="num">{item.quantity}</td>
                      <td className="num">{formatCurrency(item.mrpPrice)}</td>
                      <td className="num">
                        {cashless ? "—" : formatCurrency(item.unitPrice)}
                      </td>
                      <td className="num">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="invoice-doc__totals print-keep">
            <div className="invoice-doc__totals-inner">
              <dl className="cart-summary">
                <div className="cart-summary__row">
                  <dt>Subtotal (MRP)</dt>
                  <dd>{formatCurrency(order.subtotal)}</dd>
                </div>
                <div className="cart-summary__row cart-summary__row--save">
                  <dt>Savings</dt>
                  <dd>− {formatCurrency(order.totalSavings)}</dd>
                </div>
                <div className="cart-summary__row cart-summary__row--total">
                  <dt>Payable total</dt>
                  <dd>{formatCurrency(order.payableTotal)}</dd>
                </div>
              </dl>

              {/* Same rule as the banner above: gated on actual membership,
                  never on point activity being non-zero. */}
              {order.isEmcardMember &&
                (order.pointsRedeemed > 0 || order.pointsEarned > 0) && (
                  <div className="invoice-points">
                    <div className="invoice-points__title">
                      <i className="bi bi-gift-fill" aria-hidden="true" />
                      e-Mcard points
                    </div>

                    <dl className="cart-summary">
                      {/* Opening balance is stored ON the order, so a past
                          invoice shows the figures it showed on the day
                          rather than back-calculating from a live balance. */}
                      {(order.pointsBalanceBefore ?? null) != null && (
                        <div className="cart-summary__row">
                          <dt>Opening balance</dt>
                          <dd>{order.pointsBalanceBefore} pts</dd>
                        </div>
                      )}
                      {order.pointsRedeemed > 0 && (
                        <div className="cart-summary__row">
                          <dt>Points redeemed</dt>
                          <dd>− {order.pointsRedeemed} pts</dd>
                        </div>
                      )}
                      {order.pointsEarned > 0 && (
                        <div className="cart-summary__row">
                          {/* Rate comes with the order (LoyaltyPolicy), so a
                              configured promotion rate cannot disagree with
                              this label. */}
                          <dt>
                            Points earned
                            {order.earnRatePercent
                              ? ` (${order.earnRatePercent}% of amount paid)`
                              : ""}
                          </dt>
                          <dd>+ {order.pointsEarned} pts</dd>
                        </div>
                      )}
                      {(order.pointsBalanceAfter ?? order.emcardBalanceAfter) !=
                        null && (
                        <div className="cart-summary__row cart-summary__row--total">
                          <dt>Closing balance</dt>
                          <dd>
                            {order.pointsBalanceAfter ?? order.emcardBalanceAfter}{" "}
                            pts
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
            </div>
          </div>

          <p className="invoice-doc__party-detail" style={{ marginTop: "var(--space-8)" }}>
            Thank you for shopping with E-Mart. Questions about this order?{" "}
            <Link to="/contact">Contact us</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
