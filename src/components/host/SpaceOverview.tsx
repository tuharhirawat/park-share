import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Star,
  IndianRupee,
  CalendarClock,
  ParkingCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import api from "@/services/api";
import { getStatusStyles } from "@/lib/hostDashboardHelpers";
import { Space, ParkingSlot } from "@/types/host";
import EditSpaceDialog from "@/components/host/EditSpaceDialog";
import SlotManagementDialog from "@/components/host/SlotManagementDialog";
import HostSpaceOverviewReviewsTab from "@/components/host/tabs/HostSpaceOverviewReviewsTab";
import HostSpaceOverviewImagesTab from "@/components/host/tabs/HostSpaceOverviewImagesTab";
import HostSpaceOverviewEarningsTab from "@/components/host/tabs/HostSpaceOverviewEarningsTab";
import HostSpaceOverviewAnalyticsTab from "@/components/host/tabs/HostSpaceOverviewAnalyticsTab";
import HostSpaceOverviewBookingsTab from "@/components/host/tabs/HostSpaceOverviewBookingsTab";
import HostSpaceOverviewTab from "@/components/host/tabs/HostSpaceOverviewTab";

interface SpaceOverviewProps {
  space: Space;
  onBack: () => void;
  onChanged: () => void;
}

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "bookings", label: "Bookings" },
  { id: "images", label: "Images" },
  { id: "earnings", label: "Earnings" },
  { id: "analytics", label: "Analytics" },
  { id: "reviews", label: "Reviews" },
] as const;

// Vehicle type comes back inconsistently (e.g. "car" vs "Car" vs a raw enum
// number) depending on how a given endpoint serializes it. Normalize once
// here instead of trusting exact string equality everywhere.
const normalizeVehicleType = (value: unknown): "car" | "bike" => {
  if (typeof value === "number") return value === 1 ? "bike" : "car";
  return String(value ?? "").toLowerCase().startsWith("bike") ? "bike" : "car";
};

const SpaceOverview = ({ space, onBack, onChanged }: SpaceOverviewProps) => {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [managingSlotsOpen, setManagingSlotsOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [available, setAvailable] = useState(space.available);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);

  useEffect(() => {
    let cancelled = false;

    api.get(`/ParkingSpace/host/${space.id}/slots`)
      .then(({ data }) => {
        if (!cancelled) setSlots(data);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      });

    return () => {
      cancelled = true;
    };
  }, [space.id]);

  // Fixed: compare normalized vehicle types instead of exact-casing strings,
  // so real slots no longer show up as "0 car · 0 bike".
  const carSlots = slots.filter((s) => s.isActive && normalizeVehicleType(s.vehicleType) === "car");
  const bikeSlots = slots.filter((s) => s.isActive && normalizeVehicleType(s.vehicleType) === "bike");

  const statusStyles = getStatusStyles(space.listingStatus);

  const handleToggleAvailability = async (value: boolean) => {
    setAvailable(value);
    try {
      await api.patch(`/Host/availability/update/space/${space.id}`, { available: value });
      toast.success(value ? "Space enabled" : "Space disabled");
      onChanged();
    } catch {
      toast.error("Failed to update availability");
      setAvailable(!value);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          My Spaces
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium text-foreground truncate">{space.title}</span>
      </div>

      {/* Space header */}
      <div className="bg-card rounded-2xl p-6 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-display text-xl font-bold text-foreground">{space.title}</h2>
            <Badge variant="outline" className={statusStyles.className}>
              {statusStyles.text}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {space.address}, {space.city}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{available ? "Enabled" : "Disabled"}</span>
          <Switch checked={available} onCheckedChange={handleToggleAvailability} />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<IndianRupee className="w-4 h-4" />} label="Earnings" value={`₹${Number(space.earnings).toLocaleString("en-IN")}`} />
        <StatCard icon={<CalendarClock className="w-4 h-4" />} label="Bookings" value={String(space.totalBookings)} />
        <StatCard icon={<ParkingCircle className="w-4 h-4" />} label="Active now" value={String(space.activeNow)} />
        <StatCard
          icon={<Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
          label="Rating"
          value={space.reviewCount > 0 ? `${Number(space.rating).toFixed(1)} (${space.reviewCount})` : "—"}
        />
      </div>

      {/* Secondary navigation */}
      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s.id} value={s.id} className="whitespace-nowrap">
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="pt-4 space-y-4">
          <HostSpaceOverviewTab
            space={space}
            carSlots={carSlots}
            bikeSlots={bikeSlots}
            onEdit={() => setEditingSpace(space)}
            onEditSlots={() => setManagingSlotsOpen(true)}
          />
        </TabsContent>

        {/* Bookings */}
        <TabsContent value="bookings" className="pt-4">
          <HostSpaceOverviewBookingsTab
            spaceId={space.id}
          />
        </TabsContent>

        {/* Images */}
        <TabsContent value="images" className="pt-4">
          <HostSpaceOverviewImagesTab
            space={space}
            onChanged={onChanged}
          />
        </TabsContent>

        {/* Earnings */}
        <TabsContent value="earnings" className="pt-4 space-y-4">
          <HostSpaceOverviewEarningsTab
            spaceId={space.id}
          />
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="pt-4 space-y-4">
          <HostSpaceOverviewAnalyticsTab
            spaceId={space.id}
          />
        </TabsContent>

        {/* Reviews */}
        <TabsContent value="reviews" className="pt-4">
          <HostSpaceOverviewReviewsTab
            spaceId={space.id}
          />
        </TabsContent>
      </Tabs>

      <SlotManagementDialog
        open={managingSlotsOpen}
        spaceId={space.id}
        spaceTitle={space.title}
        slots={slots}
        onClose={() => setManagingSlotsOpen(false)}
        onChanged={onChanged}
      />

      <EditSpaceDialog
        space={editingSpace}
        onClose={() => setEditingSpace(null)}
        onSaved={() => {
          setEditingSpace(null);
          onChanged();
        }} />
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-card rounded-2xl p-4 card-shadow space-y-1">
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {icon}
      {label}
    </span>
    <p className="text-lg font-bold text-foreground">{value}</p>
  </div>
);

export default SpaceOverview;