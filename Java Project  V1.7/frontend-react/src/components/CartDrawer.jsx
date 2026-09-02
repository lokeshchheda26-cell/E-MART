import "./CartDrawer.css";

function CartDrawer({
    isOpen,
    cart,
    cartTotal,
    // Point total, buyability and reason all come from the server's one
    // purchase-mode decision (see CartServiceImpl.buildCartResponse) -
    // the drawer never adds anything up itself.
    totalPoints = 0,
    purchasable = true,
    blockingReason = null,
    emcardSelectedIds = new Set(),
    onClose,
    onIncrease,
    onDecrease,
    onRemove,
    onCheckout
}) {

    if (!isOpen) return null;

    const getProductId = (item) =>
        item.productId ?? item.prodId;

    const getName = (item) =>
        item.productName ?? item.prodName ?? "Product";

    const getImage = (item) =>
        item.productImagePath ?? item.prodImagePath;

    // Prefer the backend's already-resolved unitPrice (accounts for
    // any EMCard redemption on this line - see CartServiceImpl's
    // buildCartResponse) over the raw cardholderPrice, so a line's
    // displayed price always matches what cartTotal below actually
    // charges. Falls back to the raw price fields for any cart item
    // that somehow arrives without unitPrice.
    const getPrice = (item) =>
        Number(
            item.unitPrice ??
            item.cardholderPrice ??
            item.cardholdersPrice ??
            item.mrpPrice ??
            0
        );

    return (
        <>
            <div className="cart-overlay" onClick={onClose} />

            <aside className="cart-drawer">

                <div className="cart-drawer-header">
                    <h3>🛒 Your Cart</h3>
                    <button
                        className="cart-close-btn"
                        onClick={onClose}
                        aria-label="Close cart"
                    >
                        ✕
                    </button>
                </div>

                {cart.length === 0 ? (

                    <div className="cart-empty">
                        <p>Your cart is empty.</p>
                        <span>Add products to see them here.</span>
                    </div>

                ) : (

                    <>
                        <div className="cart-items">

                            {cart.map((item) => {
                                // The line itself is keyed/acted on by
                                // cartItemId (unique per cart row);
                                // productId is only used to check the
                                // EMCard-applied set, since EMCard
                                // reservations are per product.
                                const lineId = item.cartItemId ?? getProductId(item);
                                const productId = getProductId(item);
                                const price = getPrice(item);
                                // The server already knows whether EMCard
                                // is applied to this exact line
                                // (item.emcardApplied, resolved from the
                                // real reservation) - prefer that over
                                // the client-side emcardSelectedIds set,
                                // which can drift out of sync (e.g. right
                                // after a reload) and show a FREE label
                                // that doesn't match what's actually
                                // charged.
                                const isEmcardApplied =
                                    item.emcardApplied ??
                                    emcardSelectedIds.has(String(productId));
                                // Points this line redeems in total, decided by
                                // the product's purchase mode (mandatory for
                                // modes 3 and 4, always 0 for modes 1 and 2).
                                const points = Number(
                                    item.pointsRequired ?? item.pointsToRedeem ?? 0
                                );

                                return (
                                    <div className="cart-item" key={lineId}>

                                        <div className="cart-item-image">
                                            {getImage(item) ? (
                                                <img
                                                    src={getImage(item)}
                                                    alt={getName(item)}
                                                />
                                            ) : (
                                                <div className="cart-item-placeholder">
                                                    📦
                                                </div>
                                            )}
                                        </div>

                                        <div className="cart-item-info">
                                            <p className="cart-item-name">
                                                {getName(item)}
                                            </p>

                                            {/* Priced by purchase mode on the
                                                server: cash only, eMCard price,
                                                points only, or cash + points.
                                                This just prints what came back. */}
                                            <p className="cart-item-price">
                                                {price === 0 && points > 0 ? (
                                                    <span className="emcard-free-label">
                                                        🎁 {points} e-Points
                                                    </span>
                                                ) : (
                                                    <>
                                                        ₹{price.toLocaleString("en-IN")}
                                                        {points > 0 && (
                                                            <span className="cart-item-points">
                                                                {" "}+ {points} e-Points
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </p>

                                            {item.purchaseModeLabel && (
                                                <p className="cart-item-mode">
                                                    {item.purchaseModeLabel}
                                                </p>
                                            )}

                                            {item.purchasable === false && (
                                                <p className="cart-item-blocked">
                                                    ⚠ {item.blockingReason}
                                                </p>
                                            )}

                                            <div className="cart-item-qty">
                                                <button
                                                    onClick={() => onDecrease(lineId)}
                                                    aria-label="Decrease quantity"
                                                >
                                                    −
                                                </button>

                                                <span>{item.quantity}</span>

                                                <button
                                                    onClick={() => onIncrease(lineId)}
                                                    aria-label="Increase quantity"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            className="cart-item-remove"
                                            onClick={() => onRemove(lineId)}
                                            aria-label="Remove item"
                                        >
                                            🗑
                                        </button>

                                    </div>
                                );
                            })}

                        </div>

                        <div className="cart-drawer-footer">
                            <div className="cart-total-row">
                                <span>Cash payable</span>
                                <strong>
                                    ₹{cartTotal.toLocaleString("en-IN")}
                                </strong>
                            </div>

                            {/* A cart can mix all four purchase modes, so the
                                point side of the bill gets its own line. */}
                            {totalPoints > 0 && (
                                <div className="cart-total-row cart-points-row">
                                    <span>EMCard points</span>
                                    <strong>{totalPoints} e-Points</strong>
                                </div>
                            )}

                            {blockingReason && (
                                <div className="cart-blocked-banner">
                                    ⚠ {blockingReason}
                                </div>
                            )}

                            <button
                                className="cart-checkout-btn"
                                disabled={!purchasable}
                                onClick={() => onCheckout && onCheckout()}
                            >
                                Proceed to Checkout
                            </button>
                        </div>
                    </>

                )}

            </aside>
        </>
    );
}

export default CartDrawer;
