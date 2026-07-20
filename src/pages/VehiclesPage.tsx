import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  vehicleType: string;
  brandModel: string;
  registrationNumber: string;
}

const vehicleSchema = z.object({
  vehicleType: z.enum(["Car", "Bike"], { required_error: "Select a vehicle type" }),
  brandModel: z.string().trim().min(2, "Brand/model must be at least 2 characters").max(100),
  registrationNumber: z
    .string()
    .trim()
    .min(4, "Registration number must be at least 4 characters")
    .max(20, "Registration number is too long")
    .regex(/^[A-Za-z0-9\s\-]+$/, "Only letters, numbers, spaces, and hyphens allowed"),
});

type VehicleForm = z.infer<typeof vehicleSchema>;

const formatRegistration = (reg: string) => {
  if (!reg) return reg;

  const upper = reg.toUpperCase();
  const parts = upper.match(/[A-Z]+|\d+/g);

  return parts ? parts.join(" ") : upper;
};

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
    defaultValues: { vehicleType: undefined, brandModel: "", registrationNumber: "" },
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);

    try {
      const response = await api.get("/Vehicle/GetMyVehicles");

      setVehicles(response.data);
    } catch {
      toast.error("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchVehicles();
  }, [user, fetchVehicles]);

  const onAdd = async (values: VehicleForm) => {
    setAdding(true);

    const normalizedReg = values.registrationNumber
      .replace(/\s+/g, "")
      .replace(/-/g, "")
      .toUpperCase();

    try {
      const response = await api.post("/Vehicle/AddVehicle", {
        vehicleType: values.vehicleType,
        brandModel: values.brandModel,
        registrationNumber: normalizedReg,
      });

      toast.success(response.data.message);
      
      await fetchVehicles();
      form.reset();
      setDialogOpen(false);
    }
    catch (error: any) {
      if (error.response?.data?.message) {
        if (error.response.data.message.includes("registration")) {
          form.setError("registrationNumber", {
            message: error.response.data.message,
          });
        } else {
          toast.error(error.response.data.message);
        }
      }
    }
    finally {
      setAdding(false);
    }
  }

  const onDelete = async (id: string) => {
    setDeleting(id);

    try {
      const response = await api.delete(`/Vehicle/DeleteVehicle/${id}`);
      toast.success(response.data.message);
      setVehicles(prev =>
        prev.filter(v => v.id !== id));
    }
    catch {
      toast.error("Failed to delete vehicle");
    }
    finally {
      setDeleting(null);
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
      <div>
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
                    <FormField control={form.control} name="vehicleType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Car">Car</SelectItem>
                            <SelectItem value="Bike">Bike</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="brandModel" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand / Model</FormLabel>
                        <FormControl><Input placeholder="e.g., Honda City, KTM Duke" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="registrationNumber" render={({ field }) => (
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
                        {v.vehicleType === "Bike" ? <Bike className="w-5 h-5 text-primary" /> : <Car className="w-5 h-5 text-primary" />}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{v.brandModel}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-xs capitalize">{v.vehicleType}</Badge>
                          <span className="text-sm text-muted-foreground font-mono">{formatRegistration(v.registrationNumber)}</span>
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
