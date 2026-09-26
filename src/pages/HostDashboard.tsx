import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Space, SpaceCardData } from "@/types/host";
import api from "@/services/api";
import SummaryCards from "@/components/host/SummaryCards";
import SpaceCardSkeleton from "@/components/SkeletonLoaders/SpaceCardSkeleton";
import SpaceCard from "@/components/host/SpaceCard";
import SpaceOverview from "@/components/host/SpaceOverview";
import { HOST_DASHBOARD_PAGE_SIZE } from "@/constants/hostDashboardConstants";

const HostDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [dashboardSummary, setDashboardSummary] = useState({
    totalSpaces: 0,
    totalBookings: 0,
    totalEarnings: 0,
    averageRating: 0,
  });

  const fetchAll = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { data } = await api.get("/Host/dashboard/summary", {
        params: {
          page: currentPage,
          pageSize: HOST_DASHBOARD_PAGE_SIZE,
        },
      });

      setSpaces(data.spaces?.items || []);
      setTotalPages(data.spaces?.totalPages || 1);

      setDashboardSummary({
        totalSpaces: data.totalSpaces || 0,
        totalBookings: data.totalBookings || 0,
        totalEarnings: data.totalEarnings || 0,
        averageRating: data.averageRating || 0,
      });
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user, currentPage]);

  useEffect(() => {
    if (user) {
      fetchAll();
    }
  }, [user, fetchAll]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const spaceCards: SpaceCardData[] = useMemo(
    () =>
      spaces.map((s) => ({
        id: s.id,
        title: s.title,
        address: s.address,
        city: s.city,
        pricePerHour: s.pricePerHour,
        available: s.available,
        rating: Number(s.rating || 0),
        reviewCount: s.reviewCount || 0,
        listingStatus: s.listingStatus,
        imageUrls: s.imageUrls || [],
        activeCount: s.activeNow,
        upcomingCount: s.upcomingCount,
        totalBookings: s.totalBookings,
        earnings: s.earnings,
      })),
    [spaces]
  );

  const selectedSpace = spaces.find((s) => s.id === selectedSpaceId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8">
          Host Dashboard
        </h1>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-2xl p-5 card-shadow animate-pulse space-y-2"
              >
                <div className="h-3 w-16 rounded bg-muted" />
                <div className="h-6 w-10 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <SummaryCards
            listingsCount={dashboardSummary.totalSpaces}
            totalBookings={dashboardSummary.totalBookings}
            totalEarnings={dashboardSummary.totalEarnings}
            avgRating={
              dashboardSummary.totalSpaces > 0
                ? dashboardSummary.averageRating.toFixed(1)
                : "N/A"
            }
          />
        )}

        <div className="mt-8">
          {selectedSpace ? (
            <SpaceOverview
              space={selectedSpace}
              onBack={() => setSelectedSpaceId(null)}
              onChanged={fetchAll}
            />
          ) : loading ? (
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground text-lg">My Spaces</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SpaceCardSkeleton key={i} />
                ))}
              </div>
            </div>
          ) : spaceCards.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-4">
                You haven't listed any parking spaces yet.
              </p>

              <Button onClick={() => navigate("/host/host-listing")}>
                List Your First Space
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground text-lg">
                My Spaces
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {spaceCards.map((spaceCard) => (
                  <SpaceCard
                    key={spaceCard.id}
                    space={spaceCard}
                    onSelect={setSelectedSpaceId}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <span className="text-sm text-muted-foreground px-2">
                    Page {currentPage} of {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;