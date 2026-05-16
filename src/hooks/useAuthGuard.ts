import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export const useAuthGuard = () => {

  const [authOpen, setAuthOpen] = useState(false);
  const [redirectPath, setRedirectPath] = useState("");
  const { user } = useAuth();

  const requireAuth = ( action: () => void, intendedPath?: string ) => {

    if (!user) {

      if (intendedPath) {
        setRedirectPath(intendedPath);
      }

      setAuthOpen(true);
      return;
    }

    action();
  };

  return { authOpen, setAuthOpen, requireAuth, redirectPath };
};