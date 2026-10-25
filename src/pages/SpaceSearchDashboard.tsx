import { useState, useEffect } from "react";
import ParkingCard from "@/components/ParkingCard";
import { Button } from "@/components/ui/button";
import { MapPin, SlidersHorizontal, X } from "lucide-react";
import { useParkingSpaces } from "@/hooks/useParkingSpaces";
import ParkingCardSkeleton from "@/components/SkeletonLoaders/ParkingCardSkeleton";
import SearchableDropdown from "@/components/ui/SearchableDropdown";
import Pagination from "@/components/Pagination";
import {
  getStates,
  getCitiesByState,
  type State,
  type City,
} from "@/services/locationService";
import { VehicleType, VEHICLE_TYPE_META } from "@/enums/vehicleTypeEnum";

const SpaceSearchDashboard = () => {
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] =
    useState<{
      lat: number;
      lng: number;
    } | null>(null);
  const [page, setPage] = useState(1);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    if (!selectedStateId) {
      setCities([]);
      setSelectedCityId("");
      return;
    }

    const loadCities = async () => {
      try {
        setLoadingCities(true);

        const data = await getCitiesByState(selectedStateId);

        setCities(data);
      } catch (error) {
        console.error("Failed to load cities:", error);
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    };

    loadCities();
  }, [selectedStateId]);

  useEffect(() => {
    const loadStates = async () => {
      try {
        setLoadingStates(true);

        const data = await getStates();

        setStates(data);
      } catch (error) {
        console.error("Failed to load states:", error);
      } finally {
        setLoadingStates(false);
      }
    };

    loadStates();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const {
    data,
    isLoading,
    isError,
  } = useParkingSpaces({
    page,
    search: query,
    cityId: selectedCityId || undefined,
    vehicleType: selectedVehicle,
  });

  const spaces = data?.items ?? [];

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setUserLocation(null);
      }
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div>
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-muted border border-border">
              <MapPin className="w-5 h-5 text-primary shrink-0" />
              <input
                type="text"
                placeholder="Search by city, area, or name..."
                value={searchInput}
                onChange={e => {
                  setSearchInput(e.target.value);
                }}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput("");
                    setQuery("");
                    setPage(1);
                  }}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </Button>
          </div>

          {showFilters && (
            <div className="space-y-4 mb-6">

              {/* State + City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    State
                  </label>

                  <SearchableDropdown
                    value={selectedStateId}
                    options={states}
                    placeholder="Select state"
                    searchPlaceholder="Search state..."
                    disabled={loadingStates}
                    onChange={(stateId) => {
                      setSelectedStateId(stateId);
                      setSelectedCityId("");
                      setPage(1);
                    }}
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    City
                  </label>

                  <SearchableDropdown
                    value={selectedCityId}
                    options={cities}
                    placeholder={
                      !selectedStateId
                        ? "Select state first"
                        : "Select city"
                    }
                    searchPlaceholder="Search city..."
                    disabled={!selectedStateId || loadingCities}
                    onChange={(cityId) => {
                      setSelectedCityId(cityId);
                      setPage(1);
                    }}
                  />
                </div>
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Vehicle Type
                </label>

                {Object.values(VehicleType).map((type) => {
                  const { label, icon: Icon } = VEHICLE_TYPE_META[type];

                  return (
                    <Button
                      key={type}
                      type="button"
                      variant={selectedVehicle === type ? "default" : "outline"}
                      className="gap-2"
                      onClick={() => {
                        setSelectedVehicle(selectedVehicle === type ? null : type);
                        setPage(1);
                      }}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl font-bold text-foreground">
              {isLoading
                ? "Loading..."
                : `${data?.totalCount ?? 0} Parking Space${(data?.totalCount ?? 0) !== 1 ? "s" : ""} Found`}
            </h2>
          </div>

          {isError ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">
                Failed to load parking spaces.
              </p>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <ParkingCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {spaces.map(s => (
                  <ParkingCard
                    key={s.id}
                    space={s}
                    userLocation={userLocation}
                  />
                ))}
              </div>

              {spaces.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-lg">
                    No parking spaces available.
                  </p>
                </div>
              )}

              {data && (
                <Pagination
                  currentPage={page}
                  totalPages={data.totalPages}
                  onPageChange={(p) => {
                    setPage(p);
                    window.scrollTo({
                      top: 0,
                      behavior: "smooth",
                    });
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpaceSearchDashboard;
