import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Trash2, Loader2, Star, Filter, TimerReset, AlertCircle, Navigation } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getLatestDisplayValue } from "@/lib/spaceUpdates";
import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Booking {
  id: string;
  space_id: string;
  space_title: string;
  space_address: string;
  space_city: string;
  hours: number;
  duration_minutes: number;
  total_price: number;
  status: string;
  booking_date: string | null;
  start_time: string | null;
  end_time: string | null;
  payment_id: string | null;
  created_at: string;
  vehicle_type: string;
  vehicle_id: string | null;
  slot_id: string | null;
  original_start_time: string | null;
  original_end_time: string | null;
  original_duration_minutes: number | null;
  has_used_free_extension: boolean;
  free_extension_minutes_used: number | null;
  space_lat?: number;
  space_lng?: number;
}

interface Review {
  id: string;
  booking_id: string;
  rating: number;
  review_text: string | null;
}

interface ExtensionConfirmation {
  bookingId: string;
  extraMinutes: number;
  extraCost: number;
  newTotalPrice: number;
  canUseFreeExtension: boolean;
  pricePerHour: number;
  rescheduleDate: Date;
  rescheduleStartTime: string;
  rescheduleEndTime: string;
  isPaidExtension: boolean;
  freeMinutesApplied: number;
  nextFreeExtensionMinutesUsed: number;
  nextHasUsedFreeExtension: boolean;
  type: "extend" | "reschedule"; // distinguish between extend and reschedule
  parkingExtensionCost: number;
  platformFee: number;
}

type RescheduleConfirmation = ExtensionConfirmation; // backward compatibility

type ComputedStatus = "upcoming" | "active" | "completed" | "cancelled";

const FREE_EXTENSION_MINUTES = 10;
const EXTEND_STEP = 15;
const MAX_DAY_MINUTES = (23 * 60) + 59;
const PLATFORM_FEE_PERCENTAGE = 0.2; // 20%

const displayTime = (t: string | null) => (t ? t.slice(0, 5) : "--:--");

const canExtendBooking = (booking: Booking) => {
  const end = toMinutes(booking.end_time?.slice(0, 5) || "00:00");
  return end + EXTEND_STEP <= MAX_DAY_MINUTES;
};

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatTimeForDB = (t: string) => (t.length === 5 ? `${t}:00` : t);

const addMinutesToTime = (
  time: string,
  mins: number
) => {
  const total = Math.min(
    toMinutes(time) + mins,
    MAX_DAY_MINUTES
  );
  const h = Math.floor(total / 60);
  const m = total % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const getCurrentTime = () => {
  const now = new Date();

  return `${String(
    now.getHours()
  ).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
};

const isTodaySelected = (date?: Date) => {
  if (!date) return false;

  return (
    format(date, "yyyy-MM-dd") ===
    format(new Date(), "yyyy-MM-dd")
  );
};

const validatePastTime = (selectedTime: string, selectedDate?: Date) => {

  if (!selectedDate) return true;

  if (!isTodaySelected(selectedDate))
    return true;

  return (
    toMinutes(selectedTime) >=
    toMinutes(getCurrentTime())
  );
};

const calculatePricingForDuration = ({
  booking,
  pricePerHour,
  proposedDurationMinutes,
}: {
  booking: Booking;
  pricePerHour: number;
  proposedDurationMinutes: number;
}) => {
  const currentDuration = booking.duration_minutes;
  const extraMinutes = proposedDurationMinutes - currentDuration;

  let parkingExtensionCost =
    extraMinutes > 0
      ? (extraMinutes / 15) * Math.ceil(pricePerHour / 4)
      : 0;

  let platformFee =
    Math.round(
      parkingExtensionCost *
      PLATFORM_FEE_PERCENTAGE
    );

  let extraCost = parkingExtensionCost + platformFee;

  return {
    extraFromCurrent: extraMinutes,
    extraCost,
    parkingExtensionCost,
    platformFee,
    freeMinutesApplied: 0,
    newTotalPrice: booking.total_price + extraCost,
    canUseFreeExtension: true,
    nextFreeExtensionMinutesUsed: 0,
    nextHasUsedFreeExtension: booking.has_used_free_extension
  };
};

const computeStatus = (booking: Booking): ComputedStatus => {
  if (booking.status === "cancelled") return "cancelled";
  if (!booking.booking_date) return "upcoming";

  const now = new Date();
  const bookingDate = parseISO(booking.booking_date);

  const [sh, sm] = (booking.start_time || "00:00").split(":").map(Number);
  const startDt = new Date(bookingDate);
  startDt.setHours(sh, sm, 0, 0);

  const [eh, em] = (booking.end_time || "23:59").split(":").map(Number);
  const endDt = new Date(bookingDate);
  endDt.setHours(eh, em, 0, 0);

  if (!booking.end_time) {
    endDt.setTime(startDt.getTime() + booking.duration_minutes * 60 * 1000);
  }

  if (now < startDt) return "upcoming";
  if (now >= startDt && now <= endDt) return "active";
  return "completed";
};

const statusConfig: Record<ComputedStatus, { label: string; color: string }> = {
  upcoming: { label: "Upcoming", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  active: { label: "Currently Parked", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  completed: { label: "Completed", color: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelled", color: "bg-red-500/10 text-red-600 border-red-500/20" },
};

const StarRating = ({ rating, onChange, readonly = false }: { rating: number; onChange?: (v: number) => void; readonly?: boolean }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`w-5 h-5 transition-colors ${i <= rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"} ${!readonly ? "cursor-pointer hover:text-yellow-400" : ""}`}
        onClick={() => !readonly && onChange?.(i)} />
    ))}
  </div>
);

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const ActionNote = ({ type }: { type: "extend" | "reschedule" }) => {
  const actionText = type === "extend" ? "extension" : "rescheduling";
  return (
    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
      <p className="text-xs text-yellow-600 leading-relaxed">
        <span className="font-semibold">Note:</span> While {actionText}, it is not allowed to move back or reduce duration.
        If you mistakenly booked extra time, please cancel this booking and create a new one.
        Any eligible refunds will be processed within 48 hours of cancellation.
      </p>
    </div>
  );
};

const RescheduleConfirmationModal = ({
  confirmation,
  onConfirm,
  onCancel,
  loading,
  applyGraceExtension,
  setApplyGraceExtension
}:
  {
    confirmation: ExtensionConfirmation;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
    applyGraceExtension: boolean;
    setApplyGraceExtension: React.Dispatch<React.SetStateAction<boolean>>;
  }) => {
  const extraCost = applyGraceExtension ? 0 : confirmation.extraCost;
  const graceBase = Math.ceil((FREE_EXTENSION_MINUTES * confirmation.pricePerHour) / 60);
  const graceDiscount = graceBase + Math.round(graceBase * PLATFORM_FEE_PERCENTAGE);
  const payableAmount = applyGraceExtension ? Math.max(0, confirmation.extraCost - graceDiscount) : confirmation.extraCost;
  const isFreeReschedule =
    confirmation.type === "reschedule" &&
    confirmation.extraCost === 0 &&
    confirmation.extraMinutes === 0;

  const confirmButtonLabel = isFreeReschedule
    ? "Confirm"
    : `Confirm & Pay ₹${payableAmount}`;

  const infoMessage = isFreeReschedule
    ? "This change is already covered in your existing booking. No additional charges apply for this reschedule."
    : "Proceed to confirm this booking change.";

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="w-[92vw] max-w-[430px] max-h-[88vh] overflow-y-auto p-4 sm:p-5 rounded-2xl pointer-events-auto">
        <DialogHeader>
          <DialogTitle>{confirmation.type === "extend" ? "Extend Booking" : "Reschedule Booking"} - Price Summary</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original Booking Info */}
          <div className="bg-muted p-2.5 rounded-lg space-y-1">
            <p className="text-sm font-medium text-foreground">Current Booking</p>
            <p className="text-xs text-muted-foreground">Date: {format(new Date(confirmation.rescheduleDate), "MMM d, yyyy")}</p>
            <p className="text-xs text-muted-foreground">Time: {confirmation.rescheduleStartTime} - {confirmation.rescheduleEndTime}</p>
          </div>

          {confirmation.extraMinutes >= 30 && !confirmation.nextHasUsedFreeExtension && confirmation.canUseFreeExtension && (
            <div className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    Use Free 10 Min Grace
                  </p>
                  <p className="text-xs text-muted-foreground">
                    One-time free extension
                  </p>
                </div>

                <button
                  type="button"
                  disabled={confirmation.nextHasUsedFreeExtension}
                  onClick={() => setApplyGraceExtension(v => !v)}
                  className={cn(
                    "w-12 h-6 rounded-full relative transition",
                    applyGraceExtension
                      ? "bg-primary"
                      : "bg-muted",
                    confirmation.nextHasUsedFreeExtension &&
                    "opacity-50"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition",
                      applyGraceExtension &&
                      "translate-x-6"
                    )}
                  />
                </button>

              </div>
            </div>
          )}

          {/* Duration Change */}
          <div className="border-l-2 border-blue-500 pl-3 space-y-1">
            <p className="text-sm font-medium text-foreground">Duration Change</p>
            <p className="text-xs text-muted-foreground">Duration change: <span className="font-semibold">{confirmation.extraMinutes} minutes</span></p>
            {applyGraceExtension ? (
              <p className="text-xs text-green-600 font-medium">
                ✓ Free 10 minute grace applied.
                You saved ₹{graceDiscount} on this extension.
              </p>
            ) : (
              <p
                className={cn(
                  "text-xs font-medium",
                  isFreeReschedule
                    ? "text-green-600"
                    : "text-yellow-600"
                )}
              >
                {infoMessage}
              </p>
            )}
          </div>

          {/* Pricing Breakdown */}
          {confirmation.extraCost > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg space-y-2">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-600">Paid Extension</p>
                  <p className="text-xs text-yellow-600/80">Additional parking time selected. Extension charge applies.</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-yellow-500/20 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Current booking amount:</span>
                  <span className="font-semibold">₹{confirmation.newTotalPrice - extraCost}</span>
                </div>
                <div className="space-y-2">

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>
                        Parking extension ({confirmation.extraMinutes} mins)
                      </span>

                      <span className="font-semibold">
                        ₹{confirmation.parkingExtensionCost}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span>
                        Platform fee
                      </span>

                      <span className="font-semibold">
                        ₹{confirmation.platformFee}
                      </span>
                    </div>
                  </div>

                  {applyGraceExtension && (
                    <div className="flex justify-between items-start text-xs text-green-600 bg-green-500/5 rounded-md px-2 py-2">
                      <span className="pr-3">
                        Free extension discount (10 mins)
                      </span>

                      <span className="font-semibold whitespace-nowrap">
                        - ₹{graceDiscount}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-yellow-500/20 pt-2 mt-2">
                  <span>Booking total after extension:</span>
                  <span className="text-yellow-600">
                    ₹{
                      applyGraceExtension
                        ? confirmation.newTotalPrice - graceDiscount
                        : confirmation.newTotalPrice
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Final Price */}
          <div className="bg-card border border-border p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-base font-display font-bold">
                {isFreeReschedule
                  ? "Additional Charge:"
                  : "Amount Payable:"
                }
              </span>
              <span className="text-xl font-bold text-primary">
                ₹{payableAmount}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Preparing payment...
                </>
              ) : (
                confirmButtonLabel
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const formatDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;

  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

const ReduceTimeConfirmationModal = ({ data, onConfirm, onCancel, }: {
  data: any;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <Dialog open={true} onOpenChange={(o) => !o && onCancel()}>
    <DialogContent className="max-w-md">

      <DialogHeader>
        <DialogTitle>
          Reduce Booking Duration?
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl space-y-3">
          <div>
            <p className="text-sm font-semibold text-red-600">
              ⚠ No Refund Policy
            </p>

            <p className="text-xs text-red-600/80 mt-1">
              Reducing unused time does not generate a refund.
            </p>
          </div>

          <div className="bg-background/50 rounded-lg p-3 text-sm space-y-2">
            <div className="flex justify-between">
              <span>Current duration</span>
              <strong>
                {formatDuration(data.booking.duration_minutes)}
              </strong>
            </div>

            <div className="flex justify-between">
              <span>New duration</span>
              <strong>
                {formatDuration(data.newDuration)}
              </strong>
            </div>

            <div className="flex justify-between text-red-500 font-semibold border-t pt-2">
              <span>Time being reduced</span>
              <span>
                - {formatDuration(data.reducedMinutes)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Keep Current Booking
          </Button>

          <Button
            onClick={onConfirm}
            className="flex-1"
          >
            Reduce & Continue
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

const MyBookingsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [latestTitleUpdates, setLatestTitleUpdates] = useState<
    Record<string, any>
  >({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "completed" | "cancelled">("all");

  // Extend state
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [extendMinutes, setExtendMinutes] = useState(15);
  const [extendLoading, setExtendLoading] = useState(false);
  const [applyGraceExtension, setApplyGraceExtension] = useState(false);

  // Reschedule state
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleMinutes, setRescheduleMinutes] = useState(0);
  const [rescheduleStartTime, setRescheduleStartTime] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [shouldCheckReschedule, setShouldCheckReschedule] = useState(false);
  const [rescheduleConfirmation, setRescheduleConfirmation] = useState<RescheduleConfirmation | null>(null);

  const [reduceConfirmation, setReduceConfirmation] = useState<{
    booking: Booking;
    reducedMinutes: number;
    newDuration: number;
    rescheduleDate: Date;
    startTime: string;
    endTime: string;
  } | null>(null);

  const canIncreaseExtension = (booking: Booking) =>
    toMinutes(booking.end_time!.slice(0, 5)) + extendMinutes + EXTEND_STEP <= MAX_DAY_MINUTES;

  const canDecreaseExtension = () => {
    return extendMinutes > EXTEND_STEP;
  };

  const canIncreaseReschedule = (startTime: string) =>
    toMinutes(startTime) + rescheduleMinutes + EXTEND_STEP <= MAX_DAY_MINUTES;

  const canDecreaseReschedule = () =>
    rescheduleMinutes > EXTEND_STEP;

  const handleRescheduleDateChange = (value: string) => {

    if (!value) return;

    const pickedDate = parseISO(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selectedDate = new Date(pickedDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast.error(
        "Past dates are not allowed"
      );

      setRescheduleDate(new Date());

      if (
        !rescheduleStartTime ||
        !validatePastTime(
          rescheduleStartTime,
          new Date()
        )
      ) {
        setRescheduleStartTime(
          getCurrentTime()
        );
      }

      return;
    }

    setRescheduleDate(pickedDate);

    if (
      isTodaySelected(pickedDate) &&
      (
        !rescheduleStartTime ||
        !validatePastTime(
          rescheduleStartTime,
          pickedDate
        )
      )
    ) {
      setRescheduleStartTime(
        getCurrentTime()
      );
    }
  };

  const handleRescheduleTimeChange = (value: string) => {

    if (!validatePastTime(value, rescheduleDate)) {
      toast.error("Past time not allowed");
      return;
    }

    setRescheduleStartTime(value);
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  useEffect(() => {
    if (!shouldCheckReschedule) return;
    if (!reschedulingId) {
      setShouldCheckReschedule(false);
      return;
    }
    if (!rescheduleDate || !rescheduleStartTime) {
      setShouldCheckReschedule(false);
      toast.error("Please fill all fields");
      return;
    }

    const booking = bookings.find(b => b.id === reschedulingId);
    if (!booking) {
      setShouldCheckReschedule(false);
      return;
    }

    prepareRescheduleConfirmation(booking);
    setShouldCheckReschedule(false);
  }, [shouldCheckReschedule]);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        parking_spaces (
          lat,
          lng
        )
      `)
      .eq("user_id", user.id)
      .in("status", ["confirmed", "cancelled"])
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load bookings");
    } else {
      // Flatten the joined data for the interface
      const enrichedBookings = (data || []).map((b: any) => ({
        ...b,
        space_lat: b.parking_spaces?.lat,
        space_lng: b.parking_spaces?.lng
      }));
      const bookingsData = enrichedBookings || [];

      setBookings(bookingsData);

      const spaceIds = bookingsData.map(
        (b: any) => b.space_id
      );

      if (!spaceIds.length) return;

      const { data: titleUpdates } = await supabase
        .from("parking_space_update_requests")
        .select(`
          space_id,
          old_value,
          new_value,
          created_at
        `)
        .eq("field", "title")
        .in("status", ["APPROVED", "PENDING"])
        .in("space_id", spaceIds)
        .order("created_at", {
          ascending: false
        });

      const latestMap: Record<string, any> = {};

      titleUpdates?.forEach((update) => {

        if (!latestMap[update.space_id]) {
          latestMap[update.space_id] = update;
        }

      });

      setLatestTitleUpdates(latestMap);
    }
    setLoading(false);
  }, [user]);

  const fetchReviews = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("reviews")
      .select("id, booking_id, rating, review_text")
      .eq("user_id", user.id)
    if (data) setReviews(data as Review[]);
  }, [user]);

  useEffect(() => {
    if (user) { fetchBookings(); fetchReviews(); }
  }, [user, fetchBookings, fetchReviews]);

  const handleConfirmReduce = () => {
    if (!reduceConfirmation) return;

    const { rescheduleDate, startTime, endTime } = reduceConfirmation;

    setRescheduleDate(rescheduleDate);
    setRescheduleStartTime(startTime);
    setReduceConfirmation(null);
    prepareRescheduleConfirmation(reduceConfirmation.booking, true);
  };

  const handleCancel = async (id: string) => {
    setCancelling(id);
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    setCancelling(null);
    if (error) toast.error("Failed to cancel booking");
    else {
      toast.success("Booking cancelled");
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
    }
  };

  const handleExtend = async (booking: Booking) => {
    const currentEnd = (booking.end_time || "23:59").slice(0, 5);
    const currentEndMinutes = toMinutes(currentEnd);
    const extensionMinutes =
      applyGraceExtension
        ? FREE_EXTENSION_MINUTES
        : extendMinutes;
    const extendEndTime = addMinutesToTime(currentEnd, extensionMinutes);
    const newEndMinutes = toMinutes(extendEndTime);

    if (newEndMinutes === currentEndMinutes) {
      toast.error("No changes detected. Please choose a different end time.");
      return;
    }
    if (newEndMinutes < currentEndMinutes) {
      toast.error("Moving end time backward is not allowed. Please cancel and create a new booking.");
      return;
    }

    // Check availability
    const { data: capacityCheck } = await supabase.rpc("check_parking_capacity", {
      p_space_id: booking.space_id,
      p_slot_id: booking.slot_id,
      p_vehicle_type: booking.vehicle_type,
      p_booking_date: booking.booking_date!,
      p_start_time: formatTimeForDB(booking.end_time!),
      p_end_time: formatTimeForDB(extendEndTime),
      p_exclude_booking_id: booking.id,
    });

    if (capacityCheck && !(capacityCheck as any).available) {
      toast.error("Selected time slot is already booked. Please choose another slot or vacate on time.");
      return;
    }

    // Get pricing
    const { data: space } = await supabase
      .from("parking_spaces")
      .select("price_per_hour")
      .eq("id", booking.space_id)
      .single();

    if (!space) {
      toast.error("Failed to fetch pricing");
      return;
    }

    const proposedDurationMinutes =
      booking.duration_minutes +
      (toMinutes(extendEndTime) - toMinutes(booking.end_time ?? booking.start_time ?? "00:00"));
    const pricing = calculatePricingForDuration({
      booking,
      pricePerHour: space.price_per_hour,
      proposedDurationMinutes,
    });

    if (pricing.extraFromCurrent <= 0) {
      toast.error("You can only extend duration. Reducing time is not allowed.");
      return;
    }

    const newTotalPrice = booking.total_price + pricing.extraCost;

    setRescheduleConfirmation({
      bookingId: booking.id,
      extraMinutes: Math.max(0, pricing.extraFromCurrent),
      extraCost: pricing.extraCost,
      newTotalPrice,
      canUseFreeExtension: pricing.canUseFreeExtension,
      pricePerHour: space.price_per_hour,
      rescheduleDate: parseISO(booking.booking_date!),
      rescheduleStartTime: booking.start_time!,
      rescheduleEndTime: extendEndTime,
      isPaidExtension: pricing.extraCost > 0,
      freeMinutesApplied: pricing.freeMinutesApplied,
      nextFreeExtensionMinutesUsed: pricing.nextFreeExtensionMinutesUsed,
      nextHasUsedFreeExtension: pricing.nextHasUsedFreeExtension,
      type: "extend",
      parkingExtensionCost: pricing.parkingExtensionCost,
      platformFee: pricing.platformFee,
    });
  };

  const prepareRescheduleConfirmation = async (booking: Booking, skipReductionWarning = false) => {
    if (!rescheduleDate || !rescheduleStartTime || !rescheduleMinutes) {
      toast.error("Please fill all reschedule fields");
      return;
    }

    if (rescheduleMinutes <= 0) {
      toast.error("Invalid duration");
      return;
    }

    // BLOCK past date/time (FINAL GUARD)
    if (rescheduleDate && rescheduleStartTime) {
      const now = new Date();
      const [h, m] = rescheduleStartTime.split(":").map(Number);
      const selected = new Date(rescheduleDate);
      selected.setHours(h, m, 0, 0);

      if (selected < now) {
        toast.error("You cannot reschedule to a past time");
        return;
      }
    }

    const startMinutes = toMinutes(rescheduleStartTime);

    const proposedDurationMinutes =
      rescheduleMinutes;

    const computedEndTime =
      addMinutesToTime(
        rescheduleStartTime,
        rescheduleMinutes
      );

    const endMinutes =
      toMinutes(computedEndTime);

    const isSameAsCurrent =
      rescheduleStartTime === (booking.start_time || "").slice(0, 5) &&
      computedEndTime === (booking.end_time || "").slice(0, 5) &&
      format(rescheduleDate, "yyyy-MM-dd") === booking.booking_date;

    if (isSameAsCurrent) {
      toast.error("No changes detected. Please select different time.");
      return;
    }
    if (endMinutes <= startMinutes) {
      toast.error("End time must be after start time");
      return;
    }
    const currentDurationMinutes = booking.duration_minutes;

    if ((proposedDurationMinutes < currentDurationMinutes) && !skipReductionWarning) {
      setReduceConfirmation({
        booking,
        reducedMinutes: currentDurationMinutes - proposedDurationMinutes,
        newDuration: proposedDurationMinutes,
        rescheduleDate,
        startTime: rescheduleStartTime,
        endTime: computedEndTime,
      });
      return;
    }

    // Check capacity
    const { data: capacityCheck } = await supabase.rpc("check_parking_capacity", {
      p_space_id: booking.space_id,
      p_slot_id: booking.slot_id,
      p_vehicle_type: booking.vehicle_type,
      p_booking_date: format(rescheduleDate, "yyyy-MM-dd"),
      p_start_time: formatTimeForDB(rescheduleStartTime),
      p_end_time: formatTimeForDB(computedEndTime),
      p_exclude_booking_id: booking.id,
    });

    if (!capacityCheck || !(capacityCheck as any).available) {
      toast.error("Selected slot is already booked. Please choose a different slot.");
      return;
    }

    // Get pricing
    const { data: space } = await supabase
      .from("parking_spaces")
      .select("price_per_hour")
      .eq("id", booking.space_id)
      .single();

    if (!space) {
      toast.error("Failed to fetch pricing");
      return;
    }

    let pricing;

    if (proposedDurationMinutes === booking.duration_minutes) {
      pricing = {
        extraFromCurrent: 0,
        extraCost: 0,
        newTotalPrice: booking.total_price,
        canUseFreeExtension: false,
        freeMinutesApplied: 0,
        nextFreeExtensionMinutesUsed: 0,
        nextHasUsedFreeExtension:
          booking.has_used_free_extension
      };
    }
    else {
      pricing = calculatePricingForDuration({
        booking,
        pricePerHour: space.price_per_hour,
        proposedDurationMinutes,
      });
    }

    const newTotalPrice = booking.total_price + pricing.extraCost;
    const isPaidExtension = pricing.extraCost > 0;

    setRescheduleConfirmation({
      bookingId: booking.id,
      extraMinutes: Math.max(0, pricing.extraFromCurrent),
      extraCost: pricing.extraCost,
      newTotalPrice,
      canUseFreeExtension: pricing.canUseFreeExtension,
      pricePerHour: space.price_per_hour,
      rescheduleDate,
      rescheduleStartTime,
      rescheduleEndTime: computedEndTime,
      isPaidExtension,
      freeMinutesApplied: pricing.freeMinutesApplied,
      nextFreeExtensionMinutesUsed: pricing.nextFreeExtensionMinutesUsed,
      nextHasUsedFreeExtension: pricing.nextHasUsedFreeExtension,
      type: "reschedule",
      parkingExtensionCost: pricing.parkingExtensionCost,
      platformFee: pricing.platformFee,
    });
  };

  const handleReschedulePayment = async (confirmation: ExtensionConfirmation, booking: Booking) => {
    const [sh, sm] = confirmation.rescheduleStartTime.split(":").map(Number);
    const [eh, em] = confirmation.rescheduleEndTime.split(":").map(Number);
    const newDurationMinutes = eh * 60 + em - sh * 60 - sm;

    try {
      const [loaded, orderResponse] = await Promise.all([
        loadRazorpayScript(),
        supabase.functions.invoke("create-razorpay-order", {
          body: {
            amount: confirmation.extraCost,
            currency: "INR",
            receipt: `${confirmation.type}_${booking.id}_${Date.now().toString(36)}`.substring(0, 40),
            notes: {
              booking_id: booking.id,
              space_id: booking.space_id,
              user_id: user?.id,
            },
          },
        }),
      ]);

      const orderData = orderResponse.data;
      const orderError = orderResponse.error;

      if (orderError || !orderData?.order_id) {
        throw new Error(orderData?.error || "Failed to create payment order");
      }

      const options = {
        key: orderData.key_id,
        amount: confirmation.extraCost * 100,
        currency: "INR",
        name: "Park Mitra",
        description: `Parking ${confirmation.type}: ${booking.space_title}`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            // Prepare booking data based on type
            const bookingData: any = {
              booking_id: booking.id,
              space_id: booking.space_id,
              space_title: booking.space_title,
              space_address: booking.space_address,
              space_city: booking.space_city,
              duration_minutes: newDurationMinutes,
              total_price: confirmation.newTotalPrice,
              vehicle_type: booking.vehicle_type,
              vehicle_id: booking.vehicle_id || null,
              slot_id: booking.slot_id || null,
              has_used_free_extension: confirmation.nextHasUsedFreeExtension,
              free_extension_minutes_used: confirmation.nextFreeExtensionMinutesUsed,
            };

            if (confirmation.type === "reschedule") {
              bookingData.booking_date = format(confirmation.rescheduleDate, "yyyy-MM-dd");
              bookingData.start_time = confirmation.rescheduleStartTime;
              bookingData.end_time = confirmation.rescheduleEndTime;
            } else {
              // extend
              bookingData.booking_date = booking.booking_date;
              bookingData.start_time = booking.start_time;
              bookingData.end_time = confirmation.rescheduleEndTime;
            }

            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                booking_data: bookingData,
              },
            });

            if (verifyError || !verifyData?.success) {
              toast.error("Payment verification failed. Contact support.");
            } else {
              toast.success(`Booking ${confirmation.type === "extend" ? "extended" : "rescheduled"} successfully!`);
              setReschedulingId(null);
              setRescheduleConfirmation(null);
              setRescheduleDate(undefined);
              setRescheduleStartTime("");
              setExtendingId(null);
              setExtendMinutes(15);
              setApplyGraceExtension(false);
              fetchBookings();
            }
          } catch {
            toast.error("Something went wrong verifying payment.");
          }
          setRescheduleLoading(false);
        },
        prefill: { email: user?.email },
        theme: { color: "#2a9d7c" },
        modal: { ondismiss: () => setRescheduleLoading(false) },
      };

      setRescheduleConfirmation(null);
      setReschedulingId(null);
      setExtendingId(null);

      document.body.style.pointerEvents = "auto";

      setTimeout(() => {
        requestAnimationFrame(() => {
          new (window as any).Razorpay(options).open();
        });
      }, 150);
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
      setRescheduleLoading(false);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleConfirmation) return;
    setRescheduleLoading(true);

    const booking = bookings.find(b => b.id === rescheduleConfirmation.bookingId);
    if (!booking) {
      setRescheduleLoading(false);
      return;
    }

    if (applyGraceExtension && rescheduleConfirmation.extraMinutes >= 30) {
      const adjustedMinutes =
        Math.max(
          0,
          rescheduleConfirmation.extraMinutes
          - FREE_EXTENSION_MINUTES
        );

      const adjustedParkingCost = Math.ceil((adjustedMinutes * rescheduleConfirmation.pricePerHour) / 60);
      const adjustedPlatformFee = Math.round(adjustedParkingCost * PLATFORM_FEE_PERCENTAGE);
      rescheduleConfirmation.extraCost = adjustedParkingCost + adjustedPlatformFee;
      rescheduleConfirmation.newTotalPrice = booking.total_price + rescheduleConfirmation.extraCost;
      rescheduleConfirmation.nextHasUsedFreeExtension = true;
      rescheduleConfirmation.nextFreeExtensionMinutesUsed = 10;
    }

    if (rescheduleConfirmation.isPaidExtension && rescheduleConfirmation.extraCost > 0) {
      await handleReschedulePayment(rescheduleConfirmation, booking);
      return;
    }

    const [sh, sm] = rescheduleConfirmation.rescheduleStartTime.split(":").map(Number);
    const [eh, em] = rescheduleConfirmation.rescheduleEndTime.split(":").map(Number);
    const newDurationMinutes = eh * 60 + em - sh * 60 - sm;

    // Prepare update data based on type
    const updateData: any = {
      duration_minutes: newDurationMinutes,
      total_price: rescheduleConfirmation.newTotalPrice,
      has_used_free_extension: rescheduleConfirmation.nextHasUsedFreeExtension,
      free_extension_minutes_used: rescheduleConfirmation.nextFreeExtensionMinutesUsed,
    };

    if (rescheduleConfirmation.type === "reschedule") {
      updateData.booking_date = format(rescheduleConfirmation.rescheduleDate, "yyyy-MM-dd");
      updateData.start_time = rescheduleConfirmation.rescheduleStartTime;
      updateData.end_time = rescheduleConfirmation.rescheduleEndTime;
    } else {
      // extend only updates end_time
      updateData.end_time = rescheduleConfirmation.rescheduleEndTime;
    }

    const { data, error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", rescheduleConfirmation.bookingId)
      .select();

    setRescheduleLoading(false);

    if (error || !data || data.length === 0) {
      toast.error(`Failed to ${rescheduleConfirmation.type} booking`);
      console.error(error);
    } else {
      toast.success(`Booking ${rescheduleConfirmation.type === "extend" ? "extended" : "rescheduled"} successfully!`);

      setReschedulingId(null);
      setRescheduleConfirmation(null);
      setRescheduleDate(undefined);
      setRescheduleStartTime("");
      setExtendingId(null);
      setExtendMinutes(15);
      setApplyGraceExtension(false);

      fetchBookings();
    }
  };

  const handleSubmitReview = async (booking: Booking, existingReviewId?: string) => {
    if (!user || reviewRating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setSubmittingReview(true);

    const reviewData = {
      user_id: user.id,
      booking_id: booking.id,
      space_id: booking.space_id,
      rating: reviewRating,
      review_text: reviewText || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (existingReviewId) {
      const { error: updateError } = await supabase
        .from("reviews")
        .update(reviewData)
        .eq("id", existingReviewId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("reviews")
        .insert(reviewData);
      error = insertError;
    }

    setSubmittingReview(false);
    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") {
        toast.error("You've already reviewed this booking");
      } else {
        toast.error("Failed to submit review");
      }
    } else {
      toast.success(existingReviewId ? "Review updated! ⭐" : "Review submitted! ⭐");
      setReviewingId(null);
      setReviewRating(0);
      setReviewText("");
      fetchReviews();
    }
  };

  const reviewsByBooking = useMemo(() => {
    const map = new Map<string, Review>();

    reviews.forEach(review => {
      map.set(review.booking_id, review);
    });

    return map;
  }, [reviews]);

  const enrichedBookings = useMemo(
    () =>
      bookings.map(b => ({
        ...b,
        computedStatus: computeStatus(b),
        hasReview: reviewsByBooking.has(b.id)
      })),
    [bookings, reviewsByBooking]
  );

  const activeBookings = useMemo(
    () =>
      enrichedBookings.filter(
        b =>
          b.computedStatus === "upcoming" ||
          b.computedStatus === "active"
      ),
    [enrichedBookings]
  );

  const historyBookings = useMemo(
    () =>
      enrichedBookings.filter(
        b =>
          b.computedStatus === "completed" ||
          b.computedStatus === "cancelled"
      ),
    [enrichedBookings]
  );

  const filteredHistory = useMemo(
    () => historyFilter === "all"
      ? historyBookings
      : historyBookings.filter(
        b =>
          b.computedStatus === historyFilter
      ),
    [historyBookings, historyFilter]
  );

  const getDisplayLocation = (booking: Booking & { computedStatus: string }) => {
    if (
      booking.computedStatus === "completed" ||
      booking.computedStatus === "cancelled"
    ) {
      return `Previously parked in ${booking.space_city}`;
    }
    return `${booking.space_address}, ${booking.space_city}`;
  };

  const openDirections = (
    lat: number,
    lng: number
  ) => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${lat},${lng}`,
      "_blank"
    );
  };

  const renderBookingCard = (booking: (typeof enrichedBookings)[0], showActions: boolean) => {
    const cfg = statusConfig[booking.computedStatus];
    const cancelledBooking = booking.status === "cancelled";

    return (
      <div key={booking.id} className={`bg-card rounded-2xl p-6 card-shadow flex flex-col gap-4 ${booking.computedStatus === "active" ? "ring-2 ring-green-500/30" : ""}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-display font-bold text-foreground text-lg">
                {
                  getLatestDisplayValue({
                    currentValue:
                      latestTitleUpdates[
                        booking.space_id
                      ]?.new_value ||
                      booking.space_title,

                    previousValue:
                      latestTitleUpdates[
                        booking.space_id
                      ]?.old_value
                  })
                }
              </h3>
              <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
              {booking.vehicle_type && <Badge variant="secondary" className="capitalize text-xs">{booking.vehicle_type}</Badge>}
              {canExtendBooking(booking) && !cancelledBooking && (booking.has_used_free_extension ? (
                <Badge className="bg-yellow-500/20 text-yellow-700 text-xs">
                  Grace Used
                </Badge>
              ) : (
                <Badge className="bg-green-500/20 text-green-700 text-xs">
                  Grace Available
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {getDisplayLocation(booking)}</span>
              {booking.booking_date && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(parseISO(booking.booking_date), "MMM d, yyyy")}</span>}
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {displayTime(booking.start_time)} – {displayTime(booking.end_time)}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {Math.floor(booking.duration_minutes / 60)}h {booking.duration_minutes % 60}m</span>
            </div>
            {booking.computedStatus === "completed" && (
              <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                🔒 Exact parking access details hidden after booking completion.
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-lg font-bold text-foreground">₹{booking.total_price}</span>
            {(booking.computedStatus === "active" || booking.computedStatus === "upcoming") && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => openDirections(booking.space_lat!, booking.space_lng!)}
              >
                <Navigation className="w-3.5 h-3.5" />
                Navigate
              </Button>
            )}
            {showActions && booking.computedStatus === "upcoming" && booking.duration_minutes < 1440 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    setReschedulingId(booking.id);
                    setRescheduleDate(parseISO(booking.booking_date!));
                    setRescheduleStartTime(booking.start_time?.slice(0, 5) || "");
                    setRescheduleMinutes(booking.duration_minutes);
                  }}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reschedule
                </Button>
                <Button variant="destructive" size="sm" disabled={cancelling === booking.id} onClick={() => handleCancel(booking.id)}>
                  {cancelling === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span className="ml-1">Cancel</span>
                </Button>
              </>
            )}
            {showActions && booking.computedStatus === "active" && canExtendBooking(booking) && (
              <Button variant="outline" size="sm" className="gap-1"
                onClick={() => { setExtendingId(booking.id); setExtendMinutes(15); setApplyGraceExtension(false); setExtendLoading(false); }}>
                <TimerReset className="w-3.5 h-3.5" /> Extend
              </Button>
            )}
          </div>
        </div>

        {/* Completed Booking Actions */}
        {booking.computedStatus === "completed" && (
          <div className="border-t border-border pt-4 flex flex-wrap gap-3 items-center">

            <Button
              variant="secondary"
              size="sm"
              className="rounded-full"
              onClick={() => navigate(`/space/db_${booking.space_id}`)}
            >
              Book Again
            </Button>

            {reviewingId === booking.id ? (
              <div className="w-full mt-4 p-5 bg-muted/40 rounded-2xl border border-primary/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">How was your parking experience?</h4>
                  <StarRating
                    rating={reviewRating}
                    onChange={setReviewRating}
                  />
                </div>

                <Textarea
                  placeholder="Share your experience (optional)"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="bg-background/50 border-primary/10 focus-visible:ring-primary/20"
                  rows={3}
                />

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="rounded-full px-5"
                    disabled={submittingReview || reviewRating === 0}
                    onClick={() => {
                      const existing = reviewsByBooking.get(booking.id);
                      handleSubmitReview(booking, existing?.id);
                    }}
                  >
                    {submittingReview ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Star className="w-4 h-4 mr-2 fill-current" />
                    )}
                    {reviewsByBooking.has(booking.id) ? "Update Review" : "Submit Review"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full px-5"
                    onClick={() => {
                      setReviewingId(null);
                      setReviewRating(0);
                      setReviewText("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {!booking.hasReview ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-2 border-primary/20 hover:bg-primary/5 transition-colors"
                    onClick={() => {
                      setReviewingId(booking.id);
                      setReviewRating(0);
                      setReviewText("");
                    }}
                  >
                    <Star className="w-4 h-4" />
                    Leave Review
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full gap-2 text-primary hover:bg-primary/5"
                    onClick={() => {
                      const review = reviewsByBooking.get(booking.id);
                      if (review) {
                        setReviewingId(booking.id);
                        setReviewRating(review.rating);
                        setReviewText(review.review_text || "");
                      }
                    }}
                  >
                    <Star className="w-4 h-4 fill-primary" />
                    Edit Review
                  </Button>
                )}
              </>
            )}

            {/* Display submitted review snippet */}
            {booking.hasReview && reviewingId !== booking.id && (
              <div className="w-full mt-2 p-3 bg-muted/20 rounded-xl flex gap-3 items-start border border-border/50">
                <div className="flex gap-0.5 mt-0.5">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs font-bold">{reviewsByBooking.get(booking.id)?.rating}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 italic">
                  "{reviewsByBooking.get(booking.id)?.review_text || "No comments provided."}"
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="pt-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    );
  }

  const extendBooking = bookings.find(b => b.id === extendingId);
  const rescheduleBooking = bookings.find(b => b.id === reschedulingId);

  return (
    <div className="min-h-screen bg-background">
      <div>
        <div className="container mx-auto px-4">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8">My Bookings</h1>

          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="active">Active ({activeBookings.length})</TabsTrigger>
              <TabsTrigger value="history">History ({historyBookings.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {activeBookings.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg mb-4">No active bookings.</p>
                  <Button onClick={() => navigate("/search")}>Find Parking</Button>
                </div>
              ) : (
                <div className="space-y-4">{activeBookings.map(b => renderBookingCard(b, true))}</div>
              )}
            </TabsContent>

            <TabsContent value="history">
              <div className="flex items-center gap-3 mb-4">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={historyFilter} onValueChange={v => setHistoryFilter(v as any)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filteredHistory.length === 0 ? (
                <div className="text-center py-16"><p className="text-muted-foreground text-lg">No booking history yet.</p></div>
              ) : (
                <div className="space-y-4">{filteredHistory.map(b => renderBookingCard(b, false))}</div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Extend Dialog */}
      <Dialog open={!!extendingId} onOpenChange={(open) => { if (!open) { setExtendingId(null); setExtendMinutes(15); setApplyGraceExtension(false); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Extend Parking Time</DialogTitle></DialogHeader>
          <ActionNote type="extend" />
          {extendBooking && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Current end time: <strong>{extendBooking.end_time?.slice(0, 5)}</strong></p>
              <div>
                <label className="text-sm font-medium block mb-1">New End Time</label>
                <div className="flex items-center justify-between border rounded-xl p-3">

                  <button
                    type="button"
                    onClick={() => {
                      if (canDecreaseExtension()) {
                        setExtendMinutes(v => v - EXTEND_STEP);
                      }
                    }}
                    disabled={!canDecreaseExtension()}
                    className={cn(
                      "w-10 h-10 rounded-full border",
                      !canDecreaseExtension() &&
                      "opacity-40 cursor-not-allowed"
                    )}
                  >
                    -
                  </button>

                  <div className="text-center">
                    <p className="font-semibold">
                      +{extendMinutes} mins
                    </p>

                    <p className="text-xs text-muted-foreground">
                      New End Time:
                      {" "}
                      {addMinutesToTime(
                        extendBooking.end_time?.slice(0, 5) || "00:00",
                        extendMinutes
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => canIncreaseExtension(extendBooking) &&
                      setExtendMinutes(v => v + EXTEND_STEP)
                    }
                    disabled={!canIncreaseExtension(extendBooking)}
                    className={cn(
                      "w-10 h-10 rounded-full border",
                      !canIncreaseExtension(extendBooking) &&
                      "opacity-40 cursor-not-allowed"
                    )}
                  >
                    +
                  </button>
                </div>

                <p className="text-xs text-muted-foreground">
                  • Extension allowed only in 15 minute increments
                  • Original booking duration cannot be reduced
                </p>
                <p className="text-xs text-muted-foreground">
                  • Extensions are charged based on selected extra duration
                </p>
                <p className="text-xs text-muted-foreground">
                  • 10 minute grace discount available on 30+ minute extensions
                </p>
              </div>
              <div className="flex gap-2">
                <Button disabled={extendLoading || !extendBooking} onClick={() => handleExtend(extendBooking)}>
                  {extendLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</> : "Check Price & Availability"}
                </Button>
                <Button variant="ghost" onClick={() => { setExtendingId(null); setExtendMinutes(15); setApplyGraceExtension(false); }}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog
        open={!!reschedulingId && !rescheduleConfirmation}
        onOpenChange={(open) => {
          if (!open) {
            setReschedulingId(null);
            setRescheduleDate(
              rescheduleBooking
                ? parseISO(rescheduleBooking.booking_date!)
                : undefined
            );
            setRescheduleStartTime("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Booking</DialogTitle>
          </DialogHeader>

          <ActionNote type="reschedule" />

          <div className="space-y-4">

            <div>
              <label className="text-sm font-medium block mb-1">
                Booking Date
              </label>

              <Input
                type="date"
                value={
                  rescheduleDate
                    ? format(rescheduleDate, "yyyy-MM-dd")
                    : ""
                }
                min={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => handleRescheduleDateChange(e.target.value)}
              />

              <p className="text-xs text-muted-foreground mt-1">
                Select same or future date
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">
                  Start Time
                </label>

                <Input
                  type="time"
                  value={rescheduleStartTime}
                  min={
                    isTodaySelected(rescheduleDate)
                      ? getCurrentTime()
                      : undefined
                  }
                  onChange={(e) => handleRescheduleTimeChange(e.target.value)}
                />
              </div>


              <div>
                <label className="text-sm font-medium block mb-1">
                  End Time
                </label>

                <Input
                  readOnly
                  value={
                    addMinutesToTime(
                      rescheduleStartTime,
                      rescheduleMinutes
                    )
                  }
                  className="bg-muted cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">
                Duration
              </label>

              <div className="flex items-center justify-between border rounded-xl p-3">

                <button
                  type="button"
                  onClick={() => {
                    if (canDecreaseReschedule()) {
                      setRescheduleMinutes(v => v - EXTEND_STEP)
                    }
                  }}
                  disabled={!canDecreaseReschedule()}
                  className={cn(
                    "w-10 h-10 rounded-full border",
                    !canDecreaseReschedule() &&
                    "opacity-40 cursor-not-allowed"
                  )}
                >
                  -
                </button>

                <div className="text-center">
                  <p> {rescheduleMinutes} mins </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (canIncreaseReschedule(rescheduleStartTime)) {
                      setRescheduleMinutes(v => v + EXTEND_STEP)
                    }
                  }}
                >
                  +
                </button>

              </div>
            </div>


            <div className="flex gap-2">
              <Button onClick={() => setShouldCheckReschedule(true)}>
                Check Price & Availability
              </Button>

              <Button
                variant="ghost"
                onClick={() => { setReschedulingId(null) }}
              >
                Cancel
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Confirmation Modal */}
      {rescheduleConfirmation && (
        <RescheduleConfirmationModal
          confirmation={rescheduleConfirmation}
          onConfirm={handleConfirmReschedule}
          onCancel={() => setRescheduleConfirmation(null)}
          loading={rescheduleLoading}
          applyGraceExtension={applyGraceExtension}
          setApplyGraceExtension={setApplyGraceExtension}
        />
      )}

      {/* Reduce Confirmation Modal */}
      {reduceConfirmation && (
        <ReduceTimeConfirmationModal
          data={reduceConfirmation}
          onConfirm={handleConfirmReduce}
          onCancel={() => setReduceConfirmation(null)}
        />
      )}

    </div>
  );
};

export default MyBookingsPage;
