import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { hasEmailAuth, isAuthProviderEnabled } from "@/config/authConfig";
import { GoogleSignIn } from "@/components/GoogleSignIn";
import { useNavigate } from "react-router-dom";
import { withRedirect } from "@/lib/redirect";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectPath?: string;
  title?: string;
  description?: string;
};

const AuthRequiredModal = ({
  open,
  onOpenChange,
  redirectPath,
  title = "Sign in required",
  description = "Please sign in to continue",
}: Props) => {

  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange} >
      <DialogContent className="w-[92vw] max-w-[480px] rounded-2xl p-6 sm:p-7 mx-auto" >

        <DialogHeader>
          <DialogTitle className="text-lg text-center m-1">
            {title}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground text-center">
          {description}
        </p>

        <div className="space-y-3">

          {hasEmailAuth() && (
            <>
              <Button
                className="w-full"
                onClick={() =>
                  navigate(withRedirect("/login", redirectPath))
                }
              >
                Continue with Email
              </Button>
            </>
          )}

          {isAuthProviderEnabled("google") && (
            <GoogleSignIn
              redirectTo={redirectPath}
            />
          )}

        </div>

      </DialogContent>
    </Dialog>
  );
};

export default AuthRequiredModal;