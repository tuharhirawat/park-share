import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { RescheduleConfirmation } from "@/types/booking";

const RescheduleConfirmationModal = ({
  confirmation,
  onGraceToggle,
  onConfirm,
  onCancel,
  loading,
}: {
  confirmation: RescheduleConfirmation;
  onGraceToggle: (enabled: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) => {
  const payableAmount = confirmation.extraCost;

  const isFreeReschedule = confirmation.type === "reschedule" &&
    confirmation.extraCost === 0 &&
    confirmation.extraMinutes === 0;

  const isReduction = confirmation.type === "reschedule" &&
    confirmation.extraMinutes < 0;

  const confirmButtonLabel = isReduction
    ? "Confirm Reduction"
    : isFreeReschedule
      ? "Confirm"
      : `Confirm & Pay ₹${payableAmount}`;

  const confirmButtonLoadingLabel = isReduction
    ? "Confirming reduction..."
    : isFreeReschedule
      ? "Confirming..."
      : "Processing payment...";

  const infoMessage = isFreeReschedule
    ? "This change is already covered in your existing booking. No additional charges apply for this reschedule."
    : "Proceed to confirm this booking change.";

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="w-[92vw] max-w-[430px] max-h-[88vh] overflow-y-auto p-4 sm:p-5 rounded-2xl pointer-events-auto">
        <DialogHeader>
          <DialogTitle>{confirmation.type === "extend" ? "Extend Booking" : "Reschedule Booking"} - Price Summary</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          
          {/* Original Booking Info */}
          <div className="bg-muted p-2.5 rounded-lg space-y-1">
            <p className="text-sm font-medium text-foreground">Current Booking</p>
            <p className="text-xs text-muted-foreground">Date: {format(new Date(confirmation.rescheduleDate), "MMM d, yyyy")}</p>
            <p className="text-xs text-muted-foreground">Time: {confirmation.rescheduleStartTime} - {confirmation.rescheduleEndTime}</p>
          </div>

          {confirmation.extraMinutes >= 30 && !confirmation.nextHasUsedFreeExtension && confirmation.canUseFreeExtension && (
            <div className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    Use Free 10 Min Grace
                  </p>
                  <p className="text-xs text-muted-foreground">
                    One-time free extension
                  </p>
                </div>

                <button
                  type="button"
                  disabled={confirmation.nextHasUsedFreeExtension}
                  onClick={() =>
                    onGraceToggle(!confirmation.applyGraceExtension)
                  }
                  className={cn(
                    "w-12 h-6 rounded-full relative transition",
                    confirmation.applyGraceExtension
                      ? "bg-primary"
                      : "bg-muted",
                    confirmation.nextHasUsedFreeExtension &&
                    "opacity-50"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition",
                      confirmation.applyGraceExtension &&
                      "translate-x-6"
                    )}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Duration Change */}
          <div className="border-l-2 border-blue-500 pl-3 space-y-1">
            <p className="text-sm font-medium text-foreground">Duration Change</p>
            <p className="text-xs text-muted-foreground">Duration change: <span className="font-semibold">{confirmation.extraMinutes} minutes</span></p>
            {confirmation.applyGraceExtension ? (
              <p className="text-xs text-green-600 font-medium">
                ✓ Free 10 minute grace applied.
                You will save approximately ₹{confirmation.graceDiscount} on this extension.
              </p>
            ) : (
              <p
                className={cn(
                  "text-xs font-medium",
                  isFreeReschedule
                    ? "text-green-600"
                    : "text-yellow-600"
                )}
              >
                {infoMessage}
              </p>
            )}
          </div>

          {/* Pricing Breakdown */}
          {confirmation.extraCost > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg space-y-2">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-600">Paid Extension</p>
                  <p className="text-xs text-yellow-600/80">Additional parking time selected. Extension charge applies.</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-yellow-500/20 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Current booking amount:</span>
                  <span className="font-semibold">₹{confirmation.newTotalPrice - confirmation.extraCost}</span>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>
                        Parking extension ({confirmation.extraMinutes} mins)
                      </span>

                      <span className="font-semibold">
                        ₹{confirmation.parkingExtensionCost}
                      </span>
                    </div>

                    {confirmation.serviceFee > 0 && (
                      <div className="flex justify-between text-xs">
                        <span>Platform fee</span>

                        <span className="font-semibold">
                          ₹{confirmation.serviceFee}
                        </span>
                      </div>
                    )}
                  </div>

                  {confirmation.graceApplied && (
                    <div className="flex justify-between items-start text-xs text-green-600 bg-green-500/5 rounded-md px-2 py-2">
                      <span className="pr-3">
                        Estimated extension discount (10 mins)
                      </span>

                      <span className="font-semibold whitespace-nowrap">
                        - ₹{confirmation.graceDiscount}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-sm font-bold border-t border-yellow-500/20 pt-2 mt-2">
                  <span>Booking total after extension:</span>
                  <span className="text-yellow-600">₹{confirmation.newTotalPrice}</span>
                </div>
              </div>
            </div>
          )}

          {/* Final Price */}
          {!isReduction && (
            <div className="bg-card border border-border p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-base font-display font-bold">
                  {isFreeReschedule
                    ? "Additional Charge:"
                    : "Amount Payable:"
                  }
                </span>
                <span className="text-xl font-bold text-primary">
                  ₹{payableAmount}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {confirmButtonLoadingLabel}
                </>
              ) : (
                confirmButtonLabel
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleConfirmationModal;