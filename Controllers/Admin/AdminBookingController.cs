using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.Services;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Filters;

namespace ParkMitra_BE.Controllers.Admin
{
    [ApiController]
    [Route("api/admin/bookings")]
    public class AdminBookingController : ControllerBase
    {
        private AdminBookingService _adminBookingService;
        public AdminBookingController(AdminBookingService adminBookingService)
        {
            _adminBookingService = adminBookingService;
        }

        [AdminAuthorize(UserRoles.Admin, UserRoles.Operations)]
        [HttpGet("{id:guid}/spots")]
        public async Task<IActionResult> GetUserSpots(Guid id)
        {
            var result = await _adminBookingService.GetUserSpotsByIdAsync(id);
            return result == null ? Fail("USER_NOT_FOUND", "User not found.") : Ok(result);
        }

        [AdminAuthorize(UserRoles.Admin, UserRoles.Operations)]
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
                "USER_NOT_FOUND" => NotFound(body),
                _ => BadRequest(body)
            };
        }
    }
}
