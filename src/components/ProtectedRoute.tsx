import { useAuth } from "@/hooks/use-auth";
import { Navigate, useLocation } from "react-router-dom";
import { getLoginRoute } from "@/config/authConfig";
import { withRedirect } from "@/lib/redirect";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {

  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <Navigate
        to={withRedirect(getLoginRoute(), location.pathname)} replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;