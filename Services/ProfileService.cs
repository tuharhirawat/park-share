using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs;
using ParkMitra_BE.DTOs.Profile;
using ParkMitra_BE.Models;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace ParkMitra_BE.Services
{
    public class ProfileService
    {
        private readonly ApplicationDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public ProfileService(ApplicationDbContext context, HttpClient httpClient, IConfiguration configuration)
        {
            _context = context;
            _httpClient = httpClient;
            _configuration = configuration;
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

            var body = new
            {
                email = normalizedEmail
            };

            var json = JsonSerializer.Serialize(body);

            var content = new StringContent(
                    json,
                    Encoding.UTF8,
                    "application/json"
            );

            _httpClient.DefaultRequestHeaders.Clear();

            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer",
                    accessToken);

            _httpClient.DefaultRequestHeaders.Add(
                "apikey",
                _configuration["Supabase:AnonKey"]);

            var response = await _httpClient.PutAsync($"{_configuration["Supabase:Url"]}/auth/v1/user", content);

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
            var body = new
            {
                password = newPassword
            };

            var json = JsonSerializer.Serialize(body);

            var content = new StringContent(
                json,
                Encoding.UTF8,
                "application/json");

            _httpClient.DefaultRequestHeaders.Clear();

            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer",
                    accessToken);

            _httpClient.DefaultRequestHeaders.Add(
                "apikey",
                _configuration["Supabase:AnonKey"]);

            var response =
                await _httpClient.PutAsync(
                    $"{_configuration["Supabase:Url"]}/auth/v1/user",
                    content);

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