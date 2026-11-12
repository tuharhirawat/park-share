using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.DTOs.Admin;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Filters;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Controllers.Admin;

[ApiController]
[Route("api/admin/users")]
[AdminAuthorize(UserRoles.Admin, UserRoles.Operations)]
public class AdminUsersController : ControllerBase
{
    private readonly AdminUserService _adminUserService;

    public AdminUsersController(AdminUserService adminUserService)
    {
        _adminUserService = adminUserService;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] AdminUsersQueryDto query)
    {
        var users = await _adminUserService.GetAllUsersAsync(query);
        return users == null ? Fail("NO_USERS", "no userss available to load") : Ok(users);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetUser(Guid id)
    {
        var user = await _adminUserService.GetUserByIdAsync(id);
        return user == null ? Fail("USER_NOT_FOUND", "User not found.") : Ok(user);
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateUserStatusRequestDto body)
    {
        var admin = HttpContext.GetAdmin();
        var isSuperAdmin = admin.Role.Equals(UserRoles.SuperAdmin.ToString(), StringComparison.OrdinalIgnoreCase);
        var (error, message, user) = await _adminUserService.UpdateUserStatusAsync(admin.UserId, isSuperAdmin, id, body.Status, body.Reason);

        return error == null ? Ok(user) : Fail(error, message!);
    }

    private IActionResult Fail(string error, string message)
    {
        var body = new { success = false, error, message };

        return error switch
        {
            "USER_NOT_FOUND" => NotFound(body),
            "SUPER_ADMIN_PROTECTED" or "CANNOT_BLOCK_SELF" or "FORBIDDEN_ROLE" => StatusCode(StatusCodes.Status403Forbidden, body),
            _ => BadRequest(body)
        };
    }
}