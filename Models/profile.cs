using System;
using System.Collections.Generic;

namespace ParkMitra_BE.Models;

public partial class profile
{
    public Guid id { get; set; }

    public Guid user_id { get; set; }

    public string full_name { get; set; } = null!;

    public string? mobile_number { get; set; }

    public bool is_host { get; set; }

    public bool is_phone_verified { get; set; }

    public DateTime? phone_verified_at { get; set; }

    public DateTime created_at { get; set; }

    public DateTime updated_at { get; set; }

    public string? email { get; set; }

    public string current_status { get; set; } = null!;

    public string? status_reason { get; set; }

    public DateTime? status_updated_on { get; set; }

    public DateTime? restricted_till { get; set; }

    public virtual ICollection<booking> bookings { get; set; } = new List<booking>();

    public virtual host? host { get; set; }

    public virtual ICollection<parking_space> parking_spaces { get; set; } = new List<parking_space>();

    public virtual ICollection<review> reviews { get; set; } = new List<review>();

    public virtual ICollection<user_auth_provider> user_auth_providers { get; set; } = new List<user_auth_provider>();
}
