import { useEffect, useState } from "react";
import api from "@/services/api";
import { SpaceReviewSummary } from "@/types/host";

export const useSpaceReviewSummary = (spaceId: string) => {
  const [space, setSpace] = useState<SpaceReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!spaceId) {
      setSpace(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    setLoading(true);

    api
      .get(`/Review/host/space/${spaceId}/summary`)
      .then(({ data }) => {
        if (!cancelled) {
          setSpace(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSpace(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  return { space, loading };
};