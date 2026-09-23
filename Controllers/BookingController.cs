using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.DTOs.Booking;
using ParkMitra_BE.Enums;
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
        public async Task<IActionResult> GetMyBookings(
            [FromQuery] string tab = "active",
            [FromQuery] string historyFilter = "all",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null)
                return Unauthorized();

            var bookings = await _bookingService.GetMyBookingsAsync(
                currentUser.UserId,
                tab,
                historyFilter,
                page,
                pageSize);

            return Ok(bookings);
        }

        [HttpGet("GetMySpaceBookingsCount")]
        public async Task<IActionResult> GetMySpaceBookingsCount()
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null)
                return Unauthorized();

            var counts = await _bookingService.GetMySpaceBookingsCountAsync(currentUser.UserId);

            return Ok(counts);
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

        [HttpGet("host/space/{spaceId}")]
        public async Task<IActionResult> GetSpaceBookingsBySpaceId(
            Guid spaceId,
            [FromQuery] ComputedBookingStatus status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string sort = "newest",
            [FromQuery] DateOnly? fromDate = null,
            [FromQuery] DateOnly? toDate = null)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _bookingService.GetSpaceBookingsBySpaceIdAsync(
                currentUser.UserId, spaceId, status, page, pageSize, sort, fromDate, toDate);

            return Ok(result);
        }

        [HttpGet("host/{spaceId}/bookings/count")]
        public async Task<IActionResult> GetBookingsCountBySpaceId(
            Guid spaceId,
            [FromQuery] DateOnly? fromDate = null,
            [FromQuery] DateOnly? toDate = null)
        {
            var accessToken = Request.Cookies["access_token"];
            if (string.IsNullOrEmpty(accessToken)) return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);
            if (currentUser == null) return Unauthorized();

            var result = await _bookingService.GetBookingsCountBySpaceIdAsync(currentUser.UserId, spaceId, fromDate, toDate);
            return Ok(result);
        }
    }
}