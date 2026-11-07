using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.Enums;
using ParkMitra_BE.DTOs.Auth.EmailAuth;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Controllers.Admin;

[ApiController]
[Route("api/AdminAuth")]
public class AdminAuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly CookieService _cookieService;
    private readonly AdminAuthorizationService _adminAuthorizationService;

    public AdminAuthController(
        AuthService authService,
        CookieService cookieService,
        AdminAuthorizationService adminAuthorizationService)
    {
        _authService = authService;
        _cookieService = cookieService;
        _adminAuthorizationService = adminAuthorizationService;
    }

    [HttpPost("Login")]
    public async Task<IActionResult> Login(LoginRequestDto request)
    {
        var result = await _authService.LoginAsync(request);
        if (!result.Success)
            return BadRequest(result);

        if (string.IsNullOrEmpty(result.AccessToken))
        {
            return Unauthorized(new 
            { 
                Success = false, 
                Message = "Unable to create login session."
            });
        }

        var access = await _adminAuthorizationService.CheckAccessAsync(result.AccessToken);
        if (access.Status == AdminAccessStatus.blocked)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                Success = false,
                Message = "Your account is not active. Please contact support."
            });
        }

        if (access.Status != AdminAccessStatus.granted)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                Success = false,
                Message = "You do not have permission to access the Admin Portal."
            });
        }

        // Admin cookie only: the customer's access_token / refresh_token are never touched.
        _cookieService.SetAdminAuthCookie(
            Response, 
            result.AccessToken, 
            result.ExpiresIn);

        return Ok(new
        {
            Success = true,
            Message = "Admin login successful.",
            Admin = access.Admin
        });
    }

    [HttpGet("Me")]
    public async Task<IActionResult> Me()
    {
        var accessToken = _cookieService.GetAdminAccessToken(Request);
        if (string.IsNullOrEmpty(accessToken))
            return Unauthorized();

        var access = await _adminAuthorizationService.CheckAccessAsync(accessToken);

        switch (access.Status)
        {
            case AdminAccessStatus.granted:
                return Ok(access.Admin);

            case AdminAccessStatus.unauthenticated:
                // Expired or invalid token: clear it so the portal goes back to /login.
                _cookieService.ClearAdminAuthCookie(Response);
                return Unauthorized();

            default: // Blocked or NotAdmin
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    Success = false,
                    Message = "You do not have permission to access the Admin Portal."
                });
        }
    }

    [HttpPost("Logout")]
    public IActionResult Logout()
    {
        _cookieService.ClearAdminAuthCookie(Response);

        return Ok(new 
        {
            Success = true,
            Message = "Logged out successfully."
        });
    }
}