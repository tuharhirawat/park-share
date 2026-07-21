import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { isSafeRedirect } from "@/lib/redirect";

export default function AuthCallback() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const initialize = async () => {
      try {
        await refreshUser();

        const redirectTo = searchParams.get("redirectTo");
        navigate(isSafeRedirect(redirectTo) ? redirectTo : "/", { replace: true });
      }
      catch (err) {
        console.error(err);
        navigate("/login", { replace: true });
      }
    };

    initialize();
  }, [navigate, refreshUser, searchParams]);

  return <div>Signing you in...</div>;
}