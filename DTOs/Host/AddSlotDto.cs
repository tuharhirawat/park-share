using ParkMitra_BE.Enums;

namespace ParkMitra_BE.DTOs.Host
{
    public class AddSlotRequestDto
    {
        public Guid SpaceId { get; set; }
        public VehicleType VehicleType { get; set; } = VehicleType.Car;
    }

    public class AddSlotResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public HostSlotDto? Slot { get; set; }
    }
}
