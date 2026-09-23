using ParkMitra_BE.Enums;
using System;
using System.Collections.Generic;

namespace ParkMitra_BE.Models;

public partial class parking_slot
{
    public Guid id { get; set; }

    public Guid space_id { get; set; }

    public string label { get; set; } = null!;

    public VehicleType vehicle_type { get; set; }
    
    public bool is_active { get; set; }

    public DateTime created_at { get; set; }

    public DateTime updated_at { get; set; }

    public virtual ICollection<booking> bookings { get; set; } = new List<booking>();

    public virtual parking_space space { get; set; } = null!;
}
