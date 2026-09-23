using ParkMitra_BE.Enums;

namespace ParkMitra_BE.DTOs.Host
{
    public class HostSlotDto
    {
        public Guid Id { get; set; }
        public Guid SpaceId { get; set; }
        public string Label { get; set; } = string.Empty;
        public VehicleType VehicleType { get; set; }
        public bool IsActive { get; set; }
    }
}