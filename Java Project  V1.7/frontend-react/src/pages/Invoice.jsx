import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { getOrder, downloadInvoicePdf } from "../services/orderService";
import { formatCurrency, formatDate } from "../utils/format";

/**
 * Invoice.jsx
 * ------------------------------------------------------------------
 * Full invoice view for one order (BRD: "Print Invoice" - Mandatory,
 * "PDF invoice" - Low priority, both covered here). Reached either
 * right after Payment succeeds, or from Order History.
 *
 * Print uses the browser's native window.print() plus the
 * .invoice-print-area / @media print rules below, so only the
 * invoice itself (not the navbar/footer/buttons) ends up on paper.
 * PDF uses the backend's OpenPDF-generated file via a Blob download,
 * so the exported PDF and the on-screen invoice are guaranteed to
 * show the same numbers (both come from the same OrderResponseDTO).
 * ------------------------------------------------------------------
 */
export default function Invoice() {
  const { orderId } = useParams();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const fetchOrder = useCallback(() => getOrder(orderId), [orderId]);
  const { data: order, loading, error } = useApi(fetchOrder, [orderId]);

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
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container py-5" style={{ maxWidth: "600px" }}>
        <div className="alert alert-danger">
          {error || "We couldn't find that order."}
        </div>
        <Link to="/orders" className="btn btn-outline-secondary">
          Back to Order History
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-5" style={{ maxWidth: "800px" }}>
      {/* Print-only rule: hide everything except .invoice-print-area */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .invoice-print-area { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <h3 className="mb-0">Invoice</h3>
        <div className="d-flex gap-2">
          <Link to="/orders" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>
            Order History
          </Link>
          <button className="btn btn-outline-secondary btn-sm" onClick={handlePrint}>
            <i className="bi bi-printer me-1"></i>
            Print
          </button>
          <button
            className="btn btn-warning btn-sm fw-semibold"
            onClick={handleDownloadPdf}
            disabled={downloading}
          >
            <i className="bi bi-file-earmark-pdf me-1"></i>
            {downloading ? "Preparing..." : "Download PDF"}
          </button>
        </div>
      </div>

      {downloadError && (
        <div className="alert alert-danger py-2 no-print">{downloadError}</div>
      )}

      {/* The credit this order earned, called out where it cannot be
          missed. The figures are the ones settlement actually wrote to
          the account (order.pointsEarned / pointsBalanceAfter), not a
          recalculation, so this and the balance in the header agree. */}
      {order.pointsEarned > 0 && (
        <div className="alert alert-success d-flex flex-wrap gap-2 justify-content-between align-items-center no-print">
          <span>
            🎁 You earned <strong>{order.pointsEarned} EMCard points</strong> on
            this order
            {order.earnRatePercent
              ? ` (${order.earnRatePercent}% of the amount paid)`
              : ""}
            .
          </span>
          {(order.pointsBalanceAfter ?? order.emcardBalanceAfter) != null && (
            <span className="small">
              New balance:{" "}
              <strong>
                {order.pointsBalanceAfter ?? order.emcardBalanceAfter} pts
              </strong>
            </span>
          )}
        </div>
      )}

      <div className="card shadow-sm border-0 invoice-print-area">
        <div className="card-body p-4 p-md-5">
          <div className="d-flex justify-content-between align-items-start mb-4">
            <div>
              <h4 className="fw-bold mb-0">
                <span className="text-warning">E</span>MART
              </h4>
              <div className="small text-muted">Everyday Low Prices</div>
            </div>
            <div className="text-end">
              <h5 className="mb-1">Invoice #{order.orderId}</h5>
              <div className="small text-muted">{formatDate(order.orderDate)}</div>
              <span
                className={`badge mt-1 ${
                  order.paymentStatus === "PAID" ? "bg-success" : "bg-secondary"
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
          </div>

          <div className="row mb-4">
            <div className="col-6">
              <div className="small text-uppercase text-muted mb-1">Billed To</div>
              <div className="fw-semibold">{order.customerName}</div>
              <div className="small text-muted">{order.customerEmail}</div>
            </div>
            <div className="col-6 text-end">
              <div className="small text-uppercase text-muted mb-1">Delivery</div>
              {order.deliveryOption === "PICKUP" ? (
                <>
                  <div className="fw-semibold">Store Pickup</div>
                  {order.storeLocation && (
                    <div className="small text-muted">{order.storeLocation}</div>
                  )}
                </>
              ) : (
                <>
                  <div className="fw-semibold">Home Delivery</div>
                  <div className="small text-muted">{order.shippingAddress}</div>
                </>
              )}
            </div>
          </div>

          {/* Mode-driven line items: the same invoice has to explain a
              cash-only line, an eMCard-priced line, a points-only line and
              a cash+points line. purchaseMode comes off the order_item
              snapshot, so an old invoice keeps printing what it was
              actually billed with. */}
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Purchase Mode</th>
                <th className="text-center">Qty</th>
                <th className="text-end">MRP</th>
                <th className="text-end">Cash Paid</th>
                <th className="text-end">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => {
                const points = item.pointsRedeemed ?? 0;
                const cashless = points > 0 && Number(item.lineTotal) === 0;

                return (
                  <tr key={item.orderItemId}>
                    <td>
                      {item.productName}
                      {item.brand && (
                        <div className="small text-muted">{item.brand}</div>
                      )}
                      {points > 0 && (
                        <span className="badge bg-success-subtle text-success mt-1">
                          🎁 {points} e-Points redeemed
                        </span>
                      )}
                    </td>
                    <td className="small text-muted">
                      {item.purchaseModeLabel || "—"}
                    </td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-end">{formatCurrency(item.mrpPrice)}</td>
                    <td className="text-end">
                      {cashless ? "—" : formatCurrency(item.unitPrice)}
                    </td>
                    <td className="text-end">{formatCurrency(item.lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="row justify-content-end">
            <div className="col-6">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Subtotal (MRP)</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 text-success">
                <span>Savings</span>
                <span>− {formatCurrency(order.totalSavings)}</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between fw-bold fs-5 mb-2">
                <span>Payable Total</span>
                <span>{formatCurrency(order.payableTotal)}</span>
              </div>

              {(order.pointsRedeemed > 0 || order.pointsEarned > 0) && (
                <div className="small text-muted mt-3 pt-3 border-top">
                  <div className="fw-semibold text-dark mb-1">EMCard Points Calculation</div>

                  {/* Opening balance is stored ON the order, so a past
                      invoice shows the figures it showed on the day
                      instead of back-calculating from a live balance. */}
                  {(order.pointsBalanceBefore ?? null) != null && (
                    <div className="d-flex justify-content-between">
                      <span>Opening balance</span>
                      <span>{order.pointsBalanceBefore} pts</span>
                    </div>
                  )}
                  {order.pointsRedeemed > 0 && (
                    <div className="d-flex justify-content-between">
                      <span>Points redeemed</span>
                      <span>− {order.pointsRedeemed} pts</span>
                    </div>
                  )}
                  {order.pointsEarned > 0 && (
                    <div className="d-flex justify-content-between">
                      {/* Rate comes with the order (LoyaltyPolicy), so a
                          configured promotion rate can't disagree with
                          this label. */}
                      <span>
                        Points earned
                        {order.earnRatePercent
                          ? ` (${order.earnRatePercent}% of amount paid)`
                          : ""}
                      </span>
                      <span>+ {order.pointsEarned} pts</span>
                    </div>
                  )}
                  {(order.pointsBalanceAfter ?? order.emcardBalanceAfter) != null && (
                    <div className="d-flex justify-content-between fw-semibold text-dark">
                      <span>Closing balance</span>
                      <span>
                        {order.pointsBalanceAfter ?? order.emcardBalanceAfter} pts
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
