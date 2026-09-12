import { isTodayInTimezone } from "@/lib/time";
import { calculatePricing } from "@/lib/pricingCalculator";
import { calculateBasePrice } from "@/lib/spaceDetailHelpers";

type Props = {
  space: any;
  isFullDay: boolean;
  selectedDate: Date | undefined;
  effectiveHours: number;
};

const BookingPriceSummary = ({
  space,
  isFullDay,
  selectedDate,
  effectiveHours,
}: Props) => {
  const basePrice = calculateBasePrice(space, isFullDay, selectedDate, effectiveHours, space.timezone);
  const pricing = calculatePricing(basePrice);
  const totalPrice = pricing.totalPayable;
  
  return (
    <>
      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {isFullDay
              ? (selectedDate && isTodayInTimezone(selectedDate, space.timezone)
                ? `₹${space.pricePerHour} × ${effectiveHours.toFixed(1)} hrs`
                : "Full day rate")
              : `₹${space.pricePerHour} × ${effectiveHours.toFixed(1)} hrs`}
          </span>
          <span className="text-foreground font-medium">₹{basePrice}</span>
        </div>
        {pricing.serviceFee > 0 &&
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service fee</span>
            <span className="text-foreground font-medium">₹{pricing.serviceFee}</span>
          </div>
        }
        <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border">
          <span>Total</span>
          <span>₹{totalPrice}</span>
        </div>
      </div>
    </>
  );
};

export default BookingPriceSummary;