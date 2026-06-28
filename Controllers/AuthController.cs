using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.DTOs;
using ParkMitra_BE.DTOs.Auth;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly CookieService _cookieService;
        private readonly CurrentUserService _currentUserService;

        public AuthController(AuthService authService, CookieService cookieService, CurrentUserService currentUserService)
        {
            _authService = authService;
            _cookieService = cookieService;
            _currentUserService = currentUserService;
        }

        [HttpPost("Signup")]
        public async Task<IActionResult> Signup(SignupRequestDto request)
        {
            var result = await _authService.SignupAsync(request);

            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }

        [HttpPost("Login")]
        public async Task<IActionResult> Login(LoginRequestDto request)
        {
            var result = await _authService.LoginAsync(request);

            if (!result.Success)
                return BadRequest(result);

            _cookieService.SetAuthCookies(
                Response,
                result.AccessToken,
                result.RefreshToken,
                result.ExpiresIn
            );

            return Ok(new
            {
                result.Success,
                result.Message
            });
        }

        [HttpGet("Me")]
        public async Task<IActionResult> Me()
        {
            var accessToken = Request.Cookies["access_token"];

            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            try
            {
                var user = await _currentUserService.GetCurrentUserAsync(accessToken);

                if (user == null)
                    return Unauthorized();

                return Ok(user);
            }
            catch (Exception)
            {
                return StatusCode(500, new ApiResponseDto
                {
                    Success = false,
                    Message = "Unable to initialize your account. Please try again." 
                });
            }
        }

        [HttpPost("EstablishSession")]
        public async Task<IActionResult> EstablishSession(EstablishSessionRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.AccessToken))
            {
                return BadRequest(new ApiResponseDto
                {
                    Success = false,
                    Message = "Access token is required."
                });
            }

            try
            {
                var currentUser = await _currentUserService.GetCurrentUserAsync(request.AccessToken);

                if (currentUser == null)
                {
                    return Unauthorized(new ApiResponseDto
                    {
                        Success = false,
                        Message = "Invalid or expired access token."
                    });
                }

                _cookieService.SetAuthCookies(
                    Response,
                    request.AccessToken,
                    request.RefreshToken,
                    request.ExpiresIn
                );

                return Ok(new ApiResponseDto
                {
                    Success = true,
                    Message = "Session established successfully."
                });
            }
            catch
            {
                return StatusCode(500, new ApiResponseDto
                {
                    Success = false,
                    Message = "Unable to establish session."
                });
            }
        }

        [HttpPost("Logout")]
        public IActionResult Logout()
        {
            _cookieService.ClearAuthCookies(Response);

            return Ok(new
            {
                Success = true,
                Message = "Logged out successfully"
            });
        }
    }
}