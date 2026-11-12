namespace ParkMitra_BE.DTOs.Booking.Admin
{
    public class AdminUserBookingDto
    {
        public Guid Id { get; set; }
        public Guid SpotId { get; set; }
        public string SpotTitle { get; set; } = string.Empty;
        public string? VehicleNumber { get; set; }
        public DateOnly? BookingDate { get; set; }
        public TimeOnly? StartTime { get; set; }
        public TimeOnly? EndTime { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class AdminUserSpotDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public decimal PricePerHour { get; set; }
        public string VerificationStatus { get; set; } = string.Empty;
        public bool IsLive { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
