import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { withRedirect } from "@/lib/redirect";

const EXEMPT_PATHS = ["/confirm-age", "/auth/callback", "/terms", "/privacy", "/about", "/contact"];

const AgeGate = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const exempt = EXEMPT_PATHS.includes(location.pathname);

  if (loading && !exempt) return null;

  if (!loading && user && !user.isAdult && !exempt) {
    return (
      <Navigate
        to={withRedirect("/confirm-age", location.pathname + location.search)}
        replace
      />
    );
  }

  return children;
};

export default AgeGate;