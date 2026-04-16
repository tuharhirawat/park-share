import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Car, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
    email: z.string().trim().min(1, "Email is required").email("Please enter a valid email").max(255),
    mobile: z
      .string()
      .trim()
      .min(10, "Mobile number must be at least 10 digits")
      .max(15, "Mobile number is too long")
      .regex(/^[0-9+\-\s]+$/, "Enter a valid mobile number"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(72, "Password is too long")
      .regex(/[A-Z]/, "Include at least one uppercase letter")
      .regex(/[0-9]/, "Include at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the terms & conditions" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof signupSchema>;

const TermsContent = () => (
  <div className="prose prose-sm dark:prose-invert max-w-none">
    <h3>Terms & Conditions</h3>
    <p>By using Travel Saathi, you agree to the following terms:</p>
    <ul>
      <li>You must provide accurate information during registration.</li>
      <li>You are responsible for maintaining the security of your account.</li>
      <li>Bookings are subject to availability and the host's terms.</li>
      <li>Cancellation policies apply as stated at the time of booking.</li>
      <li>Travel Saathi acts as a platform connecting parking space owners with users.</li>
      <li>We reserve the right to suspend accounts that violate our policies.</li>
    </ul>
    <h3>Privacy Policy</h3>
    <p>We collect and process your personal data to provide our services:</p>
    <ul>
      <li>Name, email, and mobile number for account management.</li>
      <li>Booking history for service improvement.</li>
      <li>Payment information is processed securely through our payment partners.</li>
      <li>We do not sell your personal data to third parties.</li>
    </ul>
    <h3>User Agreement</h3>
    <p>As a user of Travel Saathi:</p>
    <ul>
      <li>You agree to use parking spaces responsibly.</li>
      <li>You will vacate the space by the end of your booking period.</li>
      <li>Any damage to the parking space is your responsibility.</li>
      <li>Disputes should be reported within 24 hours of the booking.</li>
    </ul>
  </div>
);

const SignupPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", mobile: "", password: "", confirmPassword: "", acceptTerms: undefined as any },
  });

  const onSubmit = async (values: SignupForm) => {
    setLoading(true);

    // Check mobile uniqueness
    const { data: existingMobile } = await supabase
      .from("profiles")
      .select("id")
      .eq("mobile_number", values.mobile)
      .maybeSingle();

    if (existingMobile) {
      form.setError("mobile", { message: "This mobile number is already registered" });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.name },
        emailRedirectTo: window.location.origin,
      },
    });
    
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Update profile with mobile number
    if (data.user) {
      await supabase
        .from("profiles")
        .update({ mobile_number: values.mobile, full_name: values.name })
        .eq("user_id", data.user.id);
    }

    setLoading(false);
    toast.success("Account created! Check your email to verify.");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-center pt-24 pb-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-xl hero-gradient flex items-center justify-center mb-4">
              <Car className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">Create Account</CardTitle>
            <CardDescription>Join Travel Saathi and start parking smarter</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" placeholder="you@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="mobile" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl><Input type="tel" placeholder="+91 9876543210" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
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
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl><Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="acceptTerms" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        I accept the{" "}
                        <Dialog>
                          <DialogTrigger asChild>
                            <button type="button" className="text-primary hover:underline font-medium">Terms & Conditions, Privacy Policy</button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg max-h-[80vh]">
                            <DialogHeader><DialogTitle>Terms, Privacy & User Agreement</DialogTitle></DialogHeader>
                            <ScrollArea className="max-h-[60vh] pr-4"><TermsContent /></ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )} />
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">Log In</Link>
                </p>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;
