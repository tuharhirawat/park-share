using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs;
using ParkMitra_BE.Models;

namespace ParkMitra_BE.Services
{
    public class ProfileService
    {
        private readonly ApplicationDbContext _context;

        public ProfileService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<ProfileDto>> GetProfilesAsync()
        {
            return await _context.profiles
                .Select(p => new ProfileDto
                {
                    UserId = p.user_id,
                    FullName = p.full_name,
                    Email = p.email,
                    MobileNumber = p.mobile_number,
                    IsHost = p.is_host,
                    CurrentStatus = p.current_status
                })
                .ToListAsync();
        }

        public async Task<ProfileDto?> GetByUserIdAsync(Guid userId)
        {
            return await _context.profiles
                .Where(p => p.user_id == userId)
                .Select(p => new ProfileDto
                {
                    UserId = p.user_id,
                    FullName = p.full_name,
                    Email = p.email,
                    MobileNumber = p.mobile_number,
                    IsHost = p.is_host,
                    CurrentStatus = p.current_status
                })
                .FirstOrDefaultAsync();
        }
    }
}