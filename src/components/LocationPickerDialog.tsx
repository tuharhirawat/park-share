import { useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import MapWithSearch from "@/components/MapWithSearch";

interface LocationPickerDialogProps {
  open: boolean;
  pendingLocation: any;
  isFetchingLocation: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadingChange: (loading: boolean) => void;
  onSelect: (loc: any) => void;
  onConfirm: () => void;
  contentClassName?: string;
}

const LocationPickerDialog = ({
  open,
  pendingLocation,
  isFetchingLocation,
  onOpenChange,
  onLoadingChange,
  onSelect,
  onConfirm,
  contentClassName,
}: LocationPickerDialogProps) => {
  const mapRef = useRef<any>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName}>
        <DialogTitle className="text-white text-lg font-semibold">
          Select Location
        </DialogTitle>

        <div className="space-y-2">
          <div className="h-[340px] overflow-hidden rounded-xl border border-border/50">
            <MapWithSearch
              ref={mapRef}
              onLoadingChange={onLoadingChange}
              initialLocation={pendingLocation}
              onSelect={onSelect}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={isFetchingLocation}
            onClick={() => mapRef.current?.useCurrentLocation()}
            className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            {isFetchingLocation
              ? "Fetching location..."
              : "Use Current Location"}
          </button>

          <button
            type="button"
            disabled={!pendingLocation}
            onClick={onConfirm}
            className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            Confirm Location
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPickerDialog;