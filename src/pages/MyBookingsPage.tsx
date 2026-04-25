import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, MapPin, Trash2, Loader2, Star, Filter, CalendarIcon, RefreshCw, TimerReset, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

interface Booking {
  id: string;
  space_id: string;
  space_title: string;
  space_address: string;
  space_city: string;
  hours: number;
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
  type: "extend" | "reschedule"; // distinguish between extend and reschedule
}

type RescheduleConfirmation = ExtensionConfirmation; // backward compatibility

type ComputedStatus = "upcoming" | "active" | "completed" | "cancelled";

const GRACE_MINUTES = 15;

// Shared pricing calculation for extensions/rescheduling
const calculateExtensionCost = (
  extraMinutes: number,
  pricePerHour: number,
  hasUsedFreeExtension: boolean
): { cost: number; isFree: boolean } => {
  if (extraMinutes <= 0) return { cost: 0, isFree: true };
  
  const canUseFreeGrace = !hasUsedFreeExtension && extraMinutes <= GRACE_MINUTES;
  if (canUseFreeGrace) return { cost: 0, isFree: true };
  
  const extraHours = Math.ceil(extraMinutes / 60);
  return { cost: extraHours * pricePerHour, isFree: false };
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
    endDt.setTime(startDt.getTime() + booking.hours * 60 * 60 * 1000);
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

const RescheduleConfirmationModal = ({ confirmation, onConfirm, onCancel, loading }: { confirmation: ExtensionConfirmation; onConfirm: () => void; onCancel: () => void; loading: boolean }) => (
  <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
    <DialogContent className="max-w-md pointer-events-auto">
      <DialogHeader>
        <DialogTitle>{confirmation.type === "extend" ? "Extend Booking" : "Reschedule Booking"} - Price Summary</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4">
        {/* Original Booking Info */}
        <div className="bg-muted p-3 rounded-lg space-y-2">
          <p className="text-sm font-medium text-foreground">Current Booking</p>
          <p className="text-xs text-muted-foreground">Date: {format(new Date(confirmation.rescheduleDate), "MMM d, yyyy")}</p>
          <p className="text-xs text-muted-foreground">Time: {confirmation.rescheduleStartTime} - {confirmation.rescheduleEndTime}</p>
        </div>

        {/* Duration Change */}
        <div className="border-l-2 border-blue-500 pl-3 space-y-1">
          <p className="text-sm font-medium text-foreground">Duration Change</p>
          <p className="text-xs text-muted-foreground">Extra time: <span className="font-semibold">{confirmation.extraMinutes} minutes</span></p>
        </div>

        {/* Pricing Breakdown */}
        {confirmation.extraMinutes <= 0 ? (
          <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg flex gap-2">
            <AlertCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-600">No Extra Charge</p>
              <p className="text-xs text-green-600/80">No additional payment required. Your booking will be updated.</p>
            </div>
          </div>
        ) : confirmation.extraMinutes <= GRACE_MINUTES ? (
          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg space-y-2">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-600">
                  {confirmation.canUseFreeExtension 
                      ? "✓ Free Extension Available"
                      : "⚠ Charges will apply"}
                </p>
                <p className="text-xs text-blue-600/80">
                  {confirmation.canUseFreeExtension 
                    ? `You can extend up to ${GRACE_MINUTES} mins for free (one-time).`
                    : `You've already used your free extension. Charges will apply.`}
                </p>
              </div>
            </div>
            
            {!confirmation.canUseFreeExtension && (
              <div className="mt-3 pt-3 border-t border-blue-500/20">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Paid extension charge:</span>
                  <span className="font-semibold">₹{confirmation.extraCost}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg space-y-2">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-600">Paid Extension</p>
                <p className="text-xs text-yellow-600/80">Extra {confirmation.extraMinutes} minutes requires additional payment.</p>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-yellow-500/20 space-y-1">
              <div className="flex justify-between text-xs">
                <span>Original paid amount:</span>
                <span className="font-semibold">₹{confirmation.newTotalPrice - confirmation.extraCost}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Extra minutes ({Math.ceil(confirmation.extraMinutes / 60)}h @ ₹{confirmation.pricePerHour}/h):</span>
                <span className="font-semibold text-yellow-600">+ ₹{confirmation.extraCost}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-yellow-500/20 pt-2 mt-2">
                <span>New total:</span>
                <span className="text-yellow-600">₹{confirmation.newTotalPrice}</span>
              </div>
            </div>
          </div>
        )}

        {/* Final Price */}
        <div className="bg-card border border-border p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-lg font-display font-bold">Final Amount:</span>
            <span className="text-2xl font-bold text-primary">₹{confirmation.newTotalPrice}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
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
            ) : confirmation.isPaidExtension ? (
              "Confirm & Pay"
            ) : (
              "Confirm"
            )}
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
  const [extendEndTime, setExtendEndTime] = useState("");
  const [extendLoading, setExtendLoading] = useState(false);

  // Reschedule state
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleStartTime, setRescheduleStartTime] = useState("");
  const [rescheduleEndTime, setRescheduleEndTime] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleConfirmation, setRescheduleConfirmation] = useState<RescheduleConfirmation | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load bookings");
    else setBookings((data as Booking[]) || []);
    setLoading(false);
  }, [user]);

  const fetchReviews = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("reviews")
      .select("id, booking_id, rating, review_text")
      .eq("user_id", user.id);
    if (data) setReviews(data as Review[]);
  }, [user]);

  useEffect(() => {
    if (user) { fetchBookings(); fetchReviews(); }
  }, [user, fetchBookings, fetchReviews]);

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
    if (!extendEndTime) { toast.error("Please select a new end time"); return; }
    
    const [oeh, oem] = (booking.end_time || "23:59").split(":").map(Number);
    const [neh, nem] = extendEndTime.split(":").map(Number);
    const extraMinutes = Math.max(0, neh * 60 + nem - oeh * 60 - oem);

    if (extraMinutes <= 0) {
      toast.error("New end time must be after current end time");
      return;
    }

    // Check availability
    const { data: capacityCheck } = await supabase.rpc("check_parking_capacity", {
      p_space_id: booking.space_id,
      p_vehicle_type: booking.vehicle_type,
      p_booking_date: booking.booking_date!,
      p_start_time: booking.end_time!,
      p_end_time: extendEndTime,
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

    // Calculate cost using shared logic
    const { cost: extraCost, isFree } = calculateExtensionCost(
      extraMinutes,
      space.price_per_hour,
      booking.has_used_free_extension
    );

    const newHours = booking.hours + Math.ceil(extraMinutes / 60);
    const newTotalPrice = booking.total_price + extraCost;

    setRescheduleConfirmation({
      bookingId: booking.id,
      extraMinutes,
      extraCost,
      newTotalPrice,
      canUseFreeExtension: !booking.has_used_free_extension && extraMinutes <= GRACE_MINUTES,
      pricePerHour: space.price_per_hour,
      rescheduleDate: parseISO(booking.booking_date!),
      rescheduleStartTime: booking.start_time!,
      rescheduleEndTime: extendEndTime,
      isPaidExtension: extraCost > 0,
      type: "extend",
    });
  };

  const prepareRescheduleConfirmation = async (booking: Booking) => {
    if (!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime) {
      toast.error("Please fill all reschedule fields");
      return;
    }

    const [sh, sm] = rescheduleStartTime.split(":").map(Number);
    const [eh, em] = rescheduleEndTime.split(":").map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    if (endMinutes <= startMinutes) {
      toast.error("End time must be after start time");
      return;
    }

    // Calculate new duration
    const newDurationMinutes = endMinutes - startMinutes;

    const currentDurationMinutes =
      (parseInt(booking.end_time!.split(":")[0]) * 60 +
      parseInt(booking.end_time!.split(":")[1])) -
      (parseInt(booking.start_time!.split(":")[0]) * 60 +
      parseInt(booking.start_time!.split(":")[1]));

    const extraMinutes = newDurationMinutes - currentDurationMinutes;
    
    // Check capacity
    const { data: capacityCheck } = await supabase.rpc("check_parking_capacity", {
      p_space_id: booking.space_id,
      p_vehicle_type: booking.vehicle_type,
      p_booking_date: format(rescheduleDate, "yyyy-MM-dd"),
      p_start_time: rescheduleStartTime,
      p_end_time: rescheduleEndTime,
      p_exclude_booking_id: booking.id,
    });

    if (capacityCheck && !(capacityCheck as any).available) {
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

    // Calculate cost using shared logic
    const { cost: extraCost } = calculateExtensionCost(
      extraMinutes,
      space.price_per_hour,
      booking.has_used_free_extension
    );

    const newTotalPrice = extraMinutes > 0
      ? booking.total_price + extraCost
      : booking.total_price;
    const isPaidExtension = extraCost > 0;

    setRescheduleConfirmation({
      bookingId: booking.id,
      extraMinutes,
      extraCost,
      newTotalPrice,
      canUseFreeExtension: !booking.has_used_free_extension && extraMinutes > 0 && extraMinutes <= GRACE_MINUTES,
      pricePerHour: space.price_per_hour,
      rescheduleDate,
      rescheduleStartTime,
      rescheduleEndTime,
      isPaidExtension,
      type: "reschedule",
    });
  };

  const handleReschedulePayment = async (confirmation: ExtensionConfirmation, booking: Booking) => {
    const [sh, sm] = confirmation.rescheduleStartTime.split(":").map(Number);
    const [eh, em] = confirmation.rescheduleEndTime.split(":").map(Number);
    const newDurationMinutes = eh * 60 + em - sh * 60 - sm;
    const hours = Math.ceil(newDurationMinutes / 60);

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
              hours,
              total_price: confirmation.newTotalPrice,
              vehicle_type: booking.vehicle_type,
              vehicle_id: booking.vehicle_id || null,
              slot_id: booking.slot_id || null,
              has_used_free_extension:
                booking.has_used_free_extension ||
                (confirmation.extraMinutes > 0 && confirmation.extraMinutes <= GRACE_MINUTES),
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
              setRescheduleEndTime("");
              setExtendingId(null);
              setExtendEndTime("");
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

    if (rescheduleConfirmation.isPaidExtension && rescheduleConfirmation.extraCost > 0) {
      await handleReschedulePayment(rescheduleConfirmation, booking);
      return;
    }

    const [sh, sm] = rescheduleConfirmation.rescheduleStartTime.split(":").map(Number);
    const [eh, em] = rescheduleConfirmation.rescheduleEndTime.split(":").map(Number);
    const newDurationMinutes = eh * 60 + em - sh * 60 - sm;
    const hours = Math.ceil(newDurationMinutes / 60);

    const usingFreeExtension =
      !booking.has_used_free_extension &&
      rescheduleConfirmation.extraMinutes > 0 &&
      rescheduleConfirmation.extraMinutes <= GRACE_MINUTES;

    // Prepare update data based on type
    const updateData: any = {
      hours,
      total_price: rescheduleConfirmation.newTotalPrice,
      has_used_free_extension: booking.has_used_free_extension || usingFreeExtension,
    };

    if (rescheduleConfirmation.type === "reschedule") {
      updateData.booking_date = format(rescheduleConfirmation.rescheduleDate, "yyyy-MM-dd");
      updateData.start_time = rescheduleConfirmation.rescheduleStartTime;
      updateData.end_time = rescheduleConfirmation.rescheduleEndTime;
    } else {
      // extend only updates end_time
      updateData.end_time = rescheduleConfirmation.rescheduleEndTime;
    }

    const { error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", rescheduleConfirmation.bookingId);

    setRescheduleLoading(false);

    if (error) {
      toast.error(`Failed to ${rescheduleConfirmation.type} booking`);
      console.error(error);
    } else {
      toast.success(`Booking ${rescheduleConfirmation.type === "extend" ? "extended" : "rescheduled"} successfully!`);
      setReschedulingId(null);
      setRescheduleConfirmation(null);
      setRescheduleDate(undefined);
      setRescheduleStartTime("");
      setRescheduleEndTime("");
      setExtendingId(null);
      setExtendEndTime("");
      fetchBookings();
    }
  };

  const handleSubmitReview = async (booking: Booking) => {
    if (!user || reviewRating === 0) { toast.error("Please select a rating"); return; }
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert({
      user_id: user.id,
      booking_id: booking.id,
      space_id: booking.space_id,
      rating: reviewRating,
      review_text: reviewText || null,
    });
    setSubmittingReview(false);
    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") toast.error("You've already reviewed this booking");
      else toast.error("Failed to submit review");
    } else {
      toast.success("Review submitted! ⭐");
      setReviewingId(null);
      setReviewRating(0);
      setReviewText("");
      fetchReviews();
    }
  };

  const enrichedBookings = useMemo(
    () => bookings.map(b => ({ ...b, computedStatus: computeStatus(b), hasReview: reviews.some(r => r.booking_id === b.id) })),
    [bookings, reviews]
  );

  const activeBookings = enrichedBookings.filter(b => b.computedStatus === "upcoming" || b.computedStatus === "active");
  const historyBookings = enrichedBookings.filter(b => b.computedStatus === "completed" || b.computedStatus === "cancelled");
  const filteredHistory = historyFilter === "all" ? historyBookings : historyBookings.filter(b => b.computedStatus === historyFilter);

  const formatTime = (t: string | null) => (t ? t.slice(0, 5) : "--:--");

  const renderBookingCard = (booking: (typeof enrichedBookings)[0], showActions: boolean) => {
    const cfg = statusConfig[booking.computedStatus];
    return (
      <div key={booking.id} className={`bg-card rounded-2xl p-6 card-shadow flex flex-col gap-4 ${booking.computedStatus === "active" ? "ring-2 ring-green-500/30" : ""}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-display font-bold text-foreground text-lg">{booking.space_title}</h3>
              <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
              {booking.vehicle_type && <Badge variant="secondary" className="capitalize text-xs">{booking.vehicle_type}</Badge>}
              {booking.has_used_free_extension && <Badge className="bg-yellow-500/20 text-yellow-700 text-xs">Grace Used</Badge>}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {booking.space_address}, {booking.space_city}</span>
              {booking.booking_date && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(parseISO(booking.booking_date), "MMM d, yyyy")}</span>}
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatTime(booking.start_time)} – {formatTime(booking.end_time)}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {booking.hours} hr{booking.hours > 1 ? "s" : ""}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xl font-bold text-foreground">₹{booking.total_price}</span>
            {showActions && booking.computedStatus === "upcoming" && (
              <>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => { setReschedulingId(booking.id); setRescheduleStartTime(booking.start_time?.slice(0,5) || ""); setRescheduleEndTime(booking.end_time?.slice(0,5) || ""); setRescheduleLoading(false); }}>
                  <RefreshCw className="w-3.5 h-3.5" /> Reschedule
                </Button>
                <Button variant="destructive" size="sm" disabled={cancelling === booking.id} onClick={() => handleCancel(booking.id)}>
                  {cancelling === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span className="ml-1">Cancel</span>
                </Button>
              </>
            )}
            {showActions && booking.computedStatus === "active" && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => { setExtendingId(booking.id); setExtendEndTime(""); setExtendLoading(false); }}>
                <TimerReset className="w-3.5 h-3.5" /> Extend
              </Button>
            )}
          </div>
        </div>

        {/* Review section */}
        {booking.computedStatus === "completed" && !booking.hasReview && (
          <div className="border-t border-border pt-4">
            {reviewingId === booking.id ? (
              <div className="space-y-3">
                <StarRating rating={reviewRating} onChange={setReviewRating} />
                <Textarea placeholder="Share your experience (optional)" value={reviewText} onChange={e => setReviewText(e.target.value)} rows={2} />
                <div className="flex gap-2">
                  <Button size="sm" disabled={submittingReview || reviewRating === 0} onClick={() => handleSubmitReview(booking)}>
                    {submittingReview ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Submit Review
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setReviewingId(null); setReviewRating(0); setReviewText(""); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setReviewingId(booking.id)}>
                <Star className="w-4 h-4" /> Leave a Review
              </Button>
            )}
          </div>
        )}
        {booking.hasReview && (
          <div className="border-t border-border pt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> Review submitted
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
      <div className="pt-20 pb-16">
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
      <Dialog open={!!extendingId} onOpenChange={(open) => { if (!open) { setExtendingId(null); setExtendEndTime(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Extend Parking Time</DialogTitle></DialogHeader>
          {extendBooking && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Current end time: <strong>{extendBooking.end_time?.slice(0, 5)}</strong></p>
              <div>
                <label className="text-sm font-medium block mb-1">New End Time</label>
                <Input type="time" value={extendEndTime} onChange={e => setExtendEndTime(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button disabled={extendLoading} onClick={() => handleExtend(extendBooking)}>
                  {extendLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</> : "Review Changes"}
                </Button>
                <Button variant="ghost" onClick={() => { setExtendingId(null); setExtendEndTime(""); }}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={!!reschedulingId && !rescheduleConfirmation} onOpenChange={(open) => { if (!open) { setReschedulingId(null); setRescheduleDate(undefined); setRescheduleStartTime(""); setRescheduleEndTime(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reschedule Booking</DialogTitle></DialogHeader>
          {rescheduleBooking && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">New Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !rescheduleDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {rescheduleDate ? format(rescheduleDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarPicker mode="single" selected={rescheduleDate} onSelect={setRescheduleDate} disabled={d => d < new Date(new Date().setHours(0,0,0,0))} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium block mb-1">Start Time</label>
                  <Input type="time" value={rescheduleStartTime} onChange={e => setRescheduleStartTime(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">End Time</label>
                  <Input type="time" value={rescheduleEndTime} onChange={e => setRescheduleEndTime(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button disabled={rescheduleLoading} onClick={() => prepareRescheduleConfirmation(rescheduleBooking)}>
                  {rescheduleLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</> : "Review Changes"}
                </Button>
                <Button variant="ghost" onClick={() => { setReschedulingId(null); setRescheduleDate(undefined); setRescheduleStartTime(""); setRescheduleEndTime(""); }}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Confirmation Modal */}
      {rescheduleConfirmation && (
        <RescheduleConfirmationModal
          confirmation={rescheduleConfirmation}
          onConfirm={handleConfirmReschedule}
          onCancel={() => setRescheduleConfirmation(null)}
          loading={rescheduleLoading}
        />
      )}
    </div>
  );
};

export default MyBookingsPage;
