import { Booking } from "@/types/host";

export const featureOptions = [
  "CCTV",
  "Guard",
  "Covered",
  "Gated",
  "EV Charging",
  "Well-Lit",
  "24/7 Access",
];

export const isBookingActiveNow = (booking: Booking, now: Date) => {
  if (!booking.bookingDate || !booking.startTime) return false;

  const bd = new Date(booking.bookingDate);
  const [sh, sm] = booking.startTime.split(":").map(Number);

  const start = new Date(bd);
  start.setHours(sh, sm, 0, 0);

  const end = booking.endTime
    ? (() => {
        const [eh, em] = booking.endTime!.split(":").map(Number);
        const e = new Date(bd);
        e.setHours(eh, em, 0, 0);
        return e;
      })()
    : start;

  return now >= start && now <= end;
};

export const getStatusStyles = (status?: string) => {
  switch (status) {
    case "approved":
      return { text: "Approved", className: "bg-green-500/10 text-green-500 border-green-500/30" };
    case "pending":
      return { text: "Under Review", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" };
    case "rejected":
      return { text: "Rejected", className: "bg-red-500/10 text-red-500 border-red-500/30" };
    default:
      return { text: "Unknown", className: "bg-muted" };
  }
};