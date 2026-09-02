import api from "../api/axiosConfig";
import { ENDPOINTS } from "../api/endpoints";

// MERGE NOTE: the original EMCard prototype passed a hard-coded
// DEMO_USER_ID in every URL because it had no auth layer. This
// project already has JWT auth (see api/axiosConfig.js, which
// attaches "Authorization: Bearer <token>" to every request), and
// the backend EmcardController now reads the user id from that
// token's authenticated principal instead of trusting a client id.
// So no userId parameter is passed or needed here - the backend
// always resolves "whose points are these" itself.

// GET current balance (total / reserved / available) + which
// products are currently EMCard-selected for the signed-in user.
export const getEmcardSummary = () =>
  api.get(`${ENDPOINTS.EMCARD}/summary`);

// Check the EMCard box for a product: attempts to reserve its
// offer. Pass `emcardQty` to say how many of the product's units
// currently in the cart should use the EMCard offer - the rest of
// that line pays the regular price, so a single product can mix
// EMCard-redeemed and normally-priced quantities. Omit it to opt in
// for the whole cart quantity, same as a plain checkbox click.
export const reserveEmcardPoints = (productId, emcardQty) =>
  api.post(
    `${ENDPOINTS.EMCARD}/reserve/${productId}`,
    null,
    emcardQty != null ? { params: { emcardQty } } : undefined,
  );

// Uncheck the EMCard box for a product: releases its reserved
// points back into the available balance.
export const releaseEmcardPoints = (productId) =>
  api.post(`${ENDPOINTS.EMCARD}/release/${productId}`);

// Releases every reservation for the signed-in user. Used on
// initial page load (since the cart itself isn't persisted across
// a refresh) so EMCard points never stay stuck as "reserved" for
// products the user can no longer see selected.
export const resetEmcardPoints = () =>
  api.post(`${ENDPOINTS.EMCARD}/reset`);

// Upgrades the signed-in user (an existing, non-member CUSTOMER) to
// EMCard membership: grants the 100-point joining bonus, same as
// choosing EMCard at signup. No payment involved - there's nothing
// to "purchase" in this data model, just the opt-in.
export const joinEmcardMembership = () =>
  api.post(`${ENDPOINTS.EMCARD}/join`);
