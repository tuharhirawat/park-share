import { useState } from "react";
import api from "@/services/api";
import HostListingPage from "@/components/host-listing/HostListingPage";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Pagination from "@/components/Pagination";
import SpaceListingSummaryCards from "@/components/host-listing/SpaceListingSummaryCards";
import { SpaceListingCardSkeletonList } from "@/components/SkeletonLoaders/SpaceListingSummaryCardsSkeleton";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import HostSpacesCountSummaryCard from "@/components/host-listing/HostSpacesCountSummaryCard";
import { PlusCircle } from "lucide-react";
import { HostSpacesListingsCount, HostSpaceListing, ListingStatus, ReapplySpace } from "@/types/hostSpaceListings";
import { Paginated } from "@/types/pagination";
import { useConfirmationDialog } from "@/hooks/useConfirmationDialog";
import { HOST_SPACES_SUMMARY_DASHBOARD_PAGE_SIZE, STATUS_CARDS  } from "@/constants/hostSpaceListingsDashboardConstants";

type View =
  | "home"
  | "pending"
  | "approved"
  | "rejected"
  | "new-space";

interface HostSpaceListingsSummaryDashboardProps {
  initialSummary: HostSpacesListingsCount;
  onSummaryChange: (summary: HostSpacesListingsCount) => void;
};

const HostSpaceListingsSummaryDashboard = ({
  initialSummary,
  onSummaryChange,
}: HostSpaceListingsSummaryDashboardProps) => {
  const [view, setView] = useState<View>("home");
  const [summary, setSummary] = useState(initialSummary);
  const [spaces, setSpaces] = useState<HostSpaceListing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [editingSpace, setEditingSpace] = useState<ReapplySpace | null>(null);
  const totalPages = Math.ceil(totalCount / HOST_SPACES_SUMMARY_DASHBOARD_PAGE_SIZE);
  const cancelDialog = useConfirmationDialog<HostSpaceListing>();
  const [cancelling, setCancelling] = useState(false);

  const loadSpacesByStatus = async (
    status: ListingStatus,
    page: number = 1
  ) => {
    setLoadingSpaces(true);

    try {
      const response = await api.get<Paginated<HostSpaceListing>>(
        `/ParkingSpace/MySpaceListings?status=${status}&page=${page}`
      );

      setSpaces(response.data.items);
      setTotalCount(response.data.totalCount);
      setCurrentPage(response.data.page);
    } catch {
      setSpaces([]);
      setTotalCount(0);
      setCurrentPage(1);
    } finally {
      setLoadingSpaces(false);
    }
  };

  const handleStatusClick = async (status: ListingStatus) => {
    setView(status);
    setCurrentPage(1);

    await loadSpacesByStatus(status, 1);
  };

  const handlePageChange = (page: number) => {
    if (view === "home" || view === "new-space") return;

    loadSpacesByStatus(view, page);
  };

  const handleReapply = async (space: HostSpaceListing) => {
    try {
      const response = await api.get<ReapplySpace>(
        `/ParkingSpace/${space.id}/ReapplyDetails`
      );

      setEditingSpace(response.data);
      setView("new-space");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        "Failed to load listing details"
      );
    }
  };

  const handleCancelListing = async () => {
    const spaceToCancel = cancelDialog.item;

    if (!spaceToCancel || cancelling || view === "home" || view === "new-space") {
      return;
    }

    setCancelling(true);

    try {
      await api.delete(`/ParkingSpace/${spaceToCancel.id}/CancelListing`);

      toast.success("Listing cancelled successfully");
      cancelDialog.close();

      // Update dashboard summary.
      const updatedSummary = {
        ...summary,
        total: Math.max(0, summary.total - 1),
        pending: Math.max(0, summary.pending - 1),
      };

      setSummary(updatedSummary);
      onSummaryChange(updatedSummary);

      const newTotalCount = Math.max(0, totalCount - 1);
      const newTotalPages = Math.max(1, Math.ceil(newTotalCount / HOST_SPACES_SUMMARY_DASHBOARD_PAGE_SIZE));
      const pageToLoad = Math.min(currentPage, newTotalPages);

      await loadSpacesByStatus(view, pageToLoad);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        "Failed to cancel listing"
      );
    } finally {
      setCancelling(false);
    }
  };

  const renderHome = () => (
    <div className="grid md:grid-cols-2 gap-6">
      {STATUS_CARDS.map(({ status, ...card }) => (
        <HostSpacesCountSummaryCard
          key={status}
          {...card}
          count={summary[status]}
          onClick={() => handleStatusClick(status)}
        />
      ))}

      <HostSpacesCountSummaryCard
        title="Apply New Space"
        description="Create another listing"
        icon={PlusCircle}
        onClick={() => {
          setEditingSpace(null);
          setView("new-space");
        }}
      />
    </div>
  );

  const renderSpaces = () => {
    if (loadingSpaces) {
      return <SpaceListingCardSkeletonList count={3} />;
    }

    if (view === "home" || view === "new-space") return null;

    return (
      <div className="space-y-5">
        {spaces.length === 0 && (
          <Card>
            <CardContent className="h-[180px] flex items-center justify-center text-muted-foreground">
              No spaces found
            </CardContent>
          </Card>
        )}

        {spaces.map((space) => (
          <SpaceListingSummaryCards
            key={space.id}
            space={space}
            status={view}
            onReapply={handleReapply}
            onCancel={cancelDialog.openFor}
          />
        ))}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 min-h-[70vh]">
      <div className="flex items-center gap-2 mb-10 text-sm">
        <button
          onClick={() => setView("home")}
          className="text-primary hover:underline"
        >
          Spaces
        </button>

        {view !== "home" && (
          <>
            <span>{">"}</span>

            <span className="font-medium text-foreground">
              {view === "new-space" && editingSpace
                ? "reapply"
                : view}
            </span>
          </>
        )}
      </div>

      {/* Content */}
      {view === "home" ? (
        renderHome()
      ) : view === "new-space" ? (
        <HostListingPage editSpace={editingSpace} />
      ) : (
        renderSpaces()
      )}

      <ConfirmationDialog
        open={cancelDialog.open}
        onClose={cancelDialog.close}
        onConfirm={handleCancelListing}
        loading={cancelling}
        variant="destructive"
        title="Cancel this listing?"
        description={
          <>
            Are you sure you want to cancel{" "}
            <span className="font-semibold text-foreground">
              {cancelDialog.item?.title}
            </span>
            ?
            <br />
            <br />
            This will permanently delete this parking listing and its related
            data from your account. This action cannot be undone. You would need
            to create this listing again if you want to list this parking space
            in the future.
          </>
        }
        confirmText="Confirm Cancel"
        loadingText="Cancelling..."
        cancelText="Go Back"
      />

    </div>
  );
};

export default HostSpaceListingsSummaryDashboard;