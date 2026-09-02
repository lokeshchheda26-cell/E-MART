function ProductCard({ product, onAddToCart, onViewProduct }) {

    const name =
        product?.productName ??
        product?.prodName ??
        "Product";

    const image =
        product?.productImagePath ??
        product?.prodImagePath;

    const description =
        product?.productShortDesc ??
        product?.shortDescription ??
        product?.prodShortDesc ??
        "";

    const mrp =
        product?.mrpPrice ?? 0;

    const price =
    product.cardholderPrice ??
    product.cardholdersPrice ??
    product.mrpPrice ??
    0;
    const points =
        product?.points ??
        product?.pointsToBeRedeemed ??
        product?.pointsToRedeem ??
        0;

    return (
        <div
            className="product-card product-card-clickable"
            onClick={() =>
                onViewProduct && onViewProduct(product)
            }
        >

            <div className="product-image">

                {image ? (
                    <img
                        src={image}
                        alt={name}
                    />
                ) : (
                    <div className="product-placeholder">
                        📦
                    </div>
                )}

            </div>

            <div className="product-info">

                <h3>
                    {name}
                </h3>

                <p className="short-desc">
                    {description}
                </p>

                <div className="price-section">

                    <span className="mrp-price">
                        MRP ₹{mrp}
                    </span>

                   <span className="card-price">
                         ₹{price}
                    </span>

                </div>

                <div className="points">
                    ⭐ {points} Points to Redeem
                </div>

                <button
                    className="add-cart-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(product);
                    }}
                >
                    🛒 ADD TO CART
                </button>

            </div>

        </div>
    );
}

export default ProductCard;