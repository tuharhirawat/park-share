import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Booking {
  id: string;
  space_title: string;
  space_address: string;
  space_city: string;
  hours: number;
  total_price: number;
  status: string;
  booking_date: string | null;
  start_time: string | null;
  payment_id: string | null;
  created_at: string;
}

const MyBookingsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load bookings");
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  };

  const handleCancel = async (id: string) => {
    setCancelling(id);
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    setCancelling(null);
    if (error) {
      toast.error("Failed to cancel booking");
    } else {
      toast.success("Booking cancelled");
      setBookings((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const statusColor: Record<string, string> = {
    confirmed: "bg-green-500/10 text-green-600 border-green-500/20",
    cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8">
            My Bookings
          </h1>

          {bookings.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-4">No bookings yet.</p>
              <Button onClick={() => navigate("/search")}>Find Parking</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-card rounded-2xl p-6 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-display font-bold text-foreground text-lg">
                        {booking.space_title}
                      </h3>
                      <Badge
                        variant="outline"
                        className={statusColor[booking.status] || ""}
                      >
                        {booking.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {booking.space_address}, {booking.space_city}
                      </span>
                      {booking.booking_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(booking.booking_date), "MMM d, yyyy")}
                        </span>
                      )}
                      {booking.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {booking.start_time.slice(0, 5)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {booking.hours} hr{booking.hours > 1 ? "s" : ""}
                      </span>
                    </div>
                    {booking.payment_id && (
                      <p className="text-xs text-muted-foreground">
                        Payment: {booking.payment_id}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-foreground">
                      ₹{booking.total_price}
                    </span>
                    {booking.status === "confirmed" && (
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
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MyBookingsPage;
