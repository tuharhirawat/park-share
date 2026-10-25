import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { UserVehicle } from "@/types/spaceDetails";
import { VehicleType } from "@/enums/vehicleTypeEnum";

interface VehicleSelectorProps {
  loadingVehicles: boolean;
  availableVehicles: UserVehicle[];
  selectedVehicleId: string;
  setSelectedVehicleId: React.Dispatch<React.SetStateAction<string>>;
  setSelectedVehicle: React.Dispatch<React.SetStateAction<VehicleType | "">>;
  setSelectedSlotId: React.Dispatch<React.SetStateAction<string>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  requireAuth: (action: () => void, intendedPath?: string) => void;
};

const VehicleSelector = ({
  loadingVehicles,
  availableVehicles,
  selectedVehicleId,
  setSelectedVehicleId,
  setSelectedVehicle,
  setSelectedSlotId,
  errors,
  setErrors,
  requireAuth,
}: VehicleSelectorProps) => {
  const navigate = useNavigate();
  const hasAvailableVehicle = availableVehicles.some((vehicle) => !vehicle.isBooked);

  return (
    <div>
      <label className="text-sm font-semibold text-foreground mb-2 block">Select Vehicle</label>

      {loadingVehicles ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />Loading...</div>
      ) : !hasAvailableVehicle ? (
        <div className="text-sm text-muted-foreground">
          <p>No available vehicles for selected time.</p>

          <Button
            variant="link"
            className="p-0 h-auto text-primary"
            onClick={() =>
              requireAuth(
                () => navigate("/vehicles"),
                "/vehicles"
              )
            }
          >
            Add a vehicle →
          </Button>
        </div>
      ) : (
        <Select
          value={selectedVehicleId}
          onValueChange={(vehicleId) => {
            setSelectedVehicleId(vehicleId);

            const vehicle = availableVehicles.find(
              (v) => v.id === vehicleId
            );

            if (vehicle && !vehicle.isBooked) {
              setSelectedVehicle(vehicle.vehicle_type as VehicleType);
            }

            setSelectedSlotId("");

            setErrors((prev) => ({
              ...prev,
              vehicle: "",
            }));
          }}
        >
          <SelectTrigger
            className={cn(errors.vehicle && "border-destructive")}
          >
            <SelectValue placeholder="Choose your vehicle" />
          </SelectTrigger>

          <SelectContent>
            {availableVehicles.map((v) => (
              <SelectItem
                key={v.id}
                value={v.id}
                disabled={v.isBooked}
              >
                {v.brand_model} — {v.registration_number} (
                {v.vehicle_type})
                {v.isBooked && " 🔒 Booked"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {errors.vehicle && (
        <p className="text-xs text-destructive mt-1">
          {errors.vehicle}
        </p>
      )}
    </div>
  );
};

export default VehicleSelector;