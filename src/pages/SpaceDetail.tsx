import { useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { mockSpaces } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Shield, Clock, Car, Bike, ArrowLeft, Navigation } from "lucide-react";
import { useState } from "react";

const SpaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const space = mockSpaces.find(s => s.id === id);
  const [hours, setHours] = useState(2);

  if (!space) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center">
          <p className="text-muted-foreground text-lg">Space not found.</p>
          <Button className="mt-4" onClick={() => navigate("/search")}>Back to Search</Button>
        </div>
      </div>
    );
  }

  const vehicleIcons: Record<string, React.ReactNode> = {
    bike: <Bike className="w-4 h-4" />,
    car: <Car className="w-4 h-4" />,
    suv: <Car className="w-5 h-5" />,
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl overflow-hidden h-72 md:h-96">
                <img src={space.image} alt={space.title} className="w-full h-full object-cover" />
              </div>

              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">{space.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {space.address}, {space.city}</span>
                  <span className="flex items-center gap-1"><Star className="w-4 h-4 text-accent fill-accent" /> {space.rating} ({space.reviewCount} reviews)</span>
                </div>
                <p className="text-muted-foreground">Hosted by <span className="font-semibold text-foreground">{space.hostName}</span></p>
              </div>

              <div className="bg-card rounded-2xl p-6 card-shadow space-y-4">
                <h3 className="font-display font-bold text-foreground text-lg">Features & Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {space.features.map(f => (
                    <Badge key={f} variant="secondary" className="gap-1 text-sm py-1.5 px-3">
                      <Shield className="w-3.5 h-3.5 text-primary" /> {f}
                    </Badge>
                  ))}
                </div>
                <h3 className="font-display font-bold text-foreground text-lg pt-2">Supported Vehicles</h3>
                <div className="flex gap-2">
                  {space.vehicleTypes.map(v => (
                    <Badge key={v} variant="outline" className="gap-1 text-sm py-1.5 px-3 capitalize">
                      {vehicleIcons[v]} {v}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Booking sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-2xl p-6 card-shadow sticky top-24 space-y-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground">₹{space.pricePerHour}<span className="text-base font-normal text-muted-foreground">/hr</span></div>
                  <div className="text-sm text-muted-foreground">or ₹{space.pricePerDay}/day</div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">Duration (hours)</label>
                  <div className="flex items-center gap-3">
                    <Button size="sm" variant="outline" onClick={() => setHours(Math.max(1, hours - 1))}>-</Button>
                    <span className="text-lg font-bold text-foreground w-10 text-center">{hours}</span>
                    <Button size="sm" variant="outline" onClick={() => setHours(hours + 1)}>+</Button>
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">₹{space.pricePerHour} × {hours} hrs</span>
                    <span className="text-foreground font-medium">₹{space.pricePerHour * hours}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service fee</span>
                    <span className="text-foreground font-medium">₹{Math.round(space.pricePerHour * hours * 0.1)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border">
                    <span>Total</span>
                    <span>₹{Math.round(space.pricePerHour * hours * 1.1)}</span>
                  </div>
                </div>

                <Button className="w-full rounded-xl gap-2" size="lg" disabled={!space.available}>
                  <Clock className="w-4 h-4" />
                  {space.available ? "Book Now" : "Unavailable"}
                </Button>
                <Button variant="outline" className="w-full rounded-xl gap-2" size="lg">
                  <Navigation className="w-4 h-4" /> Get Directions
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SpaceDetail;
