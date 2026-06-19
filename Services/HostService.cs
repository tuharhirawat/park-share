using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.Models;

namespace ParkMitra_BE.Services
{
    public class HostService
    {
        private readonly ApplicationDbContext _context;

        public HostService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<host>> GetHostsAsync()
        {
            return await _context.hosts.ToListAsync();
        }

        public async Task<host?> GetByUserIdAsync(Guid userId)
        {
            return await _context.hosts
                .FirstOrDefaultAsync(h => h.user_id == userId);
        }
    }
}