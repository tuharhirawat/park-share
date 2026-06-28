import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import api from "@/services/api";
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
      .min(8, "Password must be at least 8 characters")
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
  const { user, loading: authLoading, refreshUser } = useAuth();
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

  useEffect(() => {
    if (!user) return;

    profileForm.reset({
      full_name: user.fullName || "",
      mobile_number: user.mobileNumber || ""
    });

    emailForm.reset({
      email: user.email || ""
    });

    setLoadingProfile(false);
  }, [user]);

  const onSaveProfile = async (values: ProfileForm) => {
    setSavingProfile(true);

    try {
      await api.put("/Profile", {
        fullName: values.full_name,
        mobileNumber: values.mobile_number
      });

      toast.success("Profile updated!");

      await refreshUser();
    }
    catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        "Failed to update profile"
      );

      if (user) {
        profileForm.reset({
          full_name: user.fullName || "",
          mobile_number: user.mobileNumber || ""
        });
      }
    }
    finally {
      setSavingProfile(false);
    }
  };

  const onSaveEmail = async (values: EmailForm) => {
    if (!user) return;

    if (values.email === user.email) {
      toast.info("This is already your current email");
      return;
    }

    setSavingEmail(true);

    try {
      const response = await api.put(
        "/Profile/UpdateEmail",
        {
          email: values.email
        }
      );

      await refreshUser();

      toast.success(
        response.data.message ||
        "Verification email sent to your new address."
      );
    }
    catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        "Failed to update email"
      );

      emailForm.reset({
        email: user.email
      });
    }
    finally {
      setSavingEmail(false);
    }
  };

  const onSavePassword = async (values: PasswordForm) => {
    setSavingPassword(true);

    try {
      const response = await api.put(
        "/Profile/UpdatePassword",
        {
          newPassword: values.newPassword
        }
      );

      toast.success(
        response.data.message ||
        "Password updated successfully."
      );

      passwordForm.reset();
    }
    catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
        "Failed to update password"
      );
    }
    finally {
      setSavingPassword(false);
    }
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div>
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
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          disabled={!user?.canChangeEmail}
                        />
                      </FormControl>
                      <FormMessage />
                      {user?.canChangeEmail ? (
                        <p className="text-xs text-muted-foreground">
                          Changing email requires verification via the new address.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          This account is linked with Google sign-in.
                          Email changes are not supported.
                        </p>
                      )}
                    </FormItem>
                  )} />
                  <Button type="submit" disabled={savingEmail || !user?.canChangeEmail}>
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
    </div>
  );
};

export default ProfilePage;
