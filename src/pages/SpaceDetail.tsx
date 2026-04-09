import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { mockSpaces } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Shield, Clock, Car, Bike, ArrowLeft, Navigation, CalendarIcon } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return { value: `${h}:00`, label: `${h}:00` };
});

const SpaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const space = mockSpaces.find((s) => s.id === id);
  const [hours, setHours] = useState(2);
  const [booking, setBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");

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
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    setBooking(true);
    const totalPrice = Math.round(space.pricePerHour * hours * 1.1);

    try {
      // 1. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load payment gateway");

      // 2. Create Razorpay order via edge function
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

      // 3. Open Razorpay checkout
      const options = {
        key: orderData.key_id,
        amount: totalPrice * 100,
        currency: "INR",
        name: "Travel Saathi",
        description: `Parking: ${space.title}`,
        order_id: orderData.order_id,
        handler: async (response: any) => {
          // 4. Verify payment and create booking
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
                    hours,
                    total_price: totalPrice,
                    booking_date: format(selectedDate!, "yyyy-MM-dd"),
                    start_time: selectedTime,
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
        prefill: {
          email: user.email,
        },
        theme: {
          color: "#6366f1",
        },
        modal: {
          ondismiss: () => setBooking(false),
        },
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
          <Button className="mt-4" onClick={() => navigate("/search")}>
            Back to Search
          </Button>
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
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl overflow-hidden h-72 md:h-96">
                <img src={space.image} alt={space.title} className="w-full h-full object-cover" />
              </div>

              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                  {space.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {space.address}, {space.city}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-accent fill-accent" /> {space.rating} (
                    {space.reviewCount} reviews)
                  </span>
                </div>
                <p className="text-muted-foreground">
                  Hosted by <span className="font-semibold text-foreground">{space.hostName}</span>
                </p>
              </div>

              <div className="bg-card rounded-2xl p-6 card-shadow space-y-4">
                <h3 className="font-display font-bold text-foreground text-lg">
                  Features & Amenities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {space.features.map((f) => (
                    <Badge key={f} variant="secondary" className="gap-1 text-sm py-1.5 px-3">
                      <Shield className="w-3.5 h-3.5 text-primary" /> {f}
                    </Badge>
                  ))}
                </div>
                <h3 className="font-display font-bold text-foreground text-lg pt-2">
                  Supported Vehicles
                </h3>
                <div className="flex gap-2">
                  {space.vehicleTypes.map((v) => (
                    <Badge
                      key={v}
                      variant="outline"
                      className="gap-1 text-sm py-1.5 px-3 capitalize"
                    >
                      {vehicleIcons[v]} {v}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Booking sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl p-6 card-shadow sticky top-24 space-y-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground">
                    ₹{space.pricePerHour}
                    <span className="text-base font-normal text-muted-foreground">/hr</span>
                  </div>
                  <div className="text-sm text-muted-foreground">or ₹{space.pricePerDay}/day</div>
                </div>

                {/* Date picker */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time picker */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Start Time
                  </label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot.value} value={slot.value}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Duration */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Duration (hours)
                  </label>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setHours(Math.max(1, hours - 1))}
                    >
                      -
                    </Button>
                    <span className="text-lg font-bold text-foreground w-10 text-center">
                      {hours}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => setHours(hours + 1)}>
                      +
                    </Button>
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      ₹{space.pricePerHour} × {hours} hrs
                    </span>
                    <span className="text-foreground font-medium">
                      ₹{space.pricePerHour * hours}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service fee</span>
                    <span className="text-foreground font-medium">
                      ₹{Math.round(space.pricePerHour * hours * 0.1)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border">
                    <span>Total</span>
                    <span>₹{Math.round(space.pricePerHour * hours * 1.1)}</span>
                  </div>
                </div>

                <Button
                  className="w-full rounded-xl gap-2"
                  size="lg"
                  disabled={!space.available || booking}
                  onClick={handleBookNow}
                >
                  <Clock className="w-4 h-4" />
                  {booking
                    ? "Processing..."
                    : space.available
                    ? "Pay & Book Now"
                    : "Unavailable"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-xl gap-2"
                  size="lg"
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${space.lat},${space.lng}`,
                      "_blank"
                    )
                  }
                >
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
