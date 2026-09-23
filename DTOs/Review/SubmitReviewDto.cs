namespace ParkMitra_BE.DTOs.Review
{
    public class SubmitReviewRequestDto
    {
        public Guid BookingId { get; set; }
        public int Rating { get; set; }
        public string? ReviewText { get; set; }
    }

    public class SubmitReviewResultDto 
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? ErrorCode { get; set; }
    }
}