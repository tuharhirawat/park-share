namespace ParkMitra_BE.DTOs.Review
{
    public class SpaceReviewDto
    {
        public Guid Id { get; set; }
        public Guid BookingId { get; set; }
        public Guid UserId { get; set; }
        public Guid SpaceId { get; set; }
        public int Rating { get; set; }
        public string? ReviewText { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? FullName { get; set; }
        public int TotalReviewsByUser { get; set; }
    }
}