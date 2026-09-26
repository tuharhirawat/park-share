import { useState, lazy, Suspense } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSpaceReviewSummary } from "@/hooks/useSpaceReviewSummary";
import { SpaceReviewSummary } from "@/types/host";

const SpaceReviewersModal = lazy(
  () => import("../SpaceReviewersModal")
);

interface HostSpaceOverviewReviewsTabProps {
  spaceId: string;
}

interface RatingBarProps {
  label: string;
  count: number;
  total: number;
};

interface MetricProps {
  label: string;
  value: string | number;
};

const HostSpaceOverviewReviewsTab = ({ spaceId }: HostSpaceOverviewReviewsTabProps) => {
  const { space, loading } = useSpaceReviewSummary(spaceId);
  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);

  const handleOpenReviews = (spaceId: string) => {
    setSelectedSpace(spaceId);
  };

  const handleCloseModal = () => {
    setSelectedSpace(null);
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Loading reviews...
      </div>
    );
  }

  if (!space) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        No reviews yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SpaceReviewCard
        space={space}
        onFeedbackClick={handleOpenReviews}
      />

      <Dialog
        open={!!selectedSpace}
        onOpenChange={handleCloseModal}
      >
        <DialogContent className="w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl p-0">
          <Suspense
            fallback={
              <div className="p-8 text-center">
                Loading feedback...
              </div>
            }
          >
            {selectedSpace && (
              <SpaceReviewersModal
                spaceId={selectedSpace}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const SpaceReviewCard = ({ space, onFeedbackClick }: {
  space: SpaceReviewSummary; onFeedbackClick: (id: string) => void;
}) => {

  const lowRatings = space.oneStar + space.twoStar;
  const positiveRatio = space.reviewCount > 0
    ? `${Math.round(
      ((space.reviewCount - lowRatings) / space.reviewCount) * 100
    )}%`
    : "—";

  const metrics = [
    { label: "5★ Reviews", value: space.fiveStar },
    { label: "Low Ratings", value: lowRatings },
    { label: "Positive Ratio", value: positiveRatio },
  ];

  const ratings = [
    { label: "5★", count: space.fiveStar },
    { label: "4★", count: space.fourStar },
    { label: "3★", count: space.threeStar },
    { label: "2★", count: space.twoStar },
    { label: "1★", count: space.oneStar },
  ];

  return (
    <div className="rounded-2xl border bg-card p-6 card-shadow">
      <div className="mb-4 flex justify-between">
        <div>
          <h3 className="text-xl font-semibold">{space.title}</h3>

          <p className="text-sm text-muted-foreground">
            {space.reviewCount} customer reviews
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Metric
            key={metric.label}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {ratings.map((rating) => (
          <RatingBar
            key={rating.label}
            label={rating.label}
            count={rating.count}
            total={space.reviewCount}
          />
        ))}
      </div>

      <div className="pt-5">
        <button
          onClick={() => onFeedbackClick(space.spaceId)}
          className="rounded-xl border px-4 py-2 transition hover:bg-muted"
        >
          Customer Feedback
        </button>
      </div>
    </div>
  );
};

const Metric = ({ label, value }: MetricProps) => {
  return (
    <div className="rounded-xl bg-muted/30 p-4">
      <p className="text-sm text-muted-foreground">
        {label}
      </p>

      <p className="text-xl font-semibold">
        {value}
      </p>
    </div>
  );
};

const RatingBar = ({ label, count, total } : RatingBarProps) => {
  const width = total > 0
    ? (count / total) * 100
    : 0;

  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span>{count}</span>
      </div>

      <div className="h-2 rounded-full bg-muted">
        <div
          style={{ width: `${width}%` }}
          className="h-2 rounded-full bg-primary transition-all"
        />
      </div>
    </div>
  );
};

export default HostSpaceOverviewReviewsTab;