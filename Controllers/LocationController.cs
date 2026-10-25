using Microsoft.AspNetCore.Mvc;
using ParkMitra_BE.Services;

namespace ParkMitra_BE.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LocationController : ControllerBase
{
    private readonly LocationService _locationService;

    public LocationController(LocationService locationService)
    {
        _locationService = locationService;
    }

    [HttpGet("states")]
    public async Task<IActionResult> GetStates()
    {
        var states = await _locationService.GetActiveStatesAsync();
        return Ok(states);
    }

    [HttpGet("cities")]
    public async Task<IActionResult> GetCities([FromQuery] Guid stateId)
    {
        var cities = await _locationService.GetActiveCitiesByStateAsync(stateId);
        return Ok(cities);
    }
}