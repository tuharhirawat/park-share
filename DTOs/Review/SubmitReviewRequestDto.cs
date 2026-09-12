namespace ParkMitra_BE.DTOs.Review
{
    public class SubmitReviewRequestDto
    {
        public Guid BookingId { get; set; }
        public int Rating { get; set; }
        public string? ReviewText { get; set; }
    }
}