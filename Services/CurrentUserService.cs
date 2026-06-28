using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs.Auth;
using System.Net.Http.Headers;
using System.Text.Json;

namespace ParkMitra_BE.Services
{
    public class CurrentUserService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ApplicationDbContext _context;
        private readonly UserInitializationService _userInitializationService;

        public CurrentUserService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ApplicationDbContext context,
            UserInitializationService userInitializationService)
        {
            _httpClient = httpClientFactory.CreateClient();
            _configuration = configuration;
            _context = context;
            _userInitializationService = userInitializationService;
        }

        public async Task<MeResponseDto?> GetCurrentUserAsync(string accessToken)
        {
            var supabaseUrl = _configuration["Supabase:Url"];
            var anonKey = _configuration["Supabase:AnonKey"];

            _httpClient.DefaultRequestHeaders.Clear();

            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue(
                    "Bearer",
                    accessToken);

            _httpClient.DefaultRequestHeaders.Add(
                "apikey",
                anonKey);

            var response = await _httpClient.GetAsync($"{supabaseUrl}/auth/v1/user");

            if (!response.IsSuccessStatusCode)
                return null;

            var json = await response.Content.ReadAsStringAsync();

            using var document = JsonDocument.Parse(json);

            var root = document.RootElement;

            var authEmail = root.GetProperty("email").GetString() ?? string.Empty;

            string fullName = string.Empty;
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

                if (metadata.TryGetProperty("mobile_number", out var mobileElement))
                {
                    mobileNumber = mobileElement.GetString();
                }
            }

            var userId = Guid.Parse(root.GetProperty("id").GetString()!);

            var hasGoogleProvider = false;
            var hasEmailProvider = false;

            if (root.TryGetProperty("identities", out var identities))
            {
                foreach (var identity in identities.EnumerateArray())
                {
                    if (!identity.TryGetProperty("provider", out var providerProperty))
                        continue;

                    var provider = providerProperty.GetString();

                    if (provider == "google")
                        hasGoogleProvider = true;

                    if (provider == "email")
                        hasEmailProvider = true;
                }
            }

            var canChangeEmail = hasEmailProvider && !hasGoogleProvider;

            var profile = await _context.profiles.FirstOrDefaultAsync(p => p.user_id == userId);

            if (profile == null)
            {
                var initialized = await _userInitializationService.InitializeNewUserAsync(
                    userId,
                    fullName,
                    mobileNumber,
                    authEmail
                );

                if (!initialized)
                {
                    throw new InvalidOperationException("Failed to initialize user profile.");
                }

                profile = await _context.profiles.FirstOrDefaultAsync(p => p.user_id == userId);

                if (profile == null)
                {
                    throw new InvalidOperationException("User profile was not created.");
                }
            }

            if (!string.Equals(
                    profile.email,
                    authEmail,
                    StringComparison.OrdinalIgnoreCase)
            )
            {
                profile.email = authEmail;
                profile.updated_at = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return new MeResponseDto
            {
                UserId = profile.user_id,
                FullName = profile.full_name,
                Email = profile.email ?? "",
                MobileNumber = profile.mobile_number,
                IsHost = profile.is_host,
                CurrentStatus = profile.current_status,
                HasGoogleProvider = hasGoogleProvider,
                HasEmailProvider = hasEmailProvider,
                CanChangeEmail = canChangeEmail,
            };
        }
    }
}