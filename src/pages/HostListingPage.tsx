
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Car, Bike, MapPin, IndianRupee, Shield, Clock, ImagePlus, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import HostOnboardingModal from "@/components/HostOnboardingModal";

const vehicleOptions = [
  { id: "bike", label: "Bike", icon: Bike },
  { id: "car", label: "Car", icon: Car },
];

const featureOptions = ["CCTV", "Covered", "Gated", "Guard", "Well-Lit", "EV Charging", "24/7 Access"];

const listingSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(100, "Title is too long"),
  address: z.string().trim().min(5, "Address must be at least 5 characters").max(200),
  city: z.string().trim().min(2, "City must be at least 2 characters").max(50),
  pricePerHour: z
    .string()
    .min(1, "Price per hour is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Must be a positive number")
    .refine((v) => Number(v) <= 10000, "Price seems too high"),
  pricePerDay: z
    .string()
    .optional()
    .refine((v) => !v || (!isNaN(Number(v)) && Number(v) > 0), "Must be a positive number"),
  description: z.string().max(1000, "Description is too long").optional(),
  carSlots: z
    .string()
    .min(1, "Required")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100, "Must be 0-100"),
  bikeSlots: z
    .string()
    .min(1, "Required")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100, "Must be 0-100"),
});

type ListingForm = z.infer<typeof listingSchema>;

const generateSlotLabels = (count: number, prefix: string): string[] => {
  return Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}`);
};

const HostListingPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [vehicles, setVehicles] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isHost, setIsHost] = useState<boolean | null>(null);
  const [hostModalOpen, setHostModalOpen] = useState(false);

  const form = useForm<ListingForm>({
    resolver: zodResolver(listingSchema),
    defaultValues: { title: "", address: "", city: "", pricePerHour: "", pricePerDay: "", description: "", carSlots: "5", bikeSlots: "5" },
  });

  useEffect(() => {
    if (!loading && !user) {
      toast.error("Please log in to list your space");
      navigate("/login");
      return;
    }
    if (user) {
      supabase
        .from("profiles")
        .select("is_host")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setIsHost(data.is_host);
            if (!data.is_host) setHostModalOpen(true);
          }
        });
    }
  }, [user, loading, navigate]);

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    const oversized = files.filter(f => f.size > 5 * 1024 * 1024);
    if (oversized.length) {
      toast.error("Each image must be under 5 MB");
      return;
    }
    const newImages = [...images, ...files];
    setImages(newImages);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!user) return [];
    const urls: string[] = [];
    for (const file of images) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("parking-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("parking-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const onSubmit = async (values: ListingForm) => {
    if (!user) return;
    if (vehicles.length === 0) {
      toast.error("Please select at least one vehicle type");
      return;
    }
    setSubmitting(true);
    try {
      const imageUrls = await uploadImages();
      const carSlots = parseInt(values.carSlots);
      const bikeSlots = parseInt(values.bikeSlots);

      const { data: spaceData, error } = await supabase.from("parking_spaces").insert({
        user_id: user.id,
        title: values.title,
        address: values.address,
        city: values.city,
        price_per_hour: parseFloat(values.pricePerHour),
        price_per_day: values.pricePerDay ? parseFloat(values.pricePerDay) : null,
        vehicle_types: vehicles,
        features,
        description: values.description || null,
        image_urls: imageUrls,
        car_slots: carSlots,
        bike_slots: bikeSlots,
      }).select("id").single();

      if (error) throw error;

      // Auto-generate labeled parking slots
      const slotInserts: { space_id: string; label: string; vehicle_type: string }[] = [];
      if (vehicles.includes("car") && carSlots > 0) {
        generateSlotLabels(carSlots, "C").forEach(label => {
          slotInserts.push({ space_id: spaceData.id, label, vehicle_type: "car" });
        });
      }
      if (vehicles.includes("bike") && bikeSlots > 0) {
        generateSlotLabels(bikeSlots, "B").forEach(label => {
          slotInserts.push({ space_id: spaceData.id, label, vehicle_type: "bike" });
        });
      }

      if (slotInserts.length > 0) {
        const { error: slotError } = await supabase.from("parking_slots").insert(slotInserts);
        if (slotError) console.error("Slot creation error:", slotError);
      }

      toast.success("Your parking space has been listed! 🎉");
      navigate("/host/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  if (isHost === false) {
    return (
      <div className="min-h-screen bg-background">
        <HostOnboardingModal open={hostModalOpen} onOpenChange={(open) => {
          setHostModalOpen(open);
          if (!open) {
            // Re-check host status
            if (user) {
              supabase.from("profiles").select("is_host").eq("user_id", user.id).maybeSingle()
                .then(({ data }) => { if (data) setIsHost(data.is_host); });
            }
          }
        }} />
        <div className="pt-24 text-center px-4">
          <h2 className="font-display text-2xl font-bold text-foreground mb-4">Become a Host First</h2>
          <p className="text-muted-foreground mb-6">You need to complete host onboarding before listing a space.</p>
          <Button onClick={() => setHostModalOpen(true)}>Start Host Onboarding</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">List Your Parking Space</h1>
            <p className="text-muted-foreground">Turn your unused space into income. It takes less than 5 minutes.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card rounded-2xl p-6 md:p-8 card-shadow space-y-6">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Space Title</FormLabel>
                  <FormControl><Input placeholder="e.g., Covered Garage near MG Road" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl><Input placeholder="Street address" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl><Input placeholder="City" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="pricePerHour" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><IndianRupee className="w-4 h-4 text-primary" /> Price per Hour</FormLabel>
                    <FormControl><Input type="number" placeholder="₹40" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="pricePerDay" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price per Day</FormLabel>
                    <FormControl><Input type="number" placeholder="₹300" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="carSlots" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Car className="w-4 h-4 text-primary" /> Car Slots</FormLabel>
                    <FormControl><Input type="number" min="0" max="100" placeholder="5" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">Slots labeled C-1, C-2, etc.</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="bikeSlots" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2"><Bike className="w-4 h-4 text-primary" /> Bike Slots</FormLabel>
                    <FormControl><Input type="number" min="0" max="100" placeholder="5" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground">Slots labeled B-1, B-2, etc.</p>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><ImagePlus className="w-4 h-4 text-primary" /> Photos (up to 5)</label>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {images.length < 5 && (
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                      <ImagePlus className="w-6 h-6" />
                      <span className="text-[10px]">Add</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Car className="w-4 h-4 text-primary" /> Vehicle Types Supported</label>
                <div className="flex gap-3">
                  {vehicleOptions.map(v => (
                    <button key={v.id} type="button"
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${vehicles.includes(v.id) ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50"}`}
                      onClick={() => toggleItem(vehicles, setVehicles, v.id)}
                    >
                      <v.icon className="w-4 h-4" /> {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Features & Amenities</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {featureOptions.map(f => (
                    <label key={f} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={features.includes(f)} onCheckedChange={() => toggleItem(features, setFeatures, f)} />
                      {f}
                    </label>
                  ))}
                </div>
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Description & Rules</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe your space, availability times, and any rules..." rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Button type="submit" size="lg" className="w-full rounded-xl" disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</> : "Publish Listing"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default HostListingPage;
