using ParkMitra_BE.Enums;

namespace ParkMitra_BE.DTOs.Auth.ThirdParty
{
    public class ThirdPartyUserDto
    {
        public AuthProvider Provider { get; init; }

        public string ProviderUserId { get; init; } = string.Empty;

        public string Email { get; init; } = string.Empty;

        public string FullName { get; init; } = string.Empty;

        public bool? EmailVerified { get; init; }

        public string? PictureUrl { get; init; }
    }
}