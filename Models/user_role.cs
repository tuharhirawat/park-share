using ParkMitra_BE.Enums;
using System;
using System.Collections.Generic;

namespace ParkMitra_BE.Models;

public partial class user_role
{
    public Guid id { get; set; }

    public Guid user_id { get; set; }

    public UserRoles role { get; set; }

    public DateTime created_at { get; set; }
}
