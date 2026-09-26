import { Pencil, ParkingCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Space, ParkingSlot } from "@/types/host";

interface HostSpaceOverviewTabProps {
  space: Space;
  carSlots: ParkingSlot[];
  bikeSlots: ParkingSlot[];
  onEdit: () => void;
  onEditSlots: () => void;
}

const HostSpaceOverviewTab = ({
  space, carSlots, bikeSlots, onEdit, onEditSlots
}: HostSpaceOverviewTabProps) => {
  return (
    <div className="bg-card rounded-2xl p-6 card-shadow space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-foreground mb-1">
            Description
          </h3>

          <p className="text-sm text-muted-foreground">
            {space.description || "No description added yet."}
          </p>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={onEdit}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Details
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={onEditSlots}
          >
            <ParkingCircle className="w-3.5 h-3.5" />
            Edit Slots
          </Button>
        </div>
      </div>

      {space.features && space.features.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-2">Features</h3>

          <div className="flex flex-wrap gap-2">
            {space.features.map((f) => (
              <Badge key={f} variant="outline">
                {f}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-border">
        <div>
          <p className="text-xs text-muted-foreground">
            Price / hour
          </p>
          <p className="font-semibold text-foreground">
            ₹{space.pricePerHour}
          </p>
        </div>

        {space.pricePerDay ? (
          <div>
            <p className="text-xs text-muted-foreground">
              Price / day
            </p>
            <p className="font-semibold text-foreground">
              ₹{space.pricePerDay}
            </p>
          </div>
        ) : null}

        <div>
          <p className="text-xs text-muted-foreground">
            Available Car slots
          </p>
          <p className="font-semibold text-foreground">
            {carSlots.length}
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">
            Available Bike slots
          </p>
          <p className="font-semibold text-foreground">
            {bikeSlots.length}
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground pt-2 border-t border-border">
        Space Details have cooldown period before they can be changed again.
        For any urgent changes or corrections, please contact support.
      </p>
    </div>
  );
};

export default HostSpaceOverviewTab;