using System;
using System.Collections.Generic;

namespace ParkMitra_BE.Models;

public partial class host
{
    public Guid id { get; set; }

    public Guid user_id { get; set; }

    public DateTime joined_at { get; set; }

    public DateTime? last_payout_at { get; set; }

    public virtual ICollection<host_payout> host_payouts { get; set; } = new List<host_payout>();

    public virtual profile user { get; set; } = null!;
}
