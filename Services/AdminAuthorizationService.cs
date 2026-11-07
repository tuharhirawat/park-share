using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.Enums;
using ParkMitra_BE.DTOs.Auth.Admin;

namespace ParkMitra_BE.Services;

public class AdminAuthorizationService
{
    // Highest authority first. If a user has several admin roles, the first match wins.
    // Adjust the order of the lower roles if your org chart differs.
    private static readonly UserRoles[] AdminRolePriority =
    {
        UserRoles.SuperAdmin,
        UserRoles.Admin,
        UserRoles.Operations,
        UserRoles.FieldOfficer,
        UserRoles.Finance,
        UserRoles.Moderator,
        UserRoles.Support
    };

    private readonly ApplicationDbContext _context;
    private readonly CurrentUserService _currentUserService;

    public AdminAuthorizationService(
        ApplicationDbContext context,
        CurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<AdminAccessResult> CheckAccessAsync(string accessToken)
    {
        var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
        if (currentUser == null)
            return new AdminAccessResult(AdminAccessStatus.unauthenticated);

        if (!string.Equals(currentUser.CurrentStatus, "ACTIVE", StringComparison.OrdinalIgnoreCase))
            return new AdminAccessResult(AdminAccessStatus.blocked);

        var roles = await _context.user_roles
            .Where(x => x.user_id == currentUser.UserId)
            .Select(x => x.role)
            .ToListAsync();

        UserRoles? adminRole = null;
        foreach (var candidate in AdminRolePriority)
        {
            if (roles.Contains(candidate))
            {
                adminRole = candidate;
                break;
            }
        }

        if (adminRole == null)
            return new AdminAccessResult(AdminAccessStatus.notadmin);

        return new AdminAccessResult(
            AdminAccessStatus.granted,
            new AdminUserDto
            {
                UserId = currentUser.UserId,
                FullName = currentUser.FullName,
                Email = currentUser.Email,
                MobileNumber = currentUser.MobileNumber,
                Role = adminRole.Value.ToString().ToLowerInvariant(),
            });
    }
}