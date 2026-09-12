import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/time";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ReduceTimeConfirmationModal = ({ data, onConfirm, onCancel, }: {
  data: any;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <Dialog open={true} onOpenChange={(o) => !o && onCancel()}>
    <DialogContent className="max-w-md">

      <DialogHeader>
        <DialogTitle>
          Reduce Booking Duration?
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl space-y-3">
          <div>
            <p className="text-sm font-semibold text-red-600">
              ⚠ No Refund Policy
            </p>

            <p className="text-xs text-red-600/80 mt-1">
              Reducing unused time does not generate a refund.
            </p>
          </div>

          <div className="bg-background/50 rounded-lg p-3 text-sm space-y-2">
            <div className="flex justify-between">
              <span>Current duration</span>
              <strong>
                {formatDuration(data.booking.durationMinutes)}
              </strong>
            </div>

            <div className="flex justify-between">
              <span>New duration</span>
              <strong>
                {formatDuration(data.newDuration)}
              </strong>
            </div>

            <div className="flex justify-between text-red-500 font-semibold border-t pt-2">
              <span>Time being reduced</span>
              <span>
                - {formatDuration(data.reducedMinutes)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Keep Current Booking
          </Button>

          <Button
            onClick={onConfirm}
            className="flex-1"
          >
            Reduce & Continue
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default ReduceTimeConfirmationModal;