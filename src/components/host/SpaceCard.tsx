import { MapPin, Star, CalendarClock, IndianRupee, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getStatusStyles } from "@/lib/hostDashboardHelpers";
import { SpaceCardData } from "@/types/host";

interface SpaceCardProps {
  space: SpaceCardData;
  onSelect: (spaceId: string) => void;
}

const SpaceCard = ({ space, onSelect }: SpaceCardProps) => {
  const statusStyles = getStatusStyles(space.listingStatus);
  const cover = space.imageUrls?.[0];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(space.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(space.id);
      }}
      className="group bg-card rounded-2xl p-5 card-shadow space-y-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="relative h-36 rounded-xl overflow-hidden bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={space.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImageOff className="w-6 h-6" />
          </div>
        )}

        <div className="absolute top-2 left-2 flex gap-1.5">
          <Badge variant="outline" className={statusStyles.className}>
            {statusStyles.text}
          </Badge>
        </div>

        <div className="absolute top-2 right-2">
          <Badge
            variant="outline"
            className={
              space.activeCount > 0
                ? "bg-green-500/10 text-green-600 border-green-500/20"
                : space.available
                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                : "bg-red-500/10 text-red-600 border-red-500/20"
            }
          >
            {space.activeCount > 0 ? `${space.activeCount} In Use` : space.available ? "Available" : "Disabled"}
          </Badge>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="font-bold text-foreground truncate">{space.title}</h3>
        <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">
            {space.address}, {space.city}
          </span>
        </p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          {space.reviewCount > 0 ? `${space.rating.toFixed(1)} (${space.reviewCount})` : "No reviews yet"}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <CalendarClock className="w-3.5 h-3.5" />
          {space.upcomingCount} upcoming
        </span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">₹{space.pricePerHour}/hr · {space.totalBookings} bookings</span>
        <span className="flex items-center font-semibold text-foreground">
          <IndianRupee className="w-3.5 h-3.5" />
          {space.earnings.toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
};

export default SpaceCard;