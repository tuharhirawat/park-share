using ParkMitra_BE.Enums;

namespace ParkMitra_BE.DTOs.ParkingSpace
{
    public class ParkingSlotDto
    {
        public Guid Id { get; set; }
        public string Label { get; set; } = string.Empty;
        public VehicleType VehicleType { get; set; }
        public bool IsActive { get; set; }
    }
}
