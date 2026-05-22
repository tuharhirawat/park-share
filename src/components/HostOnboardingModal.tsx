import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HostOnboardingModal = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBecomeHost = async () => {
    if (!user || !accepted) return;

    setLoading(true);

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "mobile_number,is_phone_verified,host_joined_at"
        )
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (!profile.mobile_number?.trim()) {
        toast.error("Please add your mobile number before becoming a host");
        return;
      }

      if (!profile.is_phone_verified) {
        toast.error("Please verify your mobile number before becoming a host");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          is_host: true,
          host_joined_at:
            profile.host_joined_at ??
            new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast.success("Welcome aboard! You're now a host 🎉");
      onOpenChange(false);
      navigate("/host");
    } catch (err: any) {
      toast.error(err.message || "Failed to activate host account");
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
                <Users className="w-4 h-4 text-primary" /> How It Works
              </h3>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Accept terms and become a host</li>
                <li>Create your parking space listing with photos and details</li>
                <li>Configure parking slots (labeled A-1, A-2, etc.)</li>
                <li>Users discover and book your space</li>
                <li>Track bookings and earnings on your dashboard</li>
              </ol>
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
