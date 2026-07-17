using System;
namespace ParkMitra_BE.Models
{
    public partial class space_latest_review
    {
        public Guid id { get; set; }
        public Guid booking_id { get; set; }
        public Guid user_id { get; set; }
        public Guid space_id { get; set; }
        public int rating { get; set; }
        public string? review_text { get; set; }
        public DateTime created_at { get; set; }
        public DateTime updated_at { get; set; }
        public string? full_name { get; set; }
        public int total_reviews_by_user { get; set; }
    }
}