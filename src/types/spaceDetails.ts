import { VehicleType } from "@/enums/vehicleTypeEnum";

export type UserVehicle = {
  id: string;
  vehicle_type: VehicleType;
  brand_model: string;
  registration_number: string;
  isBooked?: boolean;  // frontend only
}

export type ParkingSlot = {
  id: string;
  label: string;
  vehicle_type: string;
  is_active: boolean;
}

export type ParkingSpaceSearchDashboardSummary = {
  id: string;
  title: string;
  address: string;
  city: string;
  pricePerHour: number;
  vehicleTypes: VehicleType[];
  rating: number;
  reviewCount: number;
  imageUrl: string | null;
  lat: number;
  lng: number;
  hasCctv: boolean;
}

export type ParkingSpaceDetails = {
  id: string;
  title: string;
  address: string;
  city: string;
  pricePerHour: number;
  pricePerDay: number | null;
  vehicleTypes: VehicleType[];
  features: string[];
  imageUrls: string[];
  rating: number;
  reviewCount: number;
  lat: number | null;
  lng: number | null;
  available: boolean;
  timezone: string;
}