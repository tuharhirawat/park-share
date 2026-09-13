import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ActionNote from "./ActionNote";
import type { Booking } from "@/types/booking";
import { MAX_DAY_MINUTES } from "@/constants/bookingConstants";
import { STEP_DURATION } from "@/constants/spaceDetailsConstants";
import { toMinutes, addMinutesToTime, isTodayInTimezone, getCurrentTime, getAppToday } from "@/lib/time";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import DurationStepper from "../DurationStepper";
import { RescheduleTimeSlot } from "@/viewTypes/bookingUi";

type RescheduleBookingDialogProps = {
  open: boolean;
  rescheduleBooking?: Booking;
  rescheduleSlot: RescheduleTimeSlot;
  handleRescheduleDateChange: (value: string) => void;
  handleRescheduleTimeChange: (value: string) => void;
  setRescheduleMinutes: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
  prepareRescheduleConfirmation: (booking: Booking) => void;
};

const RescheduleBookingDialog = ({
  open,
  rescheduleBooking,
  rescheduleSlot,
  handleRescheduleDateChange,
  handleRescheduleTimeChange,
  setRescheduleMinutes,
  onClose,
  prepareRescheduleConfirmation,
}: RescheduleBookingDialogProps) => {
  const { date: rescheduleDate, startTime: rescheduleStartTime, minutes: rescheduleMinutes } = rescheduleSlot;
  const spaceTimezone = rescheduleBooking?.spaceTimezone;
  const lockStartAndDate = rescheduleBooking?.computedStatus?.toLowerCase() === "active";

  const canIncreaseReschedule = (startTime: string) =>
    toMinutes(startTime) + rescheduleMinutes + STEP_DURATION <= MAX_DAY_MINUTES;

  const canDecreaseReschedule = () => {
    if (rescheduleMinutes <= STEP_DURATION) return false;

    if (lockStartAndDate) {
      const proposedEnd = toMinutes(rescheduleStartTime) + (rescheduleMinutes - STEP_DURATION);
      const nowMinutes = toMinutes(getCurrentTime(spaceTimezone));
      return proposedEnd > nowMinutes + STEP_DURATION;
    }

    return true;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {lockStartAndDate ? "Adjust Booking Time" : "Reschedule Booking"}
          </DialogTitle>
        </DialogHeader>

        <ActionNote type={lockStartAndDate ? "adjust" : "reschedule"} />

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Booking Date</label>

            <Input
              type="date"
              disabled={lockStartAndDate}
              value={rescheduleDate ? format(rescheduleDate, "yyyy-MM-dd") : ""}
              min={format(getAppToday(spaceTimezone), "yyyy-MM-dd")}
              onChange={(e) => {
                if (lockStartAndDate) return;
                handleRescheduleDateChange(e.target.value);
              }}
            />

            <p className="text-xs text-muted-foreground mt-1">
              {lockStartAndDate ? "Active booking — date is fixed" : "Select same or future date"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">Start Time</label>
              <Input
                type="time"
                disabled={lockStartAndDate}
                value={rescheduleStartTime}
                min={
                  isTodayInTimezone(rescheduleDate, spaceTimezone)
                    ? getCurrentTime(spaceTimezone)
                    : undefined
                }
                onChange={(e) => {
                  if (lockStartAndDate) return;
                  handleRescheduleTimeChange(e.target.value);
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">End Time</label>
              <Input
                readOnly
                value={addMinutesToTime(rescheduleStartTime, rescheduleMinutes, MAX_DAY_MINUTES)}
                className="bg-muted cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">Duration</label>
            <DurationStepper
              minutes={rescheduleMinutes}
              canDecrease={canDecreaseReschedule()}
              canIncrease={canIncreaseReschedule(rescheduleStartTime)}
              onDecrease={() => setRescheduleMinutes(v => v - STEP_DURATION)}
              onIncrease={() => setRescheduleMinutes(v => v + STEP_DURATION)}
              subtext={`${rescheduleStartTime} → ${addMinutesToTime(rescheduleStartTime, rescheduleMinutes, MAX_DAY_MINUTES)}`}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (!rescheduleBooking) return;
                prepareRescheduleConfirmation(rescheduleBooking);
              }}
            >
              Check Price & Availability
            </Button>

            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleBookingDialog;