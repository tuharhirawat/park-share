const SpaceCardSkeleton = () => {
  return (
    <div className="bg-card rounded-2xl p-5 card-shadow space-y-4 animate-pulse">
      <div className="h-36 rounded-xl bg-muted" />
      <div className="space-y-2">
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
      </div>
      <div className="flex gap-4">
        <div className="h-3 w-12 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
        <div className="h-3 w-14 rounded bg-muted" />
      </div>
      <div className="h-9 w-full rounded-lg bg-muted" />
    </div>
  );
};

export default SpaceCardSkeleton;