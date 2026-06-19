using System;
using System.Collections.Generic;

namespace ParkMitra_BE.Models;

public partial class vehicle
{
    public Guid id { get; set; }

    public Guid user_id { get; set; }

    public string vehicle_type { get; set; } = null!;

    public string brand_model { get; set; } = null!;

    public string registration_number { get; set; } = null!;

    public DateTime created_at { get; set; }

    public DateTime updated_at { get; set; }

    public virtual ICollection<booking> bookings { get; set; } = new List<booking>();
}
