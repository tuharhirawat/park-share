using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.DTOs.Booking;
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

        [HttpPost("CreateBooking")]
        public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequestDto request)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _bookingService.CreateBookingAsync(currentUser.UserId, request);

            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }

        [HttpGet("GetMyBookings")]
        public async Task<IActionResult> GetMyBookings()
        {
            var accessToken = Request.Cookies["access_token"];

            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);

            if (currentUser == null)
                return Unauthorized();

            var bookings = await _bookingService.GetMyBookingsAsync(currentUser.UserId);

            return Ok(bookings);
        }

        [HttpPost("PreviewReschedule")]
        public async Task<IActionResult> PreviewReschedule(RescheduleBookingRequestDto dto)
        {
            var accessToken = Request.Cookies["access_token"];

            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);

            if (currentUser == null)
                return Unauthorized();

            var result = await _bookingService.PreviewRescheduleAsync(currentUser.UserId, dto);

            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }

        [HttpPost("ConfirmReschedule")]
        public async Task<IActionResult> ConfirmReschedule(RescheduleBookingRequestDto dto)
        {
            var accessToken = Request.Cookies["access_token"];

            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);

            if (currentUser == null)
                return Unauthorized();

            var result = await _bookingService.ConfirmRescheduleAsync(currentUser.UserId, dto);

            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }

        [HttpPost("Cancel/{id}")]
        public async Task<IActionResult> Cancel(Guid id)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();
            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _bookingService.CancelAsync(currentUser.UserId, id);
            if (!result.Success) return BadRequest(result);
            return Ok(result);
        }
    }
}