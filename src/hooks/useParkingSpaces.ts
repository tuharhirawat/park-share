import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";

export interface ParkingSpace {
  id: string;
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
  timezone: string;
}

interface ApiParkingSpace {
  id: string;
  title: string;
  address: string;
  city: string;
  pricePerHour: number;
  pricePerDay: number | null;
  vehicleTypes: string[];
  features: string[];
  imageUrls: string[];
  rating: number;
  reviewCount: number;
  lat: number | null;
  lng: number | null;
  available: boolean;
  timezone: string;
}

const mapApiToSpace = (s: ApiParkingSpace): ParkingSpace => ({
  id: `db_${s.id}`,
  title: s.title,
  address: s.address,
  city: s.city,
  pricePerHour: s.pricePerHour,
  pricePerDay: s.pricePerDay ?? s.pricePerHour * 8,
  vehicleTypes: s.vehicleTypes as ParkingSpace["vehicleTypes"],
  features: s.features,
  rating: s.rating,
  reviewCount: s.reviewCount,
  hostName: "Host",
  image: s.imageUrls[0] || "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600&h=400&fit=crop",
  images: s.imageUrls.length > 0 ? s.imageUrls : undefined,
  lat: s.lat ?? 0,
  lng: s.lng ?? 0,
  available: s.available,
  _dbId: s.id,
  timezone: s.timezone,
});

export const useParkingSpaces = () => {
  return useQuery({
    queryKey: ["parking-spaces"],
    queryFn: async (): Promise<ParkingSpace[]> => {
      try {
        const response = await api.get("/ParkingSpace/Search");
        return (response.data as ApiParkingSpace[]).map(mapApiToSpace);
      } catch (error) {
        console.error("Error fetching spaces:", error);
        return [];
      }
    },
  });
};

export const useParkingSpaceDetails = (id?: string) => {
  return useQuery({
    queryKey: ["parking-space", id],
    queryFn: async (): Promise<ParkingSpace | null> => {
      if (!id) return null;
      const dbId = id.replace(/^db_/, "");
      const response = await api.get(`/ParkingSpace/GetSpace/${dbId}`);
      return mapApiToSpace(response.data as ApiParkingSpace);
    },
    enabled: !!id,
  });
};