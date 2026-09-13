export interface Booking {
  id: string;
  spaceId: string;
  spaceTitle: string;
  spaceAddress: string;
  spaceCity: string;
  spaceLat?: number;
  spaceLng?: number;
  spaceTimezone: string;
  durationMinutes: number;
  totalPrice: number;
  status: string;
  computedStatus: string;
  bookingDate: string | null;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  vehicleType: string;
  vehicleId: string | null;
  vehicleNumber: string | null;
  slotId: string | null;
  slotLabel: string | null;
  hasUsedFreeExtension: boolean;
  freeExtensionMinutesUsed: number;
  hasReview: boolean;
  rating: number | null;
  reviewText: string | null;
}

export interface Review {
  id: string;
  bookingId: string;
  rating: number;
  reviewText: string | null;
}

export interface RescheduleConfirmation {
  bookingId: string;
  paymentId?: string;
  extraMinutes: number;
  extraCost: number;
  newTotalPrice: number;
  canUseFreeExtension: boolean;
  pricePerHour: number;
  rescheduleDate: Date;
  rescheduleStartTime: string;
  rescheduleEndTime: string;
  isPaidExtension: boolean;
  freeMinutesApplied: number;
  nextFreeExtensionMinutesUsed: number;
  nextHasUsedFreeExtension: boolean;
  type: "extend" | "reschedule";
  parkingExtensionCost: number;
  serviceFee: number;
  gst: number;
  graceDiscount: number;
  graceApplied: boolean;
  applyGraceExtension: boolean;
  currentBookingPrice: number;
  baseTotalPayable: number;
  baseParkingExtensionCost: number;
}
