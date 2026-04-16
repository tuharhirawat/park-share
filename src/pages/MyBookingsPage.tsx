import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, MapPin, Trash2, Loader2, Star, Filter, CalendarIcon, RefreshCw, TimerReset } from "lucide-react";
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
}

interface Review {
  id: string;
  booking_id: string;
  rating: number;
  review_text: string | null;
}

type ComputedStatus = "upcoming" | "active" | "completed" | "cancelled";

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

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

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
    setExtendLoading(true);

    // Check availability for extended time
    const { data: capacityCheck } = await supabase.rpc("check_parking_capacity", {
      p_space_id: booking.space_id,
      p_vehicle_type: booking.vehicle_type,
      p_booking_date: booking.booking_date!,
      p_start_time: booking.end_time!,
      p_end_time: extendEndTime,
    });

    if (capacityCheck && !(capacityCheck as any).available) {
      toast.error("Selected time slot is already booked. Please choose another slot or vacate on time.");
      setExtendLoading(false);
      return;
    }

    // Calculate extra hours and price
    const [oeh, oem] = (booking.end_time || "23:59").split(":").map(Number);
    const [neh, nem] = extendEndTime.split(":").map(Number);
    const extraHours = Math.max(0, (neh * 60 + nem - oeh * 60 - oem) / 60);

    if (extraHours <= 0) {
      toast.error("New end time must be after current end time");
      setExtendLoading(false);
      return;
    }

    const { error } = await supabase
      .from("bookings")
      .update({
        end_time: extendEndTime,
        hours: booking.hours + Math.ceil(extraHours),
      })
      .eq("id", booking.id);

    setExtendLoading(false);
    if (error) toast.error("Failed to extend booking");
    else {
      toast.success("Booking extended!");
      setExtendingId(null);
      setExtendEndTime("");
      fetchBookings();
    }
  };

  const handleReschedule = async (booking: Booking) => {
    if (!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime) {
      toast.error("Please fill all reschedule fields");
      return;
    }
    setRescheduleLoading(true);

    // Check availability
    const { data: capacityCheck } = await supabase.rpc("check_parking_capacity", {
      p_space_id: booking.space_id,
      p_vehicle_type: booking.vehicle_type,
      p_booking_date: format(rescheduleDate, "yyyy-MM-dd"),
      p_start_time: rescheduleStartTime,
      p_end_time: rescheduleEndTime,
    });

    if (capacityCheck && !(capacityCheck as any).available) {
      toast.error("Selected slot is already booked. Please choose a different slot.");
      setRescheduleLoading(false);
      return;
    }

    const [sh, sm] = rescheduleStartTime.split(":").map(Number);
    const [eh, em] = rescheduleEndTime.split(":").map(Number);
    const hours = Math.max(1, Math.ceil((eh * 60 + em - sh * 60 - sm) / 60));

    const { error } = await supabase
      .from("bookings")
      .update({
        booking_date: format(rescheduleDate, "yyyy-MM-dd"),
        start_time: rescheduleStartTime,
        end_time: rescheduleEndTime,
        hours,
      })
      .eq("id", booking.id);

    setRescheduleLoading(false);
    if (error) toast.error("Failed to reschedule booking");
    else {
      toast.success("Booking rescheduled!");
      setReschedulingId(null);
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
                <Button variant="outline" size="sm" className="gap-1" onClick={() => { setReschedulingId(booking.id); setRescheduleStartTime(booking.start_time?.slice(0,5) || ""); setRescheduleEndTime(booking.end_time?.slice(0,5) || ""); }}>
                  <RefreshCw className="w-3.5 h-3.5" /> Reschedule
                </Button>
                <Button variant="destructive" size="sm" disabled={cancelling === booking.id} onClick={() => handleCancel(booking.id)}>
                  {cancelling === booking.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span className="ml-1">Cancel</span>
                </Button>
              </>
            )}
            {showActions && booking.computedStatus === "active" && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => { setExtendingId(booking.id); setExtendEndTime(""); }}>
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
      <Dialog open={!!extendingId} onOpenChange={(open) => { if (!open) setExtendingId(null); }}>
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
                  {extendLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</> : "Extend Booking"}
                </Button>
                <Button variant="ghost" onClick={() => setExtendingId(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={!!reschedulingId} onOpenChange={(open) => { if (!open) setReschedulingId(null); }}>
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
                <Button disabled={rescheduleLoading} onClick={() => handleReschedule(rescheduleBooking)}>
                  {rescheduleLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</> : "Reschedule"}
                </Button>
                <Button variant="ghost" onClick={() => setReschedulingId(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyBookingsPage;
