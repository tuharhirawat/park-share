using ParkMitra_BE.Enums;
using System;
using System.Collections.Generic;

namespace ParkMitra_BE.Models;

public partial class user_auth_provider
{
    public Guid id { get; set; }

    public Guid user_id { get; set; }

    public AuthProvider provider { get; set; }

    public string provider_user_id { get; set; } = null!;

    public DateTime created_at { get; set; }

    public DateTime updated_at { get; set; }
}
