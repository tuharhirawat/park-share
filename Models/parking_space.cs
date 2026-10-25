using System;
using System.Collections.Generic;

namespace ParkMitra_BE.Models;

public partial class parking_space
{
    public Guid id { get; set; }

    public Guid user_id { get; set; }

    public string title { get; set; } = null!;

    public string address { get; set; } = null!;

    public Guid city_id { get; set; }

    public decimal price_per_hour { get; set; }

    public decimal? price_per_day { get; set; }

    public List<string> vehicle_types { get; set; } = null!;

    public List<string> features { get; set; } = null!;

    public string? description { get; set; }

    public List<string> image_urls { get; set; } = null!;

    public decimal rating { get; set; }

    public int review_count { get; set; }

    public double? lat { get; set; }

    public double? lng { get; set; }

    public string timezone { get; set; } = "Asia/Kolkata";

    public bool available { get; set; }

    public DateTime created_at { get; set; }

    public DateTime updated_at { get; set; }

    public DateTime? last_title_change_at { get; set; }

    public DateTime? last_address_change_at { get; set; }

    public DateTime? last_city_change_at { get; set; }

    public DateTime? last_feature_change_at { get; set; }

    public DateTime? last_price_per_hour_change_at { get; set; }

    public DateTime? last_price_per_day_change_at { get; set; }

    public string listing_status { get; set; } = null!;

    public Guid? reviewed_by { get; set; }

    public DateTime? reviewed_at { get; set; }

    public string? rejection_reason { get; set; }

    public int reapply_count { get; set; }

    public virtual ICollection<booking> bookings { get; set; } = new List<booking>();

    public virtual city city { get; set; } = null!;

    public virtual ICollection<parking_slot> parking_slots { get; set; } = new List<parking_slot>();

    public virtual ICollection<parking_space_update_request> parking_space_update_requests { get; set; } = new List<parking_space_update_request>();

    public virtual ICollection<review> reviews { get; set; } = new List<review>();

    public virtual profile user { get; set; } = null!;
}
