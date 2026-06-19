using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs.Auth;
using System.Net.Http.Headers;
using System.Text.Json;

namespace ParkMitra_BE.Services
{
    public class GoogleAuthService
    {
        private readonly CurrentUserService _currentUserService;
        private readonly ApplicationDbContext _context;
        private readonly UserInitializationService _userInitializationService;
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        public GoogleAuthService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            CurrentUserService currentUserService,
            ApplicationDbContext context,
            UserInitializationService userInitializationService)
        {
            _httpClient = httpClientFactory.CreateClient();

            _configuration = configuration;
            _currentUserService = currentUserService;
            _context = context;
            _userInitializationService = userInitializationService;
        }

        public async Task<MeResponseDto?> GetGoogleUserAsync(string accessToken)
        {
            try
            {
                var userInfo = await _currentUserService.GetCurrentUserAsync(accessToken);

                if (userInfo != null)
                {
                    return userInfo;
                }

                var supabaseUrl = _configuration["Supabase:Url"] ?? "";
                var anonKey = _configuration["Supabase:AnonKey"] ?? "";

                _httpClient.DefaultRequestHeaders.Clear();
                _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                _httpClient.DefaultRequestHeaders.Add("apikey", anonKey);

                var response = await _httpClient.GetAsync($"{supabaseUrl}/auth/v1/user");

                if (!response.IsSuccessStatusCode)
                {
                    return null;
                }

                var json = await response.Content.ReadAsStringAsync();

                using var document = JsonDocument.Parse(json);

                var root = document.RootElement;

                var userIdString = root.GetProperty("id").GetString();

                if (!Guid.TryParse(userIdString, out var userId))
                {
                    return null;
                }

                string fullName = string.Empty;
                string email = string.Empty;
                string? mobileNumber = null;

                if (root.TryGetProperty("user_metadata", out var metadata))
                {
                    if (metadata.TryGetProperty("full_name", out var fullNameElement))
                    {
                        fullName = fullNameElement.GetString() ?? string.Empty;
                    }
                    else if (metadata.TryGetProperty("name", out var nameElement))
                    {
                        fullName = nameElement.GetString() ?? string.Empty;
                    }
                }

                if (root.TryGetProperty("email", out var emailElement))
                {
                    email = emailElement.GetString() ?? string.Empty;
                }

                var initializeSuccess =
                    await _userInitializationService.InitializeNewUserAsync(
                        userId,
                        fullName,
                        mobileNumber,
                        email);

                if (!initializeSuccess)
                {
                    return null;
                }

                var profile = await _context.profiles.FirstOrDefaultAsync(p => p.user_id == userId);

                if (profile == null)
                {
                    return null;
                }

                return new MeResponseDto
                {
                    UserId = profile.user_id,
                    FullName = profile.full_name,
                    Email = profile.email ?? string.Empty,
                    MobileNumber = profile.mobile_number,
                    IsHost = profile.is_host,
                    CurrentStatus = profile.current_status
                };
            }
            catch
            {
                return null;
            }
        }
    }
}