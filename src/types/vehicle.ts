export interface UserVehicle {
  id: string;
  vehicle_type: string;
  brand_model: string;
  registration_number: string;
  isBooked?: boolean;  // frontend only
}