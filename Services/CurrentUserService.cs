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

        public CurrentUserService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ApplicationDbContext context)
        {
            _httpClient = httpClientFactory.CreateClient();
            _configuration = configuration;
            _context = context;
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

            var response =
                await _httpClient.GetAsync(
                    $"{supabaseUrl}/auth/v1/user");

            if (!response.IsSuccessStatusCode)
                return null;

            var json =
                await response.Content.ReadAsStringAsync();

            using var document =
                JsonDocument.Parse(json);

            var userId = Guid.Parse(
                document.RootElement
                    .GetProperty("id")
                    .GetString()!);

            var profile = await _context.profiles
                .FirstOrDefaultAsync(
                    p => p.user_id == userId);

            if (profile == null)
                return null;

            return new MeResponseDto
            {
                UserId = profile.user_id,
                FullName = profile.full_name,
                Email = profile.email ?? "",
                MobileNumber = profile.mobile_number,
                IsHost = profile.is_host,
                CurrentStatus = profile.current_status
            };
        }
    }
}