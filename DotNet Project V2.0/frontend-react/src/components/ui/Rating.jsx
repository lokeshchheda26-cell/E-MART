/**
 * Rating.jsx
 * ------------------------------------------------------------------
 * Star rating display.
 *
 * IMPORTANT - this renders data, it does not invent it. Rating fields are
 * optional on the product API, and the caller is expected to pass `null`
 * when the backend has no rating for that product (see getRating() in
 * utils/product.js), in which case nothing is rendered at all.
 *
 * Showing a default "0 stars" or a made-up "4.5" for an unrated product
 * would be fabricating a review score, which is both dishonest to shoppers
 * and would quietly hide the fact that ratings are not implemented on the
 * backend yet.
 * ------------------------------------------------------------------
 */
export default function Rating({ value, count = null, size = "md" }) {
  if (value == null) return null;

  const rounded = Math.round(Number(value) * 2) / 2;

  return (
    <span className={`ui-rating ${size === "sm" ? "ui-rating--sm" : ""}`}>
      <span className="ui-rating__stars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = rounded >= star;
          const half = !filled && rounded >= star - 0.5;
          return (
            <i
              key={star}
              className={`bi ${
                filled ? "bi-star-fill" : half ? "bi-star-half" : "bi-star"
              } ${!filled && !half ? "ui-rating__star--empty" : ""}`}
            />
          );
        })}
      </span>

      <span className="sr-only">Rated {value} out of 5</span>
      <span aria-hidden="true">{Number(value).toFixed(1)}</span>

      {count ? (
        <span className="ui-rating__count">({count.toLocaleString("en-IN")})</span>
      ) : null}
    </span>
  );
}
