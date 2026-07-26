namespace ParkMitra_BE.DTOs.Booking
{
    public class CreateBookingResultDto : ApiResponseDto
    {
        public Guid? BookingId { get; set; }
        public decimal? TotalPayable { get; set; }
    }
}
