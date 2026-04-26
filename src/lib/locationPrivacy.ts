export function getApproximateLocation(
  lat: number,
  lng: number
) {
  return {
    lat: lat + 0.0020,
    lng: lng - 0.0018
  };
}