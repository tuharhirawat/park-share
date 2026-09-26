import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface AnalyticsTabProps {
  chartConfig: Record<string, { label: string; color: string }>;
  bookingsPerListing: { name: string; bookings: number }[];
  peakHours: { hour: string; bookings: number }[];
}

const AnalyticsTab = ({ chartConfig, bookingsPerListing, peakHours }: AnalyticsTabProps) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="bg-card rounded-2xl p-6 card-shadow">
      <h3 className="font-bold text-foreground mb-4">Bookings Per Listing</h3>
      <ChartContainer config={chartConfig} className="h-64 w-full">
        <BarChart data={bookingsPerListing}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
    <div className="bg-card rounded-2xl p-6 card-shadow">
      <h3 className="font-bold text-foreground mb-4">Peak Booking Hours</h3>
      <ChartContainer config={chartConfig} className="h-64 w-full">
        <BarChart data={peakHours}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
          <YAxis />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="bookings" fill="var(--color-bookings)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  </div>
);

export default AnalyticsTab;