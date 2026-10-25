using System;
using System.Collections.Generic;

namespace ParkMitra_BE.Models;

public partial class state
{
    public Guid id { get; set; }

    public string name { get; set; } = null!;

    public string? code { get; set; }

    public bool is_active { get; set; }

    public string? source { get; set; }

    public string? source_reference_code { get; set; }

    public DateTime created_at { get; set; }

    public DateTime updated_at { get; set; }

    public virtual ICollection<city> cities { get; set; } = new List<city>();
}
