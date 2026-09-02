/**
 * Purchase mode helpers - ONE client-side copy of the rule.
 *
 * The backend is authoritative (PurchaseDecisionEngine); this module
 * only reads what it sends and normalises the two vocabularies the API
 * uses for the same four modes:
 *
 *   persisted offer_type   ->  business name (what this module returns)
 *   NORMAL                     CASH_ONLY            (Mode 1)
 *   EMCARD_PRICE               EMCARD_DISCOUNT      (Mode 2)
 *   FULL_REDEMPTION            FULL_REDEMPTION      (Mode 3)
 *   PARTIAL_REDEMPTION         PARTIAL_REDEMPTION   (Mode 4)
 *
 * It exists because the mode was being resolved in three places (the
 * listing card, the product page and the eMCard checkbox handler) and
 * they disagreed: the handler looked only at `offerType`, which is NULL
 * on any product row written before that column existed, so ticking the
 * box on a perfectly valid cash+points product was rejected as
 * "cash only" before the request ever left the browser.
 */

export const MODE = {
  CASH_ONLY: "CASH_ONLY",
  EMCARD_DISCOUNT: "EMCARD_DISCOUNT",
  FULL_REDEMPTION: "FULL_REDEMPTION",
  PARTIAL_REDEMPTION: "PARTIAL_REDEMPTION",
};

const num = (value) => Number(value ?? 0);

/** Both spellings of every mode, mapped to the business name. */
function canonical(raw) {
  switch (raw) {
    case "NORMAL":
    case "CASH_ONLY":
      return MODE.CASH_ONLY;
    case "EMCARD_PRICE":
    case "EMCARD_DISCOUNT":
      return MODE.EMCARD_DISCOUNT;
    case "FULL_REDEMPTION":
      return MODE.FULL_REDEMPTION;
    case "PARTIAL_REDEMPTION":
      return MODE.PARTIAL_REDEMPTION;
    default:
      return null;
  }
}

export const getMrp = (product) =>
  num(product?.mrpPrice ?? product?.price);

export const getEmcardCash = (product) =>
  num(
    product?.resolvedCashRequired ??
      product?.cashRequired ??
      product?.emcardCashPrice ??
      product?.cardholderPrice ??
      product?.cardholdersPrice ??
      getMrp(product)
  );

export const getPointsRequired = (product) =>
  num(
    product?.resolvedPointsRequired ??
      product?.pointsRequired ??
      product?.pointsToBeRedeemed ??
      product?.pointsToRedeem ??
      product?.points
  );

/** A public sale is running right now. */
export function isSaleActive(product) {
  return (
    Boolean(product?.onSale) &&
    (product?.saleEndDate == null ||
      new Date(product.saleEndDate).getTime() > Date.now())
  );
}

/** Cash a shopper pays with no offer applied: sale price, else MRP. */
export function getRegularPrice(product) {
  if (isSaleActive(product) && product?.salePrice != null) {
    return num(product.salePrice);
  }
  return getMrp(product);
}

/**
 * Same classification the backend applies, in the same order:
 *
 *   1. an active sale replaces the eMCard offer entirely (they never
 *      stack) - see PurchaseDecisionEngine.resolveMode;
 *   2. whatever mode the API reported, under any of its field names;
 *   3. only if the response carried none at all, derive it from the
 *      price columns exactly as ProductOfferType.derive does.
 *
 * Step 3 cannot leak an offer to a non-member: their payload has already
 * been stripped server-side (cardholderPrice = MRP, points = 0), which
 * derives to CASH_ONLY.
 */
export function resolvePurchaseMode(product) {
  if (!product) return MODE.CASH_ONLY;

  if (isSaleActive(product)) return MODE.CASH_ONLY;

  const reported =
    canonical(product.purchaseMode) ??
    canonical(product.resolvedOfferType) ??
    canonical(product.offerType);

  if (reported) return reported;

  const mrp = getMrp(product);
  const cash = num(
    product.resolvedCashRequired ??
      product.cashRequired ??
      product.cardholderPrice ??
      product.cardholdersPrice
  );
  const points = getPointsRequired(product);

  const hasCashDiscount = cash > 0 && cash < mrp;
  const hasPoints = points > 0;

  if (hasCashDiscount && hasPoints) return MODE.PARTIAL_REDEMPTION;
  if (hasPoints) return MODE.FULL_REDEMPTION;
  if (hasCashDiscount) return MODE.EMCARD_DISCOUNT;
  return MODE.CASH_ONLY;
}

/**
 * Whether the shopper can tick a box for this mode. Every mode with an
 * offer can (2, 3, 4); Mode 1 has nothing to take. Mirrors
 * PurchaseMode.isOptional() on the server.
 */
export function isOfferOptional(mode) {
  return mode !== MODE.CASH_ONLY;
}
