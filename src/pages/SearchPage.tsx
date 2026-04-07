import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParkingCard from "@/components/ParkingCard";
import { mockSpaces } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { MapPin, SlidersHorizontal, Car, Bike, X } from "lucide-react";

const cities = ["All", "Bangalore", "Mumbai", "Delhi", "Pune", "Chennai", "Hyderabad"];
const vehicleOptions = ["bike", "car", "suv"] as const;

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("All");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return mockSpaces.filter(s => {
      if (selectedCity !== "All" && s.city !== selectedCity) return false;
      if (selectedVehicle && !s.vehicleTypes.includes(selectedVehicle as any)) return false;
      if (query && !s.title.toLowerCase().includes(query.toLowerCase()) && !s.city.toLowerCase().includes(query.toLowerCase()) && !s.address.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [query, selectedCity, selectedVehicle]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-muted border border-border">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <input
                type="text"
                placeholder="Search by city, area, or name..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
              />
              {query && <button onClick={() => setQuery("")}><X className="w-4 h-4 text-muted-foreground" /></button>}
            </div>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </Button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-card rounded-2xl p-6 card-shadow mb-8 space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">City</label>
                <div className="flex flex-wrap gap-2">
                  {cities.map(c => (
                    <Button key={c} size="sm" variant={selectedCity === c ? "default" : "outline"} className="rounded-full" onClick={() => setSelectedCity(c)}>
                      {c}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Vehicle Type</label>
                <div className="flex gap-2">
                  {vehicleOptions.map(v => (
                    <Button key={v} size="sm" variant={selectedVehicle === v ? "default" : "outline"} className="rounded-full capitalize gap-1"
                      onClick={() => setSelectedVehicle(selectedVehicle === v ? null : v)}>
                      {v === "bike" ? <Bike className="w-3.5 h-3.5" /> : <Car className="w-3.5 h-3.5" />} {v}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold text-foreground">
              {filtered.length} Parking Space{filtered.length !== 1 ? "s" : ""} Found
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(s => <ParkingCard key={s.id} space={s} />)}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No parking spaces found. Try adjusting your filters.</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default SearchPage;
