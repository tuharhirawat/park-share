import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import api from "@/services/api";
import { HostBooking, PagedResult, StatusCounts, ComputedStatus } from "@/types/host";
import { HOST_SPACE_TAB_BOOKINGS_PAGE_SIZE, STATUS_TABS } from "@/constants/hostDashboardConstants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface HostSpaceOverviewBookingsTabProps {
  spaceId: string;
}

const HostSpaceOverviewBookingsTab = ({ spaceId }: HostSpaceOverviewBookingsTabProps) => {
  const [statusTab, setStatusTab] = useState<ComputedStatus>("Upcoming");
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [counts, setCounts] = useState<StatusCounts | null>(null);
  const [result, setResult] = useState<PagedResult<HostBooking> | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);

  // Counts drive the tab labels — fetched once per filter change, independent
  // of which tab is open.
  useEffect(() => {
    let cancelled = false;
    setLoadingCounts(true);
    api
      .get(`/Booking/host/${spaceId}/bookings/count`, { params: { fromDate: fromDate || undefined, toDate: toDate || undefined } })
      .then(({ data }) => {
        if (!cancelled) setCounts(data);
      })
      .catch(() => {
        if (!cancelled) setCounts(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingCounts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [spaceId, fromDate, toDate]);

  // Reset to page 1 whenever the tab or filters change.
  useEffect(() => {
    setPage(1);
  }, [statusTab, sortOrder, fromDate, toDate]);

  // The actual lazy fetch: only the open tab's page of data is requested.
  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    api
      .get(`/Booking/host/space/${spaceId}`, {
        params: {
          status: statusTab,
          page,
          pageSize: HOST_SPACE_TAB_BOOKINGS_PAGE_SIZE,
          sort: sortOrder,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        },
      })
      .then(({ data }) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled) setResult({ items: [], totalCount: 0, page: 1, pageSize: HOST_SPACE_TAB_BOOKINGS_PAGE_SIZE, totalPages: 1 });
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [spaceId, statusTab, page, sortOrder, fromDate, toDate]);

  const countFor = (id: ComputedStatus) => {
    if (!counts) return null;
    return { Active: counts.active, Upcoming: counts.upcoming, Completed: counts.completed, Cancelled: counts.cancelled }[id];
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card rounded-2xl p-4 card-shadow flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Sort by date</label>
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "newest" | "oldest")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {(fromDate || toDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setFromDate(""); setToDate(""); }}>
            Clear dates
          </Button>
        )}
      </div>

      {/* Side-by-side status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => {
          const count = countFor(t.id);
          const isActive = statusTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setStatusTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${isActive
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
            >
              {t.label}
              {count !== null && !loadingCounts ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="bg-card rounded-2xl p-6 card-shadow space-y-3 min-h-[120px]">
        {loadingList ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !result || result.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No {statusTab.toLowerCase()} bookings{fromDate || toDate ? " in this date range" : ""}.</p>
        ) : (
          <div className="space-y-2">
            {result.items.map((b) => (
              <div key={b.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {b.bookingDate ? format(new Date(b.bookingDate), "d MMM yyyy") : "—"}
                    {b.startTime ? ` · ${b.startTime}` : ""}
                    {b.endTime ? ` – ${b.endTime}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {b.vehicleType}
                    {b.slotLabel ? ` · Slot ${b.slotLabel}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold text-foreground">₹{Number(b.totalPrice).toLocaleString("en-IN")}</span>
                  <Badge variant="outline" className={STATUS_TABS.find((t) => t.id === b.computedStatus)?.badgeClass}>
                    {b.computedStatus}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {result && result.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {result.page} of {result.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page === result.totalPages}
              onClick={() => setPage((p) => Math.min(result.totalPages, p + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HostSpaceOverviewBookingsTab;