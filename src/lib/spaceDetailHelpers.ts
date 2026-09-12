import {
  getCurrentDateTimeInTimezone,
  isTodayInTimezone,
  toMinutes,
  addMinutesToTime,
} from "@/lib/time";
import { END_OF_DAY_MINUTES } from "@/constants/spaceDetailsConstants";

export const getBookingTimeRange = (
  selectedDate: Date | undefined,
  isFullDay: boolean,
  startTime: string,
  duration: number,
  timezone: string
) => {
  if (!selectedDate) {
    return { startTime, endTime: addMinutesToTime(startTime, duration) };
  }

  if (isFullDay) {
    const isToday = isTodayInTimezone(selectedDate, timezone);
    return {
      startTime: isToday ? getCurrentDateTimeInTimezone(timezone).time : "00:00",
      endTime: "23:59",
    };
  }

  return { startTime, endTime: addMinutesToTime(startTime, duration) };
};

export const calculateEffectiveHours = (
  selectedDate: Date | undefined,
  isFullDay: boolean,
  duration: number,
  timezone: string
) => {
  if (!selectedDate) return 0;

  if (isFullDay) {
    if (isTodayInTimezone(selectedDate, timezone)) {
      const now = getCurrentDateTimeInTimezone(timezone).time;
      const minutesLeft = END_OF_DAY_MINUTES - toMinutes(now);
      return Math.max(minutesLeft, 0) / 60;
    }
    return 24;
  }

  return duration / 60;
};

export const calculateBasePrice = (
  space: { pricePerHour: number; pricePerDay: number },
  isFullDay: boolean,
  selectedDate: Date | undefined,
  effectiveHours: number,
  timezone: string
) => {
  if (isFullDay) {
    return selectedDate && isTodayInTimezone(selectedDate, timezone)
      ? Math.round(space.pricePerHour * effectiveHours)
      : space.pricePerDay;
  }
  return Math.round(space.pricePerHour * effectiveHours);
};