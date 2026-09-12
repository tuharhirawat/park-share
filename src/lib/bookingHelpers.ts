import { MAX_DAY_MINUTES } from "@/constants/bookingConstants";
import { STEP_DURATION } from "@/constants/spaceDetailsConstants";
import { Booking } from "@/types/booking";
import { toMinutes } from "@/lib/time";

interface GraceToggleInput {
  baseParkingExtensionCost: number;
  baseTotalPayable: number;
  currentBookingPrice: number;
  extraMinutes: number;
}

interface GraceToggleResult {
  applyGraceExtension: boolean;
  graceApplied: boolean;
  graceDiscount: number;
  parkingExtensionCost: number;
  extraCost: number;
  newTotalPrice: number;
}

// Calculates the new total price and costs when a grace extension is applied or not, based on the provided input and whether the grace extension is enabled.
// Returns an object containing the calculated values.
export const calculateGraceToggle = (
  base: GraceToggleInput,
  enabled: boolean
): GraceToggleResult => {
  if (!enabled) {
    return {
      applyGraceExtension: false,
      graceApplied: false,
      graceDiscount: 0,
      parkingExtensionCost: base.baseParkingExtensionCost,
      extraCost: base.baseTotalPayable,
      newTotalPrice: base.currentBookingPrice + base.baseTotalPayable,
    };
  }

  const costPerMinute = base.baseParkingExtensionCost / base.extraMinutes;
  const graceDiscount = Math.round(costPerMinute * 10);
  const parkingExtensionCost = base.baseParkingExtensionCost - graceDiscount;
  const extraCost = base.baseTotalPayable - graceDiscount;

  return {
    applyGraceExtension: true,
    graceApplied: true,
    graceDiscount,
    parkingExtensionCost,
    extraCost,
    newTotalPrice: base.currentBookingPrice + extraCost,
  };
};

export const canExtendBooking = (booking: Booking): boolean => {
  const end = toMinutes(booking.endTime?.slice(0, 5) || "00:00");
  return end + STEP_DURATION <= MAX_DAY_MINUTES;
};

export const getDisplayLocation = (booking: Booking & { computedStatus: string }): string => {
  if (booking.computedStatus === "completed" || booking.computedStatus === "cancelled") {
    return `Previously parked in ${booking.spaceCity}`;
  }
  return `${booking.spaceAddress}, ${booking.spaceCity}`;
};

export const clampDurationToStart = (startTime: string, minutes: number): number => {
  const maxAllowed = MAX_DAY_MINUTES - toMinutes(startTime);
  if (minutes <= maxAllowed) return minutes;
  const clamped = Math.floor(maxAllowed / STEP_DURATION) * STEP_DURATION;
  return Math.max(STEP_DURATION, clamped);
};

export const isOnStep = (time: string, stepMinutes: number = STEP_DURATION): boolean =>
  toMinutes(time) % stepMinutes === 0;
