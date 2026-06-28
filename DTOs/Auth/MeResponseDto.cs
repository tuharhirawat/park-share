namespace ParkMitra_BE.DTOs.Auth
{
    public class MeResponseDto
    {
        public Guid UserId { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string? MobileNumber { get; set; }

        public bool IsHost { get; set; }

        public string CurrentStatus { get; set; } = string.Empty;

        public bool HasGoogleProvider {  get; set; }
        
        public bool HasEmailProvider { get; set; }
        
        public bool CanChangeEmail { get; set; }
    }
}