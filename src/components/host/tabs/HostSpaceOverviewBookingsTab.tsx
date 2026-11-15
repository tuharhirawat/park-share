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
  const [statusTab, setStatusTab] = useState<ComputedStatus>("Active");
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [counts, setCounts] = useState<StatusCounts | null>(null);
  const [result, setResult] = useState<PagedResult<HostBooking> | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);

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
        if (!cancelled) {
          setResult({
            items: [],
            totalCount: 0,
            page: 1,
            pageSize: HOST_SPACE_TAB_BOOKINGS_PAGE_SIZE,
            totalPages: 1,
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingList(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [spaceId, statusTab, page, sortOrder, fromDate, toDate]);

  const countFor = (status: ComputedStatus) => {
    if (!counts) return null;

    switch (status) {
      case "Active": return counts.active;
      case "Upcoming": return counts.upcoming;
      case "Completed": return counts.completed;
      case "Cancelled": return counts.cancelled;
      default: return null;
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return "";
    return time.length >= 5 ? time.substring(0, 5) : time;
  };

  const formatBookingDate = (date: string | null) => {
    if (!date) return "—";

    try {
      return format(new Date(date), "d MMM yyyy");
    } catch {
      return date;
    }
  };

  const clearDates = () => {
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-2xl p-4 card-shadow">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>

            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>

            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Sort by date</label>
            <Select
              value={sortOrder}
              onValueChange={(value) =>
                setSortOrder(
                  value as "newest" | "oldest"
                )
              }
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>

                <SelectItem value="oldest">Oldest first</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(fromDate || toDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearDates}
            >
              Clear dates
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const count = countFor(tab.id);
          const isActive = statusTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusTab(tab.id)}
              className={`
                px-4 py-2 rounded-xl text-sm font-medium
                border transition-colors
                ${isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
                }
              `}
            >
              {tab.label}

              {count !== null && !loadingCounts && (
                <span className="ml-1">
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-card rounded-2xl p-4 sm:p-6 card-shadow min-h-[120px]">
        {loadingList ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !result || result.items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No {statusTab.toLowerCase()} bookings
            {fromDate || toDate
              ? " in this date range"
              : ""}
            .
          </p>
        ) : (
          <div className="space-y-3">
            {result.items.map((booking) => {
              const statusTabConfig = STATUS_TABS.find(
                (tab) => tab.id === booking.computedStatus
              );

              return (
                <div
                  key={booking.id}
                  className="border border-border rounded-xl p-4 flex flex-col gap-4
                    sm:flex-row sm:items-center
                    sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {formatBookingDate(
                        booking.bookingDate
                      )}

                      {booking.startTime && (
                        <span className="text-muted-foreground">
                          {" · "}
                          {formatTime(
                            booking.startTime
                          )}
                        </span>
                      )}

                      {booking.endTime && (
                        <span className="text-muted-foreground">
                          {" – "}
                          {formatTime(
                            booking.endTime
                          )}
                        </span>
                      )}
                    </p>

                    {booking.isCreatedByAdmin && (
                      <div className="mb-2">
                        <Badge
                          variant="outline"
                          className="text-[11px] border-primary/30 text-primary"
                        >
                          Created by admin
                        </Badge>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-1">
                      {booking.vehicleType || "Vehicle"}
                      {booking.slotLabel && (
                        <>
                          {" · "}
                          Slot {booking.slotLabel}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center justify-betweensm:justify-end gap-3 flex-shrink-0">
                    <span className="text-sm font-semibold text-foreground">
                      ₹ {Number(booking.totalPrice).toLocaleString("en-IN")}
                    </span>

                    <Badge
                      variant="outline"
                      className={statusTabConfig?.badgeClass}
                    >
                      {booking.computedStatus}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {result && result.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-5">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 1 || loadingList}
              onClick={() =>
                setPage((currentPage) =>
                  Math.max(1, currentPage - 1)
                )
              }
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-sm text-muted-foreground px-2">
              Page {result.page} of{" "}
              {result.totalPages}
            </span>

            <Button
              variant="outline"
              size="icon"
              disabled={page === result.totalPages || loadingList}
              onClick={() =>
                setPage((currentPage) =>
                  Math.min(
                    result.totalPages,
                    currentPage + 1
                  )
                )
              }
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