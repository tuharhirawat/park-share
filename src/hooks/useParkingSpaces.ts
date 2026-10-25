import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import type { Paginated } from "@/types/pagination";
import type { VehicleType } from "@/enums/vehicleTypeEnum";
import type { ParkingSpaceSearchDashboardSummary, ParkingSpaceDetails } from "@/types/spaceDetails";

export const DEFAULT_TIMEZONE = "Asia/Kolkata";

interface UseParkingSpacesParams {
  page: number;
  search?: string;
  cityId?: string;
  vehicleType?: VehicleType | null;
}

export const useParkingSpaces = ({
  page,
  search,
  cityId,
  vehicleType,
}: UseParkingSpacesParams) =>
  useQuery({
    queryKey: ["parking-spaces", page, search, cityId, vehicleType],
    queryFn: async () => {
      const { data } = await api.get<Paginated<ParkingSpaceSearchDashboardSummary>>(
        "/ParkingSpace/Search",
        {
          params: {
            page,
            search: search || undefined,
            cityId: cityId || undefined,
            vehicleType: vehicleType || undefined,
          },
        }
      );

      return data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

export const useParkingSpaceDetails = (id?: string) => {
 return useQuery({
    queryKey: ["parking-space", id],
    queryFn: async () => {
      if (!id) return null;
      const dbId = id.replace(/^db_/, "");
      const { data } = await api.get<ParkingSpaceDetails>(
        `/ParkingSpace/GetSpace/${dbId}`
      );
      return data;
    },
    enabled: !!id,
  });
};