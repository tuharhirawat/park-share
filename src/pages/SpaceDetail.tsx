import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import SpaceImageCarousel from "@/components/SpaceImageCarousel";
import { Star, MapPin, Shield, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import api from "@/services/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { useParkingSpaceDetails } from "@/hooks/useParkingSpaces";
import ApproximateLocationMap from "@/components/ApproximateLocationMap";
import ReviewsList from "@/components/ReviewsList";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import BookingPriceSummary from "@/components/SpaceDetails/BookingPriceSummary";
import BookingDatePicker from "@/components/SpaceDetails/BookingDatePicker";
import VehicleSelector from "@/components/SpaceDetails/VehicleSelector";
import SlotSelector from "@/components/SpaceDetails/SlotSelector";
import ErrorNotice from "@/components/ui/ErrorNotice";
import TimeWarningDialog from "@/components/SpaceDetails/TimeWarningDialog";
import { UserVehicle } from "@/types/vehicle";
import { ParkingSlot } from "@/types/parking";
import { vehicleIcons } from "@/constants/vehicleIcons";
import { useRazorpayScript } from "@/hooks/useRazorpayScript";
import { openRazorpayCheckout } from "@/lib/razorpayCheckout";
import DurationStepper from "@/components/DurationStepper";
import { getBookingTimeRange, calculateEffectiveHours } from "@/lib/spaceDetailHelpers";
import {
  getCurrentDateTimeInTimezone,
  isTodayInTimezone,
  isPastTime,
  toMinutes,
  formatTimeForDB,
  addMinutesToTime,
} from "@/lib/time";
import {
  MIN_DURATION,
  STEP_DURATION,
  END_OF_DAY_MINUTES,
  LATEST_VALID_START,
  DEFAULT_START_TIME,
  DEFAULT_DURATION,
} from "@/constants/spaceDetailsConstants";

const SpaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { authOpen, setAuthOpen, requireAuth, redirectPath } = useAuthGuard();
  const { data: space, isLoading } = useParkingSpaceDetails(id);
  useRazorpayScript();

  const [isFullDay, setIsFullDay] = useState(false);
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME);
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [booking, setBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bookingClosedToday, setBookingClosedToday] = useState(false);
  const [timeWarningOpen, setTimeWarningOpen] = useState(false);
  const [lastValidTime, setLastValidTime] = useState(DEFAULT_START_TIME);
  const [bookedVehicleIds, setBookedVehicleIds] = useState<string[]>([]);
  const [bookedSlotIds, setBookedSlotIds] = useState<string[]>([]);

  // User's vehicles
  const [userVehicles, setUserVehicles] = useState<UserVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Available slots
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<UserVehicle[]>([]);
  const [availableSlots, setAvailableSlots] = useState<ParkingSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [debouncedStartTime, setDebouncedStartTime] = useState(startTime);
  const [debouncedDuration, setDebouncedDuration] = useState(duration);

  const filteredVehicleSlots = slots.filter(s => s.vehicle_type === selectedVehicle);

  // Fetch user vehicles
  useEffect(() => {
    if (!user) return;
    setLoadingVehicles(true);
    api.get("/Vehicle/GetMyVehicles")
      .then((response) => {
        setUserVehicles(
          (response.data || []).map((v: any) => ({
            id: v.id,
            vehicle_type: v.vehicleType,
            brand_model: v.brandModel,
            registration_number: v.registrationNumber,
          }))
        );
        setLoadingVehicles(false);
      })
      .catch(() => setLoadingVehicles(false));
  }, [user]);

  // Fetch slots only for logged-in users
  useEffect(() => {
    if (!user || !space?._dbId) {
      setSlots([]);
      setAvailableSlots([]);
      setLoadingSlots(false);
      return;
    }

    setLoadingSlots(true);

    api.get(`/ParkingSpace/${space._dbId}/AvailableSlots`)
      .then((response) => {
        setSlots(
          (response.data || []).map((s: any) => ({
            id: s.id,
            label: s.label,
            vehicle_type: s.vehicleType,
            is_active: s.isActive,
          }))
        );
      })
      .catch(() => {
        setSlots([]);
        setAvailableSlots([]);
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [user, space?._dbId]);

  useEffect(() => {
    if (!selectedDate) {
      setBookingClosedToday(false);
      return;
    }
    if (!isTodayInTimezone(selectedDate, space.timezone)) {
      setBookingClosedToday(false);
      return;
    }
    const now = getCurrentDateTimeInTimezone(space.timezone).time;
    if (toMinutes(now) > LATEST_VALID_START) {
      setBookingClosedToday(true);
      setSelectedSlotId("");
      return;
    }
    setBookingClosedToday(false);
    if (isPastTime(selectedDate, startTime, space.timezone)) {
      setStartTime(now);
      setSelectedSlotId("");
    }
  }, [selectedDate, startTime]);

  useEffect(() => {
    if (toMinutes(startTime) <= LATEST_VALID_START) {
      setLastValidTime(startTime);
    }
  }, [startTime]);

  useEffect(() => {
    if (!user || !space?._dbId || !selectedDate) {
      setBookedVehicleIds([]);
      setBookedSlotIds([]);
      return;
    }

    if (!isFullDay && isTodayInTimezone(selectedDate, space.timezone) && isPastTime(selectedDate, startTime, space.timezone)) {
      return;
    }

    const { startTime: actualStartTime, endTime: actualEndTime } = getBookingTimeRange(
      selectedDate, isFullDay, startTime, duration, space.timezone
    );

    api.get("/Booking/GetSpaceBookingAvailability", {
      params: {
        spaceId: space._dbId,
        date: format(selectedDate, "yyyy-MM-dd"),
        startTime: formatTimeForDB(actualStartTime),
        endTime: formatTimeForDB(actualEndTime),
      },
    })
      .then((response) => {
        setBookedVehicleIds(response.data.bookedVehicleIds || []);
        setBookedSlotIds(response.data.bookedSlotIds || []);
      })
      .catch(() => {
        setBookedVehicleIds([]);
        setBookedSlotIds([]);
      });
  }, [user, space?._dbId, selectedDate, debouncedStartTime, debouncedDuration, isFullDay]);

  useEffect(() => {
    setAvailableVehicles(
      userVehicles
        .filter(v =>
          space?.vehicleTypes
            .map(t => t.toLowerCase())
            .includes(v.vehicle_type.toLowerCase() as any)
        )
        .map(v => ({
          ...v,
          isBooked: bookedVehicleIds.includes(v.id)
        }))
    );
  }, [userVehicles, bookedVehicleIds, space?.vehicleTypes]);

  useEffect(() => {
    setAvailableSlots(filteredVehicleSlots.filter(s => !bookedSlotIds.includes(s.id)));
  }, [slots, selectedVehicle, bookedSlotIds]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStartTime(startTime);
      setDebouncedDuration(duration);
    }, 500);

    return () => clearTimeout(timer);
  }, [startTime, duration]);

  const canIncrease = toMinutes(startTime) + duration + STEP_DURATION <= END_OF_DAY_MINUTES;
  const canDecrease = duration > MIN_DURATION;

  const updateDuration = (minutes: number) => {
    setDuration(minutes);
    setSelectedSlotId("");
  };

  const validateBooking = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedDate) newErrors.date = "Please select a date";
    if (!selectedVehicleId) newErrors.vehicle = "Please select a vehicle";
    if (!isFullDay && selectedDate) {
      if (isPastTime(selectedDate, startTime, space.timezone)) {
        newErrors.startTime = "Start time cannot be in the past";
      }
    }
    if (!isFullDay) {
      if (!startTime) newErrors.startTime = "Start time is required";
      if (duration < MIN_DURATION) newErrors.duration = `Duration must be at least ${MIN_DURATION} minutes`;
    }

    // Slot selection required if slots exist
    if (filteredVehicleSlots.length > 0 && !selectedSlotId) {
      newErrors.slot = "Please select a parking slot";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBookNow = async () => {
    if (!user) {
      requireAuth(() => { });
      return;
    }
    if (!space) return;
    if (userVehicles.length === 0) {
      toast.info("Please add a vehicle first");
      navigate("/vehicles");
      return;
    }
    if (!validateBooking()) return;
    if (!isFullDay && selectedDate && isPastTime(selectedDate, startTime, space.timezone)) {
      toast.error("Selected time is no longer valid");
      setBooking(false);
      return;
    }

    setBooking(true);
    let bookingId: string | null = null;

    try {
      const { startTime: actualStartTime, endTime: actualEndTime } = getBookingTimeRange(
        selectedDate, isFullDay, startTime, duration, space.timezone
      );

      const createResponse = await api.post("/Booking/CreateBooking", {
        spaceId: space._dbId!,
        bookingDate: format(selectedDate!, "yyyy-MM-dd"),
        startTime: formatTimeForDB(actualStartTime),
        endTime: formatTimeForDB(actualEndTime),
        isFullDay,
        vehicleId: selectedVehicleId,
        vehicleType: selectedVehicle,
        slotId: selectedSlotId || null,
      });

      if (!createResponse.data.success) {
        if (createResponse.data.errorCode === "VEHICLE_CONFLICT" || createResponse.data.errorCode === "SLOT_CONFLICT") {
          toast.error("Slot just got booked. Please select another.");
        } else {
          toast.error(createResponse.data.message || "Something went wrong. Please try again.");
        }
        setBooking(false);
        return;
      }

      bookingId = createResponse.data.bookingId;
      const paymentId = createResponse.data.paymentId;

      const orderResponse = await api.post("/Payment/CreatePaymentOrder", { paymentId });
      if (!orderResponse.data.success) {
        throw new Error(orderResponse.data.message || "Failed to create payment order");
      }

      const { orderId, keyId, amountInPaise } = orderResponse.data;
      const currentBookingId = bookingId;

      openRazorpayCheckout({
        order: { orderId, keyId, amountInPaise },
        description: `Parking: ${space.title}`,
        email: user.email,
        onSuccess: async (response) => {
          try {
            const verifyResponse = await api.post("/Payment/VerifyPayment", {
              bookingId: currentBookingId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (!verifyResponse.data.success) {
              if (verifyResponse.data.errorCode === "VEHICLE_CONFLICT" || verifyResponse.data.errorCode === "SLOT_CONFLICT") {
                toast.error("Vehicle already booked. Refund initiated.");
              } else {
                toast.error(verifyResponse.data.message || "Booking failed. Contact support.");
              }
              return;
            }

            toast.success("Booking confirmed! 🎉");
            navigate("/my-bookings");
          } catch {
            toast.error("Something went wrong. Please contact support if you were charged.");
          }
          setBooking(false);
        },
        onFailure: async () => {
          await api.post("/Payment/MarkPaymentFailed", { bookingId: currentBookingId });
          toast.error("Payment failed. Please try again.");
          setBooking(false);
        },
        onDismiss: async () => {
          await api.post("/Payment/MarkPaymentAbandoned", { bookingId: currentBookingId });
          setBooking(false);
        },
      });
    } catch (err: any) {
      if (bookingId) {
        await api.post("/Payment/MarkPaymentAbandoned", { bookingId }).catch(() => { });
      }
      toast.error(err.response?.data?.message || err.message || "Payment failed");
      setBooking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!space) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-24 text-center">
          <p className="text-muted-foreground text-lg">Space not found.</p>
          <Button className="mt-4" onClick={() => navigate("/search")}>Back to Search</Button>
        </div>
      </div>
    );
  }

  const effectiveHours = calculateEffectiveHours(selectedDate, isFullDay, duration, space.timezone);

  const hasSlotsForVehicle = slots.some(s => s.vehicle_type === selectedVehicle);
  const isSlotUnavailable = selectedVehicle && (!hasSlotsForVehicle || availableSlots.length === 0);
  const selectedVehicleBooked = availableVehicles.find(v => v.id === selectedVehicleId)?.isBooked ?? false;

  const isBookingDisabled =
    !space.available ||
    bookingClosedToday ||
    booking ||
    !selectedDate ||
    !selectedVehicleId ||
    selectedVehicleBooked ||
    isSlotUnavailable ||
    (filteredVehicleSlots.length > 0 && !selectedSlotId);

  const availableVehicleCount = availableVehicles.filter(v => !v.isBooked).length;

  return (
    <div className="min-h-screen bg-background">
      <div>
        <div className="container mx-auto px-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">

              {/* Space Photos */}
              <SpaceImageCarousel
                title={space.title}
                images={space.images}
                image={space.image}
              />

              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {space.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />Approximate location in {space.city}</span>
                  <span className="flex items-center gap-1"><Star className="w-4 h-4 text-accent fill-accent" /> {space.rating} ({space.reviewCount} reviews)</span>
                </div>
                <p className="text-muted-foreground">Hosted by <span className="font-semibold text-foreground">{space.hostName}</span></p>
                <ApproximateLocationMap lat={space.lat} lng={space.lng} />
              </div>
              <div className="bg-card rounded-2xl p-6 card-shadow space-y-4">
                <h3 className="font-display font-bold text-foreground text-lg">Features & Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {space.features.map((f: string) => (
                    <Badge key={f} variant="secondary" className="gap-1 text-sm py-1.5 px-3"><Shield className="w-3.5 h-3.5 text-primary" /> {f}</Badge>
                  ))}
                </div>
                <h3 className="font-display font-bold text-foreground text-lg pt-2">Supported Vehicles</h3>
                <div className="flex gap-2">
                  {space.vehicleTypes.map((v: string) => (
                    <Badge key={v} variant="outline" className="gap-1 text-sm py-1.5 px-3 capitalize">{vehicleIcons[v]} {v}</Badge>
                  ))}
                </div>
              </div>
              <div className="bg-card rounded-2xl p-6 card-shadow space-y-4">
                <h3 className="font-display font-bold text-foreground text-lg">Recent Reviews</h3>
                <ReviewsList spaceId={space._dbId || space.id} />
              </div>
            </div>

            {/* Booking sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl p-6 card-shadow sticky top-24 space-y-5">
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground">₹{space.pricePerHour}<span className="text-base font-normal text-muted-foreground">/hr</span></div>
                  {space.pricePerDay > 0 && <div className="text-sm text-muted-foreground">or ₹{space.pricePerDay}/day</div>}
                </div>

                {/* Date picker */}
                <BookingDatePicker
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  setSelectedSlotId={setSelectedSlotId}
                  errors={errors}
                  setErrors={setErrors}
                  timezone={space.timezone}
                />

                {/* Vehicle selector */}
                <VehicleSelector
                  loadingVehicles={loadingVehicles}
                  availableVehicleCount={availableVehicleCount}
                  availableVehicles={availableVehicles}
                  selectedVehicleId={selectedVehicleId}
                  setSelectedVehicleId={setSelectedVehicleId}
                  setSelectedVehicle={setSelectedVehicle}
                  setSelectedSlotId={setSelectedSlotId}
                  errors={errors}
                  setErrors={setErrors}
                  requireAuth={requireAuth}
                />

                {/* Full day toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground">Full Day Booking</label>
                  <Switch checked={isFullDay}
                    onCheckedChange={(v) => {
                      setIsFullDay(v);
                      setSelectedSlotId("");
                      if (!v) {
                        setStartTime(getCurrentDateTimeInTimezone(space.timezone).time);
                      }
                      setErrors(prev => ({ ...prev, startTime: "", duration: "" }));
                    }}
                  />
                </div>

                {/* Time range */}
                {!isFullDay && !bookingClosedToday && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground block">Time Range</label>
                    {/* duration based time selection */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-foreground block">Start Time</label>
                      <Input
                        type="time"
                        value={startTime}
                        min={isTodayInTimezone(selectedDate, space.timezone) ? getCurrentDateTimeInTimezone(space.timezone).time : "00:00"}
                        max={"23:29"}
                        onChange={(e) => {
                          const value = e.target.value;

                          if (selectedDate && isTodayInTimezone(selectedDate, space.timezone) && isPastTime(selectedDate, value, space.timezone)) {
                            toast.error("Cannot select past time");
                            return;
                          }

                          if (toMinutes(value) > LATEST_VALID_START) {
                            setTimeWarningOpen(true);
                            return;
                          }

                          setStartTime(value);
                          setSelectedSlotId("");

                          if (toMinutes(value) + duration > END_OF_DAY_MINUTES) {
                            setDuration(MIN_DURATION);
                          }
                        }}
                      />

                      <label className="text-sm font-semibold text-foreground block">Duration</label>
                      <DurationStepper
                        minutes={duration}
                        canDecrease={canDecrease}
                        canIncrease={canIncrease}
                        onDecrease={() => updateDuration(duration - STEP_DURATION)}
                        onIncrease={() => updateDuration(duration + STEP_DURATION)}
                        subtext={`${startTime} → ${addMinutesToTime(startTime, duration)}`}
                      />

                      {/* free hand time selection */}
                      {/* <div>
                        <span className="text-xs text-muted-foreground">Start</span>
                        <Input
                          type="time"
                          value={startTime}
                          min={isTodayInTimezone(selectedDate, space.timezone) ? getCurrentDateTimeInTimezone(space.timezone).time : "00:00"}
                          onFocus={() => {
                            if (isTodayInTimezone(selectedDate, space.timezone) && isPastTime(selectedDate, startTime)) {
                              const now = getCurrentDateTimeInTimezone(space.timezone).time;
                              setStartTime(now);
                              setSelectedSlotId("");
                            }
                          }}
                          onChange={(e) => {
                            const value = e.target.value;

                            if (selectedDate && isTodayInTimezone(selectedDate, space.timezone) && isPastTime(selectedDate, value)) {
                              toast.error("Cannot select past time");
                              return;
                            }

                            setStartTime(value);
                            setSelectedSlotId("");
                            setErrors(prev => ({ ...prev, startTime: "" }));
                          }}
                        />
                        {errors.startTime && <p className="text-xs text-destructive mt-1">{errors.startTime}</p>}
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">End</span>
                        <Input
                          type="time"
                          value={endTime}
                          min={startTime}
                          onFocus={() => {
                            if (endTime <= startTime) {
                              setEndTime(startTime);
                            }
                          }}
                          onChange={(e) => {
                            const value = e.target.value;

                            if (value <= startTime) {
                              toast.error("End time must be after start time");
                              return;
                            }

                            setEndTime(value);
                            setSelectedSlotId("");
                            setErrors(prev => ({ ...prev, endTime: "" }));
                          }}
                        />
                        {errors.endTime && <p className="text-xs text-destructive mt-1">{errors.endTime}</p>}
                      </div> */}

                      {errors.duration && <p className="text-xs text-destructive">{errors.duration}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Duration: {effectiveHours > 0 ? `${effectiveHours.toFixed(1)} hours` : "Invalid range"}
                    </p>
                  </div>
                )}

                {bookingClosedToday && (
                  <ErrorNotice message="Booking is closed for today. Please select a future date." />
                )}

                {/* Slot selector */}
                <SlotSelector
                  selectedVehicle={selectedVehicle}
                  filteredVehicleSlots={filteredVehicleSlots}
                  availableSlots={availableSlots}
                  loadingSlots={loadingSlots}
                  selectedSlotId={selectedSlotId}
                  setSelectedSlotId={setSelectedSlotId}
                  errors={errors}
                  setErrors={setErrors}
                />

                <BookingPriceSummary
                  space={space}
                  isFullDay={isFullDay}
                  selectedDate={selectedDate}
                  effectiveHours={effectiveHours}
                />

                <Button className="w-full rounded-xl gap-2" size="lg"
                  disabled={isBookingDisabled}
                  onClick={handleBookNow}
                >
                  <Clock className="w-4 h-4" />
                  {selectedVehicleBooked
                    ? "Vehicle Already Booked"
                    : !space.available || isSlotUnavailable
                      ? "Unavailable"
                      : booking
                        ? "Processing..."
                        : "Pay & Book Now"
                  }
                </Button>
              </div>
            </div>
          </div>

          <TimeWarningDialog
            open={timeWarningOpen}
            setTimeWarningOpen={setTimeWarningOpen}
            lastValidTime={lastValidTime}
            setStartTime={setStartTime}
          />

          <AuthRequiredModal
            open={authOpen}
            onOpenChange={setAuthOpen}
            redirectPath={redirectPath}
            title="Sign in to continue"
            description="Please sign in to add vehicles and complete your booking"
          />
        </div>
      </div>
    </div>
  );
};

export default SpaceDetail;
