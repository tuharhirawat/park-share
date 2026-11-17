using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.DTOs.Booking.Admin;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Filters;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/bookings")]
    [AdminAuthorize(UserRoles.Admin, UserRoles.Operations)]
    public class AdminBookingController : ControllerBase
    {
        private AdminBookingService _adminBookingService;

        public AdminBookingController(AdminBookingService adminBookingService)
        {
            _adminBookingService = adminBookingService;
        }

        [HttpGet]
        public async Task<IActionResult> GetBookings([FromQuery] AdminBookingsRequestDto query)
            => Ok(await _adminBookingService.GetAllBookingsAsync(query));

        [HttpGet("booking-cities")]
        public async Task<IActionResult> GetBookingCities()
            => Ok(new { cities = await _adminBookingService.GetBookingCitiesForUserAsync() });

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetBooking(Guid id)
        {
            var result = await _adminBookingService.GetBookingByIdAsync(id);
            return result == null ? Fail("BOOKING_NOT_FOUND", "Booking not found.") : Ok(result);
        }

        [HttpGet("{id:guid}/spots")]
        public async Task<IActionResult> GetUserSpots(Guid id)
        {
            var result = await _adminBookingService.GetUserSpotsByIdAsync(id);
            return result == null ? Fail("USER_NOT_FOUND", "User not found.") : Ok(result);
        }

        [HttpGet("{id:guid}/bookings")]
        public async Task<IActionResult> GetUserBookings(Guid id, [FromQuery] int page = 1, [FromQuery] int limit = 10)
        {
            var result = await _adminBookingService.GetUserBookingsByIdAsync(id, page, limit);
            return result == null ? Fail("USER_NOT_FOUND", "User not found.") : Ok(result);
        }

        private IActionResult Fail(string error, string message)
        {
            var body = new { success = false, error, message };

            return error switch
            {
                "USER_NOT_FOUND" or "BOOKING_NOT_FOUND" => NotFound(body),
                _ => BadRequest(body)
            };
        }
    }
}
