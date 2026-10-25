using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.DTOs.ParkingSpace;
using ParkMitra_BE.Services;
using ParkMitra_BE.Enums;

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

        [HttpGet("MySpaceListings")]
        public async Task<IActionResult> GetMySpaceListings(
            [FromQuery] HostSpaceListingStatus status,
            [FromQuery] int page = 1)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null)
                return Unauthorized();


            var result = await _parkingSpaceService.GetMySpaceListingsAsync(currentUser.UserId, status, page);
            return Ok(result);
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
        public async Task<IActionResult> Search(
            [FromQuery] string? search,
            [FromQuery] Guid? cityId,
            [FromQuery] string? vehicleType,
            [FromQuery] int page = 1)
        {
            var accessToken = Request.Cookies["access_token"];

            Guid? currentUserId = null;

            if (!string.IsNullOrEmpty(accessToken))
            {
                var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
                currentUserId = currentUser?.UserId;
            }

            var spaces = await _parkingSpaceService.SearchAsync(
                currentUserId,
                search,
                cityId,
                vehicleType,
                page);

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

        [HttpPut("host/{spaceId}/details/update")]
        public async Task<IActionResult> UpdateSpaceDetails(Guid spaceId, [FromBody] UpdateSpaceDetailsRequestDto dto)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _parkingSpaceService.UpdateSpaceDetailsAsync(currentUser.UserId, spaceId, dto);
            if (!result.Success) return BadRequest(result);
            
            return Ok(result);
        }

        [HttpGet("host/{spaceId}/slots")]
        public async Task<IActionResult> GetSpaceSlotsBySpaceId(Guid spaceId)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var slots = await _parkingSpaceService.GetSpaceSlotsBySpaceIdAsync(currentUser.UserId, spaceId);
            return Ok(slots);
        }

        [HttpGet("MySpaceListingsCount")]
        public async Task<IActionResult> GetMySpaceListingsCount()
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null)
                return Unauthorized();

            var summary = await _parkingSpaceService.GetMySpaceListingsCountAsync(currentUser.UserId);
            return Ok(summary);
        }

        [HttpDelete("{id}/CancelListing")]
        public async Task<IActionResult> CancelListing(Guid id)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null)
                return Unauthorized();

            var result = await _parkingSpaceService.CancelListingAsync(currentUser.UserId, id);
            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }

        [HttpGet("{id}/ReapplyDetails")]
        public async Task<IActionResult> GetReapplyDetails(Guid id)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null)
                return Unauthorized();

            var result = await _parkingSpaceService.GetReapplyDetailsAsync(currentUser.UserId, id);
            if (result == null)
                return NotFound();

            return Ok(result);
        }
    }
}