import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Car, Bike, MapPin, IndianRupee, Shield, Clock, ImagePlus, X, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const vehicleOptions = [
  { id: "bike", label: "Bike", icon: Bike },
  { id: "car", label: "Car", icon: Car },
  { id: "suv", label: "SUV", icon: Car },
];

const featureOptions = ["CCTV", "Covered", "Gated", "Guard", "Well-Lit", "EV Charging", "24/7 Access"];

const HostListingPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [pricePerDay, setPricePerDay] = useState("");
  const [vehicles, setVehicles] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      toast.error("Please log in to list your space");
      navigate("/login");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !address || !city || !pricePerHour) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!user) return;

    setSubmitting(true);
    try {
      const imageUrls = await uploadImages();
      const { error } = await supabase.from("parking_spaces").insert({
        user_id: user.id,
        title,
        address,
        city,
        price_per_hour: parseFloat(pricePerHour),
        price_per_day: pricePerDay ? parseFloat(pricePerDay) : null,
        vehicle_types: vehicles,
        features,
        description,
        image_urls: imageUrls,
      });
      if (error) throw error;
      toast.success("Your parking space has been listed! 🎉");
      navigate("/search");
    } catch (err: any) {
      toast.error(err.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">List Your Parking Space</h1>
            <p className="text-muted-foreground">Turn your unused space into income. It takes less than 5 minutes.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 md:p-8 card-shadow space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Space Title *</Label>
              <Input id="title" placeholder="e.g., Covered Garage near MG Road" value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Input id="address" placeholder="Street address" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input id="city" placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priceHr" className="flex items-center gap-2"><IndianRupee className="w-4 h-4 text-primary" /> Price per Hour *</Label>
                <Input id="priceHr" type="number" placeholder="₹40" value={pricePerHour} onChange={e => setPricePerHour(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceDay">Price per Day</Label>
                <Input id="priceDay" type="number" placeholder="₹300" value={pricePerDay} onChange={e => setPricePerDay(e.target.value)} />
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><ImagePlus className="w-4 h-4 text-primary" /> Photos (up to 5)</Label>
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
              <Label className="flex items-center gap-2"><Car className="w-4 h-4 text-primary" /> Vehicle Types Supported</Label>
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
              <Label className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Features & Amenities</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {featureOptions.map(f => (
                  <label key={f} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={features.includes(f)} onCheckedChange={() => toggleItem(features, setFeatures, f)} />
                    {f}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc" className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Description & Rules</Label>
              <Textarea id="desc" placeholder="Describe your space, availability times, and any rules..." value={description} onChange={e => setDescription(e.target.value)} rows={4} />
            </div>

            <Button type="submit" size="lg" className="w-full rounded-xl" disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</> : "Publish Listing"}
            </Button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default HostListingPage;
