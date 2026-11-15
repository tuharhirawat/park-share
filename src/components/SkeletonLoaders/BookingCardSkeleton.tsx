const BookingCardSkeleton = () => (
  <div className="bg-card rounded-2xl p-6 card-shadow space-y-4 animate-pulse">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="h-5 w-48 rounded bg-muted" />
        <div className="h-5 w-20 rounded-full bg-muted" />
      </div>

      <div className="h-5 w-28 rounded-full bg-muted" />
    </div>

    <div className="flex flex-wrap gap-4">
      <div className="h-4 w-40 rounded bg-muted" />
      <div className="h-4 w-28 rounded bg-muted" />
      <div className="h-4 w-28 rounded bg-muted" />
      <div className="h-4 w-16 rounded bg-muted" />
    </div>

    <div className="flex flex-wrap gap-4">
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="h-4 w-16 rounded bg-muted" />
    </div>

    <div className="flex flex-wrap items-center gap-3">
      <div className="h-6 w-20 rounded bg-muted mr-auto" />
      <div className="h-9 w-24 rounded bg-muted" />
      <div className="h-9 w-24 rounded bg-muted" />
      <div className="h-9 w-20 rounded bg-muted" />
    </div>
  </div>
);

export default BookingCardSkeleton;