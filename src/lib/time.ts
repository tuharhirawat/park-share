// Default timezone to use when no timezone is provided
export const FALLBACK_TIMEZONE = "Asia/Kolkata";

export const getCurrentDateTimeInTimezone = (timezone: string = FALLBACK_TIMEZONE) => {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
};

// Extract the calendar date the user actually picked, without ever
// routing it through UTC conversion (which implies the browser's offset).
const toDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const isTodayInTimezone = (
  date: Date | undefined,
  timezone: string
) => {
  if (!date) return false;
  const { date: today } = getCurrentDateTimeInTimezone(timezone);
  return toDateKey(date) === today;
};

// Compares wall-clock strings directly, never touches the browser's
// Date/offset for "now".
export const isPastTime = (
  date: Date,
  time: string,
  timezone: string = FALLBACK_TIMEZONE
): boolean => {
  const { date: nowDate, time: nowTime } = getCurrentDateTimeInTimezone(timezone);
  const selectedDateKey = toDateKey(date);
 
  if (selectedDateKey !== nowDate) {
    return selectedDateKey < nowDate;
  }
 
  return time < nowTime;
};

// validatePastTime kept as the booking-facing wrapper some call sites use:
// "is this time still valid to select" (true = valid/not in the past).
export const validatePastTime = (
  selectedTime: string,
  selectedDate?: Date,
  timezone: string = FALLBACK_TIMEZONE
): boolean => {
  if (!selectedDate) return true;
  if (!isTodayInTimezone(selectedDate, timezone)) return true;
  return !isPastTime(selectedDate, selectedTime, timezone);
};
 
export const toMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};
 
// Formats a time as "HH:MM:SS" for DB storage (pads seconds if missing).
export const formatTimeForDB = (t: string): string =>
  t.length === 5 ? `${t}:00` : t;
 
// Format a time as HH:MM for display
export const displayTime = (t: string | null): string =>
  t ? t.slice(0, 5) : "--:--";
 
export const formatDuration = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};
 
// Adds minutes to a time string, returning "HH:MM".
// Pass maxMinutes to clamp the result (e.g. to MAX_DAY_MINUTES).
export const addMinutesToTime = (
  time: string,
  mins: number,
  maxMinutes?: number
): string => {
  let total = toMinutes(time) + mins;
  if (maxMinutes !== undefined) {
    total = Math.min(total, maxMinutes);
  }
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// Returns a Date built from this timezone's current wall-clock parts,
// plugged into the *local* Date constructor. This is NOT a correct
// absolute timestamp when the browser's timezone differs from `timezone`
// — only use it for relative comparisons against other Dates built the
// same way (e.g. `parseISO(...)` + `.setHours(...)`), never on its own.
export const getAppNow = (timezone: string = FALLBACK_TIMEZONE): Date => {
  const { date, time } = getCurrentDateTimeInTimezone(timezone);
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min, 0);
};

// Same caveat as getAppNow — safe because it's immediately zeroed to
// midnight, so only the calendar Y/M/D (which come from the timezone-
// correct Intl parts) end up mattering.
export const getAppToday = (timezone: string = FALLBACK_TIMEZONE): Date => {
  const now = getAppNow(timezone);
  now.setHours(0, 0, 0, 0);
  return now;
};

export const getCurrentTime = (timezone: string = FALLBACK_TIMEZONE): string =>
  getCurrentDateTimeInTimezone(timezone).time;