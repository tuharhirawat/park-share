using ParkMitra_BE.DTOs.Auth;
using ParkMitra_BE.Enums;
using ParkMitra_BE.Infrastructure.Clients;
using ParkMitra_BE.Services.Auth;
using System.Text.Json;

namespace ParkMitra_BE.Services
{
    public class ThirdPartyAuthService
    {
        private readonly IAuthProviderClient _supabaseAuthClient;
        private readonly ICodeVerifierStore _verifierStore;
        private readonly CurrentUserService _currentUserService;
        private readonly UserInitializationService _userInitializationService;
        private readonly IConfiguration _config;

        public ThirdPartyAuthService(
            IAuthProviderClient supabaseAuthClient,
            ICodeVerifierStore verifierStore,
            CurrentUserService currentUserService,
            UserInitializationService userInitializationService,
            IConfiguration config)
        {
            _supabaseAuthClient = supabaseAuthClient;
            _verifierStore = verifierStore;
            _currentUserService = currentUserService;
            _userInitializationService = userInitializationService;
            _config = config;
        }

        public (bool Success, string? RedirectUrl, string? Message) BuildLoginRedirect(
            string provider, string callbackBaseUrl)
        {
            var allowed = _config.GetSection("OAuth:AllowedProviders").Get<string[]>() ?? Array.Empty<string>();
            if (!allowed.Contains(provider, StringComparer.OrdinalIgnoreCase))
                return (false, null, "Unsupported provider.");

            var state = Guid.NewGuid().ToString("N");
            var (verifier, challenge) = Pkce.Generate();
            _verifierStore.Save(state, verifier);

            var redirectTo = $"{callbackBaseUrl}?state={state}&provider={provider}";
            var authorizeUrl = _supabaseAuthClient.BuildAuthorizeUrl(provider, challenge, redirectTo);

            return (true, authorizeUrl, null);
        }

        public async Task<AuthenticationResponseDto> HandleCallbackAsync(string code, string state, string provider)
        {
            var verifier = _verifierStore.Consume(state);
            if (verifier == null)
                return new AuthenticationResponseDto { Success = false, Message = "Invalid or expired login attempt." };

            var response = await _supabaseAuthClient.ExchangeOAuthCodeAsync(code, verifier);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return new AuthenticationResponseDto { Success = false, Message = "Third-party sign-in failed." };

            using var doc = JsonDocument.Parse(responseContent);
            var root = doc.RootElement;

            var accessToken = root.GetProperty("access_token").GetString()!;
            var refreshToken = root.GetProperty("refresh_token").GetString()!;
            var expiresIn = root.GetProperty("expires_in").GetInt32();

            var identity = await _currentUserService.GetThirdPartyUserAsync(accessToken, provider);
            if (identity == null || identity.ProviderUserId == null)
                return new AuthenticationResponseDto { Success = false, Message = "Unable to initialize your account." };

            var authProviderEnum = Enum.Parse<AuthProvider>(provider, ignoreCase: true);

            await _userInitializationService.EnsureThirdPartyUserAsync(
                identity.UserId,
                authProviderEnum,
                identity.ProviderUserId,
                identity.Email,
                identity.FullName);

            return new AuthenticationResponseDto
            {
                Success = true,
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresIn = expiresIn
            };
        }
    }
}