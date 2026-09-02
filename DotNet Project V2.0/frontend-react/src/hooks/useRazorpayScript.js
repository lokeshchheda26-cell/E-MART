import { useEffect, useState } from "react";

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

// Loads the Razorpay Checkout script once (on whichever page first
// needs it - currently just Payment.jsx) and reports readiness so the
// Pay button can be disabled until it's usable.
export default function useRazorpayScript() {
  const [ready, setReady] = useState(!!window.Razorpay);

  useEffect(() => {
    if (window.Razorpay) {
      setReady(true);
      return;
    }
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => setReady(false);
    document.body.appendChild(script);
  }, []);

  return ready;
}
