import { useEffect, useState } from "react";
import { getProductDetails } from "../services/productService";
import "./ProductDetails.css";

function ProductDetails({
    productId,
    onBack,
    onAddToCart,
    onBuyNow,
    emcardSelectedIds = new Set(),
    emcardError = null,
    onEmcardToggle
}) {

    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeImage, setActiveImage] = useState(null);

    // =========================
    // LOAD PRODUCT DETAILS
    // =========================

    useEffect(() => {
        if (!productId) return;

        const loadDetails = async () => {
            setLoading(true);
            setError("");

            try {
                const response = await getProductDetails(productId);
                setDetails(response.data);

                const firstImage =
                    response.data?.images?.[0] ?? null;

                setActiveImage(firstImage);
            } catch (err) {
                console.log("Error loading product details:", err);
                setError(
                    "Unable to load product details. Please try again."
                );
            } finally {
                setLoading(false);
            }
        };

        loadDetails();
    }, [productId]);


    // =========================
    // LOADING / ERROR STATES
    // =========================

    if (loading) {
        return (
            <div className="product-details-page">
                <button className="back-btn" onClick={onBack}>
                    ← Back
                </button>
                <div className="product-details-status">
                    Loading product details...
                </div>
            </div>
        );
    }

    if (error || !details) {
        return (
            <div className="product-details-page">
                <button className="back-btn" onClick={onBack}>
                    ← Back
                </button>
                <div className="product-details-status">
                    {error || "Product not found."}
                </div>
            </div>
        );
    }

    const {
        productName,
        price,
        mrpPrice,
        cardholderPrice,
        description,
        brand,
        category,
        stock,
        points,
        // NOTE: totalPointsRedeemed (the "N Points Redeemed So Far"
        // chip) is deliberately not read any more - it described other
        // people's past orders, which is not information this page needs.
        // The API still returns it for any other consumer.
        images = [],
        specifications = []
    } = details;

    const stockKnown = stock !== null && stock !== undefined;
    const inStock = !stockKnown || stock > 0;

    const isEmcardApplied = emcardSelectedIds.has(String(productId));

    // ---------------------------------------------------------------
    // PURCHASE MODE (Mode 1..4) - supplied by the backend, not guessed.
    //
    // GET /api/product/{id}/details now returns purchaseMode plus every
    // figure that goes with it (emcardCashPrice, pointsRequired,
    // emcardSavings, pointsOptional, earnsPoints), resolved by
    // PurchaseDecisionEngine and already collapsed to CASH_ONLY for a
    // non-member. This page renders those values; it no longer
    // reconstructs the offer from mrpPrice/cardholderPrice/points.
    //
    //   CASH_ONLY           selling price only
    //   EMCARD_DISCOUNT     MRP + eMcard price + savings + CHECKBOX
    //   FULL_REDEMPTION     "Redeem using EMCard Points - N e-Points"
    //   PARTIAL_REDEMPTION  "Cash + EMCard Points - X + N e-Points"
    // ---------------------------------------------------------------
    const purchaseMode = details.purchaseMode || "CASH_ONLY";
    const modeLabel = details.purchaseModeLabel || "";
    const mrp = Number(mrpPrice ?? price ?? 0);
    const emcardCash = Number(
        details.emcardCashPrice ?? cardholderPrice ?? 0
    );
    const pointsRequired = Number(details.pointsRequired ?? points ?? 0);
    const emcardSavings = Number(details.emcardSavings ?? 0);
    // Every mode that HAS an offer (2, 3, 4) is the member's choice, so
    // the page opens on the regular price and the checkbox swaps in the
    // offer. The backend says so - the expression is only a fallback for
    // an older response shape.
    const pointsOptional =
        details.pointsOptional ?? purchaseMode !== "CASH_ONLY";

    const isFullRedemption = purchaseMode === "FULL_REDEMPTION";
    const isPartialRedemption = purchaseMode === "PARTIAL_REDEMPTION";
    const isEmcardDiscount =
        purchaseMode === "EMCARD_DISCOUNT" || purchaseMode === "EMCARD_PRICE";
    const hasEmcardDiscount =
        isEmcardDiscount || isFullRedemption || isPartialRedemption;

    let emcardLabel = null;
    if (isEmcardDiscount) {
        emcardLabel = `eMcard: ${Math.round(emcardCash)}`;
    } else if (isFullRedemption) {
        emcardLabel = `Redeem ${pointsRequired} e-Points`;
    } else if (isPartialRedemption) {
        emcardLabel = `eMcard: ${Math.round(emcardCash)} + ${pointsRequired} e-Points`;
    }

    // What the shopper pays in cash right now.
    //
    // EVERY offer mode starts at the REGULAR price and only switches to
    // the mode's terms once the checkbox is ticked:
    //   mode 2 -> 100 becomes 90
    //   mode 3 -> 100 becomes "12 e-Points, no cash to pay"
    //   mode 4 -> 100 becomes "90 + 7 e-Points"
    const offerApplied = isEmcardApplied;
    const isFreeWithEmcard = isFullRedemption && offerApplied;
    const displayedPrice = offerApplied
        ? (isFullRedemption
            // A mode that should have a cash price but has none
            // configured falls back to the regular price rather than
            // reading as free (same fallback the backend applies).
            ? 0
            : emcardCash > 0 ? emcardCash : Number(price ?? 0))
        : Number(price ?? 0);

    // The point half of a mode 4 price - only once the offer is taken.
    const showPointsAlongsideCash =
        isPartialRedemption && offerApplied && pointsRequired > 0;

    // Points this purchase will EARN: the configured rate (from the API,
    // never a literal here) applied to the cash actually payable, rounded
    // DOWN - the same arithmetic LoyaltyPolicy applies at settlement, so
    // the promise on this page matches what gets credited.
    const earnRatePercent = details.earnRatePercent ?? null;
    const pointsToEarn = earnRatePercent
        ? Math.floor((Number(displayedPrice) * Number(earnRatePercent)) / 100)
        : 0;

    // While this product is on an active sale, "price" above is the
    // sale price - show the original MRP alongside it (struck
    // through) so the saving is visible, same as the Sale Banner.
    const showSalePricing =
        Boolean(details.onSale) && !isEmcardApplied && mrp > displayedPrice;
    const saleDiscountPct = showSalePricing
        ? Math.round(((mrp - displayedPrice) / mrp) * 100)
        : 0;


    // =========================
    // RENDER
    // =========================

    return (
        <div className="product-details-page">

            <button className="back-btn" onClick={onBack}>
                ← Back to Products
            </button>

            <div className="product-details-container">

                {/* =====================================
                    IMAGE GALLERY
                ===================================== */}

                <div className="product-gallery">

                    <div className="main-image">
                        {activeImage ? (
                            <img src={activeImage} alt={productName} />
                        ) : (
                            <div className="product-placeholder-large">
                                📦
                            </div>
                        )}
                    </div>

                    {images.length > 1 && (
                        <div className="thumbnail-row">
                            {images.map((img, index) => (
                                <div
                                    key={`thumb-${index}`}
                                    className={`thumbnail ${
                                        img === activeImage ? "active" : ""
                                    }`}
                                    onClick={() => setActiveImage(img)}
                                >
                                    <img src={img} alt={`${productName} ${index + 1}`} />
                                </div>
                            ))}
                        </div>
                    )}

                </div>

                {/* =====================================
                    PRODUCT INFO
                ===================================== */}

                <div className="product-detail-info">

                    <h1>{productName}</h1>

                    <div className="product-meta">
                        {brand && (
                            <span className="meta-brand">
                                Brand: <strong>{brand}</strong>
                            </span>
                        )}
                        {category && (
                            <span className="meta-category">
                                Category: <strong>{category}</strong>
                            </span>
                        )}
                    </div>

                    {/* The mode this product is sold under, straight from
                        the backend, so the page never has to explain the
                        price with a guess. */}
                    {modeLabel && (
                        <div className={`purchase-mode-chip mode-${purchaseMode}`}>
                            {modeLabel}
                        </div>
                    )}

                    <div className="product-price">
                        {isFreeWithEmcard ? (
                            <>
                                <span className="emcard-free-label">
                                    🎁 {pointsRequired} e-Points · no cash to pay
                                </span>
                                {/* What it would have cost in cash, so the
                                    value of the redemption is visible. */}
                                <span className="product-original-price">
                                    ₹{Math.round(Number(price ?? 0))}
                                </span>
                            </>
                        ) : (
                            <>
                                ₹{Math.round(displayedPrice)}

                                {/* MODE 4, offer taken: the cash above is
                                    only half the price - both halves are
                                    then mandatory. */}
                                {showPointsAlongsideCash && (
                                    <span className="product-points-part">
                                        + {pointsRequired} e-Points
                                    </span>
                                )}

                                {/* On an active sale the price above is
                                    the sale price - also show the original
                                    MRP struck through, like the banner. */}
                                {showSalePricing && (
                                    <>
                                        <span className="product-original-price">
                                            ₹{Math.round(mrp)}
                                        </span>
                                        <span className="product-discount-pct">
                                            {saleDiscountPct}% OFF
                                        </span>
                                    </>
                                )}
                            </>
                        )}
                    </div>

                    {/* Savings are real once the offer is actually taken
                        (modes 2 and 4); before that it is an incentive, so
                        it reads as "save X" either way but only shows for
                        modes that have a cash discount. */}
                    {emcardSavings > 0 && (
                        <div className="emcard-savings">
                            {offerApplied ? "You save" : "Save"} ₹
                            {Math.round(emcardSavings)} with EMCard
                        </div>
                    )}

                    {/* Points this purchase EARNS: the configured rate
                        applied to the cash actually payable right now, so
                        it follows the offer checkbox (a fully redeemed
                        line pays no cash and therefore earns nothing).
                        The rate comes from the API - LoyaltyPolicy - so
                        nothing here hardcodes 10%. */}
                    {pointsToEarn > 0 && (
                        <div className="points">
                            ⭐ Earn {pointsToEarn} EMCard Points
                            {earnRatePercent
                                ? ` (${earnRatePercent}% of ₹${Math.round(
                                    displayedPrice
                                )})`
                                : ""}
                        </div>
                    )}

                    {hasEmcardDiscount && (
                        <div className="emcard-row">

                            {/* Every offer mode (2, 3, 4) is the shopper's
                                choice - one checkbox each, and the price
                                above stays the Regular Price until it is
                                ticked. The read-only branch below is only a
                                fallback for a backend that reports an offer
                                as non-optional. */}
                            {pointsOptional ? (
                                <label className="emcard-checkbox-label">

                                    <input
                                        type="checkbox"
                                        checked={isEmcardApplied}
                                        onChange={(e) =>
                                            onEmcardToggle &&
                                            onEmcardToggle(
                                                details,
                                                e.target.checked
                                            )
                                        }
                                    />

                                    <span>{emcardLabel}</span>

                                </label>
                            ) : (
                                <div className="emcard-mandatory">
                                    <span className="emcard-mandatory-value">
                                        {emcardLabel}
                                    </span>
                                    <span className="emcard-mandatory-note">
                                        {isFullRedemption
                                            ? "Redeem using EMCard Points"
                                            : "Cash + EMCard Points"}
                                        {" · applied automatically"}
                                    </span>
                                </div>
                            )}

                            {emcardError?.productId ===
                                String(productId) && (

                                <div className="emcard-error">
                                    ⚠ {emcardError.message}
                                </div>

                            )}

                        </div>
                    )}

                    <div
                        className={`stock-status ${
                            inStock ? "in-stock" : "out-of-stock"
                        }`}
                    >
                        {stockKnown
                            ? (inStock
                                ? `In Stock (${stock} available)`
                                : "Out of Stock")
                            : "In Stock"}
                    </div>

                    <p className="product-description">
                        {description}
                    </p>

                    {/* =====================================
                        SPECIFICATIONS TABLE
                    ===================================== */}

                    {specifications.length > 0 && (
                        <div className="specifications-section">
                            <h3>Specifications</h3>

                            <table className="specifications-table">
                                <tbody>
                                    {specifications.map((spec, index) => (
                                        <tr key={`spec-${index}`}>
                                            <td className="spec-name">
                                                {spec.configName}
                                            </td>
                                            <td className="spec-value">
                                                {spec.configValue}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* =====================================
                        ACTION BUTTONS
                    ===================================== */}

                    <div className="product-actions">
                        <button
                            className="add-cart-btn"
                            disabled={!inStock}
                            onClick={() => onAddToCart && onAddToCart(details)}
                        >
                            🛒 ADD TO CART
                        </button>

                        <button
                            className="buy-now-btn"
                            disabled={!inStock}
                            onClick={() => onBuyNow && onBuyNow(details)}
                        >
                            ⚡ BUY NOW
                        </button>
                    </div>

                </div>

            </div>

        </div>
    );
}

export default ProductDetails;
