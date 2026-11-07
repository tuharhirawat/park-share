using ParkMitra_BE.Enums;
namespace ParkMitra_BE.DTOs.Auth.Admin;

public class AdminUserDto
{
    public Guid UserId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string? MobileNumber { get; set; }

    public string Role { get; set; } = string.Empty;
}

public sealed record AdminAccessResult(AdminAccessStatus Status, AdminUserDto? Admin = null);
