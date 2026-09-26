export const FREE_EXTENSION_MINUTES = 10;

export const MAX_DAY_MINUTES = (23 * 60) + 59;

export const BOOKINGS_PAGE_DATA_SIZE = 10;

export const statusConfig = {
  upcoming: {
    label: "Upcoming",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },

  active: {
    label: "Currently Parked",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
  },

  completed: {
    label: "Completed",
    color: "bg-muted text-muted-foreground border-border",
  },

  cancelled: {
    label: "Cancelled",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
  },
} as const;