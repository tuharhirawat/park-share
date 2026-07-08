using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs;
using ParkMitra_BE.DTOs.Profile;
using ParkMitra_BE.Infrastructure.Clients;
using ParkMitra_BE.Models;

namespace ParkMitra_BE.Services
{
    /// <summary>
    /// Handles profile management and coordinates profile-related
    /// operations between the application database and Supabase
    /// Authentication.
    /// </summary>
    public class ProfileService
    {
        private readonly ApplicationDbContext _context;
        private readonly IAuthProviderClient _supabaseAuthClient;

        public ProfileService(ApplicationDbContext context, IAuthProviderClient supabaseAuthClient)
        {
            _context = context;
            _supabaseAuthClient = supabaseAuthClient;
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

        public async Task<bool> UpdateProfileAsync(
            Guid userId,
            string fullName,
            string mobileNumber)
        {
            var profile = await _context.profiles
                .FirstOrDefaultAsync(x => x.user_id == userId);

            if (profile == null)
                return false;

            if (!string.IsNullOrWhiteSpace(mobileNumber))
            {
                var mobileExists = await _context.profiles
                    .AnyAsync(x =>
                        x.mobile_number == mobileNumber &&
                        x.user_id != userId);

                if (mobileExists)
                    return false;
            }

            profile.full_name = fullName.Trim();
            profile.mobile_number =
                string.IsNullOrWhiteSpace(mobileNumber)
                    ? null
                    : mobileNumber.Trim();

            await _context.SaveChangesAsync();

            return true;
        }

        public async Task<ApiResponseDto> UpdateEmailAsync(
            Guid userId,
            string accessToken,
            string email
        )
        {
            var normalizedEmail =
                email.Trim().ToLowerInvariant();

            var emailExists =
                await _context.profiles.AnyAsync(x =>
                    x.email != null &&
                    x.email.ToLower() == normalizedEmail &&
                    x.user_id != userId);

            if (emailExists)
            {
                return new ApiResponseDto
                {
                    Success = false,
                    Message = "An account already exists with this email."
                };
            }

            var response = await _supabaseAuthClient.UpdateAuthenticatedUserAsync(
                accessToken,
                new
                {
                    email = normalizedEmail
                }
            );

            if (!response.IsSuccessStatusCode)
            {
                var error =
                    await response.Content.ReadAsStringAsync();

                return new ApiResponseDto
                {
                    Success = false,
                    Message = error
                };
            }

            return new ApiResponseDto
            {
                Success = true,
                Message = "A verification email has been sent to your new email address. Your email will be updated after you verify it using the link in that email."
            };
        }

        public async Task<ApiResponseDto> UpdatePasswordAsync(
            string accessToken, string newPassword
        )
        {
            var response = await _supabaseAuthClient.UpdateAuthenticatedUserAsync(
                accessToken,
                new
                {
                    password = newPassword
                }
            );

            if (!response.IsSuccessStatusCode)
            {
                var error =
                    await response.Content.ReadAsStringAsync();

                return new ApiResponseDto
                {
                    Success = false,
                    Message = error
                };
            }

            return new ApiResponseDto
            {
                Success = true,
                Message = "Password updated successfully."
            };
        }
    }
}