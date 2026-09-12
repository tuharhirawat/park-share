import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Filter } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReduceTimeConfirmationModal from "@/components/booking/ReduceTimeConfirmationModal";
import RescheduleConfirmationModal from "@/components/booking/RescheduleConfirmationModal";
import api from "@/services/api";
import RescheduleBookingDialog from "@/components/booking/RescheduleBookingDialog";
import BookingCard from "@/components/booking/BookingCard";
import CompletedBookingActions from "@/components/booking/CompletedBookingActions";
import { useRazorpayScript } from "@/hooks/useRazorpayScript";
import { openRazorpayCheckout } from "@/lib/razorpayCheckout";
import { RescheduleTimeSlot, ReviewDraft } from "@/viewTypes/bookingUi";
import { MAX_DAY_MINUTES } from "@/constants/bookingConstants";
import { clampDurationToStart, calculateGraceToggle } from "@/lib/bookingHelpers";
import {
  Booking,
  Review,
  RescheduleConfirmation,
} from "@/types/booking";
import {
  toMinutes,
  validatePastTime,
  addMinutesToTime,
  formatTimeForDB,
  getCurrentTime,
  isTodayInTimezone,
  getAppNow,
  getAppToday,
} from "@/lib/time";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MyBookingsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  useRazorpayScript();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>({
    bookingId: null,
    rating: 0,
    text: "",
  });

  const [submittingReview, setSubmittingReview] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "completed" | "cancelled">("all");

  // Reschedule state
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleConfirmation, setRescheduleConfirmation] = useState<RescheduleConfirmation | null>(null);
  const [rescheduleSlot, setRescheduleSlot] = useState<RescheduleTimeSlot>({
    date: undefined,
    startTime: "",
    minutes: 0,
  });
  const { date: rescheduleDate, startTime: rescheduleStartTime, minutes: rescheduleMinutes } = rescheduleSlot;

  const setRescheduleMinutes: React.Dispatch<React.SetStateAction<number>> = (value) => {
    setRescheduleSlot(slot => ({
      ...slot,
      minutes: typeof value === "function" ? (value as (prev: number) => number)(slot.minutes) : value,
    }));
  };
  
  const [reduceConfirmation, setReduceConfirmation] = useState<{
    booking: Booking;
    reducedMinutes: number;
    newDuration: number;
    rescheduleDate: Date;
    startTime: string;
    endTime: string;
  } | null>(null);

  const handleRescheduleDateChange = (value: string) => {
    if (!value) return;

    const pickedDate = parseISO(value);
    const today = getAppToday(rescheduleTimezone);

    const selectedDate = new Date(pickedDate);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast.error("Past dates are not allowed");

      setRescheduleSlot(slot => ({
        ...slot,
        date: getAppToday(rescheduleTimezone),
        startTime:
          !slot.startTime || !validatePastTime(slot.startTime, getAppToday(rescheduleTimezone), rescheduleTimezone)
            ? getCurrentTime(rescheduleTimezone)
            : slot.startTime,
      }));

      return;
    }

    setRescheduleSlot(slot => ({
      ...slot,
      date: pickedDate,
      startTime:
        isTodayInTimezone(pickedDate, rescheduleTimezone) && (!slot.startTime || !validatePastTime(slot.startTime, pickedDate, rescheduleTimezone))
          ? getCurrentTime(rescheduleTimezone)
          : slot.startTime,
    }));
  };

  const handleRescheduleTimeChange = (value: string) => {
    if (!validatePastTime(value, rescheduleDate, rescheduleTimezone)) {
      toast.error("Past time not allowed");
      return;
    }

    setRescheduleSlot(slot => ({
      ...slot,
      startTime: value,
      minutes: clampDurationToStart(value, slot.minutes),
    }));
  };

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      const response = await api.get("/Booking/GetMyBookings");

      setBookings(response.data);
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshBookingState = useCallback(async () => {
    await fetchBookings();

    setReschedulingId(null);
    setRescheduleConfirmation(null);
    setRescheduleSlot({ date: undefined, startTime: "", minutes: 0 });
  }, [fetchBookings]);

  const fetchReviews = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("reviews")
      .select("id, booking_id, rating, review_text")
      .eq("user_id", user.userId)
    if (data) setReviews(data as Review[]);
  }, [user]);

  useEffect(() => {
    if (user) { fetchBookings(); fetchReviews(); }
  }, [user, fetchBookings, fetchReviews]);

  const handleConfirmReduce = () => {
    if (!reduceConfirmation) return;

    const { rescheduleDate, startTime } = reduceConfirmation;

    setRescheduleSlot(slot => ({
      ...slot,
      date: rescheduleDate,
      startTime
    }));
    setReduceConfirmation(null);
    prepareRescheduleConfirmation(reduceConfirmation.booking, true);
  };

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      await api.post(`/Booking/Cancel/${id}`);
      toast.success("Booking cancelled");
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b));
    } catch {
      toast.error("Failed to cancel booking");
    } finally {
      setCancelling(null);
    }
  };

  const handleOpenReschedule = (booking: Booking) => {
    const startTime = booking.startTime?.slice(0, 5) || "";
    setReschedulingId(booking.id);
    setRescheduleSlot({
      date: parseISO(booking.bookingDate!),
      startTime,
      minutes: clampDurationToStart(startTime, booking.durationMinutes),
    });
  };

  const handleCloseReschedule = () => {
    setReschedulingId(null);
    setRescheduleSlot(slot => ({
      ...slot,
      date: rescheduleBooking ? parseISO(rescheduleBooking.bookingDate!) : undefined,
      startTime: "",
    }));
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

    const computedEndTime = addMinutesToTime(rescheduleStartTime, rescheduleMinutes, MAX_DAY_MINUTES);

    // BLOCK past date/time (FINAL GUARD)
    if (rescheduleDate && rescheduleStartTime) {
      const now = getAppNow(booking.spaceTimezone);
      now.setSeconds(0, 0);

      const isActive = booking.computedStatus === "active"; // NEW

      if (isActive) {
        // Start is fixed & already in the past — expected for an active booking.
        // Only the new end time needs to still be in the future.
        const [eh, em] = computedEndTime.split(":").map(Number);
        const selectedEnd = new Date(rescheduleDate);
        selectedEnd.setHours(eh, em, 0, 0);

        if (selectedEnd <= now) {
          toast.error("End time must be after the current time");
          return;
        }
      } else {
        const [h, m] = rescheduleStartTime.split(":").map(Number);
        const selected = new Date(rescheduleDate);
        selected.setHours(h, m, 0, 0);

        if (selected < now) {
          toast.error("You cannot reschedule to a past time");
          return;
        }
      }
    }

    const startMinutes = toMinutes(rescheduleStartTime);
    const proposedDurationMinutes = rescheduleMinutes;
    const endMinutes = toMinutes(computedEndTime);

    const isSameAsCurrent =
      rescheduleStartTime === (booking.startTime || "").slice(0, 5) &&
      computedEndTime === (booking.endTime || "").slice(0, 5) &&
      format(rescheduleDate, "yyyy-MM-dd") === booking.bookingDate;

    if (isSameAsCurrent) {
      toast.error("No changes detected. Please select different time.");
      return;
    }

    if (endMinutes <= startMinutes) {
      toast.error("End time must be after start time");
      return;
    }

    const currentDurationMinutes = booking.durationMinutes;

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

    try {
      const response = await api.post("/Booking/PreviewReschedule", {
        bookingId: booking.id,
        bookingDate: format(rescheduleDate, "yyyy-MM-dd"),
        startTime: formatTimeForDB(rescheduleStartTime),
        endTime: formatTimeForDB(computedEndTime),
        applyGraceExtension: rescheduleConfirmation?.applyGraceExtension ?? false
      });

      const result = response.data;

      if (!result.success) {
        toast.error(result.message ?? "Unable to reschedule.");
        return;
      }

      setRescheduleConfirmation({
        bookingId: booking.id,
        paymentId: result.paymentId,
        extraMinutes: result.extraMinutes,
        extraCost: result.totalPayable,
        newTotalPrice: result.newBookingTotal,
        canUseFreeExtension: result.canUseFreeExtension,
        pricePerHour: result.pricePerHour,
        rescheduleDate,
        rescheduleStartTime,
        rescheduleEndTime: computedEndTime,
        isPaidExtension: result.paymentRequired,
        freeMinutesApplied: result.freeMinutesApplied,
        nextFreeExtensionMinutesUsed: result.nextFreeExtensionMinutesUsed,
        nextHasUsedFreeExtension: result.nextHasUsedFreeExtension,
        type: "reschedule",
        parkingExtensionCost: result.parkingExtensionCost,
        serviceFee: result.serviceFee,
        gst: result.gst,
        graceDiscount: result.graceDiscount,
        graceApplied: result.graceApplied,
        applyGraceExtension: result.graceApplied,
        currentBookingPrice: result.currentBookingPrice,
        baseTotalPayable: result.totalPayable,
        baseParkingExtensionCost: result.parkingExtensionCost,
      });
    }
    catch (err: any) {
      toast.error(
        err?.response?.data?.message ??
        "Unable to check availability."
      );
    }
  };

  const handleGraceToggle = (enabled: boolean) => {
    if (!rescheduleConfirmation) return;

    setRescheduleConfirmation(prev => {
      if (!prev) return prev;
      return { ...prev, ...calculateGraceToggle(prev, enabled) };
    });
  };

  const handleReschedulePayment = async (confirmation: RescheduleConfirmation, booking: Booking) => {
    try {
      const paymentId = confirmation.paymentId;
      if (!paymentId) {
        throw new Error("Payment not found.");
      }

      const orderResponse = await api.post("/Payment/CreatePaymentOrder", { paymentId });
      const orderData = orderResponse.data;

      if (!orderData?.orderId) {
        throw new Error("Failed to create payment order");
      }

      setRescheduleConfirmation(null);
      setReschedulingId(null);

      document.body.style.pointerEvents = "auto";

      // Delay lets the dialog finish closing before Razorpay opens —
      // avoids a pointer-events/z-index race with the Radix overlay.
      setTimeout(() => {
        requestAnimationFrame(() => {
          openRazorpayCheckout({
            order: {
              orderId: orderData.orderId,
              keyId: orderData.keyId,
              amountInPaise: orderData.amountInPaise,
            },
            description: `Parking ${confirmation.type}: ${booking.spaceTitle}`,
            email: user?.email,
            onSuccess: async (response) => {
              try {
                const verifyResponse = await api.post("/Payment/VerifyPayment", {
                  bookingId: booking.id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                });

                if (!verifyResponse.data.success) {
                  toast.error(verifyResponse.data.message ?? "Payment verification failed.");
                } else {
                  const confirmResponse = await api.post("/Booking/ConfirmReschedule", {
                    bookingId: booking.id,
                    bookingDate: format(confirmation.rescheduleDate, "yyyy-MM-dd"),
                    startTime: formatTimeForDB(confirmation.rescheduleStartTime),
                    endTime: formatTimeForDB(confirmation.rescheduleEndTime),
                    applyGraceExtension: confirmation.applyGraceExtension,
                  });

                  if (!confirmResponse.data.success) {
                    toast.error(confirmResponse.data.message);
                    return;
                  }

                  toast.success(
                    `Booking ${confirmation.type === "extend" ? "extended" : "rescheduled"} successfully!`
                  );
                  await refreshBookingState();
                }
              } catch {
                toast.error("Something went wrong verifying payment.");
              }
              setRescheduleLoading(false);
            },
            onFailure: async () => {
              await api.post("/Payment/MarkPaymentFailed", { bookingId: booking.id });
              toast.error("Payment failed");
              setRescheduleLoading(false);
            },
            onDismiss: async () => {
              await api.post("/Payment/MarkPaymentAbandoned", { bookingId: booking.id });
              setRescheduleLoading(false);
            },
          });
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

    try {
      const response = await api.post("/Booking/ConfirmReschedule", {
        bookingId: booking.id,
        bookingDate: format(
          rescheduleConfirmation.rescheduleDate,
          "yyyy-MM-dd"
        ),
        startTime: formatTimeForDB(
          rescheduleConfirmation.rescheduleStartTime
        ),
        endTime: formatTimeForDB(
          rescheduleConfirmation.rescheduleEndTime
        ),
        applyGraceExtension:
          rescheduleConfirmation.applyGraceExtension
      });

      const result = response.data;

      // No payment required
      if (!result.paymentRequired) {
        toast.success("Booking rescheduled successfully!");

        await refreshBookingState();
        return;
      }

      // Payment required
      await handleReschedulePayment(
        {
          ...rescheduleConfirmation,
          paymentId: result.paymentId
        },
        booking
      );
    }
    catch (err: any) {
      toast.error(
        err?.response?.data?.message ??
        "Failed to reschedule booking."
      );
    }
    finally {
      setRescheduleLoading(false);
    }
  };

  const handleSubmitReview = async (booking: Booking, existingReviewId?: string) => {
    if (!user || reviewDraft.rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setSubmittingReview(true);

    const reviewData = {
      user_id: user.userId,
      booking_id: booking.id,
      spaceId: booking.spaceId,
      rating: reviewDraft.rating,
      review_text: reviewDraft.text || null,
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
      setReviewDraft({
        bookingId: null,
        rating: 0,
        text: ""
      });
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
        computedStatus: b.computedStatus.toLowerCase(),
        hasReview: reviewsByBooking.has(b.id)
      })),
    [bookings, reviewsByBooking]
  );

  const rescheduleBooking = useMemo(
    () => enrichedBookings.find(b => b.id === reschedulingId),
    [enrichedBookings, reschedulingId]
  );

  const rescheduleTimezone = rescheduleBooking?.spaceTimezone; // undefined until dialog opens

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

  const renderBookingCard = (booking: (typeof enrichedBookings)[0], showActions: boolean) => {

    return (
      <div key={booking.id} className={`bg-card rounded-2xl p-6 card-shadow flex flex-col gap-4 ${booking.computedStatus === "active" ? "ring-2 ring-green-500/30" : ""}`}>
        <BookingCard
          booking={booking}
          showActions={showActions}
          cancelling={cancelling}
          handleCancel={handleCancel}
          onReschedule={handleOpenReschedule}
        />

        {/* Completed Booking Actions */}
        {booking.computedStatus === "completed" && (
          <CompletedBookingActions
            booking={booking}
            reviewsByBooking={reviewsByBooking}
            reviewDraft={reviewDraft}
            submittingReview={submittingReview}
            setReviewDraft={setReviewDraft}
            onSubmitReview={handleSubmitReview}
          />
        )}
      </div>
    );
  };

  if (authLoading || loading) {
    return (
      <div className="pt-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    );
  }

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

      {/* Reschedule Dialog */}
      <RescheduleBookingDialog
        open={!!reschedulingId && !rescheduleConfirmation}
        rescheduleBooking={rescheduleBooking}
        rescheduleSlot={rescheduleSlot}
        handleRescheduleDateChange={handleRescheduleDateChange}
        handleRescheduleTimeChange={handleRescheduleTimeChange}
        setRescheduleMinutes={setRescheduleMinutes}
        onClose={handleCloseReschedule}
        prepareRescheduleConfirmation={prepareRescheduleConfirmation}
      />

      {/* Reschedule Confirmation Modal */}
      {rescheduleConfirmation && (
        <RescheduleConfirmationModal
          confirmation={rescheduleConfirmation}
          onGraceToggle={handleGraceToggle}
          onConfirm={handleConfirmReschedule}
          onCancel={() => {
            setRescheduleConfirmation(null);
          }}
          loading={rescheduleLoading}
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
