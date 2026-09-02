import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Generic "call a GET-style endpoint" hook - the single place that
 * knows how to turn an API call into { data, loading, error }
 * state, so individual components/pages stop hand-rolling the same
 * useEffect + try/catch/finally block for every list/getById call.
 *
 * @param {Function} apiFn - a function returning a promise from an API call,
 *   e.g. () => getAllCategories() or () => getProductDetails(id).
 *   Wrap it in useCallback (or pass a fresh arrow fn) at the call
 *   site so it re-runs when its own inputs change.
 * @param {Array} deps - dependency array, same semantics as
 *   useEffect's. Pass [] to fetch once on mount.
 * @param {Object} [options]
 * @param {boolean} [options.skip] - don't fetch (e.g. while a
 *   required id is still null).
 * @param {*} [options.initialData]
 *
 * @returns {{ data, loading, error, refetch: Function, setData: Function }}
 *
 * Usage (replaces a hand-written useEffect + fetch-based API call):
 *   const { data: categories, loading, error } =
 *     useApi(useCallback(() => getAllCategories(), []), []);
 *
 *   const { data: product, loading } =
 *     useApi(
 *       useCallback(() => getProductDetails(productId), [productId]),
 *       [productId],
 *       { skip: !productId }
 *     );
 */
export function useApi(apiFn, deps = [], options = {}) {
  const { skip = false, initialData = null } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);

  // Guards against setting state after the component/deps have
  // already moved on (a slower, stale request resolving after a
  // newer one was fired) - avoids the classic "flicker back to old
  // data" race.
  const requestId = useRef(0);

  const runRequest = useCallback(() => {
    if (skip) {
      setLoading(false);
      return Promise.resolve();
    }

    const thisRequestId = ++requestId.current;
    setLoading(true);
    setError(null);

    return apiFn()
      .then((response) => {
        if (thisRequestId !== requestId.current) return;
        setData(response?.data ?? null);
      })
      .catch((err) => {
        if (thisRequestId !== requestId.current) return;
        console.error("useApi request failed:", err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Something went wrong. Please try again."
        );
      })
      .finally(() => {
        if (thisRequestId !== requestId.current) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    runRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runRequest]);

  return { data, loading, error, refetch: runRequest, setData };
}

/**
 * Generic "call a POST/PUT/DELETE-style endpoint on demand" hook -
 * the mutation counterpart to useApi. Nothing runs until you call
 * the returned function.
 *
 * @param {Function} apiFn - a function returning a promise from an API call,
 *   e.g. (productId, qty) => addCartItem(productId, qty).
 *
 * @returns {[Function, { loading, error, data }]}
 *
 * Usage:
 *   const [addItem, { loading: addingToCart }] = useApiMutation(addCartItem);
 *   await addItem(productId, 1);
 */
export function useApiMutation(apiFn) {
  const [state, setState] = useState({ loading: false, error: null, data: null });

  const mutate = useCallback(
    (...args) => {
      setState({ loading: true, error: null, data: null });

      return apiFn(...args)
        .then((response) => {
          const result = response?.data ?? null;
          setState({ loading: false, error: null, data: result });
          return result;
        })
        .catch((err) => {
          const message =
            err?.response?.data?.message ||
            err?.message ||
            "Something went wrong. Please try again.";
          setState({ loading: false, error: message, data: null });
          throw err;
        });
    },
    [apiFn]
  );

  return [mutate, state];
}
