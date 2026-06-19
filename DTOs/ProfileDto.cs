namespace ParkMitra_BE.DTOs
{
    public class ProfileDto
    {
        public Guid UserId { get; set; }

        public string FullName { get; set; } = string.Empty;

        public string? Email { get; set; }

        public string? MobileNumber { get; set; }

        public bool IsHost { get; set; }

        public string CurrentStatus { get; set; } = string.Empty;
    }
}