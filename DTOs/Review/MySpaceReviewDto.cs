namespace ParkMitra_BE.DTOs.Review
{
    public class MySpaceReviewDto
    {
        public Guid Id { get; set; }
        public Guid SpaceId { get; set; }
        public int Rating { get; set; }
        public string? ReviewText { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}