import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import HostListingPage from "../components/host-listing/HostListingPage";
import HostOnboardingModal from "@/components/HostOnboardingModal";
import HostSpacesDashboard from "@/components/host-listing/HostSpacesDashboard";

const HostListingHub = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [hasListings, setHasListings] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: profile }, { count }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("is_host")
            .eq("user_id", user.id)
            .single(),

          supabase
            .from("parking_spaces")
            .select("id", {
              count: "exact",
              head: true
            })
            .eq("user_id", user.id)
        ]);

      const hostStatus = profile?.is_host ?? false;

      setIsHost(hostStatus);

      setHasListings((count ?? 0) > 0);

      if (!hostStatus) {
        setHostModalOpen(true);
      }

      setLoading(false);
    };

    load();
  }, [user]);

  if (loading) return null;

  if (!isHost) {
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