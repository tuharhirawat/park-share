using System;
using System.Collections.Generic;

namespace ParkMitra_BE.Models;

public partial class host_payout
{
    public Guid id { get; set; }

    public Guid host_id { get; set; }

    public decimal amount { get; set; }

    public string? payment_reference { get; set; }

    public DateTime paid_at { get; set; }

    public DateTime created_at { get; set; }

    public virtual host host { get; set; } = null!;
}
