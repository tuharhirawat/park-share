using System;
using System.Collections.Generic;

namespace ParkMitra_BE.Models;

public partial class contact_message
{
    public Guid id { get; set; }

    public string full_name { get; set; } = null!;

    public string email { get; set; } = null!;

    public string subject { get; set; } = null!;

    public string message { get; set; } = null!;

    public DateTime? created_at { get; set; }

    public bool resolved { get; set; }

    public DateTime? resolved_at { get; set; }

    public Guid? resolved_by { get; set; }

    public string? admin_notes { get; set; }
}
