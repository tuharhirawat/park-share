namespace ParkMitra_BE.DTOs.Admin;

public class AdminUsersSummaryDto
{
    public int Total { get; set; }
    public int Active { get; set; }
    public int Blocked { get; set; }
}

public class AdminUsersPageDto : AdminPagedDto<AdminUserListItemDto>
{
    public AdminUsersSummaryDto Summary { get; set; } = new();
}

public class AdminUserListItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Mobile { get; set; } = string.Empty;
    public bool PhoneVerified { get; set; }
    public decimal? Rating { get; set; }
    public string Role { get; set; } = "driver";
    public string Status { get; set; } = "active";
    public DateOnly JoinedDate { get; set; }
    public int TotalBookings { get; set; }
    public int TotalSpotsOwned { get; set; }
}

public class AdminUserDetailDto : AdminUserListItemDto
{
    public string? BlockReason { get; set; }
    public DateTime? BlockedAt { get; set; }
    public string? BlockedBy { get; set; }
}

public class AdminUsersQueryDto
{
    public string? Search { get; set; }
    public string? Roles { get; set; }
    public string? PhoneVerified { get; set; }
    public string? Statuses { get; set; }
    public string? HasSpots { get; set; }
    public DateOnly? JoinedFrom { get; set; }
    public DateOnly? JoinedTo { get; set; }
    public int? MinBookings { get; set; }
    public int? MaxBookings { get; set; }
    public string SortBy { get; set; } = "joinedDate"; 
    public string SortOrder { get; set; } = "desc";
    public int Page { get; set; } = 1;
    public int Limit { get; set; } = 10;
}

public class UpdateUserStatusRequestDto
{
    public string Status { get; set; } = string.Empty;
    public string? Reason { get; set; }
}