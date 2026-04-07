import { Star, MapPin, Shield, Car, Bike } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { ParkingSpace } from "@/lib/mockData";

const vehicleIcons: Record<string, React.ReactNode> = {
  bike: <Bike className="w-3 h-3" />,
  car: <Car className="w-3 h-3" />,
  suv: <Car className="w-3.5 h-3.5" />,
};

const ParkingCard = ({ space }: { space: ParkingSpace }) => (
  <Link to={`/space/${space.id}`} className="group block">
    <div className="bg-card rounded-2xl overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 group-hover:-translate-y-1">
      <div className="relative h-48 overflow-hidden">
        <img src={space.image} alt={space.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        {!space.available && (
          <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-lg">Fully Booked</span>
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-1.5">
          {space.features.includes("CCTV") && (
            <span className="bg-background/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium flex items-center gap-1">
              <Shield className="w-3 h-3 text-primary" /> CCTV
            </span>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-display font-bold text-foreground text-base leading-tight">{space.title}</h3>
          <div className="flex items-center gap-1 text-sm shrink-0 ml-2">
            <Star className="w-4 h-4 text-accent fill-accent" />
            <span className="font-semibold text-foreground">{space.rating}</span>
            <span className="text-muted-foreground">({space.reviewCount})</span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
          <MapPin className="w-3.5 h-3.5" />
          {space.address}, {space.city}
        </div>
        <div className="flex items-center gap-1.5 mb-4">
          {space.vehicleTypes.map(v => (
            <Badge key={v} variant="secondary" className="text-xs gap-1 capitalize">
              {vehicleIcons[v]} {v}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-foreground">₹{space.pricePerHour}</span>
            <span className="text-sm text-muted-foreground">/hr</span>
          </div>
          <Button size="sm" disabled={!space.available}>
            {space.available ? "Book Now" : "Unavailable"}
          </Button>
        </div>
      </div>
    </div>
  </Link>
);

export default ParkingCard;
