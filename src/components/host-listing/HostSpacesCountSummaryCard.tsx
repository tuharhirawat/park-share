import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface HostSpacesCountSummaryCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName?: string;
  hoverClassName?: string;
  count?: number;
  onClick: () => void;
}

const HostSpacesCountSummaryCard = ({
  title,
  description,
  icon: Icon,
  iconClassName = "text-primary",
  hoverClassName = "hover:border-primary",
  count,
  onClick,
}: HostSpacesCountSummaryCardProps) => (
  <Card
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    }}
    className={`cursor-pointer group min-h-[180px] transition-all hover:-translate-y-1 ${hoverClassName}`}
  >
    <CardContent className="h-full p-7 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-lg font-semibold">{title}</p>
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        </div>

        <Icon
          className={`w-10 h-10 group-hover:scale-110 transition ${iconClassName}`}
        />
      </div>

      {count !== undefined && (
        <div className="text-3xl font-bold">{count}</div>
      )}
    </CardContent>
  </Card>
);

export default HostSpacesCountSummaryCard;