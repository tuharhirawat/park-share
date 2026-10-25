import { Skeleton } from "@/components/ui/skeleton";

const ParkingCardSkeleton = () => {
  return (
    <div className="bg-card rounded-2xl overflow-hidden card-shadow h-full flex flex-col">
      {/* Image */}
      <Skeleton className="w-full h-48 rounded-none" />

      <div className="p-4 flex flex-col flex-1">
        {/* Title + rating */}
        <div className="flex items-start justify-between mb-2">
          <Skeleton className="h-5 w-36" />

          <div className="flex items-center gap-1">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>

        {/* Distance badges */}
        <div className="mb-4 space-y-2">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>

          {/* Location */}
          <div className="flex items-start gap-1">
            <Skeleton className="h-4 w-4 rounded-full shrink-0" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>

        {/* Vehicle types */}
        <div className="flex gap-2 mb-4 min-h-7">
          <Skeleton className="h-6 w-14 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>

        {/* Price + button */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-baseline gap-1">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-4 w-6" />
          </div>

          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
};

export default ParkingCardSkeleton;