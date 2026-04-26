import { Star, MapPin, Shield, Car, Bike } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import type { ParkingSpace } from "@/hooks/useParkingSpaces";
import { calculateDistanceMeters } from "@/lib/distance";

const vehicleIcons: Record<string, React.ReactNode> = {
  bike: <Bike className="w-3 h-3" />,
  car: <Car className="w-3 h-3" />,
};

const ParkingCard = ({ space, userLocation }: { space: ParkingSpace, userLocation: any }) => {
  const rawDistance = userLocation
    ? calculateDistanceMeters(userLocation.lat, userLocation.lng, space.lat, space.lng)
    : null;

  const distance = rawDistance
    ? Math.round(rawDistance / 50) * 50
    : null;

  const walkingMins = distance
    ? Math.max(1, Math.round(distance / 80))
    : null;

  return (
    <Link to={`/space/${space.id}`} className="group block h-full">
      <div className="bg-card rounded-2xl overflow-hidden card-shadow hover:card-shadow-hover transition-all duration-300 group-hover:-translate-y-1 h-full flex flex-col">
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
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-display font-bold text-foreground text-base leading-tight">{space.title}</h3>
            <div className="flex items-center gap-1 text-sm shrink-0 ml-2">
              <Star className="w-4 h-4 text-accent fill-accent" />
              <span className="font-semibold text-foreground">{space.rating}</span>
              <span className="text-muted-foreground">({space.reviewCount})</span>
            </div>
          </div>
          <div className="mb-4 space-y-2">

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full text-[11px]">
                {distance
                  ? `~${distance}m from you`
                  : "Nearby"
                }
              </Badge>

              <Badge variant="outline" className="rounded-full text-[11px]">
                {walkingMins
                  ? `${walkingMins} min walk`
                  : "Walking distance"}
              </Badge>
            </div>

            <div className="flex items-start gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Near your location in {space.city}
              </span>
            </div>

          </div>
          <div className="flex items-center gap-1.5 mb-4 min-h-7 overflow-hidden">
            {space.vehicleTypes.map(v => (
              <Badge key={v} variant="secondary" className="text-xs gap-1 capitalize">
                {vehicleIcons[v]} {v}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between mt-auto">
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
}

export default ParkingCard;
