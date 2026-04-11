import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ReviewItem {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
}

const ReviewsList = ({ spaceId }: { spaceId: string }) => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, review_text, created_at")
        .eq("space_id", spaceId)
        .order("created_at", { ascending: false });
      setReviews((data as ReviewItem[]) || []);
      setLoading(false);
    };
    fetchReviews();
  }, [spaceId]);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">No reviews yet.</p>;
  }

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
        <span className="font-bold text-foreground">{avgRating}</span>
        <span className="text-muted-foreground text-sm">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {reviews.map((r) => (
          <div key={r.id} className="bg-muted/50 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i <= r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(r.created_at), "MMM d, yyyy")}
              </span>
            </div>
            {r.review_text && (
              <p className="text-sm text-foreground">{r.review_text}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReviewsList;
