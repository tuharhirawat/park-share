import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOrderData {
  orderId: string;
  keyId: string;
  amountInPaise: number;
}

interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface OpenRazorpayCheckoutOptions {
  order: RazorpayOrderData;
  description: string;
  email?: string;
  onSuccess: (response: RazorpaySuccessResponse) => void | Promise<void>;
  onFailure?: () => void | Promise<void>;
  onDismiss?: () => void | Promise<void>;
}

// Shared by SpaceDetail (new booking) and MyBookings (reschedule/extend) —
// both were building this same options object independently.

// To Do: Calculations are currently only capable for indian rupees. Add support for other currencies. 
export const openRazorpayCheckout = ({
  order,
  description,
  email,
  onSuccess,
  onFailure,
  onDismiss,
}: OpenRazorpayCheckoutOptions) => {
  if (!window.Razorpay) {
    toast.error("Payment gateway still loading — please try again in a moment.");
    return;
  }

  const razorpay = new window.Razorpay({
    key: order.keyId,
    amount: order.amountInPaise,
    currency: "INR",
    name: "Park Mitra",
    description,
    order_id: order.orderId,
    handler: onSuccess,
    prefill: email ? { email } : undefined,
    theme: { color: "#2a9d7c" },
    modal: { ondismiss: onDismiss },
  });

  razorpay.on("payment.failed", onFailure ?? (() => {}));
  razorpay.open();
};