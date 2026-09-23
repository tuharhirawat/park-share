using ParkMitra_BE.Enums;

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
        public VehicleType VehicleType { get; set; }
        public Guid? SlotId { get; set; }
    }

    public class CreateBookingResultDto : ApiResponseDto
    {
        public Guid? BookingId { get; set; }
        public decimal? TotalPayable { get; set; }
        public Guid PaymentId { get; set; }
    }
}
