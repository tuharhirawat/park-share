export function calculateDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371e3;
  const toRad = (d: number) => d * Math.PI / 180;
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2
    +
    Math.cos(toRad(lat1))
    *
    Math.cos(toRad(lat2))
    *
    Math.sin(
      toRad(lng2 - lng1) / 2
    ) ** 2;

  const c =
    2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return Math.round(R * c);
}