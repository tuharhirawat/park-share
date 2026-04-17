import {
  GoogleMap,
  LoadScript,
  Marker,
} from "@react-google-maps/api";
import { toast } from "sonner";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const libraries: ("places")[] = ["places"];

const defaultCenter = {
  lat: 17.6868,
  lng: 83.2185,
};

export type MapWithSearchHandle = {
  useCurrentLocation: () => void;
  isLoadingLocation: boolean;
};

type MapWithSearchProps = {
  onSelect: (loc: { lat: number; lng: number; address: string }) => void;
  initialLocation?: { lat: number; lng: number; address: string };
  onLoadingChange?: (loading: boolean) => void;
};

const MapWithSearch = forwardRef<MapWithSearchHandle, MapWithSearchProps>(
  ({ onSelect, initialLocation, onLoadingChange }, ref) => {
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [position, setPosition] = useState(
      initialLocation
        ? { lat: initialLocation.lat, lng: initialLocation.lng }
        : defaultCenter
    );

    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingLocation, setLoadingLocation] = useState(false);

    const autoService = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesService = useRef<google.maps.places.PlacesService | null>(null);

    // Sync initial location
    useEffect(() => {
      if (!initialLocation) return;

      const newPos = {
        lat: initialLocation.lat,
        lng: initialLocation.lng,
      };

      setPosition(newPos);
      setQuery(initialLocation.address);
      map?.panTo(newPos);
    }, [initialLocation, map]);

    // Initialize services
    const handleMapLoad = (mapInstance: google.maps.Map) => {
      setMap(mapInstance);

      autoService.current = new google.maps.places.AutocompleteService();
      placesService.current = new google.maps.places.PlacesService(mapInstance);
    };

    // Debounced search
    useEffect(() => {
      if (!query || !autoService.current) {
        setSuggestions([]);
        return;
      }

      const timeout = setTimeout(() => {
        setLoading(true);

        autoService.current!.getPlacePredictions(
          {
            input: query,
            componentRestrictions: { country: "in" },
          },
          (predictions, status) => {
            setLoading(false);

            if (status !== "OK" || !predictions) {
              setSuggestions([]);
              return;
            }

            setSuggestions(predictions);
          }
        );
      }, 300);

      return () => clearTimeout(timeout);
    }, [query]);

    // Select place
    const handleSelectPlace = (placeId: string, description: string) => {
      if (!placesService.current) return;

      placesService.current.getDetails(
        {
          placeId,
          fields: ["geometry", "formatted_address"],
        },
        (place, status) => {
          if (status !== "OK" || !place?.geometry) return;

          const lat = place.geometry.location!.lat();
          const lng = place.geometry.location!.lng();

          const newPos = { lat, lng };
          setPosition(newPos);
          map?.panTo(newPos);

          const address = place.formatted_address || description;

          setQuery(address);
          setSuggestions([]);

          onSelect({ lat, lng, address });
        }
      );
    };

    // Marker drag
    const handleMarkerDrag = (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;

      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      const newPos = { lat, lng };
      setPosition(newPos);

      const geocoder = new google.maps.Geocoder();

      geocoder.geocode({ location: newPos }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const address = results[0].formatted_address;

          setQuery(address);
          onSelect({ lat, lng, address });
        }
      });
    };

    // Current location
    const getCurrentLocation = () => {
      if (!navigator.geolocation) {
        toast.error("Geolocation not supported");
        return;
      }

      if (loadingLocation) return;

      setLoadingLocation(true);
      onLoadingChange?.(true);

      const toastId = toast.loading("📍 Getting your precise location...");

      let attempts = 0;
      const maxAttempts = 4;
      let bestResult: GeolocationCoordinates | null = null;

      const tryFetch = () => {
        attempts++;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { accuracy } = pos.coords;

          // ✅ Always keep best result
          if (!bestResult || accuracy < bestResult.accuracy) {
            bestResult = pos.coords;
          }

          // ✅ If accuracy is GOOD → stop immediately
          if (accuracy <= 120) {
            finalizeLocation(pos.coords, toastId);
            return;
          }

          // 🔁 Retry silently
          if (attempts < maxAttempts) {
            setTimeout(tryFetch, 1200);
          } else {
            // ⚠️ fallback to best available
            finalizeLocation(bestResult!, toastId);
          }
        },
        (error) => {
          setLoadingLocation(false);
          onLoadingChange?.(false);

          let message = "Failed to get location";

          if (error.code === error.PERMISSION_DENIED) {
            message = "Location permission denied";
          } else if (error.code === error.TIMEOUT) {
            message = "Location request timed out";
          }

          toast.error(message, { id: toastId });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    };

    const finalizeLocation = (
      coords: GeolocationCoordinates,
      toastId: string | number
    ) => {
    const { latitude, longitude, accuracy } = coords;

    const newPos = { lat: latitude, lng: longitude };
      setPosition(newPos);
      map?.panTo(newPos);

    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ location: newPos }, (results, status) => {
      setLoadingLocation(false);
      onLoadingChange?.(false);

      if (status === "OK" && results?.length) {
        const address = results[0].formatted_address;

        setQuery(address);
        onSelect({ lat: latitude, lng: longitude, address });

        toast.success("Location fetched successfully", { id: toastId });
      } else {
        toast.error("Unable to fetch address", { id: toastId });
      }
      });
    };

    tryFetch();
    };

    useImperativeHandle(ref, () => ({
      useCurrentLocation: getCurrentLocation,
      isLoadingLocation: loadingLocation,
    }));

    return (
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        libraries={libraries}
      >
        <div className="flex h-full flex-col gap-4">
          {/* SEARCH */}
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search location..."
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 outline-none"
            />

            {suggestions.length > 0 && (
              <div className="absolute z-50 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl mt-2 max-h-60 overflow-auto">
                {suggestions.map((item) => (
                  <div
                    key={item.place_id}
                    onClick={() =>
                      handleSelectPlace(item.place_id, item.description)
                    }
                    className="px-4 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 text-sm text-gray-900 dark:text-white"
                  >
                    {item.description}
                  </div>
                ))}
              </div>
            )}

            {loading && (
              <div className="absolute right-3 top-3 text-xs text-gray-400">
                Searching...
              </div>
            )}
          </div>

          {/* MAP */}
          <div className="flex-1">
            <GoogleMap
              mapContainerStyle={{ width: "100%", height: "100%" }}
              center={position}
              zoom={15}
              onLoad={handleMapLoad}
            >
              <Marker
                position={position}
                draggable
                onDragEnd={handleMarkerDrag}
              />
            </GoogleMap>
          </div>

          {/* Loading location */}
          {loadingLocation && (
            <div className="text-center text-sm text-blue-400 animate-pulse">
              📡 Getting precise GPS signal...
            </div>
          )}
        </div>
      </LoadScript>
    );
  }
);

MapWithSearch.displayName = "MapWithSearch";

export default MapWithSearch;