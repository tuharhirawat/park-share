import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";

export interface Review {
  id: string;
  booking_id: string;
  user_id: string;
  space_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  total_reviews_by_user: number;
}

interface ApiReview {
  id: string;
  bookingId: string;
  userId: string;
  spaceId: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
  updatedAt: string;
  fullName: string | null;
  totalReviewsByUser: number;
}

const mapApiToReview = (r: ApiReview): Review => ({
  id: r.id,
  booking_id: r.bookingId,
  user_id: r.userId,
  space_id: r.spaceId,
  rating: r.rating,
  review_text: r.reviewText,
  created_at: r.createdAt,
  updated_at: r.updatedAt,
  full_name: r.fullName,
  total_reviews_by_user: r.totalReviewsByUser,
});

export const useReviews = (spaceId: string, limit = 5, enabled = true) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const fetchPage = useCallback(
    async (pageNumber: number, replace = false) => {
      setLoading(true);
      try {
        const response = await api.get(`/Review/space/${spaceId}`, {
          params: { page: pageNumber, limit },
        });
        const rows = ((response.data || []) as ApiReview[]).map(mapApiToReview);
        setReviews(prev => (replace ? rows : [...prev, ...rows]));
        setHasMore(rows.length === limit);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    },
    [spaceId, limit]
  );

  useEffect(() => {
    if (!enabled) return;          // ← don't fetch until this hook instance is actually needed
    setPage(0);
    fetchPage(0, true);
  }, [spaceId, fetchPage, enabled]);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    const nextPage = page + 1;

    await fetchPage(nextPage);

    setPage(nextPage);
  };

  return { reviews, loading, hasMore, loadMore };
};