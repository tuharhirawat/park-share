
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from "recharts";
import { useEffect, useState } from "react";
import api from "@/services/api";

interface HostSpaceOverviewEarningsTabProps {
  spaceId: string;
}

const HostSpaceOverviewEarningsTab = ({ spaceId }: HostSpaceOverviewEarningsTabProps) => {

  const [earningsOverTime, setEarningsOverTime] = useState<{ month: string; earnings: number }[]>([]);
  const totalEarnings = earningsOverTime.reduce(
    (total, item) => total + Number(item.earnings),
    0
  );

  useEffect(() => {
    let cancelled = false;
    api.get(`/Host/spaces/${spaceId}/earnings/trend`)
      .then(({ data }) => { 
        if (!cancelled) setEarningsOverTime(data); 
      })
      .catch(() => { 
        if (!cancelled) setEarningsOverTime([]); 
      });
    return () => { cancelled = true; };
  }, [spaceId]);

  return (<>
    <div className="bg-card rounded-2xl p-6 card-shadow space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-foreground">Earnings — last 6 months</h3>
        <span className="text-xl font-bold text-foreground">₹{totalEarnings.toLocaleString("en-IN")}</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={earningsOverTime}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-20" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Earnings"]} />
            <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </>);
};

export default HostSpaceOverviewEarningsTab;