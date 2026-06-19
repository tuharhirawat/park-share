using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.DTOs.Auth;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GoogleAuthController : ControllerBase
    {
        private readonly GoogleAuthService _googleAuthService;

        public GoogleAuthController(GoogleAuthService googleAuthService)
        {
            _googleAuthService = googleAuthService;
        }

        [HttpPost("GetGoogleUser")]
        public async Task<IActionResult> GetGoogleUser(GoogleLoginRequestDto request)
        {
            var user = await _googleAuthService.GetGoogleUserAsync(request.AccessToken);

            if (user == null)
                return Unauthorized();

            return Ok(user);
        }
    }
}