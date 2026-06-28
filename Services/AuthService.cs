using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs.Auth;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace ParkMitra_BE.Services
{
    public class AuthService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ApplicationDbContext _context;
        private readonly CurrentUserService _currentUserService;

        public AuthService(
            IHttpClientFactory httpClientFactory, 
            IConfiguration configuration, 
            ApplicationDbContext context,
            CurrentUserService currentUserService)
        {
            _httpClient = httpClientFactory.CreateClient();
            _configuration = configuration;
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<SignupResponseDto> SignupAsync(SignupRequestDto request)
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            var normalizedMobile = request.MobileNumber.Trim();

            var normalizedFullName = request.FullName.Trim();

            var existingProfile = await _context.profiles
                .FirstOrDefaultAsync(x =>
                    (x.email ?? "").ToLower() == normalizedEmail ||
                    x.mobile_number == normalizedMobile);

            if (existingProfile != null)
            {
                return new SignupResponseDto
                {
                    Success = false,
                    Message = "An account already exists with this email or mobile number"
                };
            }

            var supabaseUrl = _configuration["Supabase:Url"];
            var serviceRoleKey = _configuration["Supabase:ServiceRoleKey"];

            var signupRequest = new
            {
                email = normalizedEmail,
                password = request.Password,
                data = new
                {
                    full_name = normalizedFullName,
                    mobile_number = normalizedMobile
                }
            };

            var json = JsonSerializer.Serialize(signupRequest);

            var content = new StringContent(
                json,
                Encoding.UTF8,
                "application/json"
            );

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", serviceRoleKey);
            _httpClient.DefaultRequestHeaders.Add("apikey", serviceRoleKey);

            var response = await _httpClient.PostAsync(
                $"{supabaseUrl}/auth/v1/signup", content
            );

            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return new SignupResponseDto
                {
                    Success = false,
                    Message = responseContent
                };
            }

            return new SignupResponseDto
            {
                Success = true,
                Message = "Account created successfully. Please verify your email.",
            };
        }

        public async Task<LoginResponseDto> LoginAsync(LoginRequestDto request)
        {
            var supabaseUrl = _configuration["Supabase:Url"];
            var serviceRoleKey = _configuration["Supabase:ServiceRoleKey"];

            var normalizedEmail = request.Email.Trim().ToLowerInvariant();

            var loginRequest = new
            {
                email = normalizedEmail,
                password = request.Password
            };

            var json = JsonSerializer.Serialize(loginRequest);

            var content = new StringContent(json, Encoding.UTF8, "application/json");

            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("apikey", serviceRoleKey);

            var response = await _httpClient.PostAsync(
                $"{supabaseUrl}/auth/v1/token?grant_type=password",
                content
            );

            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                if (responseContent.Contains("Email not confirmed"))
                {
                    return new LoginResponseDto
                    {
                        Success = false,
                        Message = "Please verify your email before logging in."
                    };
                }

                if (responseContent.Contains("Invalid login credentials"))
                {
                    return new LoginResponseDto
                    {
                        Success = false,
                        Message = "Invalid email or password."
                    };
                }

                return new LoginResponseDto
                {
                    Success = false,
                    Message = "Unable to log in. Please try again."
                };
            }

            using var document = JsonDocument.Parse(responseContent);

            var root = document.RootElement;

            var accessToken = root.GetProperty("access_token").GetString() ?? "";

            var refreshToken = root.GetProperty("refresh_token").GetString() ?? "";

            var expiresIn = root.GetProperty("expires_in").GetInt32();

            var currentUser = await _currentUserService.GetCurrentUserAsync(accessToken);

            if (currentUser == null)
            {
                return new LoginResponseDto
                {
                    Success = false,
                    Message = "Unable to initialize your account. Please try again."
                };
            }

            return new LoginResponseDto
            {
                Success = true,
                Message = "Login successful",
                AccessToken = accessToken ?? "",
                RefreshToken = refreshToken ?? "",
                ExpiresIn = expiresIn,
            };
        }
    }
}