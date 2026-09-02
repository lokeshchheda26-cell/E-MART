/**
 * Small formatting helpers shared by the checkout/invoice/order
 * pages (and anywhere else money or dates need the same look), so
 * each page doesn't hand-roll its own toLocaleString call.
 */

export function formatCurrency(value) {
  const n = Number(value ?? 0);
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
