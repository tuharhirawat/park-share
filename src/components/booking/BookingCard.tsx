import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Booking } from "@/types/booking";
import { canExtendBooking, getDisplayLocation } from "@/lib/bookingHelpers";
import { displayTime, formatDuration } from "@/lib/time";
import { openDirections } from "@/lib/maps";
import { statusConfig } from "@/constants/bookingConstants";
import {
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  RefreshCw,
  TimerReset,
  Trash2,
  Car,
  Bike
} from "lucide-react";

interface BookingCardProps {
  booking: Booking;
  showActions: boolean;
  cancelling: string | null;
  handleCancel: (id: string) => void;
  onReschedule: (booking: Booking) => void;
};

const BookingCard = ({
  booking,
  showActions,
  cancelling,
  handleCancel,
  onReschedule
}: BookingCardProps) => {
  const cfg = statusConfig[booking.computedStatus];
  const cancelledBooking = booking.status === "Cancelled";

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-display font-bold text-foreground text-lg">
            {booking.spaceTitle}
          </h3>

          <Badge variant="outline" className={cfg.color}>
            {cfg.label}
          </Badge>

          {!cancelledBooking && canExtendBooking(booking) && (
            booking.hasUsedFreeExtension ? (
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 text-xs">
                Grace Used
              </Badge>
            ) : booking.computedStatus === "Completed" ? (
              <Badge variant="outline" className="bg-blue-500/20 text-blue-700 text-xs">
                Grace Unused
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-500/20 text-green-700 text-xs">
                Grace Available
              </Badge>
            )
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {getDisplayLocation(booking)}
          </span>

          {booking.bookingDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(parseISO(booking.bookingDate), "MMM d, yyyy")}
            </span>
          )}

          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {displayTime(booking.startTime)} –{" "}
            {displayTime(booking.endTime)}
          </span>

          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatDuration(booking.durationMinutes)}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {booking.vehicleType && (
            <span className="flex items-center gap-1">
              {booking.vehicleType.toLowerCase() === "bike" ? (
                <Bike className="w-4 h-4" />
              ) : (
                <Car className="w-4 h-4" />
              )}

              <span className="capitalize">
                {booking.vehicleNumber}
              </span>
            </span>
          )}

          {booking.slotLabel && (
            <span className="flex items-center gap-1">
              {booking.slotLabel}
            </span>
          )}
        </div>

        {booking.computedStatus === "completed" && (
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
            🔒 Exact parking access details hidden after booking completion.
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-lg font-bold text-foreground">
          ₹{booking.totalPrice}
        </span>

        {(booking.computedStatus === "active" || booking.computedStatus === "upcoming") && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => openDirections(booking.spaceLat!, booking.spaceLng!)}
          >
            <Navigation className="w-3.5 h-3.5" />
            Navigate
          </Button>
        )}

        {showActions && (
          <>
            {booking.durationMinutes < 1440 && booking.computedStatus === "upcoming" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => onReschedule(booking)}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reschedule
              </Button>
            )}

            {booking.computedStatus === "active" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => onReschedule(booking)}
              >
                <TimerReset className="w-3.5 h-3.5" />
                Adjust Time
              </Button>
            )}
          </>
        )}

        {showActions && !cancelledBooking && (
          <Button
            variant="destructive"
            size="sm"
            disabled={cancelling === booking.id}
            onClick={() => handleCancel(booking.id)}
          >
            {cancelling === booking.id ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span className="ml-1">Cancel</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default BookingCard;