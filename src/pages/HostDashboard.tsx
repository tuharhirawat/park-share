import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, MapPin, Star, IndianRupee, Clock, Car, BarChart3, Plus, Trash2, ImagePlus, X } from "lucide-react";
import { format, parseISO, subMonths } from "date-fns";
import { ChartContainer, ChartTooltip, ChartTooltipContent, } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRef } from "react";
import MapWithSearch from "@/components/MapWithSearch";
import ReviewMetricsPanel from "@/components/host/ReviewMetricsPanel";
import { Textarea } from "@/components/ui/textarea";

interface Space {
  id: string;
  title: string;
  address: string;
  city: string;
  price_per_hour: number;
  price_per_day?: number | null;
  vehicle_types?: string[];
  features?: string[];
  description?: string | null;
  lat?: number;
  lng?: number;
  available: boolean;
  rating: number;
  review_count: number;
  image_urls: string[];
  last_title_change_at?: string;
  last_city_change_at?: string;
  last_address_change_at?: string;
  last_feature_change_at?: string;
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

const DAYS = {
  TITLE: 30,
  CITY: 30,
  ADDRESS: 60,
  FEATURES: 30,
};

const isCooldownActive = (lastDate?: string, days?: number) => {
  if (!lastDate) return false;
  const diff = Date.now() - new Date(lastDate).getTime();
  return diff < days! * 24 * 60 * 60 * 1000;
};

const handleSpaceUpdate = ({
  editing,
  original,
}: {
  editing: Space;
  original: Space;
}) => {
  const now = new Date();
  const updates: any = {};
  const requests: any[] = [];
  const errors: any = {};

  if (editing.title !== original.title) {
    if (isCooldownActive(original.last_title_change_at, DAYS.TITLE)) {
      errors.title = "Can be changed after 30 days";
    } else {
      requests.push({
        field: "title",
        old_value: original.title,
        new_value: editing.title,
      });
      updates.title = editing.title;
      updates.last_title_change_at = now;
    }
  }

  if (editing.city !== original.city) {
    if (isCooldownActive(original.last_city_change_at, DAYS.CITY)) {
      errors.city = "Can be changed after 30 days";
    } else {
      requests.push({
        field: "city",
        old_value: original.city,
        new_value: editing.city,
      });
      updates.city = editing.city;
      updates.last_city_change_at = now;
    }
  }

  if (editing.address !== original.address) {
    if (isCooldownActive(original.last_address_change_at, DAYS.ADDRESS)) {
      errors.address = "Can be changed after 60 days";
    } else {
      requests.push({
        field: "address",
        old_value: original.address,
        new_value: editing.address,
      });
      updates.address = editing.address;
      updates.lat = editing.lat;
      updates.lng = editing.lng;
      updates.last_address_change_at = now;
    }
  }

  if (JSON.stringify(editing.features) !== JSON.stringify(original.features)) {
    if (isCooldownActive(original.last_feature_change_at, DAYS.FEATURES)) {
      errors.features = "Can be changed after 30 days";
    } else {
      updates.features = editing.features;
      updates.last_feature_change_at = now;
    }
  }

  updates.price_per_hour = editing.price_per_hour;
  updates.price_per_day = editing.price_per_day ?? null;
  updates.description = editing.description ?? null;

  return { updates, requests, errors };
};

const isBookingActiveNow = (
  booking: Booking,
  now: Date
) => {
  if (!booking.booking_date || !booking.start_time)
    return false;

  const bd = parseISO(booking.booking_date);

  const [sh, sm] =
    booking.start_time.split(":").map(Number);

  const start = new Date(bd);
  start.setHours(sh, sm, 0, 0);

  const end = booking.end_time
    ? (() => {
      const [eh, em] =
        booking.end_time.split(":").map(Number);

      const e = new Date(bd);
      e.setHours(eh, em, 0, 0);
      return e;
    })()
    : new Date(
      start.getTime() +
      booking.hours * 3600000
    );

  return now >= start && now <= end;
};

const HostDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Slot management
  const [managingSpaceId, setManagingSpaceId] = useState<string | null>(null);
  const [newSlotType, setNewSlotType] = useState<string>("car");
  const [addingSlot, setAddingSlot] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [originalSpace, setOriginalSpace] = useState<Space | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Image management
  const [imageSpaceId, setImageSpaceId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<any>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const mapRef = useRef<any>(null);

  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    city?: string;
    address?: string;
    features?: string;
  }>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: spacesData } = await supabase
      .from("parking_spaces")
      .select("id, title, address, city, price_per_hour, price_per_day, vehicle_types, features,  description, lat, lng, available, rating, review_count, image_urls, last_title_change_at, last_city_change_at, last_address_change_at, last_feature_change_at")
      .eq("user_id", user.id);

    const hostSpaces = (spacesData || []) as Space[];
    setSpaces(hostSpaces);

    if (hostSpaces.length === 0) {
      setBookings([]);
      setSlots([]);
      setLoading(false);
      return;
    }

    const spaceIds = hostSpaces.map(s => s.id);

    const [bookingsRes, slotsRes] = await Promise.all([
      supabase.from("bookings").select("*").in("space_id", spaceIds).order("created_at", { ascending: false }),
      supabase.from("parking_slots").select("*").in("space_id", spaceIds).order("label"),
    ]);

    setBookings((bookingsRes.data as Booking[]) || []);
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
  }, [user, spaces, fetchAll]);

  // Slot management handlers
  const handleAddSlot = async () => {
    if (!managingSpaceId) return;

    setAddingSlot(true);

    try {

      const existing = slots.filter(
        s =>
          s.space_id === managingSpaceId &&
          s.vehicle_type === newSlotType
      );

      const numbers = existing.map(s => {
        const parts = s.label.split("-");
        return parseInt(parts[1]) || 0;
      });

      const nextNumber =
        numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

      const prefix = newSlotType === "car" ? "C" : "B";
      const newLabel = `${prefix}-${nextNumber}`;

      const { error } = await supabase
        .from("parking_slots")
        .insert({
          space_id: managingSpaceId,
          label: newLabel,
          vehicle_type: newSlotType,
        });

      if (error) throw error;

      toast.success(`Slot ${newLabel} added`);
      fetchAll();

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAddingSlot(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    const { error } = await supabase.from("parking_slots").delete().eq("id", slotId);
    if (error) toast.error("Failed to delete slot");
    else { toast.success("Slot removed"); fetchAll(); }
  };

  const handleToggleSlot = async (slotId: string, isActive: boolean) => {
    // Only check when disabling
    if (isActive) {
      const slot = slots.find(s => s.id === slotId);
      if (!slot) return;

      const now = new Date();

      const activeBooking = bookings.find(
        b =>
          b.space_id === slot.space_id &&
          b.vehicle_type === slot.vehicle_type &&
          b.status !== "cancelled" &&
          isBookingActiveNow(b, now)
      );

      if (activeBooking) {
        toast.error(`Slot ${slot.label} is currently in use`);
        return;
      }
    }

    const { error } = await supabase
      .from("parking_slots")
      .update({ is_active: !isActive })
      .eq("id", slotId);

    if (error) {
      toast.error("Failed to update slot");
    } else {
      fetchAll();
    }
  };

  const handleSaveEdit = async () => {
    if (!editingSpace || !originalSpace) return;

    setSavingEdit(true);

    try {
      const { updates, requests, errors } = handleSpaceUpdate({
        editing: editingSpace,
        original: originalSpace,
      });

      setFieldErrors(errors);

      if (Object.keys(errors).length > 0) {
        setSavingEdit(false);
        return;
      }

      // Insert requests (if any)
      if (requests.length > 0) {
        await supabase.from("parking_space_update_requests").insert(
          requests.map(r => ({
            ...r,
            space_id: editingSpace.id,
          }))
        );
      }

      // Update main table
      const { error } = await supabase
        .from("parking_spaces")
        .update(updates)
        .eq("id", editingSpace.id);

      if (error) throw error;

      toast.success("Updated successfully");

      setEditingSpace(null);
      setOriginalSpace(null);
      fetchAll();

    } catch (err: any) {
      toast.error(err.message || "Failed to update space");
    }
    finally {
      setSavingEdit(false);
    }
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
    const uploadedUrls = (
      await Promise.all(
        files.map(async file => {
          if (file.size > 5 * 1024 * 1024) {
            toast.error("Each image under 5MB");
            return null;
          }

          const ext = file.name.split(".").pop();

          const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)
            }.${ext}`;

          const { error } = await supabase.storage
            .from("parking-images")
            .upload(path, file);

          if (error) {
            toast.error("Upload failed");
            return null;
          }

          return supabase.storage
            .from("parking-images")
            .getPublicUrl(path)
            .data.publicUrl;
        })
      )
    ).filter(Boolean);

    const newUrls = [
      ...(space.image_urls || []),
      ...uploadedUrls
    ];

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
  const bookingsBySpace = useMemo(() => {
    const grouped: Record<string, Booking[]> = {};
    nonCancelledBookings.forEach(booking => {
      if (!grouped[booking.space_id]) {
        grouped[booking.space_id] = [];
      }
      grouped[booking.space_id].push(booking);
    });
    return grouped;
  }, [nonCancelledBookings]);
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
    () => spaces.map(s => ({ name: s.title.length > 20 ? s.title.slice(0, 20) + "…" : s.title, bookings: (bookingsBySpace[s.id] || []).length })),
    [spaces, bookingsBySpace]
  );

  const peakHours = useMemo(() => {
    const hourCounts: Record<number, number> = {};
    nonCancelledBookings.forEach(b => { if (b.start_time) { const h = parseInt(b.start_time.split(":")[0]); hourCounts[h] = (hourCounts[h] || 0) + 1; } });
    return Array.from({ length: 24 }, (_, i) => ({ hour: `${i.toString().padStart(2, "0")}:00`, bookings: hourCounts[i] || 0 }));
  }, [nonCancelledBookings]);

  const liveStatus = useMemo(() => {
    const now = new Date();
    return spaces.map(s => {
      const spaceBookings = bookingsBySpace[s.id] || [];
      const activeNow = spaceBookings.filter(b => isBookingActiveNow(b, now));
      const upcomingToday = spaceBookings.filter(b => {
        if (!b.booking_date || !b.start_time) return false;
        const bd = parseISO(b.booking_date);
        const [sh, sm] = b.start_time.split(":").map(Number);
        const start = new Date(bd); start.setHours(sh, sm, 0, 0);
        return start > now && format(bd, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
      });
      return { ...s, activeCount: activeNow.length, upcomingCount: upcomingToday.length, totalBookings: spaceBookings.length };
    });
  }, [spaces, bookingsBySpace]);

  const avgRating = useMemo(
    () =>
      spaces.length
        ? (
          spaces.reduce(
            (sum, s) => sum + Number(s.rating || 0),
            0
          ) / spaces.length
        ).toFixed(1)
        : "N/A",
    [spaces]
  );

  const activeBookingsCount = useMemo(() => {
    const now = new Date();

    return nonCancelledBookings.filter(
      b => isBookingActiveNow(b, now)
    ).length;

  }, [nonCancelledBookings]);

  const chartConfig = {
    earnings: { label: "Earnings (₹)", color: "hsl(var(--primary))" },
    bookings: { label: "Bookings", color: "hsl(var(--primary))" },
  };

  const slotCountsBySpace = useMemo(() => {
    const map: Record<string, { car: number; bike: number }> = {};

    slots.forEach(s => {
      if (!s.is_active) return;

      if (!map[s.space_id]) {
        map[s.space_id] = { car: 0, bike: 0 };
      }

      if (s.vehicle_type === "car") map[s.space_id].car++;
      if (s.vehicle_type === "bike") map[s.space_id].bike++;
    });

    return map;
  }, [slots]);

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

  const managingSpace = spaces.find(s => s.id === managingSpaceId);
  const managingSlots = slots.filter(s => s.space_id === managingSpaceId);

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
                {liveStatus.map(s => {
                  const counts = slotCountsBySpace[s.id] || { car: 0, bike: 0 };

                  return (
                    <div key={s.id} className="relative bg-card rounded-2xl p-6 card-shadow space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h3 className="font-bold text-foreground">{s.title}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {s.address}, {s.city}</p>
                          <p className="text-xs text-muted-foreground">
                            Capacity: {counts.car} car slots · {counts.bike} bike slots · {s.totalBookings} bookings
                            {s.review_count > 0 && ` · ${s.rating} ★ (${s.review_count} reviews)`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={s.activeCount > 0 ? "bg-green-500/10 text-green-600 border-green-500/20" : s.available ? "bg-blue-500/10 text-blue-600 border-blue-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"}>
                            {s.activeCount > 0 ? `${s.activeCount} In Use` : s.available ? "Available" : "Not Available"}
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingSpace(s);
                            setOriginalSpace(s);
                          }}
                        >
                          Edit Details
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => { setImageSpaceId(s.id); imageInputRef.current?.click(); }}>
                          <ImagePlus className="w-3.5 h-3.5" /> {uploadingImage ? "Uploading..." : "Add Images"}
                        </Button>
                      </div>

                      <div className="absolute bottom-4 right-4 flex items-center gap-2 md:bottom-4 md:right-4">
                        <span className="text-xs text-muted-foreground">
                          {s.available ? "Enabled" : "Disabled"}
                        </span>

                        <Switch
                          checked={s.available}
                          onCheckedChange={async (value) => {
                            setSpaces((prev) =>
                              prev.map((sp) =>
                                sp.id === s.id ? { ...sp, available: value } : sp
                              )
                            );

                            const { error } = await supabase
                              .from("parking_spaces")
                              .update({ available: value })
                              .eq("id", s.id);

                            if (error) {
                              toast.error("Failed to update availability");

                              setSpaces((prev) =>
                                prev.map((sp) =>
                                  sp.id === s.id ? { ...sp, available: !value } : sp
                                )
                              );
                            } else {
                              toast.success(
                                value ? "Space enabled" : "Space disabled"
                              );
                            }
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
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
                  const earned = (bookingsBySpace[s.id] || []).reduce((sum, b) => sum + Number(b.total_price), 0);
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

            <TabsContent value="reviews">
              <ReviewMetricsPanel
                hostId={user.id}
              />
            </TabsContent>

            {/* Live Status */}
            <TabsContent value="live">
              <div className="space-y-4">
                {liveStatus.map(s => {
                  const counts = slotCountsBySpace[s.id] || { car: 0, bike: 0 };
                  return (
                    <div key={s.id} className={`bg-card rounded-2xl p-6 card-shadow ${s.activeCount > 0 ? "ring-2 ring-green-500/30" : ""}`}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-foreground">{s.title}</h3>
                          <p className="text-sm text-muted-foreground">{s.address}, {s.city}</p>
                          <p className="text-xs text-muted-foreground mt-1">Capacity: {counts.car} cars · {counts.bike} bikes</p>
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
                  )
                })}
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

      <Dialog open={!!editingSpace} onOpenChange={() => setEditingSpace(null)}>
        <DialogContent className="max-w-lg rounded-xl border border-border/50 overflow-visible p-5">
          <DialogHeader>
            <DialogTitle>Edit Space</DialogTitle>
          </DialogHeader>

          {editingSpace && (
            <div className="space-y-3 overflow-y-auto max-h-[70vh] px-1 pt-1">
              <Input
                className="h-9 text-sm"
                value={editingSpace.title}
                onChange={(e) => {
                  setEditingSpace({ ...editingSpace, title: e.target.value });
                  setFieldErrors(prev => ({ ...prev, title: undefined }));
                }}
                placeholder="Title"
              />
              {fieldErrors.title && (
                <p className="text-xs text-red-500">{fieldErrors.title}</p>
              )}

              <Input
                className="h-9 text-sm"
                value={editingSpace.address}
                readOnly
                onClick={() => {
                  setPendingLocation(
                    editingSpace.lat && editingSpace.lng
                      ? {
                        lat: editingSpace.lat,
                        lng: editingSpace.lng,
                        address: editingSpace.address,
                      }
                      : null
                  );
                  setMapOpen(true);
                  setFieldErrors(prev => ({ ...prev, address: undefined }));
                }}
              />
              {fieldErrors.address && (
                <p className="text-xs text-red-500">{fieldErrors.address}</p>
              )}

              <Input
                className="h-9 text-sm"
                value={editingSpace.city}
                onChange={(e) => {
                  setEditingSpace({ ...editingSpace, city: e.target.value });
                  setFieldErrors(prev => ({ ...prev, city: undefined }));
                }}
                placeholder="City"
              />
              {fieldErrors.city && (
                <p className="text-xs text-red-500">{fieldErrors.city}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input
                  className="h-9 text-sm"
                  type="number"
                  value={editingSpace.price_per_hour}
                  onChange={(e) =>
                    setEditingSpace({
                      ...editingSpace,
                      price_per_hour: Number(e.target.value),
                    })
                  }
                  placeholder="₹ / hour"
                />

                <Input
                  className="h-9 text-sm"
                  type="number"
                  value={editingSpace.price_per_day || ""}
                  onChange={(e) =>
                    setEditingSpace({
                      ...editingSpace,
                      price_per_day: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="₹ / day"
                />
              </div>

              <Textarea
                className="min-h-[80px] text-sm"
                value={editingSpace.description || ""}
                onChange={(e) =>
                  setEditingSpace({
                    ...editingSpace,
                    description: e.target.value,
                  })
                }
                placeholder="Description"
              />

              <div className="flex flex-wrap gap-2">
                {["CCTV", "Guard", "Covered", "Gated", "EV Charging", "Well-Lit", "24/7 Access"].map(f => (
                  <Button
                    className="h-8 px-3 text-xs"
                    key={f}
                    size="sm"
                    variant={editingSpace.features?.includes(f) ? "default" : "outline"}
                    onClick={() => {
                      const updated = editingSpace.features?.includes(f)
                        ? editingSpace.features.filter(i => i !== f)
                        : [...(editingSpace.features || []), f];

                      setEditingSpace({ ...editingSpace, features: updated });
                      setFieldErrors(prev => ({ ...prev, features: undefined }));
                    }}
                  >
                    {f}
                  </Button>
                ))}
              </div>
              {fieldErrors.features && (
                <p className="text-xs text-red-500">{fieldErrors.features}</p>
              )}

              <Button
                className="w-full h-9 text-sm"
                disabled={savingEdit}
                onClick={handleSaveEdit}
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={mapOpen}
        onOpenChange={(open) => {
          setMapOpen(open);

          if (!open) {
            setPendingLocation(null);
          }
        }}
      >
        <DialogContent className="max-w-xl rounded-xl border border-border/50 p-5">

          <DialogTitle className="text-white text-lg font-semibold">
            Select Location
          </DialogTitle>

          <div className="space-y-2">
            <div className="h-[340px] overflow-hidden rounded-xl border border-border/50">
              <MapWithSearch
                ref={mapRef}
                onLoadingChange={setIsFetchingLocation}
                initialLocation={pendingLocation}
                onSelect={(loc: any) => {
                  setPendingLocation(loc);
                }}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">

            <button
              type="button"
              disabled={isFetchingLocation}
              onClick={() => {
                if (!mapRef.current) {
                  toast.error("Map not ready");
                  return;
                }

                mapRef.current.useCurrentLocation();
              }}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition"
            >
              {isFetchingLocation
                ? "Fetching location..."
                : "Use Current Location"}
            </button>

            <button
              type="button"
              disabled={!pendingLocation}
              onClick={() => {
                if (!pendingLocation || !editingSpace) return;

                setEditingSpace({
                  ...editingSpace,
                  address: pendingLocation.address,
                  lat: pendingLocation.lat,
                  lng: pendingLocation.lng,
                });

                setMapOpen(false);
              }}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition"
            >
              Confirm Location
            </button>

          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default HostDashboard;