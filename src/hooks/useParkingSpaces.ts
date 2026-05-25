import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ParkingSpace {
  id: string;
  userId?: string;
  title: string;
  address: string;
  city: string;
  pricePerHour: number;
  pricePerDay: number;
  vehicleTypes: ("bike" | "car")[];
  features: string[];
  rating: number;
  reviewCount: number;
  hostName: string;
  image: string;
  images?: string[];
  lat: number;
  lng: number;
  available: boolean;
  _dbId?: string;
  latestTitleUpdate?: {
    old_value: string;
    new_value: string;
  };
}

export interface DbParkingSpace {
  id: string;
  user_id: string;
  title: string;
  address: string;
  city: string;
  price_per_hour: number;
  price_per_day: number | null;
  vehicle_types: string[];
  features: string[];
  description: string | null;
  image_urls: string[];
  rating: number;
  review_count: number;
  lat: number | null;
  lng: number | null;
  available: boolean;
  listing_status: string;
}

const mapDbToSpace = (s: DbParkingSpace): ParkingSpace => ({
  id: `db_${s.id}`,
  userId: s.user_id,
  title: s.title,
  address: s.address,
  city: s.city,
  pricePerHour: s.price_per_hour,
  pricePerDay: s.price_per_day ?? s.price_per_hour * 8,
  vehicleTypes: s.vehicle_types as ParkingSpace["vehicleTypes"],
  features: s.features,
  rating: s.rating,
  reviewCount: s.review_count,
  hostName: "Host",
  image: s.image_urls[0] || "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&h=400&fit=crop",
  images: s.image_urls.length > 0 ? s.image_urls : undefined,
  lat: s.lat ?? 0,
  lng: s.lng ?? 0,
  available: s.available,
  _dbId: s.id,
});

export const useParkingSpaces = () => {
  return useQuery({
    queryKey: ["parking-spaces"],
    queryFn: async (): Promise<ParkingSpace[]> => {
      const { data, error } = await supabase
        .from("parking_spaces")
        .select("*")
        .eq("available", true)
        .eq("listing_status", "approved")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching spaces:", error);
        return [];
      }

      const dbSpaces = (data as unknown as DbParkingSpace[]).map(mapDbToSpace);
      const spaceIds = dbSpaces.map(space => space._dbId);

      const { data: titleUpdates } = await supabase
        .from("parking_space_update_requests")
        .select(`
          space_id,
          old_value,
          new_value,
          created_at
        `)
        .eq("field", "title")
        .in("status", ["APPROVED", "PENDING"])
        .in("space_id", spaceIds)
        .order("created_at", { ascending: false });

      const latestTitleMap: Record<string, any> = {};

      titleUpdates?.forEach(update => {

        if (!latestTitleMap[update.space_id]) {
          latestTitleMap[update.space_id] = update;
        }

      });

      const enrichedSpaces = dbSpaces.map(space => ({
        ...space,

        latestTitleUpdate:
          latestTitleMap[space._dbId || ""]
            ? {
              old_value:
                latestTitleMap[space._dbId || ""].old_value,

              new_value:
                latestTitleMap[space._dbId || ""].new_value,
            }
            : undefined,
      }));

      return enrichedSpaces;
    },
  });
};
