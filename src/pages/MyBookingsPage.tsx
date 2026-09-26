import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
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
import { RescheduleTimeSlot } from "@/viewTypes/bookingUi";
import { MAX_DAY_MINUTES, BOOKINGS_PAGE_DATA_SIZE } from "@/constants/bookingConstants";
import { clampDurationToStart, calculateGraceToggle } from "@/lib/bookingHelpers";
import { Booking, RescheduleConfirmation, MyBookingsApiResponse } from "@/types/booking";
import BookingPagination from "@/components/booking/BookingPagination";
import { toMinutes, addMinutesToTime, formatTimeForDB, getAppNow } from "@/lib/time";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BookingCardSkeleton from "@/components/SkeletonLoaders/BookingCardSkeleton";
import { MySpaceBookingReview } from "@/types/booking";

const MyBookingsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const userId = user?.userId ?? null;
  useRazorpayScript();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const [spaceReviews, setSpaceReviews] = useState<Record<string, MySpaceBookingReview>>({});
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "completed" | "cancelled">("all");
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [activeCount, setActiveCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);

  const [loadingCounts, setLoadingCounts] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const historyCount =
    historyFilter === "completed"
      ? completedCount
      : historyFilter === "cancelled"
        ? cancelledCount
        : completedCount + cancelledCount;

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

  const fetchCounts = useCallback(async () => {
    if (!userId) return;

    setLoadingCounts(true);

    try {
      const { data } = await api.get(
        "/Booking/GetMySpaceBookingsCount"
      );

      setActiveCount(data?.active ?? 0);
      setCompletedCount(data?.completed ?? 0);
      setCancelledCount(data?.cancelled ?? 0);
    } catch (err) {
      console.error("Failed to load booking counts:", err);

      setActiveCount(0);
      setCompletedCount(0);
      setCancelledCount(0);
    } finally {
      setLoadingCounts(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const fetchBookings = useCallback(async () => {
    if (!userId) return;

    setLoadingBookings(true);

    try {
      const response = await api.get<MyBookingsApiResponse>("/Booking/GetMyBookings", {
        params: {
          tab: activeTab,
          historyFilter: activeTab === "history" ? historyFilter : "all",
          page,
          pageSize: BOOKINGS_PAGE_DATA_SIZE,
        },
      });

      const result = response.data;

      setBookings(
        (result.items || []).map((booking) => ({
          ...booking,
          computedStatus: String(booking.computedStatus)
            .trim()
            .toLowerCase(),
        }))
      );

      setTotalPages(result.totalPages ?? 1);
    } catch (err) {
      console.error("Failed to load bookings:", err);
      toast.error("Something went wrong");
      setBookings([]);
      setTotalPages(1);
    } finally {
      setLoadingBookings(false);
    }
  }, [userId, activeTab, historyFilter, page]);

  useEffect(() => {
    const completedSpaceIds = [
      ...new Set(
        bookings
          .filter((b) => b.computedStatus === "completed")
          .map((b) => b.spaceId)
          .filter(Boolean)
      ),
    ];

    if (completedSpaceIds.length === 0) {
      setSpaceReviews({});
      setReviewsLoading(false);
      return;
    }

    const fetchReviews = async () => {
      setReviewsLoading(true);

      try {
        const params = new URLSearchParams();

        completedSpaceIds.forEach((spaceId: string) => {
          params.append("spaceIds", spaceId);
        });

        const reviewResponse = await api.get(
          `/Review/user/spacebooking/reviews?${params.toString()}`
        );

        const reviewMap: Record<string, MySpaceBookingReview> = {};

        (reviewResponse.data || []).forEach(
          (review: MySpaceBookingReview) => {
            reviewMap[review.spaceId] = review;
          }
        );

        setSpaceReviews(reviewMap);
      } catch (reviewError) {
        console.error("Failed to load space reviews:", reviewError);
        setSpaceReviews({});
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [bookings]);

  const refreshBookingState = useCallback(async () => {
    await fetchBookings();

    setReschedulingId(null);
    setRescheduleConfirmation(null);
    setRescheduleSlot({ date: undefined, startTime: "", minutes: 0 });
  }, [fetchBookings]);

  useEffect(() => {
    if (userId) { fetchBookings(); }
  }, [userId, fetchBookings]);

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

      await Promise.all([
        fetchBookings(),
        fetchCounts(),
      ]);
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

      const isActive = booking.computedStatus === "active";

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
        applyGraceExtension: rescheduleConfirmation.applyGraceExtension
      });

      const result = response.data;

      if (!result.paymentRequired) {
        toast.success("Booking rescheduled successfully!");

        await refreshBookingState();
        return;
      }

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

  const rescheduleBooking = useMemo(
    () => bookings.find(b => b.id === reschedulingId),
    [bookings, reschedulingId]
  );

  const rescheduleTimezone = rescheduleBooking?.spaceTimezone;

  const renderBookingCard = (booking: Booking, showActions: boolean) => {

    return (
      <div key={booking.id} className={`bg-card rounded-2xl p-6 card-shadow flex flex-col gap-4 ${booking.computedStatus === "active" ? "ring-2 ring-green-500/30" : ""}`}>
        <BookingCard
          booking={booking}
          showActions={showActions}
          cancelling={cancelling}
          handleCancel={handleCancel}
          onReschedule={handleOpenReschedule}
        />

        {booking.computedStatus === "completed" && (
          <CompletedBookingActions
            booking={booking}
            existingReview={spaceReviews[booking.spaceId]}
            reviewsLoading={reviewsLoading}
            onReviewSaved={(review) => {
              setSpaceReviews((prev) => ({
                ...prev,
                [booking.spaceId]: review,
              }));
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div>
        <div className="container mx-auto px-4">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8">My Bookings</h1>

          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              const nextTab = value as "active" | "history";

              setActiveTab(nextTab);
              setPage(1);
              setTotalPages(1);
              setBookings([]);
            }}
            className="space-y-6"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="active">
                Active ({loadingCounts ? "..." : activeCount})
              </TabsTrigger>

              <TabsTrigger value="history">
                History ({loadingCounts ? "..." : historyCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              {loadingBookings ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <BookingCardSkeleton key={index} />
                  ))}
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg mb-4">
                    No active bookings.
                  </p>

                  <Button onClick={() => navigate("/search")}>Find Parking</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map(b => renderBookingCard(b, true))}
                </div>
              )}

              {!loadingBookings && bookings.length > 0 && (
                <BookingPagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              )}
            </TabsContent>

            <TabsContent value="history">
              <div className="flex items-center gap-3 mb-4">
                <Filter className="w-4 h-4 text-muted-foreground" />

                <Select
                  value={historyFilter}
                  onValueChange={v => {
                    setHistoryFilter(
                      v as "all" | "completed" | "cancelled"
                    );
                    setPage(1);
                    setTotalPages(1);
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loadingBookings ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <BookingCardSkeleton key={index} />
                  ))}
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg">
                    No booking history yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map(b => renderBookingCard(b, false))}
                </div>
              )}

              {!loadingBookings && bookings.length > 0 && (
                <BookingPagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
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
        setRescheduleSlot={setRescheduleSlot}
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
          onCancel={() => setRescheduleConfirmation(null)}
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
