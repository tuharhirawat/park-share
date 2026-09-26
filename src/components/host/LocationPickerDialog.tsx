import { RefObject } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import MapWithSearch from "@/components/MapWithSearch";

interface LocationPickerDialogProps {
  open: boolean;
  pendingLocation: any;
  isFetchingLocation: boolean;
  mapRef: RefObject<any>;
  onOpenChange: (open: boolean) => void;
  onLoadingChange: (loading: boolean) => void;
  onSelect: (loc: any) => void;
  onConfirm: () => void;
}

const LocationPickerDialog = ({
  open,
  pendingLocation,
  isFetchingLocation,
  mapRef,
  onOpenChange,
  onLoadingChange,
  onSelect,
  onConfirm,
}: LocationPickerDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-xl rounded-xl border border-border/50 p-5">
      <DialogTitle className="text-white text-lg font-semibold">Select Location</DialogTitle>

      <div className="space-y-2">
        <div className="h-[340px] overflow-hidden rounded-xl border border-border/50">
          <MapWithSearch ref={mapRef} onLoadingChange={onLoadingChange} initialLocation={pendingLocation} onSelect={onSelect} />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          disabled={isFetchingLocation}
          onClick={() => mapRef.current?.useCurrentLocation()}
          className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition"
        >
          {isFetchingLocation ? "Fetching location..." : "Use Current Location"}
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

export default LocationPickerDialog;