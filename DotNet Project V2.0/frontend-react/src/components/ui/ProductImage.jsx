import { useState } from "react";

/**
 * ProductImage.jsx
 * ------------------------------------------------------------------
 * A product photograph that degrades gracefully when the file is missing.
 *
 * Why this exists: product image paths come from the database, and a path
 * that no longer resolves is a normal, permanent fact of life in a catalogue
 * (a product is re-photographed, an asset is moved, a row is imported with a
 * stale path). Left to the browser, a broken <img> renders its alt text as
 * loose words sprawling across the card, which looks far more broken than a
 * missing picture actually is - and on a grid it also breaks the alignment
 * that the fixed aspect ratio exists to protect.
 *
 * On error this swaps to the same placeholder used when a product has no
 * image at all, so "no photo" and "photo failed" look identical and neither
 * disturbs the layout.
 *
 * Decorative by default: `alt` is empty because in every current usage the
 * product name is already announced right next to the image, and repeating
 * it would make a screen reader say everything twice. Pass an explicit alt
 * where the image IS the only description (the product detail gallery).
 * ------------------------------------------------------------------
 */
export default function ProductImage({
  src,
  alt = "",
  className = "",
  placeholderClassName = "",
  icon = "bi-box-seam",
  loading = "lazy",
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span
        className={placeholderClassName || "product-image__placeholder"}
        aria-hidden="true"
      >
        <i className={`bi ${icon}`} />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
