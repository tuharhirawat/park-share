import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import SpaceImageCarousel from "@/components/SpaceImageCarousel";
import { Star, MapPin, Shield, Clock, Car, Bike, ArrowLeft, Navigation, CalendarIcon, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useParkingSpaces } from "@/hooks/useParkingSpaces";
import ApproximateLocationMap from "@/components/ApproximateLocationMap";
import { getLatestDisplayValue } from "@/lib/spaceUpdates";
import ReviewsList from "@/components/ReviewsList";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { getCurrentTime, isToday, isPastTime } from "@/lib/time";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { calculatePricing } from "@/lib/pricingCalculator";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface UserVehicle {
  id: string;
  vehicle_type: string;
  brand_model: string;
  registration_number: string;
  isBooked?: boolean;
}

interface ParkingSlot {
  id: string;
  label: string;
  vehicle_type: string;
  is_active: boolean;
}

const MIN_DURATION = 30;
const STEP_DURATION = 15;
const END_OF_DAY_MINUTES = (23 * 60) + 59;
const LATEST_VALID_START = END_OF_DAY_MINUTES - MIN_DURATION;

const formatTime = (t: string) => t.length === 5 ? `${t}:00` : t;

const SpaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { authOpen, setAuthOpen, requireAuth, redirectPath } = useAuthGuard();
  const { data: allSpaces = [], isLoading } = useParkingSpaces();
  const space = allSpaces.find((s) => s.id === id);

  const [isFullDay, setIsFullDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState(30);  //30 mins default minimum duration
  const [booking, setBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bookingClosedToday, setBookingClosedToday] = useState(false);
  const [timeWarningOpen, setTimeWarningOpen] = useState(false);
  const [lastValidTime, setLastValidTime] = useState("09:00");

  // User's vehicles
  const [userVehicles, setUserVehicles] = useState<UserVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Available slots
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<UserVehicle[]>([]);
  const [availableSlots, setAvailableSlots] = useState<ParkingSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [latestTitleUpdate, setLatestTitleUpdate] = useState<any>(null);

  const filteredVehicleSlots =
    slots.filter(
      s => s.vehicle_type === selectedVehicle
    );

  useEffect(() => {

    if (!space?.id && !space?._dbId) return;

    const fetchLatestTitle = async () => {

      const { data } = await supabase
        .from("parking_space_update_requests")
        .select(`
          old_value,
          new_value,
          created_at
        `)
        .eq(
          "space_id",
          (space._dbId || space.id).replace("db_", "")
        )
        .eq("field", "title")
        .in("status", ["APPROVED", "PENDING"])
        .order("created_at", {
          ascending: false
        })
        .limit(1)
        .maybeSingle();

      setLatestTitleUpdate(data || null);
    };

    fetchLatestTitle();

  }, [space?.id, space?._dbId]);

  // Fetch user vehicles
  useEffect(() => {
    if (!user) return;
    setLoadingVehicles(true);
    supabase
      .from("vehicles")
      .select("id, vehicle_type, brand_model, registration_number")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setUserVehicles((data as UserVehicle[]) || []);
        setLoadingVehicles(false);
      });
  }, [user]);

  // Fetch all slots for this space
  useEffect(() => {
    if (!space?._dbId) return;
    setLoadingSlots(true);
    supabase
      .from("parking_slots")
      .select("id, label, vehicle_type, is_active")
      .eq("space_id", space._dbId)
      .eq("is_active", true)
      .order("label")
      .then(({ data }) => {
        setSlots((data as ParkingSlot[]) || []);
        setLoadingSlots(false);
      });
  }, [space]);

  useEffect(() => {
    if (!selectedDate) {
      setBookingClosedToday(false);
      return;
    }
    if (!isToday(selectedDate)) {
      setBookingClosedToday(false);
      return;
    }
    const now = getCurrentTime();
    if (timeToMinutes(now) > LATEST_VALID_START) {
      setBookingClosedToday(true);
      setSelectedSlotId("");
      return;
    }
    setBookingClosedToday(false);
    if (isPastTime(selectedDate, startTime)) {
      setStartTime(now);
      setSelectedSlotId("");
    }
  }, [selectedDate, startTime]);

  useEffect(() => {
    if (
      timeToMinutes(startTime)
      <= LATEST_VALID_START
    ) {
      setLastValidTime(startTime);
    }
  }, [startTime]);

  const checkVehicleAvailability = useCallback(async () => {
    if (!selectedDate || !userVehicles.length) {
      setAvailableVehicles(
        userVehicles
          .filter(v => space?.vehicleTypes.includes(v.vehicle_type as any))
          .map(v => ({
            ...v,
            isBooked: false
          }))
      );
      return;
    }

    const actualStartTime = isFullDay ? "00:00" : startTime;
    const actualEndTime = isFullDay ? "23:59" : calculateEndTime(startTime, duration);

    const { data: bookings } = await supabase
      .from("bookings")
      .select("vehicle_id")
      .eq("booking_date", format(selectedDate, "yyyy-MM-dd"))
      .in("status", ["pending", "confirmed"])
      .lt("start_time", formatTime(actualEndTime))
      .gt("end_time", formatTime(actualStartTime));

    const bookedVehicleIds = new Set((bookings || []).map(b => b.vehicle_id));

    const vehiclesData = userVehicles
      .filter(v => space?.vehicleTypes.includes(v.vehicle_type as any))
      .map(v => ({
        ...v,
        isBooked: bookedVehicleIds.has(v.id)
      }));

    setAvailableVehicles(vehiclesData);
  }, [userVehicles, selectedDate, startTime, duration, isFullDay, space?.vehicleTypes]);

  useEffect(() => {
    checkVehicleAvailability();
  }, [checkVehicleAvailability]);

  const calculateEndTime = (start: string, duration: number) => {
    const [h, m] = start.split(":").map(Number);
    const totalMinutes = h * 60 + m + duration;

    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;

    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const canIncrease = timeToMinutes(startTime) + duration + STEP_DURATION <= END_OF_DAY_MINUTES;
  const canDecrease = duration > MIN_DURATION;

  const updateDuration = (minutes: number) => {
    setDuration(minutes);
    setSelectedSlotId("");
  }

  // Filter available slots when vehicle type / date / time change
  const checkSlotAvailability = useCallback(async () => {
    if (!space?._dbId || !selectedVehicle || !selectedDate) {
      setAvailableSlots(filteredVehicleSlots);
      return;
    }

    const actualStartTime = isFullDay ? "00:00" : startTime;
    const actualEndTime = isFullDay ? "23:59" : calculateEndTime(startTime, duration);

    // Get booked slot_ids for this time
    const { data: bookedBookings } = await supabase
      .from("bookings")
      .select("slot_id")
      .eq("space_id", space._dbId)
      .eq("booking_date", format(selectedDate, "yyyy-MM-dd"))
      .in("status", ["pending", "confirmed"])
      .lt("start_time", formatTime(actualEndTime))
      .gt("end_time", formatTime(actualStartTime))
      .not("slot_id", "is", null);

    const bookedSlotIds = new Set((bookedBookings || []).map(b => b.slot_id));
    const vehicleSlots = filteredVehicleSlots;
    setAvailableSlots(vehicleSlots.filter(s => !bookedSlotIds.has(s.id)));
  }, [space, selectedVehicle, selectedDate, startTime, duration, isFullDay, slots]);

  useEffect(() => {
    checkSlotAvailability();
  }, [checkSlotAvailability]);

  const calculateHours = () => {
    if (!selectedDate) return 0;
    if (isFullDay) {
      if (isToday(selectedDate)) {
        const now = new Date();
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 0, 0);
        return (endOfDay.getTime() - now.getTime()) / (1000 * 60 * 60);
      }
      return 24;
    }
    return duration / 60;
  };

  const validateBooking = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedDate) newErrors.date = "Please select a date";
    if (!selectedVehicleId) newErrors.vehicle = "Please select a vehicle";
    if (!isFullDay && selectedDate) {
      if (isPastTime(selectedDate, startTime)) {
        newErrors.startTime = "Start time cannot be in the past";
      }
    }
    if (!isFullDay) {
      if (!startTime) newErrors.startTime = "Start time is required";
      if (duration < 30) newErrors.duration = "Duration must be at least 30 minutes";
      // if (effectiveHours > 18) newErrors.endTime = "Maximum 18 hours per booking — consider full day";
    }
    // Slot selection required if slots exist
    if (filteredVehicleSlots.length > 0 && !selectedSlotId) {
      newErrors.slot = "Please select a parking slot";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
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
    if (!isFullDay && selectedDate) {
      if (isPastTime(selectedDate, startTime)) {
        toast.error("Selected time is no longer valid");
        setBooking(false);
        return;
      }
    }

    setBooking(true);
    let bookingId: string | null = null;

    try {
      const dbSpaceId = space._dbId;
      const actualStartTime = isFullDay ? "00:00" : startTime;
      const actualEndTime = isFullDay ? "23:59" : calculateEndTime(startTime, duration);

      // Check capacity before proceeding
      const { data: lockData, error: lockError } = await supabase.functions.invoke(
        "create-booking-lock",
        {
          body: {
            booking_data: {
              space_id: dbSpaceId,
              space_title: space.title,
              space_address: space.address,
              space_city: space.city,
              duration_minutes: Math.floor(effectiveHours * 60),
              total_price: totalPrice,
              booking_date: format(selectedDate!, "yyyy-MM-dd"),
              start_time: actualStartTime,
              end_time: actualEndTime,
              vehicle_type: selectedVehicle,
              vehicle_id: selectedVehicleId,
              slot_id: selectedSlotId || null,
              user_id: user.id
            },

            payment_data: {
              base_price: pricing.basePrice,
              host_payout: pricing.hostPayout,
              host_commission: pricing.hostCommission,
              platform_fee: pricing.serviceFee,
              gst_amount: pricing.gst,
              total_payable: pricing.totalPayable,
              pricing_version: pricing.version
            }
          }
        }
      );

      if (lockError) {
        console.error("Lock invoke error:", lockError);
        toast.error("Something went wrong. Please try again.");
        setBooking(false);
        return;
      }

      if (!lockData || !lockData.success) {

        if (lockData?.error === "VEHICLE_CONFLICT") {
          toast.error("Slot just got booked. Please select another.");
        } else {
          toast.error("Something went wrong. Please try again.");
        }

        setBooking(false);
        return;
      }

      bookingId = lockData.booking_id;

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load payment gateway");

      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "create-razorpay-order",
        {
          body: {
            amount: totalPrice,
            currency: "INR",
            receipt: `bk_${dbSpaceId.slice(0, 8)}_${Date.now().toString(36)}`.substring(0, 40),
            notes: { space_id: dbSpaceId, user_id: user.id },
            booking_id: bookingId
          },
        }
      );

      if (orderError || !orderData?.order_id) {
        throw new Error(orderData?.error || "Failed to create payment order");
      }

      const options = {
        key: orderData.key_id,
        amount: totalPrice * 100,
        currency: "INR",
        name: "Park Mitra",
        description: `Parking: ${space.title}`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            const { data: verifyData } = await supabase.functions.invoke(
              "verify-razorpay-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  booking_data: {
                    booking_id: bookingId,
                    space_id: dbSpaceId,
                    space_title: space.title,
                    space_address: space.address,
                    space_city: space.city,
                    duration_minutes: Math.floor(effectiveHours * 60),
                    total_price: totalPrice,
                    base_price: pricing.basePrice,
                    host_payout: pricing.hostPayout,
                    host_commission: pricing.hostCommission,
                    platform_fee: pricing.serviceFee,
                    gst_amount: pricing.gst,
                    total_payable: pricing.totalPayable,
                    pricing_version: pricing.version,
                    booking_date: format(selectedDate!, "yyyy-MM-dd"),
                    start_time: actualStartTime,
                    end_time: actualEndTime,
                    vehicle_type: selectedVehicle,
                    vehicle_id: selectedVehicleId || null,
                    slot_id: selectedSlotId || null,
                  },
                },
              }
            );

            if (!verifyData?.success) {

              if (verifyData?.error === "VEHICLE_CONFLICT") {
                await supabase.functions.invoke("refund-payment", {
                  body: {
                    payment_id: response.razorpay_payment_id
                  }
                });

                toast.error("Vehicle already booked. Refund initiated.");
                return;
              }

              toast.error(verifyData.message || "Booking failed. Contact support.");
              return;
            } else {
              toast.success("Booking confirmed! 🎉");
              navigate("/my-bookings");
            }
          } catch {
            if (response?.razorpay_payment_id) {
              await supabase.functions.invoke("refund-payment", {
                body: {
                  payment_id: response.razorpay_payment_id
                }
              });
            }

            toast.error("Something went wrong. Amount refunded.");
          }
          setBooking(false);
        },
        prefill: { email: user.email },
        theme: { color: "#2a9d7c" },
        modal: {
          ondismiss: async () => {
            if (bookingId) {
              await supabase
                .from("bookings")
                .update({ status: "payment_abandoned" })
                .eq("id", bookingId)
                .eq("status", "pending");
            }

            await supabase
              .from("payments")
              .update({
                status: "abandoned",
                failure_reason: "user_closed_payment_modal"
              })
              .eq("booking_id", bookingId)
              .eq("status", "pending");

            setBooking(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", async () => {
        if (bookingId) {
          await supabase
            .from("bookings")
            .update({ status: "payment_failed" })
            .eq("id", bookingId)
            .eq("status", "pending");
        }

        await supabase
          .from("payments")
          .update({
            status: "failed",
            failure_reason: "gateway_failure"
          })
          .eq("booking_id", bookingId)
          .eq("status", "pending");

        toast.error("Payment failed. Please try again.");
        setBooking(false);
      });
      rzp.open();
    } catch (err: any) {

      if (bookingId) {
        await supabase
          .from("bookings")
          .update({ status: "payment_abandoned" })
          .eq("id", bookingId)
          .eq("status", "pending");

        await supabase
          .from("payments")
          .update({
            status: "abandoned",
            failure_reason: "exception_during_payment_flow"
          })
          .eq("booking_id", bookingId)
          .eq("status", "pending");
      }

      toast.error(err?.message || "Payment failed");
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

  const effectiveHours = calculateHours();
  let basePrice = 0;

  if (isFullDay) {
    if (selectedDate && isToday(selectedDate)) {
      basePrice = Math.round(space.pricePerHour * effectiveHours);
    } else {
      basePrice = space.pricePerDay;
    }
  } else {
    basePrice = Math.round(space.pricePerHour * effectiveHours);
  }

  const pricing = calculatePricing(basePrice);
  const totalPrice = pricing.totalPayable;

  const hasSlotsForVehicle = slots.some(
    s => s.vehicle_type === selectedVehicle
  );

  const isSlotUnavailable =
    selectedVehicle &&
    (
      !hasSlotsForVehicle ||
      availableSlots.length === 0
    );

  const isBookingDisabled =
    !space.available ||
    bookingClosedToday ||
    booking ||
    !selectedDate ||
    !selectedVehicleId ||
    isSlotUnavailable ||
    (filteredVehicleSlots.length > 0 && !selectedSlotId);

  const vehicleIcons: Record<string, React.ReactNode> = {
    bike: <Bike className="w-4 h-4" />,
    car: <Car className="w-4 h-4" />,
  };

  const availableVehicleCount = availableVehicles.filter(
    v => !v.isBooked
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <div>
        <div className="container mx-auto px-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Premium Hero Gallery */}
              <SpaceImageCarousel
                title={space.title}
                images={space.images}
                image={space.image}
              />
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {
                    getLatestDisplayValue({
                      currentValue:
                        latestTitleUpdate?.new_value,

                      previousValue:
                        latestTitleUpdate?.old_value
                        || space.title
                    })
                  }
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
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground", errors.date && "border-destructive")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={selectedDate} onSelect={(d) => { setSelectedDate(d); setSelectedSlotId(""); setErrors(prev => ({ ...prev, date: "" })); }} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus />
                    </PopoverContent>
                  </Popover>
                  {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
                </div>

                {/* Vehicle selector */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Select Vehicle</label>
                  {loadingVehicles ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
                  ) : availableVehicleCount === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      <p>No available vehicles for selected time.</p>
                      <Button
                        variant="link"
                        className="p-0 h-auto text-primary"
                        onClick={() =>
                          requireAuth(
                            () => navigate("/vehicles"),
                            "/vehicles"
                          )
                        }
                      >
                        Add a vehicle →
                      </Button>
                    </div>
                  ) : (
                    <Select value={selectedVehicleId} onValueChange={(vid) => {
                      setSelectedVehicleId(vid);
                      const veh = availableVehicles.find(v => v.id === vid);
                      if (veh && !veh.isBooked) setSelectedVehicle(veh.vehicle_type);
                      setSelectedSlotId("");
                      setErrors(prev => ({ ...prev, vehicle: "" }));
                    }}>
                      <SelectTrigger className={cn(errors.vehicle && "border-destructive")}>
                        <SelectValue placeholder="Choose your vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVehicles.map((v) => (
                          <SelectItem
                            key={v.id}
                            value={v.id}
                            disabled={v.isBooked}
                          >
                            {v.brand_model} — {v.registration_number}
                            {" ("} {v.vehicle_type} {")"} {v.isBooked && " 🔒 Booked"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.vehicle && <p className="text-xs text-destructive mt-1">{errors.vehicle}</p>}
                </div>

                {/* Full day toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground">Full Day Booking</label>
                  <Switch checked={isFullDay}
                    onCheckedChange={(v) => {
                      setIsFullDay(v);
                      setSelectedSlotId("");
                      setStartTime(v ? "00:00" : getCurrentTime());
                      setErrors(prev => ({ ...prev, startTime: "", duration: "" }));
                    }}
                  />
                </div>

                {/* Time range */}
                {!isFullDay && !bookingClosedToday && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground block">Time Range</label>
                    <div className="space-y-3">

                      {/* duration based time selection */}
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground block">Start Time</label>

                        <Input
                          type="time"
                          value={startTime}
                          min={isToday(selectedDate) ? getCurrentTime() : "00:00"}
                          max={"23:29"}
                          onChange={(e) => {
                            const value = e.target.value;

                            if (selectedDate && isToday(selectedDate) && isPastTime(selectedDate, value)) {
                              toast.error("Cannot select past time");
                              return;
                            }

                            if (timeToMinutes(value) > LATEST_VALID_START) {
                              setTimeWarningOpen(true);
                              return;
                            }

                            setStartTime(value);
                            setSelectedSlotId("");

                            if (
                              timeToMinutes(value) + duration
                              > END_OF_DAY_MINUTES
                            ) {
                              setDuration(MIN_DURATION);
                            }
                          }}
                        />

                        <label className="text-sm font-semibold text-foreground block">
                          Duration
                        </label>

                        <div className="flex items-center justify-between border rounded-xl p-3">

                          <button
                            type="button"
                            onClick={() => updateDuration(duration - STEP_DURATION)}
                            disabled={!canDecrease}
                            className={cn(
                              "w-10 h-10 rounded-full border text-lg font-bold",
                              !canDecrease &&
                              "opacity-40 cursor-not-allowed"
                            )}
                          >
                            -
                          </button>

                          <div className="text-center">
                            <p className="font-semibold">
                              {duration} mins
                            </p>

                            <p className="text-xs text-muted-foreground">
                              {startTime} → {calculateEndTime(startTime, duration)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => updateDuration(duration + STEP_DURATION)}
                            disabled={!canIncrease}
                            className={cn(
                              "w-10 h-10 rounded-full border text-lg font-bold",
                              !canIncrease &&
                              "opacity-40 cursor-not-allowed"
                            )}
                          >
                            +
                          </button>

                        </div>

                        {errors.duration && (
                          <p className="text-xs text-destructive">{errors.duration}</p>
                        )}
                      </div>

                      {/* free hand time selection */}
                      {/* <div>
                        <span className="text-xs text-muted-foreground">Start</span>
                        <Input
                          type="time"
                          value={startTime}
                          min={isToday(selectedDate) ? getCurrentTime() : "00:00"}
                          onFocus={() => {
                            if (isToday(selectedDate) && isPastTime(selectedDate, startTime)) {
                              const now = getCurrentTime();
                              setStartTime(now);
                              setSelectedSlotId("");
                            }
                          }}
                          onChange={(e) => {
                            const value = e.target.value;

                            if (selectedDate && isToday(selectedDate) && isPastTime(selectedDate, value)) {
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
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Duration: {effectiveHours > 0 ? `${effectiveHours.toFixed(1)} hours` : "Invalid range"}
                    </p>
                  </div>
                )}

                {bookingClosedToday && (
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-sm text-destructive">
                      Booking is closed for today. Please select a future date.
                    </p>
                  </div>
                )}

                {/* Slot selector */}
                {selectedVehicle && filteredVehicleSlots.length > 0 && (
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">Select Parking Slot</label>
                    {loadingSlots ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading slots...</div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {filteredVehicleSlots.map(slot => {
                          const isAvailable = availableSlots.some(a => a.id === slot.id);
                          const isSelected = selectedSlotId === slot.id;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={!isAvailable}
                              className={cn(
                                "py-2 px-3 rounded-lg text-xs font-mono font-semibold border transition-colors",
                                isSelected ? "bg-primary text-primary-foreground border-primary" :
                                  isAvailable ? "bg-card border-border hover:border-primary/50 text-foreground" :
                                    "bg-muted/50 text-muted-foreground border-border opacity-50 cursor-not-allowed line-through"
                              )}
                              onClick={() => { setSelectedSlotId(slot.id); setErrors(prev => ({ ...prev, slot: "" })); }}
                            >
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {errors.slot && <p className="text-xs text-destructive mt-1">{errors.slot}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{availableSlots.length} of {filteredVehicleSlots.length} available</p>
                    {availableSlots.length === 0 && (
                      <p className="text-xs text-destructive mt-2">
                        No slots available for selected time
                      </p>
                    )}
                  </div>
                )}

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {isFullDay
                        ? (selectedDate && isToday(selectedDate)
                          ? `₹${space.pricePerHour} × ${effectiveHours.toFixed(1)} hrs`
                          : "Full day rate")
                        : `₹${space.pricePerHour} × ${effectiveHours.toFixed(1)} hrs`}
                    </span>
                    <span className="text-foreground font-medium">₹{basePrice}</span>
                  </div>
                  {pricing.serviceFee > 0 &&
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Service fee</span>
                      <span className="text-foreground font-medium">₹{pricing.serviceFee}</span>
                    </div>
                  }
                  <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border">
                    <span>Total</span>
                    <span>₹{totalPrice}</span>
                  </div>
                </div>

                <Button className="w-full rounded-xl gap-2" size="lg"
                  disabled={isBookingDisabled}
                  onClick={handleBookNow}
                >
                  <Clock className="w-4 h-4" />
                  {!space.available || isSlotUnavailable
                    ? "Unavailable"
                    : booking
                      ? "Processing..."
                      : "Pay & Book Now"
                  }
                </Button>
              </div>
            </div>
          </div>

          <Dialog
            open={timeWarningOpen}
            onOpenChange={(open) => {
              if (!open) return;
              setTimeWarningOpen(open);
            }}
          >
            <DialogContent
              className="w-[92vw] max-w-[420px] rounded-2xl p-6 sm:p-7 text-center mx-auto"
              onPointerDownOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <div className="flex flex-col items-center justify-center text-center space-y-5">
                <DialogHeader className="w-full space-y-3 text-center">
                  <DialogTitle
                    className="text-lg sm:text-xl font-semibold text-center leading-snug w-full"
                  >
                    Booking Not Possible
                  </DialogTitle>
                </DialogHeader>

                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-center max-w-[280px] sm:max-w-[320px] mx-auto">
                  Start time must be 23:29 or earlier to proceed with booking.
                </p>

                <Button
                  className="w-full sm:w-full mt-2 rounded-xl"
                  onClick={() => {
                    setStartTime(lastValidTime);
                    setTimeWarningOpen(false);
                  }}
                >
                  Okay
                </Button>

              </div>

            </DialogContent>
          </Dialog>

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
