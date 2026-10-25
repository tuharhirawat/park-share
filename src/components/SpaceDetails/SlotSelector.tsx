import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ParkingSlot } from "@/types/spaceDetails";

interface SlotSelectorProps {
  selectedVehicle: string;
  filteredVehicleSlots: ParkingSlot[];
  availableSlots: ParkingSlot[];
  loadingSlots: boolean;
  selectedSlotId: string;
  setSelectedSlotId: React.Dispatch<React.SetStateAction<string>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

const SlotSelector = ({
  selectedVehicle,
  filteredVehicleSlots,
  availableSlots,
  loadingSlots,
  selectedSlotId,
  setSelectedSlotId,
  errors,
  setErrors,
}: SlotSelectorProps) => {

  if (!selectedVehicle || filteredVehicleSlots.length === 0) {
    return null;
  }

  return (
    <div>
      <label className="text-sm font-semibold text-foreground mb-2 block">Select Parking Slot</label>
      {loadingSlots ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading slots...</div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {filteredVehicleSlots.map(slot => {
            const isAvailable = availableSlots.some(a => a.id === slot.id);
            const isSelected = selectedSlotId === slot.id;
            return (
              <button
                key={slot.id}
                type="button"
                disabled={!isAvailable}
                className={cn(
                  "py-2 px-3 rounded-lg text-xs font-mono font-semibold border transition-colors",
                  isSelected ? "bg-primary text-primary-foreground border-primary" :
                    isAvailable ? "bg-card border-border hover:border-primary/50 text-foreground" :
                      "bg-muted/50 text-muted-foreground border-border opacity-50 cursor-not-allowed line-through"
                )}
                onClick={() => { setSelectedSlotId(slot.id); setErrors(prev => ({ ...prev, slot: "" })); }}
              >
                {slot.label}
              </button>
            );
          })}
        </div>
      )}
      {errors.slot && <p className="text-xs text-destructive mt-1">{errors.slot}</p>}
      <p className="text-xs text-muted-foreground mt-1">{availableSlots.length} of {filteredVehicleSlots.length} available</p>
      {availableSlots.length === 0 && (
        <p className="text-xs text-destructive mt-2">
          No slots available for selected time
        </p>
      )}
    </div>
  );
};

export default SlotSelector;