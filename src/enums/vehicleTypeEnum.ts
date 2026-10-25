import { Bike, Car, type LucideIcon } from "lucide-react";

export enum VehicleType {
  Car = "car",
  Bike = "bike",
}

export const VEHICLE_TYPE_META: Record<VehicleType, { label: string; icon: LucideIcon }> = {
  [VehicleType.Car]: { label: "Car", icon: Car },
  [VehicleType.Bike]: { label: "Bike", icon: Bike },
};