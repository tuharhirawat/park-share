import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SpaceReviewSummary = {
  space_id: string;
  title: string;
  review_count: number;
  avg_rating: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
  unique_reviewers: number;
  repeat_reviews: number;
  latest_review_at: string;
};

export function useHostReviewSummary(hostId: string) {
  const [spaces, setSpaces] = useState<SpaceReviewSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [hostId]);

  async function fetchSummary() {

    setLoading(true);

    const { data, error } = await supabase
      .from("host_space_review_summary")
      .select("*")
      .eq("host_id", hostId)
      .order("avg_rating", { ascending: true });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setSpaces(data || []);
    setLoading(false);
  }

  return {
    spaces,
    loading
  };
}