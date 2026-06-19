using System;
using System.Collections.Generic;

namespace ParkMitra_BE.Models;

public partial class parking_space_update_request
{
    public Guid id { get; set; }

    public Guid space_id { get; set; }

    public string field { get; set; } = null!;

    public string old_value { get; set; } = null!;

    public string new_value { get; set; } = null!;

    public string status { get; set; } = null!;

    public DateTime? created_at { get; set; }

    public virtual parking_space space { get; set; } = null!;
}
