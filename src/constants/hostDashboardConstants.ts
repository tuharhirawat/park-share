import { ComputedStatus } from "@/types/host";

export const HOST_SPACE_TAB_BOOKINGS_PAGE_SIZE = 10;

export const HOST_DASHBOARD_PAGE_SIZE = 10;

export const STATUS_TABS: { id: ComputedStatus; label: string; badgeClass: string }[] = [
  { id: "Active", label: "Active", badgeClass: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  { id: "Upcoming", label: "Upcoming", badgeClass: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { id: "Completed", label: "Completed", badgeClass: "bg-green-500/10 text-green-600 border-green-500/20" },
  { id: "Cancelled", label: "Cancelled", badgeClass: "bg-red-500/10 text-red-500 border-red-500/20" },
];