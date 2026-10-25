using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs.Location;

namespace ParkMitra_BE.Services;

public class LocationService
{
    private readonly ApplicationDbContext _context;

    public LocationService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<StateDto>> GetActiveStatesAsync()
    {
        return await _context.states
            .AsNoTracking()
            .Where(s => s.is_active)
            .OrderBy(s => s.name)
            .Select(s => new StateDto
            {
                id = s.id,
                name = s.name,
                code = s.code
            })
            .ToListAsync();
    }

    public async Task<List<CityDto>> GetActiveCitiesByStateAsync(Guid stateId)
    {
        return await _context.cities
            .AsNoTracking()
            .Where(c =>
                c.state_id == stateId &&
                c.is_active)
            .OrderBy(c => c.name)
            .Select(c => new CityDto
            {
                id = c.id,
                name = c.name
            })
            .ToListAsync();
    }
}