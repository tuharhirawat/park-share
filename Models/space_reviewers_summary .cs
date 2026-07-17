using System;
namespace ParkMitra_BE.Models
{
    public partial class space_reviewer_summary
    {
        public Guid space_id { get; set; }
        public Guid user_id { get; set; }
        public string? full_name { get; set; }
        public int reviews_by_user { get; set; }
        public int latest_rating { get; set; }
        public string? latest_review { get; set; }
        public DateTime latest_review_date { get; set; }
        public decimal avg_rating { get; set; }
    }
}