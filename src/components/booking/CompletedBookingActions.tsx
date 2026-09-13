import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star } from "lucide-react";
import StarRating from "./StarRating";
import type { Booking } from "@/types/booking";
import type { ReviewDraft } from "@/viewTypes/bookingUi";

type CompletedBookingActionsProps = {
  booking: Booking;
  reviewDraft: ReviewDraft;
  submittingReview: boolean;
  setReviewDraft: React.Dispatch<React.SetStateAction<ReviewDraft>>;
  onSubmitReview: (booking: Booking, existingReviewId?: string) => void;
};

const CompletedBookingActions = ({
  booking,
  reviewDraft,
  submittingReview,
  setReviewDraft,
  onSubmitReview,
}: CompletedBookingActionsProps) => {
  const navigate = useNavigate();
  const isEditingThisBooking = reviewDraft.bookingId === booking.id;

  return (
    <div className="border-t border-border pt-4 flex flex-wrap gap-3 items-center">
      <Button
        variant="secondary"
        size="sm"
        className="rounded-full"
        onClick={() => navigate(`/space/db_${booking.spaceId}`)}
      >
        Book Again
      </Button>

      {isEditingThisBooking ? (
        <div className="w-full mt-4 p-5 bg-muted/40 rounded-2xl border border-primary/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">
              How was your parking experience?
            </h4>

            <StarRating
              rating={reviewDraft.rating}
              onChange={(rating) => setReviewDraft(prev => ({ ...prev, rating }))}
            />
          </div>

          <Textarea
            placeholder="Share your experience (optional)"
            value={reviewDraft.text}
            onChange={(e) => setReviewDraft(prev => ({ ...prev, text: e.target.value }))}
            className="bg-background/50 border-primary/10 focus-visible:ring-primary/20"
            rows={3}
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              className="rounded-full px-5"
              disabled={submittingReview || reviewDraft.rating === 0}
              onClick={() => onSubmitReview(booking)}
            >
              {submittingReview ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 mr-2 fill-current" />
                  {booking.hasReview ? "Update Review" : "Submit Review"}
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="rounded-full px-5"
              onClick={() => setReviewDraft({
                bookingId: null,
                rating: 0,
                text: ""
              })}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          {!booking.hasReview ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full gap-2 border-primary/20 hover:bg-primary/5 transition-colors"
              onClick={() => setReviewDraft({
                bookingId: booking.id,
                rating: 0,
                text: ""
              })}
            >
              <Star className="w-4 h-4" />
              Leave Review
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full gap-2 text-primary hover:bg-primary/5"
              onClick={() =>
                setReviewDraft({
                  bookingId: booking.id,
                  rating: booking.rating ?? 0,
                  text: booking.reviewText || "",
                })
              }
            >
              <Star className="w-4 h-4 fill-primary" />
              Edit Review
            </Button>
          )}
        </>
      )}

      {booking.hasReview && !isEditingThisBooking && (
        <div className="w-full mt-2 p-3 bg-muted/20 rounded-xl flex gap-3 items-start border border-border/50">
          <div className="flex gap-0.5 mt-0.5">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-bold">
              {booking.rating}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 italic">
            "{booking.reviewText || "No comments provided."}"
          </p>
        </div>
      )}
    </div>
  );
};

export default CompletedBookingActions;