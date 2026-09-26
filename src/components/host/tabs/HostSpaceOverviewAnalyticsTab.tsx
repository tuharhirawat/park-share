import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from "recharts";
import { useEffect, useState } from "react";
import api from "@/services/api";

const HostSpaceOverviewAnalyticsTab = ({ spaceId }: { spaceId: string }) => {
  const [peakHours, setPeakHours] = useState<{ hour: number; bookings: number }[]>([]);
  
  useEffect(() => {
    let cancelled = false;
    api.get(`/Host/spaces/${spaceId}/analytics/peakhours`)
      .then(({ data }) => { if (!cancelled) setPeakHours(data); })
      .catch(() => { if (!cancelled) setPeakHours([]); });
    return () => { cancelled = true; };
  }, [spaceId]);

  return (<>
    <div className="bg-card rounded-2xl p-6 card-shadow space-y-4">
      <h3 className="font-semibold text-foreground">Peak booking hours</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={peakHours}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-20" />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip labelFormatter={(h) => `${h}:00`} />
            <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </>);
};

export default HostSpaceOverviewAnalyticsTab;