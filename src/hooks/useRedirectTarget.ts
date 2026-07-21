import { useSearchParams } from "react-router-dom";
import { isSafeRedirect } from "@/lib/redirect";

/** Reads and validates ?redirectTo= from the current page's URL. */
export const useRedirectTarget = (): string | undefined => {
  const [searchParams] = useSearchParams();
  const raw = searchParams.get("redirectTo");
  return isSafeRedirect(raw) ? raw : undefined;
};