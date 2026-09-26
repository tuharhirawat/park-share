import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";

interface EarningsTabProps {
  chartConfig: Record<string, { label: string; color: string }>;
  earningsOverTime: { month: string; earnings: number }[];
  earningsPerListing: { title: string; earned: number }[];
}

const EarningsTab = ({ chartConfig, earningsOverTime, earningsPerListing }: EarningsTabProps) => (
  <>
    <div className="bg-card rounded-2xl p-6 card-shadow">
      <h3 className="font-bold text-foreground mb-4">Earnings Over Time</h3>
      <ChartContainer config={chartConfig} className="h-72 w-full">
        <LineChart data={earningsOverTime}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line type="monotone" dataKey="earnings" stroke="var(--color-earnings)" strokeWidth={2} dot />
        </LineChart>
      </ChartContainer>
    </div>
    <div className="mt-6 space-y-3">
      <h3 className="font-bold text-foreground">Earnings Per Listing</h3>
      {earningsPerListing.map((row) => (
        <div key={row.title} className="bg-card rounded-xl p-4 card-shadow flex justify-between items-center">
          <span className="text-foreground font-medium">{row.title}</span>
          <span className="font-bold text-foreground">₹{row.earned.toLocaleString()}</span>
        </div>
      ))}
    </div>
  </>
);

export default EarningsTab;