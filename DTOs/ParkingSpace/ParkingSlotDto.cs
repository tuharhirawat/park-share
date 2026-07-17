namespace ParkMitra_BE.DTOs.ParkingSpace
{
    public class ParkingSlotDto
    {
        public Guid Id { get; set; }
        public string Label { get; set; } = string.Empty;
        public string VehicleType { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }
}
