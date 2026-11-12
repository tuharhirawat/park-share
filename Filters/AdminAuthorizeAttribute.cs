using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using ParkMitra_BE.DTOs.Auth.Admin;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Filters;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class AdminAuthorizeAttribute : Attribute, IAsyncAuthorizationFilter
{
    public const string HttpContextItemKey = "AdminUser";
    private readonly UserRoles[] _allowedRoles;

    public AdminAuthorizeAttribute(params UserRoles[] allowedRoles)
    {
        _allowedRoles = allowedRoles;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var http = context.HttpContext;

        var token = http.RequestServices
            .GetRequiredService<CookieService>()
            .GetAdminAccessToken(http.Request);

        if (string.IsNullOrEmpty(token))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var access = await http.RequestServices
            .GetRequiredService<AdminAuthorizationService>()
            .CheckAccessAsync(token);

        if (access.Status == AdminAccessStatus.unauthenticated)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        if (access.Status != AdminAccessStatus.granted || access.Admin == null)
        {
            context.Result = Forbidden("NOT_AN_ADMIN", "You do not have permission to access the Admin Portal.");
            return;
        }

        var role = access.Admin.Role;

        var isSuperAdmin = role.Equals(
            UserRoles.SuperAdmin.ToString(),
            StringComparison.OrdinalIgnoreCase);

        var hasAllowedRole = 
            _allowedRoles.Length == 0 || 
            _allowedRoles.Any(r => r.ToString().Equals(role, StringComparison.OrdinalIgnoreCase));

        if (!isSuperAdmin && !hasAllowedRole)
        {
            context.Result = Forbidden("FORBIDDEN_ROLE", "Your role does not have permission to access this resource.");
            return;
        }

        http.Items[HttpContextItemKey] = access.Admin;
    }

    private static ObjectResult Forbidden(string error, string message)
    {
        return new(new { success = false, error, message }) { StatusCode = StatusCodes.Status403Forbidden };
    }
}

public static class AdminHttpContextExtensions
{
    /// <summary>The admin resolved by [AdminAuthorize]. Only call inside a guarded action.</summary>
    public static AdminUserDto GetAdmin(this HttpContext context) =>
        (AdminUserDto)context.Items[AdminAuthorizeAttribute.HttpContextItemKey]!;
}