import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mockSpaces, type ParkingSpace } from "@/lib/mockData";

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
}

const mapDbToSpace = (s: DbParkingSpace): ParkingSpace => ({
  id: `db_${s.id}`,
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
  lat: s.lat ?? 0,
  lng: s.lng ?? 0,
  available: s.available,
  // Keep reference to db id for future use
  _dbId: s.id,
});

export const useParkingSpaces = () => {
  return useQuery({
    queryKey: ["parking-spaces"],
    queryFn: async (): Promise<ParkingSpace[]> => {
      const { data, error } = await supabase
        .from("parking_spaces")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching spaces:", error);
        // Fallback to mock data on error
        return mockSpaces;
      }

      const dbSpaces = (data as unknown as DbParkingSpace[]).map(mapDbToSpace);
      // Combine: real data first, then mock data
      return [...dbSpaces, ...mockSpaces];
    },
  });
};
