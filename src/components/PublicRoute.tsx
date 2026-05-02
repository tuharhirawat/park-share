import { useAuth } from "@/hooks/use-auth";
import { Navigate } from "react-router-dom";

const PublicRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PublicRoute;