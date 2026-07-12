import { useEffect, useState } from "react";
import api from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import HostListingPage from "../components/host-listing/HostListingPage";
import HostOnboardingModal from "@/components/HostOnboardingModal";
import HostSpacesDashboard from "@/components/host-listing/HostSpacesDashboard";

const HostListingHub = () => {
  const { user, loading: authLoading } = useAuth();
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [hasListings, setHasListings] = useState(false);
  const [checkingListings, setCheckingListings] = useState(true);

  useEffect(() => {
    if (!user) return;

    if (!user.isHost) {
      setHostModalOpen(true);
      setCheckingListings(false);
      return;
    }

    api.get("/ParkingSpace/MySpaces")
      .then((response) => {
        setHasListings((response.data?.length ?? 0) > 0);
        setCheckingListings(false);
      })
      .catch(() => setCheckingListings(false));
  }, [user]);

  if (authLoading || checkingListings) return null;

  if (!user?.isHost) {
    return (
      <HostOnboardingModal
        open={hostModalOpen}
        onOpenChange={setHostModalOpen}
      />
    );
  }

  return hasListings
    ? <HostSpacesDashboard />
    : <HostListingPage />;
};

export default HostListingHub;