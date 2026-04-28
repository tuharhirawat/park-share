import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";

export default function SpaceReviewersModal({ spaceId }: { spaceId: string }) {

  const [users, setUsers] = useState([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [reviewHistory, setReviewHistory] = useState<Record<string, any[]>>({});

  useEffect(() => {
    load();
  }, [spaceId]);

  async function load() {
    const { data } = await supabase
      .from("space_reviewers_summary")
      .select("*")
      .eq("space_id", spaceId)
      .order(
        "latest_review_date",
        { ascending: false }
      );
    setUsers(data || []);
  }

  async function loadUserHistory(userId: string) {

    if (reviewHistory[userId]) {
      setExpandedUser(
        expandedUser === userId
          ? null
          : userId
      );
      return;
    }

    const { data, error } = await supabase
      .from("reviews")
      .select(`
        id,
        rating,
        review_text,
        created_at
      `)
      .eq("space_id", spaceId)
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      console.error(error);
      return;
    }

    setReviewHistory(prev => ({
      ...prev,
      [userId]: data || []
    }));
    setExpandedUser(userId);
  }

  return (
    <div className="max-h-[85vh] overflow-y-auto p-6 space-y-5">

      <h3 className="text-xl font-bold">
        Customer Review History
      </h3>

      {users.map((u: any) => (
        <div
          key={u.user_id}
          className="border rounded-2xl p-5"
        >

          <div className="flex justify-between">

            <div>
              <h4 className="font-semibold">
                {u.full_name}
              </h4>

              <p className="text-sm text-muted-foreground">
                {u.reviews_by_user} reviews submitted
              </p>
            </div>

            <div className="font-semibold">
              ⭐ {u.latest_rating}
            </div>

          </div>

          <p className="mt-4">
            {u.latest_review}
          </p>

          <button
            onClick={() => loadUserHistory(u.user_id)}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            {expandedUser === u.user_id
              ? "Hide History"
              : "View Review History"}
          </button>

          {expandedUser === u.user_id &&
            reviewHistory[u.user_id] && (
              <div className="mt-5 space-y-3 border-t pt-4 max-h-64 overflow-y-auto pr-2">
                {reviewHistory[u.user_id].map((r: any) => (
                  <div
                    key={r.id}
                    className="rounded-xl bg-muted/30 p-4"
                  >
                    <div className="flex justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star
                            key={i}
                            className={
                              i <= r.rating
                                ? "w-3 h-3 fill-yellow-500 text-yellow-500"
                                : "w-3 h-3 opacity-20"
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm">
                      {r.review_text}
                    </p>
                  </div>
                ))}
              </div>
            )}
        </div>
      ))}
    </div>
  )
}