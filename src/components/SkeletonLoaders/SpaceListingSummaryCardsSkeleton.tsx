import { Card, CardContent } from "@/components/ui/card";

export const SpaceListingCardSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="flex gap-4">
        <div className="w-24 h-20 rounded-md bg-muted animate-pulse shrink-0" />

        <div className="flex-1">
          <div className="h-6 w-48 bg-muted animate-pulse rounded mb-3" />
          <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
        </div>
      </div>
    </CardContent>
  </Card>
);

interface SpaceListingCardSkeletonListProps {
  count?: number;
}

export const SpaceListingCardSkeletonList = ({
  count = 3,
}: SpaceListingCardSkeletonListProps) => (
  <div className="space-y-5">
    {Array.from({ length: count }, (_, i) => (
      <SpaceListingCardSkeleton key={i} />
    ))}
  </div>
);