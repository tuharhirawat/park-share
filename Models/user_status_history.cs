using System;
using System.Collections.Generic;

namespace ParkMitra_BE.Models;

public partial class user_status_history
{
    public Guid id { get; set; }

    public Guid user_id { get; set; }

    public string status { get; set; } = null!;

    public string? reason { get; set; }

    public DateTime? restricted_till { get; set; }

    public Guid? changed_by { get; set; }

    public DateTime? created_at { get; set; }
}
