using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs;
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

        public async Task<ApiResponseDto> BecomeHostAsync(Guid userId)
        {
            var profile = await _context.profiles
                .FirstOrDefaultAsync(p => p.user_id == userId);

            if (profile == null)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "Profile not found."
                };
            }

            if (string.IsNullOrWhiteSpace(profile.mobile_number))
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "Please add your mobile number before becoming a host."
                };
            }

            if (!profile.is_phone_verified)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "Please verify your mobile number before becoming a host."
                };
            }

            var existingHost = await _context.hosts
                .FirstOrDefaultAsync(h => h.user_id == userId);

            if (existingHost != null)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "You are already a host."
                };
            }

            profile.is_host = true;

            _context.hosts.Add(new host
            {
                id = Guid.NewGuid(),
                user_id = userId,
                joined_at = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return new ApiResponseDto
            {
                Success = true,
                Message = "Welcome aboard! You're now a host."
            };
        }
    }
}