import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Car, Bike, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Vehicle {
  id: string;
  vehicle_type: string;
  brand_model: string;
  registration_number: string;
}

const vehicleSchema = z.object({
  vehicle_type: z.enum(["car", "bike"], { required_error: "Select a vehicle type" }),
  brand_model: z.string().trim().min(2, "Brand/model must be at least 2 characters").max(100),
  registration_number: z
    .string()
    .trim()
    .min(4, "Registration number must be at least 4 characters")
    .max(20, "Registration number is too long")
    .regex(/^[A-Za-z0-9\s\-]+$/, "Only letters, numbers, spaces, and hyphens allowed"),
});

type VehicleForm = z.infer<typeof vehicleSchema>;

const VehiclesPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const form = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { vehicle_type: undefined, brand_model: "", registration_number: "" },
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const fetchVehicles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, vehicle_type, brand_model, registration_number")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load vehicles");
    else setVehicles((data as Vehicle[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchVehicles();
  }, [user, fetchVehicles]);

  const onAdd = async (values: VehicleForm) => {
    if (!user) return;
    setAdding(true);
    const { error } = await supabase.from("vehicles").insert({
      user_id: user.id,
      vehicle_type: values.vehicle_type,
      brand_model: values.brand_model,
      registration_number: values.registration_number.toUpperCase(),
    });
    setAdding(false);
    if (error) {
      if (error.message.includes("idx_vehicles_reg_unique") || error.code === "23505") {
        form.setError("registration_number", { message: "This registration number is already registered" });
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Vehicle added!");
      form.reset();
      setDialogOpen(false);
      fetchVehicles();
    }
  };

  const onDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    setDeleting(null);
    if (error) toast.error("Failed to delete vehicle");
    else {
      toast.success("Vehicle removed");
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">My Vehicles</h1>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Vehicle</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add a Vehicle</DialogTitle></DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onAdd)} className="space-y-4">
                    <FormField control={form.control} name="vehicle_type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="car">Car</SelectItem>
                            <SelectItem value="bike">Bike</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="brand_model" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand / Model</FormLabel>
                        <FormControl><Input placeholder="e.g., Honda City, KTM Duke" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="registration_number" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Registration Number</FormLabel>
                        <FormControl><Input placeholder="e.g., MH 12 AB 1234" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full" disabled={adding}>
                      {adding ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</> : "Add Vehicle"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {vehicles.length === 0 ? (
            <div className="text-center py-16">
              <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-2">No vehicles added yet</p>
              <p className="text-muted-foreground text-sm">Add your vehicles to use them while booking parking.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vehicles.map((v) => (
                <Card key={v.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        {v.vehicle_type === "bike" ? <Bike className="w-5 h-5 text-primary" /> : <Car className="w-5 h-5 text-primary" />}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{v.brand_model}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-xs capitalize">{v.vehicle_type}</Badge>
                          <span className="text-sm text-muted-foreground font-mono">{v.registration_number}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(v.id)} disabled={deleting === v.id}>
                      {deleting === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehiclesPage;
