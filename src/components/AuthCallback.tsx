import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

export default function AuthCallback() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const initialize = async () => {
      try {
        await refreshUser();
        navigate("/", { replace: true });
      }
      catch (err) {
        navigate("/login", { replace: true });
      }
    };

    initialize();
  }, [navigate, refreshUser]);

  return <div>Signing you in...</div>;
}