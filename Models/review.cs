using System;
using System.Collections.Generic;

namespace ParkMitra_BE.Models;

public partial class review
{
    public Guid id { get; set; }

    public Guid user_id { get; set; }

    public Guid booking_id { get; set; }

    public Guid space_id { get; set; }

    public int rating { get; set; }

    public string? review_text { get; set; }

    public DateTime created_at { get; set; }

    public DateTime updated_at { get; set; }

    public virtual booking booking { get; set; } = null!;

    public virtual parking_space space { get; set; } = null!;

    public virtual profile user { get; set; } = null!;
}
