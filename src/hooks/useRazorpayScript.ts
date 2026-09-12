import { useEffect } from "react";

export const useRazorpayScript = () => {
  useEffect(() => {
    if ((window as any).Razorpay) return;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.body.appendChild(script);
  }, []);
};