using ParkMitra_BE.Enums;
using System;
using System.Collections.Generic;

namespace ParkMitra_BE.Models;

public partial class booking
{
    public Guid id { get; set; }

    public Guid user_id { get; set; }

    public Guid space_id { get; set; }

    public string space_title { get; set; } = null!;

    public string space_address { get; set; } = null!;

    public string space_city { get; set; } = null!;

    public decimal total_price { get; set; }

    public BookingStatus status { get; set; }

    public DateTime created_at { get; set; }

    public DateTime updated_at { get; set; }

    public DateOnly? booking_date { get; set; }

    public TimeOnly? start_time { get; set; }

    public TimeOnly? end_time { get; set; }

    public string vehicle_type { get; set; } = null!;

    public Guid? vehicle_id { get; set; }

    public Guid? slot_id { get; set; }

    /// <summary>
    /// Initial booking start timestamp. Never update after creation.
    /// </summary>
    public DateTime? original_start_time { get; set; }

    /// <summary>
    /// Initial booking end timestamp. Never update after creation.
    /// </summary>
    public DateTime? original_end_time { get; set; }

    /// <summary>
    /// Original duration in minutes (used for delta pricing).
    /// </summary>
    public int original_duration_minutes { get; set; }

    /// <summary>
    /// Indicates if one-time free grace extension is used.
    /// </summary>
    public bool has_used_free_extension { get; set; }

    /// <summary>
    /// Number of grace-extension minutes used (0-15). Used to exclude grace time from paid-hour progression.
    /// </summary>
    public int free_extension_minutes_used { get; set; }

    public int duration_minutes { get; set; }

    public DateTime? expires_at { get; set; }

    public virtual ICollection<payment> payments { get; set; } = new List<payment>();

    public virtual review? review { get; set; }

    public virtual parking_slot? slot { get; set; }

    public virtual parking_space space { get; set; } = null!;

    public virtual profile user { get; set; } = null!;

    public virtual vehicle? vehicle { get; set; }
}
