using Microsoft.EntityFrameworkCore;
using ParkMitra_BE.Data;
using ParkMitra_BE.DTOs.Auth;
using ParkMitra_BE.DTOs.Auth.ThirdParty;
using ParkMitra_BE.Infrastructure.Clients;
using System.Text.Json;

namespace ParkMitra_BE.Services
{
    /// <summary>
    /// Responsible for loading the authenticated user's information,
    /// synchronizing the local profile, and initializing user records
    /// when they do not already exist.
    /// </summary>
    public class CurrentUserService
    {
        private readonly IAuthProviderClient _supabaseAuthClient;
        private readonly ApplicationDbContext _context;
        private readonly UserInitializationService _userInitializationService;

        public CurrentUserService(
            IAuthProviderClient supabaseAuthClient,
            ApplicationDbContext context,
            UserInitializationService userInitializationService)
        {
            _supabaseAuthClient = supabaseAuthClient;
            _context = context;
            _userInitializationService = userInitializationService;
        }

        public async Task<MeResponseDto?> GetCurrentUserAsync(string accessToken)
        {
            var root = await LoadAuthenticatedUserAsync(accessToken);

            if (root == null)
                return null;

            var authenticatedUser = root.Value;

            var authEmail = authenticatedUser.GetProperty("email").GetString() ?? string.Empty;

            string fullName = string.Empty;
            string? mobileNumber = null;

            if (authenticatedUser.TryGetProperty("user_metadata", out var metadata))
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

            var userId = Guid.Parse(authenticatedUser.GetProperty("id").GetString()!);

            var hasGoogleProvider = false;
            var hasEmailProvider = false;

            if (authenticatedUser.TryGetProperty("identities", out var identities))
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

        public async Task<ThirdPartyIdentityDto?> GetThirdPartyUserAsync(string accessToken, string provider)
        {
            var root = await LoadAuthenticatedUserAsync(accessToken);

            if (root == null)
                return null;

            var authenticatedUser = root.Value;

            var userId = Guid.Parse(authenticatedUser.GetProperty("id").GetString()!);
            var email = authenticatedUser   .GetProperty("email").GetString() ?? string.Empty;
            var fullName = string.Empty;

            if (authenticatedUser.TryGetProperty("user_metadata", out var metadata))
            {
                if (metadata.TryGetProperty("full_name", out var fn))
                    fullName = fn.GetString() ?? string.Empty;
                else if (metadata.TryGetProperty("name", out var n))
                    fullName = n.GetString() ?? string.Empty;
            }

            string? providerUserId = null;

            if (authenticatedUser.TryGetProperty("identities", out var identities))
            {
                foreach (var identity in identities.EnumerateArray())
                {
                    if (identity.TryGetProperty("provider", out var p) &&
                        p.GetString() == provider &&
                        identity.TryGetProperty("id", out var idProp))
                    {
                        providerUserId = idProp.GetString();
                        break;
                    }
                }
            }

            return new ThirdPartyIdentityDto
            {
                UserId = userId,
                Email = email,
                FullName = fullName,
                ProviderUserId = providerUserId
            };
        }

        // Private Helper Method
        private async Task<JsonElement?> LoadAuthenticatedUserAsync(string accessToken)
        {
            var response = await _supabaseAuthClient.GetAuthenticatedUserAsync(accessToken);

            if (!response.IsSuccessStatusCode)
                return null;

            var json = await response.Content.ReadAsStringAsync();

            using var document = JsonDocument.Parse(json);

            return document.RootElement.Clone();
        }
    }
}