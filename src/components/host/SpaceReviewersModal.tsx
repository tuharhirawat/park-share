import { useEffect, useState } from "react";
import api from "@/services/api";
import { Star } from "lucide-react";

type Reviewer = {
  userId: string;
  fullName: string;
  latestRating: number;
  latestReview: string | null;
  latestReviewDate: string;
};

export default function SpaceReviewersModal({ spaceId }: { spaceId: string }) {
  const [users, setUsers] = useState<Reviewer[]>([]);

  useEffect(() => {
    load();
  }, [spaceId]);

  async function load() {
    try {
      const { data } = await api.get(
        `/Review/host/space/${spaceId}/reviewers`
      );

      setUsers(data || []);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="max-h-[85vh] overflow-y-auto p-6 space-y-5">
      <h3 className="text-xl font-bold">Customer Reviews</h3>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No customer reviews yet.</p>
      ) : (
        users.map((user) => (
          <div
            key={user.userId}
            className="border rounded-2xl p-5"
          >
            <div className="flex justify-between gap-4">
              <div>
                <h4 className="font-semibold">
                  {user.fullName}
                </h4>

                <p className="text-xs text-muted-foreground mt-1">
                  Reviewed on{" "}
                  {new Date(
                    user.latestReviewDate
                  ).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-1 font-semibold">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                {user.latestRating}
              </div>
            </div>

            {user.latestReview ? (
              <p className="mt-4 text-sm text-muted-foreground">
                "{user.latestReview}"
              </p>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground italic">
                No comments provided.
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );
}