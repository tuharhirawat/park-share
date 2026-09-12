using ParkMitra_BE.Enums;

namespace ParkMitra_BE.DTOs.Booking
{
    public class MyBookingsDto
    {
        public Guid Id { get; set; }
        public Guid SpaceId { get; set; }
        public string SpaceTitle { get; set; } = string.Empty;
        public string SpaceAddress { get; set; } = string.Empty;
        public string SpaceCity { get; set; } = string.Empty;
        public double? SpaceLat { get; set; }
        public double? SpaceLng { get; set; }
        public string SpaceTimezone { get; set; } = string.Empty;
        public int DurationMinutes { get; set; }
        public decimal TotalPrice { get; set; }
        public int? Rating { get; set; }
        public string? ReviewText { get; set; }
        public BookingStatus Status { get; set; }
        public ComputedBookingStatus ComputedStatus { get; set; } // upcoming / active / completed / cancelled
        public DateOnly? BookingDate { get; set; }
        public TimeOnly? StartTime { get; set; }
        public TimeOnly? EndTime { get; set; }
        public DateTime CreatedAt { get; set; }
        public VehicleType? VehicleType { get; set; }
        public Guid? VehicleId { get; set; }
        public string? VehicleNumber { get; set; }
        public Guid? SlotId { get; set; }
        public string? SlotLabel { get; set; }
        public bool HasUsedFreeExtension { get; set; }
        public int FreeExtensionMinutesUsed { get; set; }
        public bool HasReview { get; set; }
    }
}
