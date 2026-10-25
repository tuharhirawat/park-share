import {
  Clock3,
  CheckCircle2,
  CircleX,
  type LucideIcon,
} from "lucide-react";
import { ListingStatus } from "@/types/hostSpaceListings";

export const HOST_SPACES_SUMMARY_DASHBOARD_PAGE_SIZE = 10;

export const STATUS_CARDS: {
  status: ListingStatus;
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  hoverClassName: string;
}[] = [
  {
    status: "pending",
    title: "Pending",
    description: "Awaiting admin review",
    icon: Clock3,
    iconClassName: "text-yellow-500",
    hoverClassName: "hover:border-yellow-500/60",
  },
  {
    status: "approved",
    title: "Approved",
    description: "Approved listings",
    icon: CheckCircle2,
    iconClassName: "text-green-500",
    hoverClassName: "hover:border-green-500/60",
  },
  {
    status: "rejected",
    title: "Rejected",
    description: "Needs correction",
    icon: CircleX,
    iconClassName: "text-red-500",
    hoverClassName: "hover:border-red-500/60",
  },
];