import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import api from "@/services/api";
import StarRating from "./StarRating";
import type { Booking, MySpaceBookingReview } from "@/types/booking";
import type { ReviewDraft } from "@/viewTypes/bookingUi";

interface CompletedBookingActionsProps {
  booking: Booking;
  existingReview?: MySpaceBookingReview;
  reviewsLoading: boolean;
  onReviewSaved: (review: MySpaceBookingReview) => void;
};

const CompletedBookingActions = ({
  booking,
  existingReview,
  reviewsLoading,
  onReviewSaved,
}: CompletedBookingActionsProps) => {
  const navigate = useNavigate();

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>({
    bookingId: null,
    rating: 0,
    text: "",
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleOpenReview = () => {
    if (reviewsLoading) return;

    if (existingReview) {
      // Existing review → open in edit mode
      setReviewDraft({
        bookingId: booking.id,
        rating: existingReview.rating,
        text: existingReview.reviewText || "",
      });
    } else {
      // No review → open new review form
      setReviewDraft({
        bookingId: booking.id,
        rating: 0,
        text: "",
      });
    }

    setReviewOpen(true);
  };

  const handleCloseReview = () => {
    if (submittingReview) return;

    setReviewOpen(false);

    setReviewDraft({
      bookingId: null,
      rating: 0,
      text: "",
    });
  };

  const handleSubmitReview = async () => {
    if (reviewDraft.rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setSubmittingReview(true);

    try {
      await api.post("/Review/Submit", {
        bookingId: booking.id,
        rating: reviewDraft.rating,
        reviewText: reviewDraft.text || null,
      });

      const now = new Date().toISOString();

      const savedReview: MySpaceBookingReview = {
        id: existingReview?.id ?? crypto.randomUUID(),
        spaceId: booking.spaceId,
        rating: reviewDraft.rating,
        reviewText: reviewDraft.text || null,
        createdAt: existingReview?.createdAt ?? now,
        updatedAt: now,
      };

      onReviewSaved(savedReview);

      toast.success(
        existingReview
          ? "Review updated! ⭐"
          : "Review submitted! ⭐"
      );

      handleCloseReview();
    } catch (err: any) {
      console.error(err);

      const message = err?.response?.data?.message;

      toast.error(message ?? "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const isReviewed = !!existingReview;

  return (
    <>
      <div className="border-t border-border pt-4 flex flex-wrap gap-3 items-center">
        {/* Book Again */}
        <Button
          variant="secondary"
          size="sm"
          className="rounded-full"
          onClick={() => navigate(`/space/db_${booking.spaceId}`)}
        >
          Book Again
        </Button>

        {/* Review Button */}
        <Button
          variant={isReviewed ? "ghost" : "outline"}
          size="sm"
          className={
            isReviewed
              ? "rounded-full gap-2 text-primary hover:bg-primary/5"
              : "rounded-full gap-2 border-primary/20 hover:bg-primary/5 transition-colors"
          }
          disabled={reviewsLoading}
          onClick={handleOpenReview}
        >
          {reviewsLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading Review...
            </>
          ) : (
            <>
              <Star
                className={`w-4 h-4 ${
                  isReviewed ? "fill-primary" : ""
                }`}
              />

              {isReviewed
                ? "View / Edit Review"
                : "Leave a Review"}
            </>
          )}
        </Button>
      </div>

      {/* Review Modal */}
      <Dialog
        open={reviewOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseReview();
          }
        }}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {isReviewed
                ? "Edit Your Review"
                : "Leave a Review"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Space */}
            <div>
              <p className="font-semibold">
                {booking.spaceTitle}
              </p>

              <p className="text-sm text-muted-foreground mt-1">
                How was your parking experience?
              </p>
            </div>

            {/* Rating */}
            <div className="flex justify-center py-2">
              <StarRating
                rating={reviewDraft.rating}
                onChange={(rating) =>
                  setReviewDraft((prev) => ({
                    ...prev,
                    rating,
                  }))
                }
              />
            </div>

            {/* Review Text */}
            <Textarea
              placeholder="Share your experience (optional)"
              value={reviewDraft.text}
              onChange={(e) =>
                setReviewDraft((prev) => ({
                  ...prev,
                  text: e.target.value,
                }))
              }
              className="bg-background/50 border-primary/10 focus-visible:ring-primary/20"
              rows={4}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                className="rounded-full px-5"
                disabled={submittingReview}
                onClick={handleCloseReview}
              >
                Cancel
              </Button>

              <Button
                className="rounded-full px-5"
                disabled={
                  submittingReview ||
                  reviewDraft.rating === 0
                }
                onClick={handleSubmitReview}
              >
                {submittingReview ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4 mr-2 fill-current" />

                    {isReviewed
                      ? "Update Review"
                      : "Submit Review"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CompletedBookingActions;