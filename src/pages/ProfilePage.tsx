import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Mail, Phone, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  mobile_number: z
    .string()
    .trim()
    .min(10, "Mobile number must be at least 10 digits")
    .max(15)
    .regex(/^[0-9+\-\s]+$/, "Enter a valid mobile number")
    .or(z.literal("")),
});

const emailSchema = z.object({
  email: z.string().trim().email("Please enter a valid email").max(255),
});

const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(72)
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type EmailForm = z.infer<typeof emailSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

const ProfilePage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: "", mobile_number: "" },
  });

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoadingProfile(true);
    const { data } = await supabase
      .from("profiles")
      .select("full_name, mobile_number")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      profileForm.reset({
        full_name: data.full_name || "",
        mobile_number: data.mobile_number || "",
      });
    }
    emailForm.reset({ email: user.email || "" });
    setLoadingProfile(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user, fetchProfile]);

  const onSaveProfile = async (values: ProfileForm) => {
    if (!user) return;
    setSavingProfile(true);

    // Check mobile uniqueness
    if (values.mobile_number) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("mobile_number", values.mobile_number)
        .neq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        profileForm.setError("mobile_number", { message: "This mobile number is already registered" });
        setSavingProfile(false);
        return;
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: values.full_name,
        mobile_number: values.mobile_number || null,
      })
      .eq("user_id", user.id);

    setSavingProfile(false);
    if (error) toast.error("Failed to update profile");
    else toast.success("Profile updated!");
  };

  const onSaveEmail = async (values: EmailForm) => {
    if (!user) return;
    if (values.email === user.email) {
      toast.info("This is already your current email");
      return;
    }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: values.email });
    setSavingEmail(false);
    if (error) toast.error(error.message);
    else toast.success("Verification email sent to your new address. Please confirm to complete the change.");
  };

  const onSavePassword = async (values: PasswordForm) => {
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: values.newPassword });
    setSavingPassword(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated!");
      passwordForm.reset();
    }
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-2xl space-y-6">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">My Profile</h1>

          {/* Profile Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><User className="w-5 h-5 text-primary" /> Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                  <FormField control={profileForm.control} name="full_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="mobile_number" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Phone className="w-4 h-4" /> Mobile Number</FormLabel>
                      <FormControl><Input type="tel" placeholder="+91 9876543210" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={savingProfile}>
                    {savingProfile ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Mail className="w-5 h-5 text-primary" /> Email Address</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onSaveEmail)} className="space-y-4">
                  <FormField control={emailForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground">Changing email requires verification via the new address.</p>
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={savingEmail}>
                    {savingEmail ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</> : "Update Email"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Lock className="w-5 h-5 text-primary" /> Change Password</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onSavePassword)} className="space-y-4">
                  <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl><Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={savingPassword}>
                    {savingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</> : "Change Password"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProfilePage;
