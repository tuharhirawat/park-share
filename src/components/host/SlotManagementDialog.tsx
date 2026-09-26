import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/services/api";
import { ParkingSlot } from "@/types/host";

interface SlotManagementDialogProps {
  open: boolean;
  spaceId?: string;
  spaceTitle?: string;
  slots: ParkingSlot[];
  onClose: () => void;
  onChanged: () => void; // parent refetches after any add/toggle/delete
}

const SlotManagementDialog = ({ open, spaceId, spaceTitle, slots, onClose, onChanged }: SlotManagementDialogProps) => {
  const [newSlotType, setNewSlotType] = useState("car");
  const [addingSlot, setAddingSlot] = useState(false);

  const handleAddSlot = async () => {
    if (!spaceId) return;
    setAddingSlot(true);
    try {
      const { data } = await api.post("/Host/slot/add", { spaceId, vehicleType: newSlotType });
      toast.success(data.message);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to add slot");
    } finally {
      setAddingSlot(false);
    }
  };

  const handleToggleSlot = async (slotId: string) => {
    try {
      await api.patch(`/Host/toggle/slot/${slotId}`);
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update slot");
    }
  };

  // const handleDeleteSlot = async (slotId: string) => {
  //   try {
  //     await api.delete(`/Host/slots/${slotId}/delete`);
  //     toast.success("Slot removed");
  //     onChanged();
  //   } catch (err: any) {
  //     toast.error(err?.response?.data?.message ?? "Failed to delete slot");
  //   }
  // };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Manage Slots — {spaceTitle}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {slots.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {slots.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-foreground">{slot.label}</span>
                    <Badge variant="secondary" className="capitalize text-xs">{slot.vehicleType}</Badge>
                    {!slot.isActive && (
                      <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleToggleSlot(slot.id)}>
                      {slot.isActive ? "Disable" : "Enable"}
                    </Button>
                    
                    {/* Deletion button temporarily disabled */}
                    {/* <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteSlot(slot.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button> */}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No slots configured yet.</p>
          )}

          <div className="flex gap-2 items-end">
            <div className="w-28">
              <label className="text-sm font-medium block mb-1">Type</label>
              <Select value={newSlotType} onValueChange={setNewSlotType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Car</SelectItem>
                  <SelectItem value="bike">Bike</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button disabled={addingSlot} onClick={handleAddSlot}>
              {addingSlot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SlotManagementDialog;