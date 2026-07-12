using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HostController : ControllerBase
    {
        private readonly HostService _hostService;
        private readonly CurrentUserService _currentUserService;

        public HostController(
            HostService hostService,
            CurrentUserService currentUserService)
        {
            _hostService = hostService;
            _currentUserService = currentUserService;
        }

        [HttpPost("BecomeHost")]
        public async Task<IActionResult> BecomeHost()
        {
            var accessToken = Request.Cookies["access_token"];

            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);

            if (currentUser == null)
                return Unauthorized();

            var result = await _hostService.BecomeHostAsync(currentUser.UserId);

            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }
    }
}