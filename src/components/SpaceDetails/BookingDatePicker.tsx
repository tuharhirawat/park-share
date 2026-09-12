import React from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentDateTimeInTimezone } from "@/lib/time";

type BookingDatePickerProps = {
  selectedDate: Date | undefined;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date | undefined>>;
  setSelectedSlotId: React.Dispatch<React.SetStateAction<string>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  timezone: string;
};

const BookingDatePicker = ({
  selectedDate,
  setSelectedDate,
  setSelectedSlotId,
  errors,
  setErrors,
  timezone,
}: BookingDatePickerProps) => {
  const { date: todayStr } = getCurrentDateTimeInTimezone(timezone);
  const [y, m, d] = todayStr.split("-").map(Number);
  const todayInSpaceTz = new Date(y, m - 1, d);

  return (
    <div>
      <label className="text-sm font-semibold text-foreground mb-2 block">Date</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground", errors.date && "border-destructive")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => { setSelectedDate(d); setSelectedSlotId(""); setErrors(prev => ({ ...prev, date: "" })); }}
            disabled={(date) => date < todayInSpaceTz}
            defaultMonth={todayInSpaceTz}
            today={todayInSpaceTz} 
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
    </div>
  );
};

export default BookingDatePicker;