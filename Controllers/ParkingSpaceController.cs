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

        [HttpPost("CreateParkingSpace")]
        public async Task<IActionResult> CreateParkingSpace([FromBody] CreateParkingSpaceDto request)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _parkingSpaceService.CreateParkingSpaceAsync(currentUser.UserId, request);

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

        [HttpPut("{id}/UpdateParkingSpace")]
        public async Task<IActionResult> UpdateParkingSpace(Guid id, [FromBody] CreateParkingSpaceDto request)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _parkingSpaceService.UpdateParkingSpaceAsync(currentUser.UserId, id, request);

            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }

        [HttpGet("Search")]
        public async Task<IActionResult> Search()
        {
            var accessToken = Request.Cookies["access_token"];

            Guid? currentUserId = null;

            if (!string.IsNullOrEmpty(accessToken))
            {
                var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
                currentUserId = currentUser?.UserId;
            }

            var spaces = await _parkingSpaceService.SearchAsync(currentUserId);
            return Ok(spaces);
        }

        [HttpGet("GetSpace/{id}")]
        public async Task<IActionResult> GetSpaceById(Guid id)
        {
            var accessToken = Request.Cookies["access_token"];
            Guid? currentUserId = null;
            if (!string.IsNullOrEmpty(accessToken))
            {
                var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
                currentUserId = currentUser?.UserId;
            }

            var space = await _parkingSpaceService.GetSpaceByIdAsync(id, currentUserId);
            if (space == null) return NotFound();
            return Ok(space);
        }

        [HttpGet("{id}/AvailableSlots")]
        public async Task<IActionResult> GetAvailableSlots(Guid id)
        {
            var slots = await _parkingSpaceService.GetAvailableSlotsAsync(id);
            return Ok(slots);
        }
    }
}