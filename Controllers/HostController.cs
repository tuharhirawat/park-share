using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.DTOs.Host;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HostController : ControllerBase
    {
        private readonly HostService _hostService;
        private readonly CurrentUserService _currentUserService;

        public HostController(HostService hostService, CurrentUserService currentUserService)
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

        [HttpPost("slot/add")]
        public async Task<IActionResult> AddSlot([FromBody] AddSlotRequestDto dto)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _hostService.AddSlotAsync(currentUser.UserId, dto);
            if (!result.Success) return BadRequest(result);

            return Ok(result);
        }

        [HttpGet("dashboard/summary")]
        public async Task<IActionResult> GetDashboardSummary(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var dashboard = await _hostService.GetDashboardSummaryAsync(currentUser.UserId, page, pageSize);

            return Ok(dashboard);
        }

        [HttpGet("spaces/{spaceId}/earnings/trend")]
        public async Task<IActionResult> GetSpaceEarningsTrend(Guid spaceId)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();
            
            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _hostService.GetSpaceEarningsTrendAsync(currentUser.UserId, spaceId);

            return Ok(result);
        }

        [HttpGet("spaces/{spaceId}/analytics/peakhours")]
        public async Task<IActionResult> GetSpacePeakHours(Guid spaceId)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();
            
            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _hostService.GetSpacePeakHoursAsync(currentUser.UserId, spaceId);

            return Ok(result);
        }

        [HttpPatch("toggle/slot/{slotId}")]
        public async Task<IActionResult> ToggleSlotAvailability(Guid slotId)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _hostService.ToggleSlotAvailabilityAsync(currentUser.UserId, slotId);
            if (!result.Success) return BadRequest(result);

            return Ok(result);
        }

        [HttpPatch("availability/update/space/{spaceId}")]
        public async Task<IActionResult> ToggleAvailability(Guid spaceId, [FromBody] ToggleAvailabilityRequestDto dto)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _hostService.ToggleAvailabilityAsync(currentUser.UserId, spaceId, dto.Available);
            if (!result.Success) return BadRequest(result);

            return Ok(result);
        }

        /// Delete endpoint not in use
        //[HttpDelete("slots/{slotId}/delete")]
        //public async Task<IActionResult> DeleteSlot(Guid slotId)
        //{
        //    var accessToken = Request.Cookies["access_token"];
        //    if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

        //    var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
        //    if (currentUser == null) return Unauthorized();

        //    var result = await _hostService.DeleteSlotAsync(currentUser.UserId, slotId);
        //    if (!result.Success) return BadRequest(result);

        //    return Ok(result);
        //}
    }
}