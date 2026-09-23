namespace ParkMitra_BE.Models
{
    public class host_space_review_summary
    {
        public Guid host_id { get; set; }
        public Guid space_id { get; set; }
        public string title { get; set; } = string.Empty;
        public int review_count { get; set; }
        public decimal avg_rating { get; set; }
        public int five_star { get; set; }
        public int four_star { get; set; }
        public int three_star { get; set; }
        public int two_star { get; set; }
        public int one_star { get; set; }
        public DateTime? latest_review_at { get; set; }
    }
}
