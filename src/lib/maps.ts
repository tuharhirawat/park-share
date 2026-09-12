export const openDirections = (lat: number, lng: number) => {
  window.open(
    `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${lat},${lng}`,
    "_blank"
  );
};
