import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/services/api";
import { featureOptions } from "@/lib/hostDashboardHelpers";
import { Space, FieldCooldown } from "@/types/host";
import LocationPickerDialog from "@/components/LocationPickerDialog";

interface EditSpaceDialogProps {
  space: Space | null;
  onClose: () => void;
  onSaved: () => void;
}

const EditSpaceDialog = ({ space, onClose, onSaved }: EditSpaceDialogProps) => {
  const [editingSpace, setEditingSpace] = useState<Space | null>(space);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    address?: string;
    features?: string;
    pricePerHour?: string;
    pricePerDay?: string;
  }>({});

  const [savingEdit, setSavingEdit] = useState(false);

  const [mapOpen, setMapOpen] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<any>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  useEffect(() => {
    setEditingSpace(space);
    setFieldErrors({});
  }, [space]);

  const isReadOnlyView = editingSpace?.listingStatus === "pending";
  const dialogTitle = isReadOnlyView ? "View Space" : "Edit Space";
  const readOnlyProps = { readOnly: isReadOnlyView };

  const getCooldownMessage = (cooldown?: FieldCooldown) => {
    if (!cooldown?.isActive) return null;

    const unit = cooldown.daysRemaining === 1 ? "day" : "days";

    return `Can be changed in ${cooldown.daysRemaining} ${unit}`;
  };

  const updateField = <K extends keyof Space>(
    field: K, value: Space[K]
  ) => {
    if (!editingSpace || isReadOnlyView) return;

    setEditingSpace((prev) =>
      prev
        ? {
          ...prev,
          [field]: value,
        }
        : prev
    );

    if (field in fieldErrors) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleFeatureToggle = (feature: string) => {
    if (!editingSpace || isReadOnlyView) return;

    const updated = editingSpace.features?.includes(feature)
      ? editingSpace.features.filter(x => x !== feature)
      : [...(editingSpace.features || []), feature];

    setEditingSpace({
      ...editingSpace,
      features: updated,
    });

    setFieldErrors((prev) => ({
      ...prev,
      features: undefined,
    }));
  };

  const handleAddressClick = () => {
    if (
      isReadOnlyView ||
      !editingSpace ||
      editingSpace.addressCooldown?.isActive
    ) {
      return;
    }

    setPendingLocation(
      editingSpace.lat && editingSpace.lng
        ? {
          lat: editingSpace.lat,
          lng: editingSpace.lng,
          address: editingSpace.address,
        }
        : null
    );

    setMapOpen(true);

    setFieldErrors((prev) => ({
      ...prev,
      address: undefined,
    }));
  };

  const handleConfirmLocation = () => {
    if (!pendingLocation || !editingSpace) return;

    setEditingSpace({
      ...editingSpace,
      address: pendingLocation.address,
      lat: pendingLocation.lat,
      lng: pendingLocation.lng,
    });

    setMapOpen(false);
  };

  const hasChanges = () => {
    if (!editingSpace || !space) return false;

    return (
      editingSpace.title.trim() !== space.title.trim() ||
      editingSpace.address.trim() !== space.address.trim() ||
      editingSpace.lat !== space.lat ||
      editingSpace.lng !== space.lng ||
      editingSpace.pricePerHour !== space.pricePerHour ||
      editingSpace.pricePerDay !== space.pricePerDay ||
      (editingSpace.description || "") !== (space.description || "") ||
      JSON.stringify(editingSpace.features || []) !==
      JSON.stringify(space.features || [])
    );
  };

  const handleSave = async () => {
    if (!editingSpace) return;

    if (!hasChanges()) {
      toast.info("No changes made");
      return;
    }

    setSavingEdit(true);

    try {
      const { data } = await api.put(
        `/ParkingSpace/host/${editingSpace.id}/details/update`,
        {
          title: editingSpace.title,
          address: editingSpace.address,
          lat: editingSpace.lat,
          lng: editingSpace.lng,
          pricePerHour: editingSpace.pricePerHour,
          pricePerDay: editingSpace.pricePerDay,
          description: editingSpace.description,
          features: editingSpace.features,
        }
      );

      toast.success(data.message);
      onSaved();
    } catch (err: any) {
      const resp = err?.response?.data;

      if (resp?.fieldErrors) {
        setFieldErrors(resp.fieldErrors);
      } else {
        toast.error(resp?.message || "Failed to update space");
      }
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <>
      <Dialog
        open={!!editingSpace}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="w-[calc(100%-1rem)] max-w-lg sm:max-w-xl max-h-[90vh] p-0 overflow-hidden flex flex-col rounded-xl border border-border/50">
          <DialogHeader className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5 sm:pb-4 border-b border-border/50">
            <DialogTitle className="text-base sm:text-lg">
              {dialogTitle}
            </DialogTitle>
          </DialogHeader>

          {editingSpace && (
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5 space-y-4">
              {/* Listing Title */}
              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-medium text-muted-foreground">
                  Listing Title
                </label>

                <Input
                  className="h-9 w-full text-sm"
                  value={editingSpace.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. Kalki's 2nd space"
                  {...readOnlyProps}
                  disabled={
                    isReadOnlyView ||
                    editingSpace.titleCooldown?.isActive
                  }
                />

                {editingSpace.titleCooldown?.isActive && (
                  <p className="text-xs text-amber-500">{getCooldownMessage(editingSpace.titleCooldown)}</p>
                )}

                {fieldErrors.title && <p className="text-xs text-red-500">{fieldErrors.title}</p>}
              </div>

              {/* State & City */}
              <div className="space-y-1.5 min-w-0">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-xs font-medium text-muted-foreground">State</label>
                    <Input className="h-9 w-full text-sm" value={editingSpace.state} disabled readOnly />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <label className="text-xs font-medium text-muted-foreground">City</label>
                    <Input className="h-9 w-full text-sm" value={editingSpace.city} disabled readOnly />
                  </div>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">
                      State and city cannot be changed once confirmed.
                    </span>{" "}
                    If the Space has been shifted to a different state or city, please apply for a new Space.
                  </p>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-medium text-muted-foreground">
                  Address
                </label>

                <Input
                  className={`h-9 w-full text-sm truncate ${editingSpace.addressCooldown?.isActive
                    ? "cursor-not-allowed"
                    : "cursor-pointer"
                    }`}
                  value={editingSpace.address}
                  onClick={handleAddressClick}
                  disabled={editingSpace.addressCooldown?.isActive}
                  readOnly
                />

                {editingSpace.addressCooldown?.isActive && (
                  <p className="text-xs text-amber-500">
                    {getCooldownMessage(editingSpace.addressCooldown)}
                  </p>
                )}

                {fieldErrors.address && (
                  <p className="text-xs text-red-500">
                    {fieldErrors.address}
                  </p>
                )}
              </div>

              {/* Prices */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs font-medium text-muted-foreground">
                    Price / Hour (₹)
                  </label>

                  <Input
                    className="h-9 w-full text-sm"
                    type="number"
                    value={editingSpace.pricePerHour}
                    onChange={(e) => updateField("pricePerHour", Number(e.target.value))}
                    placeholder="e.g. 40"
                    {...readOnlyProps}
                    disabled={
                      isReadOnlyView ||
                      editingSpace.pricePerHourCooldown?.isActive
                    }
                  />

                  {editingSpace.pricePerHourCooldown?.isActive && (
                    <p className="text-xs text-amber-500">
                      {getCooldownMessage(editingSpace.pricePerHourCooldown)}
                    </p>
                  )}

                  {fieldErrors.pricePerHour && (
                    <p className="text-xs text-red-500">
                      {fieldErrors.pricePerHour}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 min-w-0">
                  <label className="text-xs font-medium text-muted-foreground">
                    Price / Day (₹)
                  </label>

                  <Input
                    className="h-9 w-full text-sm"
                    type="number"
                    value={editingSpace.pricePerDay || ""}
                    onChange={(e) =>
                      updateField(
                        "pricePerDay", e.target.value ? Number(e.target.value) : null
                      )
                    }
                    placeholder="Optional"
                    {...readOnlyProps}
                    disabled={
                      isReadOnlyView ||
                      editingSpace.pricePerDayCooldown?.isActive
                    }
                  />

                  {editingSpace.pricePerDayCooldown?.isActive && (
                    <p className="text-xs text-amber-500">
                      {getCooldownMessage(editingSpace.pricePerDayCooldown)}
                    </p>
                  )}

                  {fieldErrors.pricePerDay && (
                    <p className="text-xs text-red-500">
                      {fieldErrors.pricePerDay}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-medium text-muted-foreground">Description</label>

                <Textarea
                  className="min-h-[90px] w-full resize-y text-sm"
                  value={editingSpace.description || ""}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Describe your parking space"
                  {...readOnlyProps}
                />
              </div>

              {/* Features */}
              <div className="space-y-1.5 min-w-0">
                <label className="text-xs font-medium text-muted-foreground">Features</label>

                <div className="flex flex-wrap gap-2">
                  {featureOptions.map((feature) => (
                    <Button
                      key={feature}
                      type="button"
                      className="h-8 px-3 text-xs whitespace-nowrap"
                      size="sm"
                      variant={
                        editingSpace.features?.includes(feature)
                          ? "default"
                          : "outline"
                      }
                      onClick={() => handleFeatureToggle(feature)}
                      disabled={
                        isReadOnlyView ||
                        editingSpace.featuresCooldown?.isActive
                      }
                    >
                      {feature}
                    </Button>
                  ))}
                </div>

                {editingSpace.featuresCooldown?.isActive && (
                  <p className="text-xs text-amber-500">
                    {getCooldownMessage(editingSpace.featuresCooldown)}
                  </p>
                )}

                {fieldErrors.features && <p className="text-xs text-red-500">{fieldErrors.features}</p>}
              </div>
            </div>
          )}

          {/* Footer */}
          {!isReadOnlyView && editingSpace && (
            <div className="border-t border-border/50 bg-background px-4 py-3 sm:px-5 sm:py-4">
              <Button
                className="h-9 w-full text-sm"
                disabled={savingEdit}
                onClick={handleSave}
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <LocationPickerDialog
        open={mapOpen}
        pendingLocation={pendingLocation}
        isFetchingLocation={isFetchingLocation}
        onOpenChange={(open) => {
          setMapOpen(open);

          if (!open) {
            setPendingLocation(null);
          }
        }}
        onLoadingChange={setIsFetchingLocation}
        onSelect={setPendingLocation}
        onConfirm={handleConfirmLocation}
        contentClassName="w-[calc(100%-1rem)] max-w-xl rounded-xl border border-border/50 p-5"
      />
    </>
  );
};

export default EditSpaceDialog;