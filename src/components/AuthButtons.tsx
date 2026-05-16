import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { hasEmailAuth, isAuthProviderEnabled } from "@/config/authConfig";

const AuthButtons = () => {

  return (
    <div className="flex items-center gap-2">

      {hasEmailAuth() && (
        <>
          <Link to="/login">
            <Button variant="outline" size="sm">
              Log In
            </Button>
          </Link>

          <Link to="/signup">
            <Button size="sm">
              Sign Up
            </Button>
          </Link>
        </>
      )}

      {!hasEmailAuth() && isAuthProviderEnabled("google") && (
        <GoogleSignIn text="Join Now" />
      )}

    </div>
  );
};

export default AuthButtons;