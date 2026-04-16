import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, MapPin, Star, IndianRupee, TrendingUp, Clock, Car, Bike, BarChart3, Plus, Trash2, ImagePlus, X,
} from "lucide-react";
import { format, parseISO, subMonths } from "date-fns";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner";
import { useRef } from "react";

interface Space {
  id: string;
  title: string;
  address: string;
  city: string;
  price_per_hour: number;
  available: boolean;
  rating: number;
  review_count: number;
  car_slots: number;
  bike_slots: number;
  image_urls: string[];
}

interface ParkingSlot {
  id: string;
  space_id: string;
  label: string;
  vehicle_type: string;
  is_active: boolean;
}

interface Booking {
  id: string;
  space_id: string;
  space_title: string;
  hours: number;
  total_price: number;
  status: string;
  booking_date: string | null;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  vehicle_type: string;
}

interface Review {
  id: string;
  space_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

const HostDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Slot management
  const [managingSpaceId, setManagingSpaceId] = useState<string | null>(null);
  const [newSlotLabel, setNewSlotLabel] = useState("");
  const [newSlotType, setNewSlotType] = useState<string>("car");
  const [addingSlot, setAddingSlot] = useState(false);

  // Image management
  const [imageSpaceId, setImageSpaceId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: spacesData } = await supabase
      .from("parking_spaces")
      .select("id, title, address, city, price_per_hour, available, rating, review_count, car_slots, bike_slots, image_urls")
      .eq("user_id", user.id);

    const hostSpaces = (spacesData || []) as Space[];
    setSpaces(hostSpaces);

    if (hostSpaces.length === 0) {
      setBookings([]);
      setReviews([]);
      setSlots([]);
      setLoading(false);
      return;
    }

    const spaceIds = hostSpaces.map(s => s.id);

    const [bookingsRes, reviewsRes, slotsRes] = await Promise.all([
      supabase.from("bookings").select("*").in("space_id", spaceIds).order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").in("space_id", spaceIds).order("created_at", { ascending: false }),
      supabase.from("parking_slots").select("*").in("space_id", spaceIds).order("label"),
    ]);

    setBookings((bookingsRes.data as Booking[]) || []);
    setReviews((reviewsRes.data as Review[]) || []);
    setSlots((slotsRes.data as ParkingSlot[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  // Realtime
  useEffect(() => {
    if (!user || spaces.length === 0) return;
    const spaceIds = spaces.map(s => s.id);
    const channel = supabase
      .channel("host-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, (payload) => {
        const row = payload.new as Booking;
        if (row && spaceIds.includes(row.space_id)) fetchAll();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, spaces.length, fetchAll]);

  // Slot management handlers
  const handleAddSlot = async () => {
    if (!managingSpaceId || !newSlotLabel.trim()) { toast.error("Enter a slot label"); return; }
    setAddingSlot(true);
    const { error } = await supabase.from("parking_slots").insert({
      space_id: managingSpaceId,
      label: newSlotLabel.trim().toUpperCase(),
      vehicle_type: newSlotType,
    });
    setAddingSlot(false);
    if (error) {
      if (error.code === "23505") toast.error("Slot label already exists");
      else toast.error(error.message);
    } else {
      toast.success("Slot added!");
      setNewSlotLabel("");
      fetchAll();
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    const { error } = await supabase.from("parking_slots").delete().eq("id", slotId);
    if (error) toast.error("Failed to delete slot");
    else { toast.success("Slot removed"); fetchAll(); }
  };

  const handleToggleSlot = async (slotId: string, isActive: boolean) => {
    await supabase.from("parking_slots").update({ is_active: !isActive }).eq("id", slotId);
    fetchAll();
  };

  // Image management
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!imageSpaceId || !user) return;
    const files = Array.from(e.target.files || []);
    const space = spaces.find(s => s.id === imageSpaceId);
    if (!space) return;
    if ((space.image_urls?.length || 0) + files.length > 5) {
      toast.error("Maximum 5 images per listing");
      return;
    }
    setUploadingImage(true);
    const newUrls = [...(space.image_urls || [])];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { toast.error("Each image must be under 5 MB"); continue; }
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("parking-images").upload(path, file);
      if (error) { toast.error("Upload failed"); continue; }
      const { data } = supabase.storage.from("parking-images").getPublicUrl(path);
      newUrls.push(data.publicUrl);
    }
    await supabase.from("parking_spaces").update({ image_urls: newUrls }).eq("id", imageSpaceId);
    setUploadingImage(false);
    toast.success("Images updated!");
    fetchAll();
  };

  const handleRemoveImage = async (spaceId: string, index: number) => {
    const space = spaces.find(s => s.id === spaceId);
    if (!space) return;
    const newUrls = space.image_urls.filter((_, i) => i !== index);
    await supabase.from("parking_spaces").update({ image_urls: newUrls }).eq("id", spaceId);
    toast.success("Image removed");
    fetchAll();
  };

  const nonCancelledBookings = useMemo(() => bookings.filter(b => b.status !== "cancelled"), [bookings]);
  const totalEarnings = useMemo(() => nonCancelledBookings.reduce((s, b) => s + Number(b.total_price), 0), [nonCancelledBookings]);

  const earningsOverTime = useMemo(() => {
    const months: { month: string; earnings: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM");
      const sum = nonCancelledBookings.filter(b => b.booking_date && b.booking_date.startsWith(key)).reduce((s, b) => s + Number(b.total_price), 0);
      months.push({ month: label, earnings: sum });
    }
    return months;
  }, [nonCancelledBookings]);

  const bookingsPerListing = useMemo(
    () => spaces.map(s => ({ name: s.title.length > 20 ? s.title.slice(0, 20) + "…" : s.title, bookings: nonCancelledBookings.filter(b => b.space_id === s.id).length })),
    [spaces, nonCancelledBookings]
  );

  const peakHours = useMemo(() => {
    const hourCounts: Record<number, number> = {};
    nonCancelledBookings.forEach(b => { if (b.start_time) { const h = parseInt(b.start_time.split(":")[0]); hourCounts[h] = (hourCounts[h] || 0) + 1; } });
    return Array.from({ length: 24 }, (_, i) => ({ hour: `${i.toString().padStart(2, "0")}:00`, bookings: hourCounts[i] || 0 }));
  }, [nonCancelledBookings]);

  const liveStatus = useMemo(() => {
    const now = new Date();
    return spaces.map(s => {
      const spaceBookings = nonCancelledBookings.filter(b => b.space_id === s.id);
      const activeNow = spaceBookings.filter(b => {
        if (!b.booking_date || !b.start_time) return false;
        const bd = parseISO(b.booking_date);
        const [sh, sm] = b.start_time.split(":").map(Number);
        const start = new Date(bd); start.setHours(sh, sm, 0, 0);
        const end = b.end_time
          ? (() => { const [eh, em] = b.end_time!.split(":").map(Number); const e = new Date(bd); e.setHours(eh, em, 0, 0); return e; })()
          : new Date(start.getTime() + b.hours * 3600000);
        return now >= start && now <= end;
      });
      const upcomingToday = spaceBookings.filter(b => {
        if (!b.booking_date || !b.start_time) return false;
        const bd = parseISO(b.booking_date);
        const [sh, sm] = b.start_time.split(":").map(Number);
        const start = new Date(bd); start.setHours(sh, sm, 0, 0);
        return start > now && format(bd, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
      });
      return { ...s, activeCount: activeNow.length, upcomingCount: upcomingToday.length, totalBookings: spaceBookings.length };
    });
  }, [spaces, nonCancelledBookings]);

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "N/A";

  const activeBookingsCount = useMemo(() => {
    const now = new Date();
    return nonCancelledBookings.filter(b => {
      if (!b.booking_date || !b.start_time) return false;
      const bd = parseISO(b.booking_date);
      const [sh, sm] = b.start_time.split(":").map(Number);
      const start = new Date(bd); start.setHours(sh, sm, 0, 0);
      const end = b.end_time
        ? (() => { const [eh, em] = b.end_time!.split(":").map(Number); const e = new Date(bd); e.setHours(eh, em, 0, 0); return e; })()
        : new Date(start.getTime() + b.hours * 3600000);
      return now >= start && now <= end;
    }).length;
  }, [nonCancelledBookings]);

  if (authLoading || loading) {
    return (
      <div className="pt-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-24 text-center">
          <p className="text-muted-foreground text-lg mb-4">You haven't listed any parking spaces yet.</p>
          <Button onClick={() => navigate("/host")}>List Your First Space</Button>
        </div>
      </div>
    );
  }

  const chartConfig = {
    earnings: { label: "Earnings (₹)", color: "hsl(var(--primary))" },
    bookings: { label: "Bookings", color: "hsl(var(--primary))" },
  };

  const managingSpace = spaces.find(s => s.id === managingSpaceId);
  const managingSlots = slots.filter(s => s.space_id === managingSpaceId);
  const imageSpace = spaces.find(s => s.id === imageSpaceId);

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8">Host Dashboard</h1>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-card rounded-2xl p-5 card-shadow">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Car className="w-4 h-4" /> Listings</div>
              <p className="text-2xl font-bold text-foreground">{spaces.length}</p>
            </div>
            <div className="bg-card rounded-2xl p-5 card-shadow">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><BarChart3 className="w-4 h-4" /> Total Bookings</div>
              <p className="text-2xl font-bold text-foreground">{nonCancelledBookings.length}</p>
            </div>
            <div className="bg-card rounded-2xl p-5 card-shadow">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Clock className="w-4 h-4" /> Active Now</div>
              <p className="text-2xl font-bold text-green-600">{activeBookingsCount}</p>
            </div>
            <div className="bg-card rounded-2xl p-5 card-shadow">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><IndianRupee className="w-4 h-4" /> Earnings</div>
              <p className="text-2xl font-bold text-foreground">₹{totalEarnings.toLocaleString()}</p>
            </div>
            <div className="bg-card rounded-2xl p-5 card-shadow">
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Star className="w-4 h-4" /> Avg Rating</div>
              <p className="text-2xl font-bold text-foreground">{avgRating}</p>
            </div>
          </div>

          <Tabs defaultValue="listings" className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-5">
              <TabsTrigger value="listings">My Listings</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="live">Live Status</TabsTrigger>
            </TabsList>

            {/* Listings with slot/image management */}
            <TabsContent value="listings">
              <div className="space-y-4">
                {liveStatus.map(s => (
                  <div key={s.id} className="bg-card rounded-2xl p-6 card-shadow space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="font-bold text-foreground">{s.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {s.address}, {s.city}</p>
                        <p className="text-xs text-muted-foreground">Capacity: {s.car_slots} car slots · {s.bike_slots} bike slots · {s.totalBookings} bookings</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={s.activeCount > 0 ? "bg-green-500/10 text-green-600 border-green-500/20" : s.available ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>
                          {s.activeCount > 0 ? `${s.activeCount} In Use` : s.available ? "Available" : "Unavailable"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">₹{s.price_per_hour}/hr</span>
                      </div>
                    </div>

                    {/* Images preview */}
                    {s.image_urls && s.image_urls.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {s.image_urls.map((url, i) => (
                          <div key={i} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden group">
                            <img src={url} alt="" className="w-full h-full object-cover" />
                            <button onClick={() => handleRemoveImage(s.id, i)} className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setManagingSpaceId(s.id)}>
                        <Plus className="w-3.5 h-3.5" /> Manage Slots
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => { setImageSpaceId(s.id); imageInputRef.current?.click(); }}>
                        <ImagePlus className="w-3.5 h-3.5" /> {uploadingImage ? "Uploading..." : "Add Images"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </TabsContent>

            {/* Earnings */}
            <TabsContent value="earnings">
              <div className="bg-card rounded-2xl p-6 card-shadow">
                <h3 className="font-bold text-foreground mb-4">Earnings Over Time</h3>
                <ChartContainer config={chartConfig} className="h-72 w-full">
                  <LineChart data={earningsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="earnings" stroke="var(--color-earnings)" strokeWidth={2} dot />
                  </LineChart>
                </ChartContainer>
              </div>
              <div className="mt-6 space-y-3">
                <h3 className="font-bold text-foreground">Earnings Per Listing</h3>
                {spaces.map(s => {
                  const earned = nonCancelledBookings.filter(b => b.space_id === s.id).reduce((sum, b) => sum + Number(b.total_price), 0);
                  return (
                    <div key={s.id} className="bg-card rounded-xl p-4 card-shadow flex justify-between items-center">
                      <span className="text-foreground font-medium">{s.title}</span>
                      <span className="font-bold text-foreground">₹{earned.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Analytics */}
            <TabsContent value="analytics">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card rounded-2xl p-6 card-shadow">
                  <h3 className="font-bold text-foreground mb-4">Bookings Per Listing</h3>
                  <ChartContainer config={chartConfig} className="h-64 w-full">
                    <BarChart data={bookingsPerListing}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
                <div className="bg-card rounded-2xl p-6 card-shadow">
                  <h3 className="font-bold text-foreground mb-4">Peak Booking Hours</h3>
                  <ChartContainer config={chartConfig} className="h-64 w-full">
                    <BarChart data={peakHours}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>
            </TabsContent>

            {/* Reviews */}
            <TabsContent value="reviews">
              {reviews.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No reviews yet.</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map(r => {
                    const sp = spaces.find(s => s.id === r.space_id);
                    return (
                      <div key={r.id} className="bg-card rounded-xl p-5 card-shadow space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground text-sm">{sp?.title || "Unknown"}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star key={i} className={`w-4 h-4 ${i <= r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`} />
                          ))}
                        </div>
                        {r.review_text && <p className="text-sm text-muted-foreground">{r.review_text}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Live Status */}
            <TabsContent value="live">
              <div className="space-y-4">
                {liveStatus.map(s => (
                  <div key={s.id} className={`bg-card rounded-2xl p-6 card-shadow ${s.activeCount > 0 ? "ring-2 ring-green-500/30" : ""}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-foreground">{s.title}</h3>
                        <p className="text-sm text-muted-foreground">{s.address}, {s.city}</p>
                        <p className="text-xs text-muted-foreground mt-1">Capacity: {s.car_slots} cars · {s.bike_slots} bikes</p>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <Badge variant="outline" className={s.activeCount > 0 ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-muted text-muted-foreground"}>
                          {s.activeCount > 0 ? `${s.activeCount} Currently Occupied` : "No Active Users"}
                        </Badge>
                        {s.upcomingCount > 0 && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">{s.upcomingCount} Upcoming Today</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Slot Management Dialog */}
      <Dialog open={!!managingSpaceId} onOpenChange={open => { if (!open) setManagingSpaceId(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Manage Slots — {managingSpace?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Existing slots */}
            {managingSlots.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {managingSlots.map(slot => (
                  <div key={slot.id} className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-foreground">{slot.label}</span>
                      <Badge variant="secondary" className="capitalize text-xs">{slot.vehicle_type}</Badge>
                      {!slot.is_active && <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">Inactive</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleToggleSlot(slot.id, slot.is_active)}>
                        {slot.is_active ? "Disable" : "Enable"}
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteSlot(slot.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No slots configured yet.</p>
            )}

            {/* Add new slot */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium block mb-1">Label</label>
                <Input placeholder="e.g., C-6, B-3" value={newSlotLabel} onChange={e => setNewSlotLabel(e.target.value)} />
              </div>
              <div className="w-28">
                <label className="text-sm font-medium block mb-1">Type</label>
                <Select value={newSlotType} onValueChange={setNewSlotType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="bike">Bike</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button disabled={addingSlot} onClick={handleAddSlot}>
                {addingSlot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default HostDashboard;
