import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, IndianRupee, Shield, Users, Scale } from "lucide-react";

interface HostOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HostOnboardingModal = ({ open, onOpenChange }: HostOnboardingModalProps) => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBecomeHost = async () => {
    if (!user || !accepted) return;

    setLoading(true);

    try {
      const response = await api.post("/Host/BecomeHost");

      toast.success(response.data.message);
      await refreshUser();
      onOpenChange(false);
      navigate("/host/host-listing");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to activate host account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">Become a Host on Park Mitra</DialogTitle>
          <DialogDescription>Turn your unused parking space into a steady income stream</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-5">
            <div className="bg-primary/5 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-primary" /> Earning Opportunity
              </h3>
              <p className="text-sm text-muted-foreground">
                List your unused parking space and earn money whenever someone books it.
                Set your own prices and availability. Many hosts earn ₹5,000–₹20,000/month.
              </p>
            </div>

            <div className="bg-primary/5 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Host Responsibilities
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>Keep your parking space accessible during booked times</li>
                <li>Maintain cleanliness and safety of the space</li>
                <li>Accurately represent your space in listings (photos, features)</li>
                <li>Respond to bookings in a timely manner</li>
                <li>Report any issues or disputes within 24 hours</li>
              </ul>
            </div>

            <div className="bg-primary/5 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Scale className="w-4 h-4 text-primary" /> Legal & Commission
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                <li>You must have legal right to rent the parking space</li>
                <li>You are responsible for local regulations and permits</li>
                <li>Park Mitra charges a <strong>20% platform commission</strong> on each booking</li>
                <li>Payouts are processed after booking completion</li>
              </ul>
            </div>

            <div className="bg-primary/5 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                How It Works
              </h3>

              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">

                <li> Accept terms and activate your host account </li>
                <li>
                  Create your parking space listing with photos, pricing and slot details
                </li>
                <li>
                  Your listing will initially be submitted for
                  <span className="font-medium text-yellow-500">
                    {" "}review
                  </span>
                  .
                </li>
                <li>
                  Park Mitra verifies listing details, photos and policy compliance before approval
                </li>
                <li>
                  Once approved, your space becomes live and users can start booking it
                </li>
                <li>
                  If rejected, you will see the rejection reason
                  and can update your listing and reapply
                </li>
                <li>
                  Track bookings, earnings and listing status from your dashboard
                </li>
              </ol>
            </div>

            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
              <p className="text-sm text-yellow-200">
                Listings do not go live immediately.
                Every parking space is reviewed for safety,
                accuracy and platform compliance before approval.
              </p>
            </div>

            <div className="border-t border-border pt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" />
                <span className="text-sm text-foreground">
                  I accept all terms, conditions, host responsibilities, and the 20% platform commission. I confirm I have the legal right to list my parking space.
                </span>
              </label>
            </div>
          </div>
        </ScrollArea>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="flex-1" disabled={!accepted || loading} onClick={handleBecomeHost}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : "Become a Host"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HostOnboardingModal;
