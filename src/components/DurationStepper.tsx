import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type DurationStepperProps = {
  minutes: number;
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
  subtext?: string;
};

const DurationStepper = ({
  minutes,
  canDecrease,
  canIncrease,
  onDecrease,
  onIncrease,
  subtext,
}: DurationStepperProps) => (
  <div className="flex items-center justify-between border rounded-xl p-3">
    <button
      type="button"
      onClick={onDecrease}
      disabled={!canDecrease}
      className={cn(
        "w-10 h-10 rounded-full border flex items-center justify-center",
        !canDecrease && "opacity-40 cursor-not-allowed"
      )}
    >
      <Minus className="w-4 h-4" />
    </button>

    <div className="text-center">
      <p className="font-semibold">{minutes} mins</p>
      {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
    </div>

    <button
      type="button"
      onClick={onIncrease}
      disabled={!canIncrease}
      className={cn(
        "w-10 h-10 rounded-full border flex items-center justify-center",
        !canIncrease && "opacity-40 cursor-not-allowed"
      )}
    >
      <Plus className="w-4 h-4" />
    </button>
  </div>
);

export default DurationStepper;