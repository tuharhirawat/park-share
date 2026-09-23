namespace ParkMitra_BE.DTOs.Review
{
    public class HostSpaceReviewSummaryDto
    {
        public Guid SpaceId { get; set; }
        public string Title { get; set; } = string.Empty;
        public int ReviewCount { get; set; }
        public decimal AvgRating { get; set; }
        public int FiveStar { get; set; }
        public int FourStar { get; set; }
        public int ThreeStar { get; set; }
        public int TwoStar { get; set; }
        public int OneStar { get; set; }
        public DateTime? LatestReviewAt { get; set; }
    }
}