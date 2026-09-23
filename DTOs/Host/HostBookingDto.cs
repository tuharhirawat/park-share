using ParkMitra_BE.Enums;

namespace ParkMitra_BE.DTOs.Host
{
    public class HostBookingDto
    {
        public Guid Id { get; set; }
        public decimal TotalPrice { get; set; }
        public ComputedBookingStatus ComputedStatus { get; set; }
        public DateOnly? BookingDate { get; set; }
        public TimeOnly? StartTime { get; set; }
        public TimeOnly? EndTime { get; set; }
        public DateTime CreatedAt { get; set; }
        public VehicleType? VehicleType { get; set; }
        public string? SlotLabel { get; set; }
    }
}