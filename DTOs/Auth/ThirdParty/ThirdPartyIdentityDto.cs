namespace ParkMitra_BE.DTOs.Auth.ThirdParty
{
    public class ThirdPartyIdentityDto
    {
        public Guid UserId { get; set; }

        public string Email { get; set; }  = string.Empty;

        public string FullName { get; set; } = string.Empty;

        public string? ProviderUserId { get; set; }
    }
}
