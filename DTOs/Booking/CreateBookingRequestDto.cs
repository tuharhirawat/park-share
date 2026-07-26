namespace ParkMitra_BE.DTOs.Booking
{
    public class CreateBookingRequestDto
    {
        public Guid SpaceId { get; set; }
        public DateOnly BookingDate { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public bool IsFullDay { get; set; }
        public Guid VehicleId { get; set; }
        public string VehicleType { get; set; } = string.Empty;
        public Guid? SlotId { get; set; }
    }
}
