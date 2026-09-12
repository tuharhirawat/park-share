namespace ParkMitra_BE.DTOs.Review
{
    public class SubmitReviewResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? ErrorCode { get; set; }
    }
}