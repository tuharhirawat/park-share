using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingController : ControllerBase
    {
        private readonly BookingService _bookingService;
        private readonly CurrentUserService _currentUserService;

        public BookingController(
            BookingService bookingService,
            CurrentUserService currentUserService)
        {
            _bookingService = bookingService;
            _currentUserService = currentUserService;
        }

        [HttpGet("GetSpaceBookingAvailability")]
        public async Task<IActionResult> GetSpaceBookingAvailability(
            [FromQuery] Guid spaceId,
            [FromQuery] DateOnly date,
            [FromQuery] TimeOnly startTime,
            [FromQuery] TimeOnly endTime)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _bookingService.GetSpaceBookingAvailabilityAsync(spaceId, date, startTime, endTime);
            return Ok(result);
        }
    }
}