namespace ParkMitra_BE.DTOs.Booking
{
    public class RescheduleBookingRequestDto
    {
        public Guid BookingId { get; set; }

        public DateOnly BookingDate { get; set; }

        public TimeOnly StartTime { get; set; }

        public TimeOnly EndTime { get; set; }

        public bool ApplyGraceExtension { get; set; }
    }
}