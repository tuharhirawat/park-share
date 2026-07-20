import { Star, Loader2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useReviews } from "@/hooks/useReviews";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ReviewsList = ({ spaceId }: { spaceId: string }) => {
  const [openAllReviews, setOpenAllReviews] = useState(false);
  const { reviews, loading } = useReviews(spaceId);                       // always on — preview
  const {
    reviews: allReviews,
    loading: loadingAll,
    hasMore,
    loadMore,
  } = useReviews(spaceId, 10, openAllReviews);                            // only fetches once dialog opens

  if (loading && reviews.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/30 rounded-2xl border border-dashed">
        <MessageSquare className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">No reviews yet for this space.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Be the first to share your experience!</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-muted/40 rounded-2xl p-5 space-y-3 transition-colors hover:bg-muted/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {r?.full_name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {r?.full_name || "Anonymous User"}
                    </p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i <= r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/20"
                            }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground font-medium">
                  {format(new Date(r.created_at), "MMM d, yyyy")}
                  {r.updated_at !== r.created_at && (
                    <span className="ml-2 text-[10px]">
                      Edited
                    </span>
                  )}
                </span>
              </div>
              {r.review_text?.trim() && (
                <p className="text-sm text-foreground leading-relaxed pl-11">
                  {r.review_text}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenAllReviews(true)}
            className="rounded-full px-6"
          >
            View All Reviews
          </Button>
        </div>
      </div>
      <Dialog
        open={openAllReviews}
        onOpenChange={setOpenAllReviews}
      >
        <DialogContent className="w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl p-6 space-y-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">All Reviews</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            {allReviews.map((r) => (
              <div key={r.id} className="bg-muted/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {r?.full_name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {r?.full_name || "Anonymous User"}
                      </p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i <= r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/20"
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {format(new Date(r.created_at), "MMM d, yyyy")}
                    {r.updated_at !== r.created_at && (
                      <span className="ml-2 text-[10px]">Edited</span>
                    )}
                  </span>
                </div>
                {r.review_text?.trim() && (
                  <p className="text-sm text-foreground leading-relaxed pl-11">
                    {r.review_text}
                  </p>
                )}
              </div>
            ))}

            {allReviews.length === 0 && !loadingAll && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No reviews yet.
              </p>
            )}
          </div>

          {hasMore && (
            <Button
              variant="outline"
              className="w-full"
              onClick={loadMore}
              disabled={loadingAll}
            >
              {loadingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load More"}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReviewsList;