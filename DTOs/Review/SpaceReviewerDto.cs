namespace ParkMitra_BE.DTOs.Review
{
    public class SpaceReviewerDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public int ReviewsByUser { get; set; }
        public int LatestRating { get; set; }
        public string? LatestReview { get; set; }
        public DateTime? LatestReviewDate { get; set; }
    }
}