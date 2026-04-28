import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

export const useReviews = (spaceId: string, limit = 5) => {

  const [reviews,setReviews] = useState<Review[]>([]);
  const [loading,setLoading] = useState(false);
  const [hasMore,setHasMore] = useState(true);
  const [page,setPage] = useState(0);

  const fetchPage = useCallback(
    async (pageNumber:number, replace=false) => {

      setLoading(true);

      const from = pageNumber * limit;
      const to = from + limit - 1;

      const { data, error } = await supabase
        .from("space_latest_reviews")
        .select(`
          id,
          booking_id,
          user_id,
          space_id,
          rating,
          review_text,
          created_at,
          updated_at,
          full_name,
          total_reviews_by_user
        `)
        .eq("space_id", spaceId)
        .order("updated_at", {
          ascending:false
        })
        .range(from,to);

      if(error){
        console.error(error);
        setLoading(false);
        return;
      }

      const rows = (data || []) as Review[];

      setReviews(prev =>
        replace
          ? rows
          : [...prev,...rows]
      );

      setHasMore(
        rows.length === limit
      );

      setLoading(false);

    },
    [spaceId,limit]
  );

  useEffect(()=>{
    setPage(0);
    fetchPage(0,true);
  },[spaceId,fetchPage]);

  const loadMore = async () => {
    if(loading || !hasMore) return;

    const nextPage = page + 1;

    await fetchPage(nextPage);

    setPage(nextPage);
  };

  return { reviews, loading, hasMore, loadMore };
};