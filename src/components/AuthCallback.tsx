import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { isSafeRedirect, withRedirect } from "@/lib/redirect";

export default function AuthCallback() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    const raw = searchParams.get("redirectTo");
    const redirectTo = isSafeRedirect(raw) ? raw : undefined;

    if (!user.isAdult) {
      navigate(withRedirect("/confirm-age", redirectTo), { replace: true });
    } else {
      navigate(redirectTo ?? "/", { replace: true });
    }
  }, [loading, user, navigate, searchParams]);

  return <div>Signing you in...</div>;
}