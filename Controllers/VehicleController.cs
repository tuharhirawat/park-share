using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.DTOs.Vehicle;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VehicleController : ControllerBase
    {
        private readonly VehicleService _vehicleService;
        private readonly CurrentUserService _currentUserService;

        public VehicleController(
            VehicleService vehicleService,
            CurrentUserService currentUserService)
        {
            _vehicleService = vehicleService;
            _currentUserService = currentUserService;
        }

        [HttpGet("GetMyVehicles")]
        public async Task<IActionResult> GetMyVehicles()
        {
            var accessToken = Request.Cookies["access_token"];

            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);

            if (currentUser == null)
                return Unauthorized();

            var vehicles = await _vehicleService.GetMyVehiclesAsync(currentUser.UserId);

            return Ok(vehicles);
        }

        [HttpPost("AddVehicle")]
        public async Task<IActionResult> AddVehicle([FromBody] VehicleDto request)
        {
            var accessToken = Request.Cookies["access_token"];

            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);

            if (currentUser == null)
                return Unauthorized();

            var result = await _vehicleService.AddVehicleAsync(
                currentUser.UserId,
                request);

            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }

        [HttpDelete("DeleteVehicle/{id}")]
        public async Task<IActionResult> DeleteVehicle(Guid id)
        {
            var accessToken = Request.Cookies["access_token"];

            if (string.IsNullOrEmpty(accessToken))
                return Unauthorized();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);

            if (currentUser == null)
                return Unauthorized();

            var result = await _vehicleService.DeleteVehicleAsync(
                currentUser.UserId,
                id);

            if (!result.Success)
                return BadRequest(result);

            return Ok(result);
        }
    }
}