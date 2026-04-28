import { useState, memo, lazy, Suspense, useMemo, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useHostReviewSummary } from "@/hooks/useHostReviewSummary";

const SpaceReviewersModal = lazy(
  () => import("./SpaceReviewersModal")
);

type ReviewSpace = {
  space_id: string;
  title: string;
  review_count: number;
  unique_reviewers: number;
  repeat_reviews: number;
  avg_rating: number | string;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
  latest_review_at: string;
};

export default function ReviewMetricsPanel({hostId}: {hostId: string;}) {
  const { spaces, loading } = useHostReviewSummary(hostId);

  const [selectedSpace, setSelectedSpace] = useState<string | null>(null);

  const handleOpenReviews = useCallback(
    (spaceId: string) => {
      setSelectedSpace(spaceId);
    },
    []
  );

  const handleCloseModal = useCallback(
    () => setSelectedSpace(null),
    []
  );

  if (loading) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        Loading reviews...
      </div>
    );
  }

  if (!spaces?.length) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        No reviews yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {spaces.map((space: ReviewSpace) => (
        <SpaceReviewCard
          key={space.space_id}
          space={space}
          onFeedbackClick={handleOpenReviews}
        />
      ))}

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

const SpaceReviewCard = memo(function SpaceReviewCard({space,onFeedbackClick}: {space: ReviewSpace; onFeedbackClick: (id: string) => void;}) {
  const { lowRatings, positiveRatio, formattedDate, metrics, ratings } = useMemo(() => {
    const lowRatings =
      space.one_star + space.two_star;

    const positiveRatio =
      space.review_count > 0
        ? `${Math.round(
          ((space.review_count - lowRatings) /
            space.review_count) *
          100
        )}%`
        : "—";

    const formattedDate =
      space.latest_review_at
        ? new Date(
          space.latest_review_at
        ).toLocaleDateString()
        : "—";

    return {
      lowRatings,
      positiveRatio,
      formattedDate,

      metrics: [
        { label: "Repeat Reviewers", value: space.repeat_reviews },
        { label: "5★ Reviews", value: space.five_star },
        { label: "Low Ratings", value: lowRatings },
        { label: "Positive Ratio", value: positiveRatio },
      ],

      ratings: [
        { label: "5★", count: space.five_star },
        { label: "4★", count: space.four_star },
        { label: "3★", count: space.three_star },
        { label: "2★", count: space.two_star },
        { label: "1★", count: space.one_star }
      ]
    };
  }, [space]);

  return (
    <div className="rounded-2xl border bg-card p-6 card-shadow">
      <div className="mb-4 flex justify-between">
        <div>
          <h3 className="text-xl font-semibold">
            {space.title}
          </h3>

          <p className="text-sm text-muted-foreground">
            {space.review_count} reviews •{" "}
            {space.unique_reviewers} reviewers
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold">
            ⭐ {space.avg_rating}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
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
            total={space.review_count}
          />
        ))}
      </div>

      <div className="pt-5">
        <button
          onClick={() => onFeedbackClick(space.space_id)}
          className="rounded-xl border px-4 py-2 transition hover:bg-muted"
        >
          Customer Feedback
        </button>
      </div>
    </div>
  );
});

type MetricProps = {
  label: string;
  value: string | number;
};

const Metric = memo(function Metric({
  label,
  value
}: MetricProps) {
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
});

type RatingBarProps = {
  label: string;
  count: number;
  total: number;
};

const RatingBar = memo(function RatingBar({
  label,
  count,
  total
}: RatingBarProps) {
  const width =
    total > 0
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
          style={{
            width: `${width}%`
          }}
          className="h-2 rounded-full bg-primary transition-all"
        />
      </div>
    </div>
  );
});