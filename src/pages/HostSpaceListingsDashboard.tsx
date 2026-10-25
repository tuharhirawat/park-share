import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import HostListingPage from "@/components/host-listing/HostListingPage";
import HostOnboardingModal from "@/components/host-listing/HostOnboardingModal";
import HostSpaceListingsSummaryDashboard from "@/components/host-listing/HostSpaceListingsSummaryDashboard";
import { HostSpacesListingsCount } from "@/types/hostSpaceListings";
import api from "@/services/api";

const HostSpaceListingsDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [summary, setSummary] = useState<HostSpacesListingsCount | null>(null);
  const [checkingListings, setCheckingListings] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCheckingListings(false);
      return;
    }

    if (!user.isHost) {
      setHostModalOpen(true);
      setCheckingListings(false);
      return;
    }

    let cancelled = false;

    const loadListingsSummary = async () => {
      setCheckingListings(true);
      setListingsError(null);

      try {
        const response = await api.get<HostSpacesListingsCount>(
          "/ParkingSpace/MySpaceListingsCount"
        );

        if (cancelled) return;

        setSummary(response.data);
      } catch (error) {
        if (cancelled) return;

        console.error(
          "Failed to load host space listings summary.",
          {
            error,
            userId: user.userId,
            endpoint: "/ParkingSpace/MySpaceListingsCount",
          }
        );

        setSummary(null);
        setListingsError("Unable to load your parking space listings. Please try again.");
      } finally {
        if (!cancelled) {
          setCheckingListings(false);
        }
      }
    };

    loadListingsSummary();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading || checkingListings) {
    return null;
  }

  if (!user?.isHost) {
    return (
      <HostOnboardingModal
        open={hostModalOpen}
        onOpenChange={setHostModalOpen}
      />
    );
  }

  if (listingsError) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">
            Unable to load your listings
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            {listingsError}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md px-4 py-2 text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!summary || summary.total === 0) {
    return <HostListingPage />;
  }

  return (
    <HostSpaceListingsSummaryDashboard
      initialSummary={summary}
      onSummaryChange={setSummary}
    />
  );
};

export default HostSpaceListingsDashboard;