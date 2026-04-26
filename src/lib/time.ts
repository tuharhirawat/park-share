export const getCurrentTime = (): string => {
  const now = new Date();
  return now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const isToday = (date?: Date): boolean => {
  if (!date) return false;
  const now = new Date();
  return date.toDateString() === now.toDateString();
};

export const isPastTime = (date: Date, time: string): boolean => {
  const now = new Date();
  now.setSeconds(0, 0); // Ignore seconds and milliseconds for comparison
  const [h, m] = time.split(":").map(Number);
  const selected = new Date(date);
  selected.setHours(h, m, 0, 0);

  return selected < now;
};