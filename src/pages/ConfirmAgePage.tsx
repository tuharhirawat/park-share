import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useRedirectTarget } from "@/hooks/useRedirectTarget";

const ConfirmAgePage = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const redirectTo = useRedirectTarget();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user?.isAdult) return <Navigate to={redirectTo ?? "/"} replace />;

  const submit = async () => {
    setLoading(true);
    try {
      await api.post("/Auth/ConfirmAdult", { confirmed });
      await refreshUser();
      navigate(redirectTo ?? "/", { replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const cancel = async () => {
    try { await api.post("/Auth/Logout"); } catch { }
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">One last step</CardTitle>
          <CardDescription>Park Mitra is for users aged 18 and over.</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-center justify-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} />
            I confirm that I am 18 years or older
          </label>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" disabled={!confirmed || loading} onClick={submit}>Continue</Button>
          <Button variant="ghost" className="w-full" onClick={cancel}>Cancel</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ConfirmAgePage;