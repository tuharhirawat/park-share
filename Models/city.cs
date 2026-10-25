using System;
using System.Collections.Generic;

namespace ParkMitra_BE.Models;

public partial class city
{
    public Guid id { get; set; }
    public Guid state_id { get; set; }
    public string name { get; set; } = null!;
    public decimal? latitude { get; set; }
    public decimal? longitude { get; set; }
    public List<string> aliases { get; set; } = null!;
    public bool is_active { get; set; }
    public string? source { get; set; }
    public string? source_reference_code { get; set; }
    public DateTime created_at { get; set; }
    public DateTime updated_at { get; set; }
    public virtual ICollection<parking_space> parking_spaces { get; set; } = new List<parking_space>();
    public virtual state state { get; set; } = null!;
}
