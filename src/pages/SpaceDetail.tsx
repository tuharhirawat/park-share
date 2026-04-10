import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { mockSpaces } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Star, MapPin, Shield, Clock, Car, Bike, ArrowLeft, Navigation, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useParkingSpaces } from "@/hooks/useParkingSpaces";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const SpaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: allSpaces = [] } = useParkingSpaces();

  const space = allSpaces.find((s) => s.id === id) || mockSpaces.find((s) => s.id === id);

  const [isFullDay, setIsFullDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [booking, setBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const calculateHours = () => {
    if (isFullDay) return 24;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const diff = (eh * 60 + em - sh * 60 - sm) / 60;
    return Math.max(0, diff);
  };

  const effectiveHours = isFullDay ? 24 : calculateHours();
  const totalPrice = isFullDay && space
    ? Math.round(space.pricePerDay * 1.1)
    : space
    ? Math.round(space.pricePerHour * effectiveHours * 1.1)
    : 0;
  const basePrice = isFullDay && space
    ? space.pricePerDay
    : space
    ? Math.round(space.pricePerHour * effectiveHours)
    : 0;
  const serviceFee = totalPrice - basePrice;

  const validateBooking = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedDate) newErrors.date = "Please select a date";
    if (!isFullDay) {
      if (!startTime) newErrors.startTime = "Start time is required";
      if (!endTime) newErrors.endTime = "End time is required";
      if (effectiveHours <= 0) newErrors.endTime = "End time must be after start time";
      if (effectiveHours > 18) newErrors.endTime = "Maximum 18 hours per booking — consider full day";
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
      toast.info("Please log in to book a space");
      navigate("/login");
      return;
    }
    if (!space) return;
    if (!validateBooking()) return;

    setBooking(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load payment gateway");

      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "create-razorpay-order",
        {
          body: {
            amount: totalPrice,
            currency: "INR",
            receipt: `booking_${space.id}_${Date.now()}`,
            notes: { space_id: space.id, user_id: user.id },
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
        name: "Travel Saathi",
        description: `Parking: ${space.title}`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
              "verify-razorpay-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  booking_data: {
                    space_id: space.id,
                    space_title: space.title,
                    space_address: space.address,
                    space_city: space.city,
                    hours: Math.ceil(effectiveHours),
                    total_price: totalPrice,
                    booking_date: format(selectedDate!, "yyyy-MM-dd"),
                    start_time: isFullDay ? "00:00" : startTime,
                  },
                },
              }
            );

            if (verifyError || !verifyData?.success) {
              toast.error("Payment verification failed. Contact support.");
            } else {
              toast.success("Booking confirmed! 🎉");
              navigate("/my-bookings");
            }
          } catch {
            toast.error("Something went wrong verifying payment.");
          }
          setBooking(false);
        },
        prefill: { email: user.email },
        theme: { color: "#2a9d7c" },
        modal: { ondismiss: () => setBooking(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
      setBooking(false);
    }
  };

  if (!space) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center">
          <p className="text-muted-foreground text-lg">Space not found.</p>
          <Button className="mt-4" onClick={() => navigate("/search")}>Back to Search</Button>
        </div>
      </div>
    );
  }

  const vehicleIcons: Record<string, React.ReactNode> = {
    bike: <Bike className="w-4 h-4" />,
    car: <Car className="w-4 h-4" />,
    suv: <Car className="w-5 h-5" />,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl overflow-hidden h-72 md:h-96">
                <img src={space.image} alt={space.title} className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">{space.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {space.address}, {space.city}</span>
                  <span className="flex items-center gap-1"><Star className="w-4 h-4 text-accent fill-accent" /> {space.rating} ({space.reviewCount} reviews)</span>
                </div>
                <p className="text-muted-foreground">Hosted by <span className="font-semibold text-foreground">{space.hostName}</span></p>
              </div>
              <div className="bg-card rounded-2xl p-6 card-shadow space-y-4">
                <h3 className="font-display font-bold text-foreground text-lg">Features & Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {space.features.map((f) => (
                    <Badge key={f} variant="secondary" className="gap-1 text-sm py-1.5 px-3"><Shield className="w-3.5 h-3.5 text-primary" /> {f}</Badge>
                  ))}
                </div>
                <h3 className="font-display font-bold text-foreground text-lg pt-2">Supported Vehicles</h3>
                <div className="flex gap-2">
                  {space.vehicleTypes.map((v) => (
                    <Badge key={v} variant="outline" className="gap-1 text-sm py-1.5 px-3 capitalize">{vehicleIcons[v]} {v}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Booking sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl p-6 card-shadow sticky top-24 space-y-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground">₹{space.pricePerHour}<span className="text-base font-normal text-muted-foreground">/hr</span></div>
                  <div className="text-sm text-muted-foreground">or ₹{space.pricePerDay}/day</div>
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
                      <Calendar mode="single" selected={selectedDate} onSelect={(d) => { setSelectedDate(d); setErrors(prev => ({ ...prev, date: "" })); }} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} initialFocus />
                    </PopoverContent>
                  </Popover>
                  {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
                </div>

                {/* Full day toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground">Full Day Booking</label>
                  <Switch checked={isFullDay} onCheckedChange={(v) => { setIsFullDay(v); setErrors(prev => ({ ...prev, startTime: "", endTime: "" })); }} />
                </div>

                {/* Custom time range */}
                {!isFullDay && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground block">Time Range</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-muted-foreground">Start</span>
                        <Input type="time" value={startTime} onChange={e => { setStartTime(e.target.value); setErrors(prev => ({ ...prev, startTime: "" })); }} className={cn("mt-1", errors.startTime && "border-destructive")} />
                        {errors.startTime && <p className="text-xs text-destructive mt-1">{errors.startTime}</p>}
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">End</span>
                        <Input type="time" value={endTime} onChange={e => { setEndTime(e.target.value); setErrors(prev => ({ ...prev, endTime: "" })); }} className={cn("mt-1", errors.endTime && "border-destructive")} />
                        {errors.endTime && <p className="text-xs text-destructive mt-1">{errors.endTime}</p>}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Duration: {effectiveHours > 0 ? `${effectiveHours.toFixed(1)} hours` : "Invalid range"}
                    </p>
                  </div>
                )}

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {isFullDay ? "Full day rate" : `₹${space.pricePerHour} × ${effectiveHours.toFixed(1)} hrs`}
                    </span>
                    <span className="text-foreground font-medium">₹{basePrice}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service fee</span>
                    <span className="text-foreground font-medium">₹{serviceFee}</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border">
                    <span>Total</span>
                    <span>₹{totalPrice}</span>
                  </div>
                </div>

                <Button className="w-full rounded-xl gap-2" size="lg" disabled={!space.available || booking} onClick={handleBookNow}>
                  <Clock className="w-4 h-4" />
                  {booking ? "Processing..." : space.available ? "Pay & Book Now" : "Unavailable"}
                </Button>
                <Button variant="outline" className="w-full rounded-xl gap-2" size="lg"
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${space.lat},${space.lng}`, "_blank")}>
                  <Navigation className="w-4 h-4" /> Get Directions
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SpaceDetail;
