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
// points. Response tells you whether it succeeded. Pass `points`
// to redeem only part of the product's full point cost (partial
// redemption - the rest of that line is paid with money); omit it
// to redeem the full amount, same as before.
export const reserveEmcardPoints = (productId, points) =>
  api.post(
    `${ENDPOINTS.EMCARD}/reserve/${productId}`,
    null,
    points != null ? { params: { points } } : undefined,
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
