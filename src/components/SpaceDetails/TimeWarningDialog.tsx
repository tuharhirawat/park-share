import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TimeWarningDialogProps = {
  open: boolean;
  setTimeWarningOpen: React.Dispatch<React.SetStateAction<boolean>>;
  lastValidTime: string;
  setStartTime: React.Dispatch<React.SetStateAction<string>>;
};

const TimeWarningDialog = ({
  open,
  setTimeWarningOpen,
  lastValidTime,
  setStartTime,
}: TimeWarningDialogProps) => {
  
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) return;
        setTimeWarningOpen(open);
      }}
    >
      <DialogContent
        className="w-[92vw] max-w-[420px] rounded-2xl p-6 sm:p-7 text-center mx-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center justify-center text-center space-y-5">
          <DialogHeader className="w-full space-y-3 text-center">
            <DialogTitle
              className="text-lg sm:text-xl font-semibold text-center leading-snug w-full"
            >
              Booking Not Possible
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed text-center max-w-[280px] sm:max-w-[320px] mx-auto">
            Start time must be 23:29 or earlier to proceed with booking.
          </p>

          <Button
            className="w-full sm:w-full mt-2 rounded-xl"
            onClick={() => {
              setStartTime(lastValidTime);
              setTimeWarningOpen(false);
            }}
          >
            Okay
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TimeWarningDialog;