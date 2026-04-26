import { GoogleMap, LoadScript, Marker, Circle } from "@react-google-maps/api";
import { getApproximateLocation } from "@/lib/locationPrivacy";

type Props = {
  lat: number;
  lng: number;
};

export default function ApproximateLocationMap({ lat, lng }: Props) {
  const approx = getApproximateLocation(lat, lng);

  return (
    <LoadScript
      googleMapsApiKey={
        import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      }
    >

      <div className="rounded-2xl overflow-hidden border">
        <GoogleMap
          mapContainerStyle={{
            width: "100%",
            height: "320px"
          }}
          center={approx}
          zoom={16}
          options={{
            disableDefaultUI: true,
            clickableIcons: false
          }}
        >

          <Circle
            center={approx}
            radius={300}
          />

        </GoogleMap>

        <div className="p-4 text-sm text-muted-foreground">
          📍 Approximate area shown • Exact location revealed after booking
        </div>
      </div>

    </LoadScript>
  )
}