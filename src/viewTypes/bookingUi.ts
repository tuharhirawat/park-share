export type RescheduleTimeSlot = {
  date: Date | undefined;
  startTime: string;
  minutes: number;
};

export type ReviewDraft = {
  bookingId: string | null;
  rating: number;
  text: string;
};