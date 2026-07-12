using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.DTOs.ParkingSpace;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ParkingSpaceController : ControllerBase
    {
        private readonly ParkingSpaceService _parkingSpaceService;
        private readonly CurrentUserService _currentUserService;

        public ParkingSpaceController(
            ParkingSpaceService parkingSpaceService,
            CurrentUserService currentUserService)
        {
            _parkingSpaceService = parkingSpaceService;
            _currentUserService = currentUserService;
        }

        [HttpPost("Create")]
        public async Task<IActionResult> Create([FromBody] CreateParkingSpaceDto request)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _parkingSpaceService.CreateAsync(currentUser.UserId, request);

            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }

        [HttpGet("MySpaces")]
        public async Task<IActionResult> GetMySpaces()
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var spaces = await _parkingSpaceService.GetMySpacesAsync(currentUser.UserId);
            return Ok(spaces);
        }

        [HttpPut("{id}/Update")]
        public async Task<IActionResult> Update(Guid id, [FromBody] CreateParkingSpaceDto request)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _parkingSpaceService.UpdateAsync(currentUser.UserId, id, request);

            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }
    }
}